import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth"; // これまでのファイルと同様にprismaをインポート

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { adminToken, problemid, title, statement, answer, isPublished } = body;

    // 1. 管理者トークンのチェック
    const envToken = process.env.ADMIN_TOKEN;
    if (!envToken || adminToken !== envToken) {
      return NextResponse.json(
        { error: "認証エラー: 管理者トークンが一致しません。" },
        { status: 401 }
      );
    }

    // 2. 必須項目のチェック
    if (!title || !statement || !answer) {
      return NextResponse.json(
        { error: "入力エラー: タイトル、問題文、解答は必須です。" },
        { status: 400 }
      );
    }

    // 3. データベースに問題を作成
    const newProblem = await prisma.problem.create({
      data: {
		id: problemid,
        title: title,
        statement: statement,
        answer: answer,
        // isPublished が送られてこなかった場合は、安全のためデフォルトで false (非公開) にする
        isPublished: isPublished ?? false, 
      },
    });

    // 4. 成功レスポンス
    return NextResponse.json(
      { 
        message: "問題の作成に成功しました！", 
        problem: newProblem 
      },
      { status: 201 }
    );

  } catch (error) {
    console.error("Make Problem Error:", error);
	// 🚨 デバッグ用の特別対応（原因が分かったら必ず消してください！）
    return NextResponse.json(
      {
        error: "サーバーエラーが発生しました。",
        debug_message: error.message,         // エラーの直接的な原因（一番重要！）
        debug_stack: error.stack,             // コードのどこで落ちたかの詳細な経路
        debug_full: String(error)             // エラーオブジェクト全体の文字列化
      },
      { status: 500 }
    );
  }
}