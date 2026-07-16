// src/app/api/[id]/route.ts
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

    // 1. セッションの取得（ログインしていない場合は null になる）
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id; // ゲストなら undefined

    // 2. 問題データの取得
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      include: { permittedUsers: { select: { id: true } }, contestProblems: true }
    });

    if (!problem) return NextResponse.json({ error: "見つかりません" }, { status: 404 });

    // 3. ユーザー権限の確認（ゲストの場合は自動的に false になる）
    let isAdmin = false;
    let isPermitted = false;

    if (currentUserId) {
      const user = await prisma.user.findUnique({ where: { id: currentUserId } });
      isAdmin = user?.role === "ADMIN";
      isPermitted = problem.permittedUsers.some((u) => u.id === currentUserId);
    }

    // 4. 【重要】アクセス権のチェック
    // 「公開されている」or「管理者」or「作問者」なら閲覧OK！
    const hasAccess = problem.isPublished || isAdmin || isPermitted;

    if (!hasAccess) {
      // 非公開問題の場合の処理
      if (!currentUserId) {
        return NextResponse.json({ error: "非公開問題を閲覧するにはログインが必要です。" }, { status: 401 });
      } else {
        return NextResponse.json({ error: "この問題を閲覧する権限がありません。" }, { status: 403 });
      }
    }

    // 5. 正解(AC)状況のチェック（ゲストは未ログインなので当然 false）
    let hasAC = false;
    if (currentUserId) {
      const acSubmission = await prisma.submission.findFirst({
        where: { userId: currentUserId, problemId: problemId, status: "AC" },
      });
      hasAC = !!acSubmission;
    }

    // 6. 正解者数の集計（そのまま）
    const solvers = await prisma.submission.groupBy({
      by: ['userId'],
      where: {
        problemId: problemId,
        status: "AC",
        user: { role: "USER", permittedProblems: { none: { id: problemId } } }
      }
    });
    const acCount = solvers.length;
    const canEdit = isAdmin || isPermitted;

    // 7. データの返却（ゲストには answer を絶対に送らない）
    return NextResponse.json({
      id: problem.id,
      title: problem.title,
      statement: problem.statement,
      isPublished: problem.isPublished,
      acCount: acCount,
      hasAC: hasAC,
      canEdit: canEdit,
      authorNames: problem.permittedUsers.map((u) => u.id),
      // 答えは「AC済み」か「管理者・作問者」にだけ送る
      answer: (hasAC || isAdmin || isPermitted) ? problem.answer : undefined,
    });

  } catch (error) {
    console.error("Fetch Problem Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

