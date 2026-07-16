// src/app/api/problems/[id]/forum/[postId]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function PUT(request: Request, { params }: { params: Promise<{ id: string; postId: string }> }) {
  try {
    const { id, postId } = await params;
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    if (!currentUserId) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

    // ユーザー情報と投稿情報（権限チェック用）を取得
    const [user, post] = await Promise.all([
      prisma.user.findUnique({ where: { id: currentUserId } }),
      prisma.forumPost.findUnique({ 
        where: { id: postId },
        include: { problem: { include: { permittedUsers: { select: { id: true } } } } }
      })
    ]);

    if (!user || !post) return NextResponse.json({ error: "データが見つかりません" }, { status: 404 });

    // 🔒 権限チェック: 投稿者本人 or ADMIN or 作問者 なら許可
    const isOwner = post.userId === currentUserId;
    const isAdmin = user.role === "ADMIN";
    const isWriter = post.problem.permittedUsers.some((u) => u.id === currentUserId);

    if (!isOwner && !isAdmin && !isWriter) {
      return NextResponse.json({ error: "この投稿を編集する権限がありません" }, { status: 403 });
    }

    const { content } = await request.json();
    if (!content || !content.trim()) return NextResponse.json({ error: "本文を入力してください" }, { status: 400 });

    const updatedPost = await prisma.forumPost.update({
      where: { id: postId },
      data: { content },
      include: { user: { select: { name: true, role: true } } }
    });

    return NextResponse.json({ message: "更新しました", post: updatedPost }, { status: 200 });
  } catch (error) {
    console.error("Forum PUT Error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string; postId: string }> }) {
  try {
    const { id, postId } = await params;
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    if (!currentUserId) return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });

    const [user, post] = await Promise.all([
      prisma.user.findUnique({ where: { id: currentUserId } }),
      prisma.forumPost.findUnique({ 
        where: { id: postId },
        include: { problem: { include: { permittedUsers: { select: { id: true } } } } }
      })
    ]);

    if (!user || !post) return NextResponse.json({ error: "データが見つかりません" }, { status: 404 });

    // 🔒 権限チェック: 投稿者本人 or ADMIN or 作問者 なら許可
    const isOwner = post.userId === currentUserId;
    const isAdmin = user.role === "ADMIN";
    const isWriter = post.problem.permittedUsers.some((u) => u.id === currentUserId);

    if (!isOwner && !isAdmin && !isWriter) {
      return NextResponse.json({ error: "この投稿を削除する権限がありません" }, { status: 403 });
    }

    await prisma.forumPost.delete({ where: { id: postId } });

    return NextResponse.json({ message: "削除しました" }, { status: 200 });
  } catch (error) {
    console.error("Forum DELETE Error:", error);
    return NextResponse.json({ error: "サーバーエラー" }, { status: 500 });
  }
}