import { NextResponse } from "next/server";
import { prisma } from "@/lib/auth"; 
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

// ==========================================
// GET: コンテスト詳細と問題リストの取得
// ==========================================
export async function GET(
  request: Request,
  { params }: { params: Promise<{ contestId: string }> }
) {
  try {
    const resolvedParams = await params;
    const contestId = resolvedParams.contestId;
    
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;
    let isAdmin = false;

    if (currentUserId) {
      const user = await prisma.user.findUnique({ where: { id: currentUserId } });
      isAdmin = user?.role === "ADMIN";
    }

    const contest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: {
        // 🌟 編集画面で使うために権限者(permittedUsers)を取得
        permittedUsers: { select: { id: true, name: true } },
        contestProblems: {
          orderBy: { order: "asc" },
          include: {
            problem: {
              include: {
                permittedUsers: { select: { id: true } },
                submissions: currentUserId
                  ? { where: { userId: currentUserId, status: "AC" }, take: 1 }
                  : false,
              }
            }
          }
        }
      }
    });

    if (!contest) {
      return NextResponse.json({ error: "コンテストが見つかりません" }, { status: 404 });
    }

    const now = new Date();
    const hasStarted = now >= contest.startTime;

    const visibleContestProblems = contest.contestProblems.filter((cp) => {
      if (isAdmin) return true;
      if (hasStarted) return true; 
      if (currentUserId && cp.problem.permittedUsers.some((u) => u.id === currentUserId)) return true;
      return false;
    });

    const problemsWithStats = await Promise.all(
      visibleContestProblems.map(async (cp) => {
        const problem = cp.problem;
        const solvers = await prisma.submission.groupBy({
          by: ["userId"],
          where: {
            problemId: problem.id,
            status: "AC",
            user: { role: "USER", permittedProblems: { none: { id: problem.id } } },
          },
        });

        return {
          id: problem.id,
          label: cp.label,
          title: problem.title,
          isPublished: problem.isPublished,
          acCount: solvers.length,
          hasAC: problem.submissions?.length > 0 || false,
          points: cp.points,
          order: cp.order, // 🌟 編集画面の並び順用に追加
        };
      })
    );
    
    return NextResponse.json({
      contest: {
        id: contest.id,
        title: contest.title,
        description: contest.description,
        startTime: contest.startTime,
        endTime: contest.endTime,
        writerNames: contest.permittedUsers.map((u) => u.name),
        // 🌟 追加: 管理者、または自分が権限者リストに含まれているか
        canEdit: isAdmin || (currentUserId ? contest.permittedUsers.some((u) => u.id === currentUserId) : false),
      },
      problems: problemsWithStats
    });

  } catch (error) {
    console.error("Fetch Contest Details Error:", error);
    return NextResponse.json({ error: "Server Error" }, { status: 500 });
  }
}

// ==========================================
// PUT: コンテスト情報の更新 (🌟新規追加)
// ==========================================
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ contestId: string }> }
) {
  try {
    const resolvedParams = await params;
    const contestId = resolvedParams.contestId;
    
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (!currentUser) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    const isAdmin = currentUser.role === "ADMIN";

    // 1. コンテストの編集権限チェック
    const existingContest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: { permittedUsers: true }
    });

    if (!existingContest) {
      return NextResponse.json({ error: "コンテストが見つかりません" }, { status: 404 });
    }

    if (!isAdmin) {
      const canEdit = existingContest.permittedUsers.some(u => u.id === currentUserId);
      if (!canEdit) {
        return NextResponse.json({ error: "このコンテストを編集する権限がありません。" }, { status: 403 });
      }
    }

    const body = await request.json();
    const { title, description, startTime, endTime, problems, writerNames } = body;

    // 2. 問題のバリデーション
    if (!problems || problems.length === 0) {
      return NextResponse.json({ error: "コンテストには少なくとも1つの問題が必要です。" }, { status: 400 });
    }

    const problemIds = problems.map((p: any) => p.problemId);
    const uniqueProblemIds = new Set(problemIds);
    if (uniqueProblemIds.size !== problemIds.length) {
      return NextResponse.json({ error: "重複した問題が含まれています。" }, { status: 400 });
    }

    // 3. 追加する問題の権限チェック
    const dbProblems = await prisma.problem.findMany({
      where: { id: { in: problemIds } },
      include: { permittedUsers: { select: { id: true } } }
    });

    for (const pId of problemIds) {
      const dbProb = dbProblems.find(dp => dp.id === pId);
      if (!dbProb) {
        return NextResponse.json({ error: `問題ID ${pId} は存在しません。` }, { status: 400 });
      }
      if (!isAdmin) {
        const isPermitted = dbProb.permittedUsers.some(u => u.id === currentUserId);
        if (!isPermitted) {
          return NextResponse.json({ error: `問題ID ${pId} をコンテストに追加する権限がありません。` }, { status: 403 });
        }
      }
    }

    // 4. 権限者の解決
    const permittedUserIds = [currentUserId];
    if (writerNames && writerNames.trim() !== "") {
      const names = writerNames.split(",").map((n: string) => n.trim()).filter((n: string) => n !== "");
      const additionalUsers = await prisma.user.findMany({
        where: { name: { in: names } },
        select: { id: true }
      });
      additionalUsers.forEach(u => {
        if (!permittedUserIds.includes(u.id)) permittedUserIds.push(u.id);
      });
    }

    // 5. 更新処理 (中間テーブルは一度削除して作り直すのが最も安全でクリーンです)
    const updatedContest = await prisma.contest.update({
      where: { id: contestId },
      data: {
        title,
        description,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        permittedUsers: {
          set: [], // 一度リセット
          connect: permittedUserIds.map(uid => ({ id: uid }))
        },
        contestProblems: {
          deleteMany: {}, // 古い問題を全て削除
          create: problems.map((p: any) => ({
            problemId: p.problemId,
            label: p.label,
            points: Number(p.points),
            order: Number(p.order)
          }))
        }
      }
    });

    return NextResponse.json({ message: "コンテストを更新しました", contestId: updatedContest.id }, { status: 200 });
  } catch (error: any) {
    console.error("Update Contest Error:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}

// ==========================================
// DELETE: コンテストの削除 (🌟新規追加)
// ==========================================
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ contestId: string }> }
) {
  try {
    const resolvedParams = await params;
    const contestId = resolvedParams.contestId;
    
    const session = await getServerSession(authOptions);
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      return NextResponse.json({ error: "ログインが必要です" }, { status: 401 });
    }

    const currentUser = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (!currentUser) return NextResponse.json({ error: "ユーザーが見つかりません" }, { status: 404 });
    const isAdmin = currentUser.role === "ADMIN";

    // 1. コンテストの削除権限チェック
    const existingContest = await prisma.contest.findUnique({
      where: { id: contestId },
      include: { permittedUsers: true }
    });

    if (!existingContest) {
      return NextResponse.json({ error: "コンテストが見つかりません" }, { status: 404 });
    }

    if (!isAdmin) {
      const canEdit = existingContest.permittedUsers.some(u => u.id === currentUserId);
      if (!canEdit) {
        return NextResponse.json({ error: "このコンテストを削除する権限がありません。" }, { status: 403 });
      }
    }

    // 2. コンテストの削除 (関連するContestProblemはCascadeで自動削除されます)
    await prisma.contest.delete({
      where: { id: contestId }
    });

    return NextResponse.json({ message: "コンテストを削除しました" }, { status: 200 });
  } catch (error: any) {
    console.error("Delete Contest Error:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}