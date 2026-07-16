import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// 🔒 共通の編集・管理権限チェック
async function checkManagePermission(problemId: string, userName: string) {
  const [user, problem] = await Promise.all([
    prisma.user.findUnique({ where: { name: userName } }),
    prisma.problem.findUnique({
      where: { id: problemId },
      include: { permittedUsers: true },
    })
  ]);

  if (!problem) return { error: "問題が見つかりません", status: 404 };
  if (!user) return { error: "ユーザーが見つかりません", status: 404 };

  // ADMINまたはpermittedUsersに含まれる場合のみ許可
  const hasPermission = user.role === "ADMIN" || problem.permittedUsers.some((u) => u.name === userName);

  if (!hasPermission) {
    return { error: "この問題を管理・編集する権限がありません", status: 403 };
  }

  return { problem };
}

// 🔑 編集画面用のデータ取得 (GET)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    // 🚨 修正ポイント: 使う前に await で id を取り出す！
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.name) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const permCheck = await checkManagePermission(id, session.user.name);
    if (permCheck.error) {
      return NextResponse.json({ error: permCheck.error }, { status: permCheck.status });
    }

    return NextResponse.json({ problem: permCheck.problem }, { status: 200 });
  } catch (error: any) {
    console.error("Manage GET Error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// 📝 問題の更新 (PUT)
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; // await する！
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.name) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const permCheck = await checkManagePermission(id, session.user.name);
    if (permCheck.error) {
      return NextResponse.json({ error: permCheck.error }, { status: permCheck.status });
    }

    const body = await request.json();
    const { title, statement, answer, isPublished } = body;

    const updatedProblem = await prisma.problem.update({
      where: { id: id },
      data: { title, statement, answer, isPublished },
    });

    return NextResponse.json({ message: "更新しました", problem: updatedProblem }, { status: 200 });
  } catch (error: any) {
    console.error("Manage PUT Error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// 🗑️ 問題の削除 (DELETE)
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params; // 👈 ここで await
    const session = await getServerSession(authOptions);
    if (!session || !session.user || !session.user.name) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const permCheck = await checkManagePermission(id, session.user.name);
    if (permCheck.error) {
      return NextResponse.json({ error: permCheck.error }, { status: permCheck.status });
    }

    await prisma.problem.delete({ where: { id: id } });
    return NextResponse.json({ message: "問題を削除しました" }, { status: 200 });
  } catch (error: any) {
    console.error("Manage DELETE Error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}