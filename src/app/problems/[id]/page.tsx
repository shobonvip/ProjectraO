import ProblemViewer from "@/components/ProblemViewer";

// 📝 async を追加し、paramsの型を Promise<{ id: string }> に変更
export default async function StandardProblemPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // 📝 params を await して中身を取り出す
  const resolvedParams = await params;

  return (
    <ProblemViewer
      problemId={resolvedParams.id}
      backLink={{ href: "/problems", text: "← 問題一覧へ戻る" }}
    />
  );
}