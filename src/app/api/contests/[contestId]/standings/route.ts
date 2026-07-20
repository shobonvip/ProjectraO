import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ contestId: string }> }
) {
  try {
    const resolvedParams = await params;
    const contestId = resolvedParams.contestId;

    // 1. コンテスト情報と紐づく問題を取得
    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        contestProblems: {
          orderBy: { order: "asc" },
        }
      }
    });

    if (!contest) {
      return NextResponse.json({ error: "コンテストが見つかりません" }, { status: 404 });
    }

    const contestProblemIds = contest.contestProblems.map(cp => cp.problemId);
    
    // 問題ID → 配点 のマッピングを作成
    const problemPoints: Record<string, number> = {};
    contest.contestProblems.forEach(cp => {
      problemPoints[cp.problemId] = cp.points;
    });

    // 2. コンテスト期間中の提出をすべて取得
    const submissions = await prisma.submission.findMany({
      where: {
        problemId: { in: contestProblemIds },
        createdAt: {
          gte: contest.startTime,
          lte: contest.endTime,
        },
        user: { 
          // ① 管理者は除外
          role: "USER",
          // ② 🌟追加: 自分が権限を持つ問題(permittedProblems)の中に、
          // このコンテストの問題が1つでも含まれているユーザーは完全に除外する
          permittedProblems: {
            none: {
              id: { in: contestProblemIds }
            }
          }
        },
      },
      orderBy: { createdAt: "asc" }, // 古い順に処理して最初のACを特定する
      include: { user: { select: { id: true, name: true } } }
    });

    // 3. ユーザーごとの成績を集計
    const userStats: Record<string, any> = {};

    for (const sub of submissions) {
      if (!userStats[sub.userId]) {
        userStats[sub.userId] = {
          user: sub.user,
          totalScore: 0,
          lastAcTime: null,
          details: {} // { problemId: { status, waCount, acTime } }
        };
      }

      const stats = userStats[sub.userId];
      
      if (!stats.details[sub.problemId]) {
        stats.details[sub.problemId] = { status: "IDLE", waCount: 0, acTime: null };
      }

      const pStats = stats.details[sub.problemId];

      // すでにAC済みの問題に対する追加提出は無視
      if (pStats.status === "AC") continue;

      if (sub.status === "AC") {
        pStats.status = "AC";
        pStats.acTime = sub.createdAt;
        stats.totalScore += problemPoints[sub.problemId];
        
        // 最終正解時刻の更新
        if (!stats.lastAcTime || new Date(sub.createdAt) > new Date(stats.lastAcTime)) {
          stats.lastAcTime = sub.createdAt;
        }
      } else {
        // WA, IE 等の不正解ステータス
        pStats.waCount += 1;
        pStats.status = "WA"; // 表示上は一旦WAとする
      }
    }

    // 4. ランキングの並び替え
    // (合計点数 DESC, 最終正解時刻 ASC)
    const standings = Object.values(userStats).sort((a: any, b: any) => {
      // 1. 点数で比較（降順）
      if (b.totalScore !== a.totalScore) {
        return b.totalScore - a.totalScore;
      }
      
      // 2. 最終正解時刻で比較（昇順 = 早い方が上）
      if (!a.lastAcTime && !b.lastAcTime) return 0;
      if (!a.lastAcTime) return 1; // 点数が同じでACなし（あり得ないが念の為）は下へ
      if (!b.lastAcTime) return -1;
      
      return new Date(a.lastAcTime).getTime() - new Date(b.lastAcTime).getTime();
    });

    // 5. 順位（同値処理対応）の付与
    let currentRank = 1;
    standings.forEach((s: any, index: number) => {
      if (index > 0) {
        const prev = standings[index - 1];
        // 点数が違う、または最終AC時刻が違う場合は順位を下げる
        if (s.totalScore < prev.totalScore || s.lastAcTime !== prev.lastAcTime) {
          currentRank = index + 1;
        }
      }
      s.rank = currentRank;
    });

    return NextResponse.json({
      contest: {
        id: contest.id,
        title: contest.title,
        startTime: contest.startTime,
        endTime: contest.endTime,
      },
      problems: contest.contestProblems.map(cp => ({
        id: cp.problemId,
        label: cp.label,
        points: cp.points,
      })),
      standings
    });

  } catch (error) {
    console.error("Standings Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}