import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma-client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// レートリミット（連投制限）の秒数
const RATE_LIMIT_WINDOW_MS = 2 * 60 * 1000;
const MAX_SUBMISSIONS = 5; 

export async function POST(request: Request) {
  try {
    const { problemId, userAnswer } = await request.json();

    // 1. バリデーション
    if (!problemId || userAnswer === undefined) {
      return NextResponse.json(
        { error: "必要なパラメータが不足しています。" },
        { status: 400 }
      );
    }

    // 👇 ここを変更！
    const session = await getServerSession(authOptions);
    
    // ログインしていなければ提出を弾く
    if (!session || !session.user) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    // 本物のアカウントで提出！
    const userId = session.user.id;

    // 2. 問題ごとのスライディングウィンドウ・レートリミットチェック
    const timeWindowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MS);

    // 直近3分以内の「このユーザー」の「この問題」に対する提出を取得（古い順）
    const recentSubmissions = await prisma.submission.findMany({
      where: { 
        userId: userId,
        problemId: problemId,      // ← ここが重要！問題ごとに独立させます
        createdAt: {
          gte: timeWindowStart,    // 3分前以降のデータのみに絞り込む
        }
      },
      orderBy: { createdAt: "asc" }, // 取得した中で一番古いものを配列の先頭にする
    });

    if (recentSubmissions.length >= MAX_SUBMISSIONS) {
      // 5回以上の提出があった場合、一番古い提出が「3分の枠」から押し出されるまで待機させる
      const oldestInWindow = recentSubmissions[0].createdAt.getTime();
      const unlockTime = oldestInWindow + RATE_LIMIT_WINDOW_MS;
      const waitTimeSec = Math.ceil((unlockTime - Date.now()) / 1000);

      // UXのため、分と秒に変換して親切なメッセージにする
      const waitMinutes = Math.floor(waitTimeSec / 60);
      const waitRemainingSec = waitTimeSec % 60;
      const timeString = waitMinutes > 0 
        ? `${waitMinutes}分${waitRemainingSec}秒` 
        : `${waitRemainingSec}秒`;

      return NextResponse.json(
        { error: `この問題への提出は2分間に3回までです。あと ${timeString} 待ってください。` },
        { status: 429 }
      );
    }

    // 3. 問題の存在確認と正解ハッシュの取得
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
    });

    if (!problem) {
      return NextResponse.json(
        { error: "指定された問題が見つかりません。" },
        { status: 404 }
      );
    }

    // 4. 提出された解答をハッシュ化して比較 (SHA-256)
    // ユーザーが入力した文字列の空白や改行をトリムして比較するのが親切です
    const normalizedAnswer = userAnswer.toString().trim();
    const isCorrect = normalizedAnswer === problem.answer;
    const status = isCorrect ? "AC" : "WA";

    // 5. 提出レコードをデータベースに保存
    const submission = await prisma.submission.create({
      data: {
        userId,
        problemId,
        userAnswer: normalizedAnswer,
        status,
      },
    });

    // 6. 結果を返却
    return NextResponse.json({
      submissionId: submission.id,
      status: submission.status, // "AC" または "WA"
      createdAt: submission.createdAt,
    });

  } catch (error) {
    console.error("Submission API Error:", error);
    return NextResponse.json(
      { error: "サーバー内部でエラーが発生しました。" },
      { status: 500 }
    );
  }
}