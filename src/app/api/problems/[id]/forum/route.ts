import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// 🔒 アクセス権限をチェックする共通関数
async function checkForumAccess(problemId: string, currentUserId: string) {
  const user = await prisma.user.findUnique({ where: { id: currentUserId } });
  const problem = await prisma.problem.findUnique({
    where: { id: problemId },
    include: {
      permittedUsers: { select: { id: true } },
      submissions: { where: { userId: currentUserId, status: "AC" } }, // AC記録があるか確認
    }
  });

  if (!user || !problem) return false;

  const isAdmin = user.role === "ADMIN";
  const isWriter = problem.permittedUsers.some(u => u.id === currentUserId);
  const hasAC = problem.submissions.length > 0;

  // 管理者 or 作問者 or AC済み ならアクセス許可！
  return isAdmin || isWriter || hasAC;
}

// 📖 掲示板の取得 (GET)
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    if (!currentUserId) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

    const canAccess = await checkForumAccess(id, currentUserId);
    if (!canAccess) {
      return NextResponse.json({ error: "フォーラムを見るには正解(AC)する必要があります。" }, { status: 403 });
    }

    // 投稿一覧を取得（古い順）
    const posts = await prisma.forumPost.findMany({
      where: { problemId: id },
      include: { user: { select: { name: true, role: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(posts, { status: 200 });
  } catch (error) {
    console.error("Forum GET Error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

// ✍️ 掲示板への書き込み (POST)
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    if (!currentUserId) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

    const canAccess = await checkForumAccess(id, currentUserId);
    if (!canAccess) {
      return NextResponse.json({ error: "書き込むには正解(AC)する必要があります。" }, { status: 403 });
    }

    const { content } = await request.json();
    if (!content || !content.trim()) {
      return NextResponse.json({ error: "本文を入力してください" }, { status: 400 });
    }

    const newPost = await prisma.forumPost.create({
      data: {
        content: content,
        userId: currentUserId,
        problemId: id,
      },
      include: { user: { select: { name: true, role: true } } }
    });

    return NextResponse.json({ message: "投稿しました！", post: newPost }, { status: 201 });
  } catch (error) {
    console.error("Forum POST Error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}