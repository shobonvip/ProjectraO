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