import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma-client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

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
	const currentUserId = "test-user-id"; 

    // 1. ユーザー情報を取得してロール（ADMINかどうか）を確認
    const user = await prisma.user.findUnique({
      where: { id: currentUserId },
    });
    
    const isAdmin = user?.role === "ADMIN";

    // 2. 問題データと、閲覧許可されているユーザー一覧を一緒に取得
    const problem = await prisma.problem.findUnique({
      where: { id: problemId },
      select: {
        id: true,
        title: true,
        statement: true,
		isPublished: true,
		answer: true,
        permittedUsers: {
          select: {
            id: true,
          }
        },
        contestProblems: {
          select: {
            points: true,
            label: true,
          }
        }
      }
    });

    if (!problem) {
      return NextResponse.json({
		error: "問題が見つかりません。"
	  }, { status: 404 });
    }
    
	let hasAccess = false;
    const isPermitted = problem.permittedUsers.some(u => u.id === currentUserId);
    
	if (isAdmin) {
      // ルール①: 管理者なら常にアクセス可能
      hasAccess = true;
    } else if (problem.isPublished) {
      // ルール②: 公開されている問題なら誰でもアクセス可能
      hasAccess = true;
    } else if (isPermitted) {
      hasAccess = true;
    }

    // アクセス権がない場合は403エラーを返す
    if (!hasAccess) {
      return NextResponse.json(
        { error: "この問題を閲覧する権限がありません（非公開問題）。" },
        { status: 403 }
      );
    }

    const contestProblem = problem.contestProblems[0];

	const acSubmission = await prisma.submission.findFirst({
      where: { userId: currentUserId, problemId: problemId, status: "AC" },
    });
	const hasAC = !!acSubmission;

	const solvers = await prisma.submission.groupBy({
      by: ['userId'],
      where: {
        problemId: problemId,
        status: "AC",
        user: {
          role: "USER", // ADMINを除外
          permittedProblems: {
			none: { id: problemId }
		  } // この問題の作問者を除外
        }
      }
    });

	const acCount = solvers.length;

    // 4. 安全なデータのみ返却
    return NextResponse.json({
      id: problem.id,
      title: problem.title,
      statement: problem.statement,
	  isPublished: problem.isPublished,
	  acCount: acCount,
	  hasAC: hasAC,
      points: contestProblem?.points ?? 0,
      label: contestProblem?.label ?? "",
	  answer: (hasAC || isAdmin || isPermitted) ? problem.answer : undefined,
    });
	

  } catch (error) {
    console.error("Fetch Problem Error:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました。" }, { status: 500 });
  }
}