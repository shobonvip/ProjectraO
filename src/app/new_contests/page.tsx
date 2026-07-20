"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface ProblemInput {
  problemId: string;
  label: string;
  points: number;
  order: number;
}

export default function NewContestPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // フォームの入力状態を管理
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [writerIds, setWriterIds] = useState(""); 
  
  const [problems, setProblems] = useState<ProblemInput[]>([
    { problemId: "", label: "A", points: 1, order: 1 }
  ]);

  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ログインチェック
  if (status === "loading") return <div className="p-8">読み込み中...</div>;
  if (status === "unauthenticated") {
    return <div className="p-8 text-red-500 font-bold">コンテストを作成するにはログインが必要です。</div>;
  }

  const handleAddProblem = () => {
    const nextOrder = problems.length + 1;
    const nextLabel = String.fromCharCode(64 + nextOrder); // A, B, C...
    setProblems([...problems, { problemId: "", label: nextLabel, points: 1, order: nextOrder }]);
  };

  const handleRemoveProblem = (index: number) => {
    setProblems(problems.filter((_, i) => i !== index));
  };

  const handleProblemChange = (index: number, field: keyof ProblemInput, value: any) => {
    const updated = [...problems];
    updated[index] = { ...updated[index], [field]: value };
    setProblems(updated);
  };

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    if (problems.some(p => !p.problemId.trim())) {
      setErrorMsg("問題IDが入力されていない項目があります。");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/contests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: id === "" ? undefined : id, // 空欄ならPrismaにUUIDを任せる
          title,
          description,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          writerIds,
          problems
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "作成に失敗しました");
      }

      alert("コンテストを作成しました！");
      router.push(`/contests/${data.contestId}`);
      router.refresh();
      
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-bold mb-6 text-slate-800">新規コンテスト作成</h1>

        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <p className="text-sm sm:text-base text-amber-800 font-medium">
            ⚠️ 自分が権限を持つ問題、または管理者の場合のみコンテストに問題を追加できます。
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-100 border border-red-200 text-red-700 p-4 rounded-xl mb-6 font-bold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* コンテストID (任意) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              コンテストID <span className="text-slate-400 font-normal">(空欄なら自動生成。以降変更不可)</span>
            </label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="例: pbc-001"
              className="w-full border border-slate-300 rounded-lg p-3 text-slate-900 bg-white placeholder:text-slate-400 font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          {/* タイトル */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              コンテスト名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg p-3 text-slate-900 bg-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
          </div>

          {/* 📝 説明文 (2カラム・ライブプレビュー) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              説明文 (Markdown & LaTeX対応)
            </label>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* エディタ側 */}
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-500 mb-1">エディタ</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={8}
                  className="w-full flex-grow border border-slate-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm text-slate-900 bg-white placeholder:text-slate-300 transition-all"
                  placeholder="### コンテストルール&#13;&#10;ここにMarkdownで説明文を記述します。"
                />
              </div>

              {/* プレビュー側 */}
              <div className="flex flex-col h-full">
                <span className="text-xs font-bold text-indigo-500 mb-1">ライブプレビュー</span>
                <div className="w-full h-full min-h-[12rem] border border-indigo-100 bg-indigo-50/30 rounded-lg p-5 overflow-y-auto">
                  <div className="prose prose-sm max-w-none text-slate-700">
                    {description ? (
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {description}
                      </ReactMarkdown>
                    ) : (
                      <span className="text-slate-400 italic">プレビューがここに表示されます...</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 開催期間 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 border border-slate-200 rounded-xl">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">開始日時 <span className="text-red-500">*</span></label>
              <input
                type="datetime-local"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">終了日時 <span className="text-red-500">*</span></label>
              <input
                type="datetime-local"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full border border-slate-300 rounded-lg p-3 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* 共同権限者 ID */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">
              共同権限者 ID (任意)
            </label>
            <input
              type="text"
              value={writerIds}
              onChange={(e) => setWriterIds(e.target.value)}
              placeholder="IDをカンマ区切りで入力 (例: user1, user2)"
              className="w-full border border-slate-300 rounded-lg p-3 text-slate-900 bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
            />
            <p className="text-xs text-slate-500 mt-2">※作成者自身は自動的に権限者として登録されます。</p>
          </div>

          {/* 問題リスト */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">問題の設定</h2>
            {problems.map((prob, index) => (
              <div key={index} className="flex flex-wrap items-end gap-3 p-4 bg-white border border-slate-200 rounded-xl">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-slate-500 mb-1">問題ID</label>
                  <input
                    type="text"
                    required
                    value={prob.problemId}
                    onChange={(e) => handleProblemChange(index, "problemId", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 font-mono bg-slate-50"
                  />
                </div>
                <div className="w-20">
                  <label className="block text-xs font-bold text-slate-500 mb-1">ラベル</label>
                  <input
                    type="text"
                    required
                    value={prob.label}
                    onChange={(e) => handleProblemChange(index, "label", e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-600 bg-slate-50"
                  />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-bold text-slate-500 mb-1">配点</label>
                  <input
                    type="number"
                    required
                    value={prob.points}
                    onChange={(e) => handleProblemChange(index, "points", parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50"
                  />
                </div>
                
                {problems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveProblem(index)}
                    className="px-3 py-2 bg-red-100 text-red-600 rounded-lg text-sm font-bold hover:bg-red-200 transition-colors h-[38px]"
                  >
                    削除
                  </button>
                )}
              </div>
            ))}

            <button
              type="button"
              onClick={handleAddProblem}
              className="w-full py-3 border-2 border-dashed border-indigo-200 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 hover:border-indigo-400 transition-all"
            >
              ＋ 問題を追加する
            </button>
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 disabled:bg-slate-400 shadow-md transition-all text-lg mt-8"
          >
            {isSubmitting ? "作成中..." : "コンテストを作成する"}
          </button>
        </form>
      </div>
    </main>
  );
}