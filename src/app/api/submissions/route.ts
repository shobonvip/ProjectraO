import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma-client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import crypto from "crypto";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// レートリミット（連投制限）の秒数
const RATE_LIMIT_SECONDS = 5;

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

    // ★ 暫定的なモックユーザーID（後で OAuth のセッションIDに書き換えます）
    // テスト時は、あらかじめデータベース（Prisma Studio等）に id: "test-user-id" の User を作っておいてください。
    const userId = "test-user-id";

    // 2. レートリミットチェック（複合インデックスにより超高速に処理されます）
    const lastSubmission = await prisma.submission.findFirst({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    if (lastSubmission) {
      const secondsSinceLast = (Date.now() - new Date(lastSubmission.createdAt).getTime()) / 1000;
      if (secondsSinceLast < RATE_LIMIT_SECONDS) {
        const waitTime = Math.ceil(RATE_LIMIT_SECONDS - secondsSinceLast);
        return NextResponse.json(
          { error: `連投制限中です。あと ${waitTime} 秒待ってください。` },
          { status: 429 }
        );
      }
    }

    // 3. 問題の存在確認と正解ハッシュの取得

	// ★ デバッグ用：今DBに登録されているすべての問題をコンソールに出力する
    const allProblems = await prisma.problem.findMany();
    console.log("-----------------------------------------");
    console.log("【デバッグ】リクエストされた problemId:", problemId);
    console.log("【デバッグ】現在DBに登録されている問題のID一覧:", allProblems.map(p => p.id));
    console.log("-----------------------------------------");

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
    const inputHash = crypto
      .createHash("sha256")
      .update(normalizedAnswer)
      .digest("hex");

    const isCorrect = inputHash === problem.answerHash;
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