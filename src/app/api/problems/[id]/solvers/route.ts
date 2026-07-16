// src/app/api/[id]/solvers/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth"; // これで統一！
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const problemId = resolvedParams.id;

    // 1. セッションの取得（ログインしていない場合はゲストとして扱うため即弾かない）
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id; // ゲストなら undefined

    // 2. 問題データ（と権限者リスト）の取得
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: {
        permittedUsers: {
          select: { id: true },
        },
      },
    });

    // 存在しない問題の場合は404
    if (!problem) {
      return NextResponse.json({ error: "問題が見つかりません。" }, { status: 404 });
    }

    // 3. ユーザー権限の確認（ゲストの場合は自動的に false になる）
    let isAdmin = false;
    let isPermitted = false;

    if (currentUserId) {
      const user = await prisma.user.findUnique({ where: { id: currentUserId } });
      isAdmin = user?.role === "ADMIN";
      isPermitted = problem.permittedUsers.some((u) => u.id === currentUserId);
    }

    // 4. 【重要】閲覧権限のガード
    // 「公開済み」か「管理者」か「この問題の権限を持っている（作問者）」場合のみアクセスを許可
    const hasAccess = problem.isPublished || isAdmin || isPermitted;

    if (!hasAccess) {
      // 非公開問題の場合の処理
      if (!currentUserId) {
        return NextResponse.json(
          { error: "非公開問題の正解者を閲覧するにはログインが必要です。" },
          { status: 401 }
        );
      } else {
        return NextResponse.json(
          { error: "この問題の正解者を閲覧する権限がありません。" },
          { status: 403 }
        );
      }
    }

    // 5. 正解者リストの取得
    // ユーザー単位でユニークな「最速AC」のみを、提出が早い順（asc）に取得する
    // かつ、管理者(ADMIN)と、その問題の作問者(permittedUsers)を除外する
    const solvers = await prisma.submission.findMany({
      where: {
        problemId: problemId,
        status: "AC",
        user: {
          role: "USER", // ADMINを除外
          permittedProblems: {
            none: { id: problemId }, // 作問者を除外
          },
        },
      },
      distinct: ["userId"], // 1ユーザーにつき1レコード（最速AC）に限定
      orderBy: {
        createdAt: "asc", // 提出日時が早い順
      },
      select: {
        id: true,
        createdAt: true,
        user: {
          select: {
            name: true,
          },
        },
      },
    });

    // クライアントが扱いやすいシンプルな配列にして返却
    const formattedSolvers = solvers.map((s, index) => ({
      rank: index + 1,
      userName: s.user.name,
      solvedAt: s.createdAt,
    }));

    return NextResponse.json(formattedSolvers);
  } catch (error) {
    console.error("Fetch Solvers Error:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}