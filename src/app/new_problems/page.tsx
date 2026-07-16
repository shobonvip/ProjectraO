"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

// 🚨 プレビュー用のインポートを追加
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default function NewProblemPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  // フォームの入力状態を管理
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [answer, setAnswer] = useState("");
  const [isPublished, setIsPublished] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ログインチェック
  if (status === "loading") return <div className="p-8">読み込み中...</div>;
  if (status === "unauthenticated") {
    return <div className="p-8 text-red-500 font-bold">問題を作成するにはログインが必要です。</div>;
  }

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: id === "" ? undefined : id, // 空欄ならPrismaにUUIDを任せる
          title,
          statement,
          answer,
          isPublished,
        }),
      });

      const data = await res.json(); // 👈 修正: レスポンスデータを取得しておく

      if (!res.ok) {
        throw new Error(data.error || "作成に失敗しました");
      }

      alert("問題を作成しました！");
      // 🚨 修正: IDを空欄にした場合でも、自動生成されたIDへ正しく飛べるように data.problem.id を使う！
      router.push(`/problems/${data.problem.id}`); 
      router.refresh();
      
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    // 🚨 プレビューを並べるために max-w-5xl に拡張
    <main className="min-h-screen bg-slate-50 py-12">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-6 text-slate-800">新規問題作成</h1>

      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-sm sm:text-base text-amber-800 font-medium">
          ⚠️ 問題を作成します。システム上、問題が消えたり admin に見られたり脆弱性により流出する場合があります。他コンテストサイトで出す予定の貴重な問題は投稿しないでください。
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-100 border border-red-200 text-red-700 p-4 rounded-xl mb-6 font-bold">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 問題ID (任意) */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            問題ID <span className="text-slate-400 font-normal">(空欄なら自動生成。以降変更不可)</span>
          </label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="例: sample-01"
            className="w-full border border-slate-300 rounded-lg p-3 text-slate-900 bg-white placeholder:text-slate-400 font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>

        {/* タイトル */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            タイトル <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border border-slate-300 rounded-lg p-3 text-slate-900 bg-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>

        {/* 📝 問題文 (2カラム・ライブプレビュー) */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            問題文 (Markdown & LaTeX対応) <span className="text-red-500">*</span>
          </label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* エディタ側 */}
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-500 mb-1">エディタ</span>
              <textarea
                value={statement}
                onChange={(e) => setStatement(e.target.value)}
                required
                rows={12}
                className="w-full flex-grow border border-slate-300 rounded-lg p-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm text-slate-900 bg-white placeholder:text-slate-300 transition-all"
                placeholder="### 問題概要&#13;&#10;ここにMarkdownで問題文を記述します。&#13;&#10;&#13;&#10;数式は $x = 1$ のように書けます。"
              />
            </div>

            {/* プレビュー側 */}
            <div className="flex flex-col h-full">
              <span className="text-xs font-bold text-indigo-500 mb-1">ライブプレビュー</span>
              <div className="w-full h-full min-h-[16.5rem] border border-indigo-100 bg-indigo-50/30 rounded-lg p-5 overflow-y-auto">
                <div className="prose prose-sm max-w-none text-slate-700">
                  {statement ? (
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {statement}
                    </ReactMarkdown>
                  ) : (
                    <span className="text-slate-400 italic">プレビューがここに表示されます...</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 解答 */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">
            解答 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            required
            placeholder="例: 12345"
            className="w-full border border-slate-300 rounded-lg p-3 text-slate-900 bg-white font-mono focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
          />
        </div>

        {/* 公開設定 */}
        <div className="flex items-center bg-slate-50 p-4 border border-slate-200 rounded-lg">
          <input
            type="checkbox"
            id="isPublished"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="mr-3 h-5 w-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
          />
          <label htmlFor="isPublished" className="text-sm font-bold text-slate-700 cursor-pointer select-none">
            この問題を公開する
          </label>
        </div>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 disabled:bg-slate-400 shadow-md transition-all text-lg mt-4"
        >
          {isSubmitting ? "作成中..." : "問題を作成する"}
        </button>
      </form>
    </div>
    </main>
  );
  
}