import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma-client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const problemId = resolvedParams.id;

    // 1. ログイン（セッション）チェック
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "ログインが必要です。" }, { status: 401 });
    }
    const currentUserId = session.user.id;

    // 2. ユーザー権限と問題データの取得
    const user = await prisma.user.findUnique({ where: { id: currentUserId } });
    const isAdmin = user?.role === "ADMIN";

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

    // 3. 【重要】閲覧権限のガード
    // 「管理者」か「公開済み」か「この問題の権限を持っている（作問者）」場合のみアクセスを許可
    const isPermitted = problem.permittedUsers.some((u) => u.id === currentUserId);
    const hasAccess = isAdmin || problem.isPublished || isPermitted;

    if (!hasAccess) {
      return NextResponse.json(
        { error: "この問題の情報を閲覧する権限がありません。" },
        { status: 403 } // 権限なしエラー（Forbidden）
      );
    }

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