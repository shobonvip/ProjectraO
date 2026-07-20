import ProblemViewer from "@/components/ProblemViewer";

// 📝 こちらも async にして Promise で型定義
export default async function ContestProblemPage({
  params,
}: {
  params: Promise<{ contestId: string; problemId: string }>;
}) {
  // 📝 await してパラメータを取得
  const resolvedParams = await params;

  return (
    <ProblemViewer
      problemId={resolvedParams.problemId}
      contestId={resolvedParams.contestId}
      backLink={{ 
        href: `/contests/${resolvedParams.contestId}`, 
        text: "← コンテストへ戻る" 
      }}
    />
  );
}