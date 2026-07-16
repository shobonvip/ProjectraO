"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";

// 🚨 プレビュー用のインポートを追加
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

export default function EditProblemPage() {
  const router = useRouter();
  const params = useParams();
  const problemId = params.id as string;
  const { status } = useSession();

  // フォーム状態
  const [title, setTitle] = useState("");
  const [statement, setStatement] = useState("");
  const [answer, setAnswer] = useState("");
  const [isPublished, setIsPublished] = useState(false);

  // 画面の制御状態
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // エラー管理用の状態を拡張
  const [errorMsg, setErrorMsg] = useState("");
  const [hasPermission, setHasPermission] = useState(true); // 権限があるかどうかのフラグ

  // 🔄 初期データの取得
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const res = await fetch(`/api/problems/${problemId}/manage`);
        const data = await res.json();

        // 403 (Forbidden) が返ってきたら権限なしフラグを立てる
        if (res.status === 403) {
          setHasPermission(false);
          return;
        }

        if (!res.ok) throw new Error(data.error || "問題データの取得に失敗しました");
        
        // 安全にデータをセット
        if (data && data.problem) {
          setTitle(data.problem.title);
          setStatement(data.problem.statement);
          setAnswer(data.problem.answer);
          setIsPublished(data.problem.isPublished);
        } else {
          throw new Error("データが不正です");
        }
      } catch (error: any) {
        setErrorMsg(error.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchProblem();
    }
  }, [problemId, status]);

  // ローディング中・未ログイン時の表示
  if (status === "loading" || isLoading) return <div className="p-8">読み込み中...</div>;
  if (status === "unauthenticated") return <div className="p-8 text-red-500 font-bold">ログインが必要です。</div>;

  // ⛔ 権限がない場合の専用画面
  if (!hasPermission) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">アクセス拒否</h1>
        <p className="mb-6">あなたにはこの問題を編集・閲覧する権限がありません。</p>
        <button
          onClick={() => router.push("/problems")}
          className="bg-slate-800 text-white font-bold py-3 px-6 rounded-xl hover:bg-slate-700 transition-all shadow-md"
        >
          問題一覧へ戻る
        </button>
      </div>
    );
  }

  // 📝 更新処理 (PUT)
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/problems/${problemId}/manage`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, statement, answer, isPublished }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "更新に失敗しました");
      }

      alert("問題を更新しました！");
      router.push(`/problems/${problemId}`);
      router.refresh();
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 🗑️ 削除処理 (DELETE)
  const handleDelete = async () => {
    if (!window.confirm("本当にこの問題を削除しますか？\n※この操作は取り消せません！")) {
      return;
    }
    
    setIsDeleting(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/problems/${problemId}/manage`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "削除に失敗しました");
      }

      alert("問題を削除しました。");
      router.push(`/problems`);
      router.refresh();
    } catch (error: any) {
      setErrorMsg(error.message);
      setIsDeleting(false);
    }
  };

  return (
    // 🚨 プレビューを並べるために max-w-5xl に拡張
    <main className="min-h-screen bg-slate-50 py-12">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold mb-6 text-slate-800">問題の編集</h1>

      {errorMsg && (
        <div className="bg-red-100 border border-red-200 text-red-700 p-4 rounded-xl mb-6 font-bold">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-6">
        {/* 問題ID (変更不可) */}
        <div>
          <label className="block text-sm font-bold text-slate-700 mb-2">問題ID (変更不可)</label>
          <input
            type="text"
            value={problemId}
            disabled
            className="w-full border border-slate-300 rounded-lg p-3 bg-slate-100 text-slate-500 font-mono cursor-not-allowed"
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

        {/* ボタンエリア */}
        <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
          <button
            type="submit"
            disabled={isSubmitting || isDeleting}
            className="flex-1 bg-indigo-600 text-white font-bold py-4 rounded-xl hover:bg-indigo-700 disabled:bg-slate-400 shadow-md transition-all text-lg"
          >
            {isSubmitting ? "更新中..." : "変更を保存する"}
          </button>
          
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting || isDeleting}
            className="bg-red-600 text-white font-bold py-4 px-8 rounded-xl hover:bg-red-700 disabled:bg-slate-400 shadow-md transition-all text-lg"
          >
            {isDeleting ? "削除中..." : "削除"}
          </button>
        </div>
      </form>
    </div>
    </main>
  );
}