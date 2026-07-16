import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth"; // これで統一！
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    // 1. セッションの取得
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    // 2. ユーザー権限の確認（ゲストの場合は自動的に false）
    let isAdmin = false;
    if (currentUserId) {
      const user = await prisma.user.findUnique({ where: { id: currentUserId } });
      isAdmin = user?.role === "ADMIN";
    }

    // 3. 【重要】アクセス権に基づいた取得条件 (where句) の組み立て
    // ・ADMIN: 全て取得
    // ・ログインユーザー: 「公開済み」または「自分が権限を持つ非公開問題」を取得
    // ・ゲスト: 「公開済み」のみ取得
    const whereCondition = isAdmin
      ? {} 
      : currentUserId
      ? {
          OR: [
            { isPublished: true },
            { permittedUsers: { some: { id: currentUserId } } },
          ],
        }
      : { isPublished: true };

    // 4. 問題一覧の取得 (hasAC判定のために、自分のAC提出も含めて取得)
    const problems = await prisma.problem.findMany({
      where: whereCondition,
      orderBy: { id: "asc" }, // お好みでソート順を変更してください
      include: {
        // ログイン中の場合のみ、この問題に対する自分のAC提出を1件取得する
        submissions: currentUserId
          ? {
              where: { userId: currentUserId, status: "AC" },
              take: 1,
            }
          : false,
      },
    });

    // 5. 各問題の正解者数(acCount)を集計して整形
    // ※問題数が増えた場合はN+1になるため、将来的に別途キャッシュや最適化を検討
    const problemsWithStats = await Promise.all(
      problems.map(async (problem) => {
        // 詳細ページと同じく、管理者と作問者を除外したACユーザー数をカウント
        const solvers = await prisma.submission.groupBy({
          by: ["userId"],
          where: {
            problemId: problem.id,
            status: "AC",
            user: { 
              role: "USER", 
              permittedProblems: { none: { id: problem.id } } 
            },
          },
        });

        return {
          id: problem.id,
          title: problem.title,
          isPublished: problem.isPublished,
          acCount: solvers.length,
          // submissions配列に要素があればAC済み
          hasAC: problem.submissions?.length > 0 || false,
        };
      })
    );

    return NextResponse.json(problemsWithStats);

  } catch (error) {
    console.error("Fetch Problems Index Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}