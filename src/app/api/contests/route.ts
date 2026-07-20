import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth"; 
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth"; // パスは適宜調整してください
export async function GET() {
  try {
    // 全てのコンテストを取得し、開始時刻の降順（新しい順）で並び替え
    const contests = await prisma.contest.findMany({
      orderBy: {
        startTime: "desc",
      },
      include: {
        // コンテストに含まれる問題数をカウント
        _count: {
          select: { contestProblems: true }
        },
      
        permittedUsers: {
          select: { name: true }
        }
      }
    });

    // フロントエンドで扱いやすい形に整形
    const formattedContests = contests.map(contest => ({
      id: contest.id,
      title: contest.title,
      startTime: contest.startTime,
      endTime: contest.endTime,
      problemCount: contest._count.contestProblems,
      writerNames: contest.permittedUsers.map(user => user.name),
    }));

    return NextResponse.json(formattedContests);

  } catch (error) {
    console.error("Fetch Contests Index Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const body = await request.json();
    // 🌟 id (カスタムID) も受け取るように追加
    const { id, title, description, startTime, endTime, problems, writerNames } = body;

    // 🌟 1. 問題が1つも追加されていない場合のエラーチェック
    if (!problems || problems.length === 0) {
      return NextResponse.json({ error: "コンテストには少なくとも1つの問題を追加してください。" }, { status: 400 });
    }

    const problemIds = problems.map((p: any) => p.problemId);

    // 🌟 2. 重複した問題（同じ問題ID）が含まれている場合のエラーチェック
    const uniqueProblemIds = new Set(problemIds);
    if (uniqueProblemIds.size !== problemIds.length) {
      return NextResponse.json({ error: "コンテスト内に重複した問題が含まれています。同じ問題を複数追加することはできません。" }, { status: 400 });
    }

    // 3. ユーザー情報と権限(ADMINか)の取得
    const currentUser = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (!currentUser) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    const isAdmin = currentUser.role === "ADMIN";

    // 4. 追加する問題の権限チェックと存在確認
    const dbProblems = await prisma.problem.findMany({
      where: { id: { in: problemIds } },
      include: { permittedUsers: { select: { id: true } } }
    });

    for (const pId of problemIds) {
      const dbProb = dbProblems.find(dp => dp.id === pId);
      if (!dbProb) {
        return NextResponse.json({ error: `問題ID ${pId} は存在しません。` }, { status: 400 });
      }
      
      // ADMINでなく、かつ問題の permittedUsers にも含まれていない場合は弾く
      if (!isAdmin) {
        const isPermitted = dbProb.permittedUsers.some(u => u.id === currentUserId);
        if (!isPermitted) {
          return NextResponse.json({ error: `問題ID ${pId} をコンテストに追加する権限がありません。` }, { status: 403 });
        }
      }
    }

    // 5. コンテスト権限者（writerNames）の解決
    // 作成者（自分）は必ず含める
    const permittedUserIds = [currentUserId];
    if (writerNames && writerNames.trim() !== "") {
      const names = writerNames.split(",").map((n: string) => n.trim()).filter((n: string) => n !== "");
      const additionalUsers = await prisma.user.findMany({
        where: { name: { in: names } },
        select: { id: true, name: true }
      });
      additionalUsers.forEach(u => {
        if (!permittedUserIds.includes(u.id)) permittedUserIds.push(u.id);
      });
    }

    // 6. コンテストと中間テーブル (ContestProblem) の一括作成
    const newContest = await prisma.contest.create({
      data: {
        id: id || undefined, // 🌟 カスタムIDがある場合はそれを使い、なければ自動生成(UUID)する
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        permittedUsers: {
          connect: permittedUserIds.map(uid => ({ id: uid }))
        },
        contestProblems: {
          create: problems.map((p: any) => ({
            problemId: p.problemId,
            label: p.label,
            points: Number(p.points),
            order: Number(p.order)
          }))
        }
      }
    });

    return NextResponse.json({ message: "コンテストを作成しました", contestId: newContest.id }, { status: 201 });
  } catch (error: any) {
    console.error("Create Contest Error:", error);
    
    // 🌟 PrismaのID重複エラー(P2002)に対する親切なエラーメッセージ
    if (error.code === 'P2002') {
      return NextResponse.json({ error: "指定されたコンテストIDは既に使用されています。別のIDを指定してください。" }, { status: 400 });
    }
    
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}