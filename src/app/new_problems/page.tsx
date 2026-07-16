"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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
    return <div className="p-8 text-red-500">問題を作成するにはログインが必要です。</div>;
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

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "作成に失敗しました");
      }

      alert("問題を作成しました！");
      router.push(`/problems/${id}`); // 作成後は問題一覧などへ遷移
      router.refresh();
      
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">新規問題作成</h1>


      <div>
        <p className="text-lg sm:text-xl text-slate-600 font-small">
          問題を作成します。問題が消えたり admin に見られたり脆弱に流出する場合があります。他コンテストサイトで出すなど貴重な問題は投稿しないでください。
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-6">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 問題ID (任意) */}
        <div>
          <label className="block text-sm font-medium mb-1">問題ID (空欄なら自動生成) 以降変更できません</label>
          <input
            type="text"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="例: sample-01"
            className="w-full border rounded p-2"
          />
        </div>

        {/* タイトル */}
        <div>
          <label className="block text-sm font-medium mb-1">タイトル <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full border rounded p-2"
          />
        </div>

        {/* 問題文 */}
        <div>
          <label className="block text-sm font-medium mb-1">問題文 <span className="text-red-500">*</span></label>
          <textarea
            value={statement}
            onChange={(e) => setStatement(e.target.value)}
            required
            rows={6}
            className="w-full border rounded p-2"
          />
        </div>

        {/* 解答 */}
        <div>
          <label className="block text-sm font-medium mb-1">解答 <span className="text-red-500">*</span></label>
          <input
            type="text"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            required
            className="w-full border rounded p-2"
          />
        </div>

        {/* 公開設定 */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isPublished"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="mr-2 h-4 w-4"
          />
          <label htmlFor="isPublished" className="text-sm font-medium">
            この問題を公開する
          </label>
        </div>

        {/* 送信ボタン */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 disabled:bg-gray-400"
        >
          {isSubmitting ? "作成中..." : "問題を作成する"}
        </button>
      </form>
    </div>
  );
}