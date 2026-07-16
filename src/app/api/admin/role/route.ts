import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.name) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const body = await request.json();
    const { secretToken, targetRole } = body;

    // 🔒 鉄壁のパスワードチェック（ADMINになる時もUSERに戻る時も確認する）
    const envToken = process.env.ADMIN_TOKEN;
    if (!envToken || secretToken !== envToken) {
      return NextResponse.json({ error: "パスワードが違います。" }, { status: 403 });
    }

    // 不正な権限が送られてこないようにブロック
    if (targetRole !== "ADMIN" && targetRole !== "USER") {
      return NextResponse.json({ error: "不正なリクエストです。" }, { status: 400 });
    }

    // 権限の書き換え
    await prisma.user.update({
      where: { name: session.user.name },
      data: { role: targetRole },
    });

    return NextResponse.json({ message: `権限を ${targetRole} に設定しました！` }, { status: 200 });

  } catch (error) {
    console.error("Change Role Error:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}