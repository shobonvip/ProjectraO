"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";

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
  
  // 🚨 エラー管理用の状態を拡張
  const [errorMsg, setErrorMsg] = useState("");
  const [hasPermission, setHasPermission] = useState(true); // 権限があるかどうかのフラグ

  // 🔄 初期データの取得
  useEffect(() => {
    const fetchProblem = async () => {
      try {
        const res = await fetch(`/api/problems/${problemId}/manage`);
        const data = await res.json();

        // 🚨 403 (Forbidden) が返ってきたら権限なしフラグを立てる
        if (res.status === 403) {
          setHasPermission(false);
          return;
        }

        if (!res.ok) throw new Error(data.error || "問題データの取得に失敗しました");
        
        // 安全にデータをセット（data.problem が存在するか確認）
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
  if (status === "unauthenticated") return <div className="p-8 text-red-500">ログインが必要です。</div>;

  // ⛔ 権限がない場合の専用画面
  if (!hasPermission) {
    return (
      <div className="max-w-2xl mx-auto p-8 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-4">アクセス拒否</h1>
        <p className="mb-6">あなたにはこの問題を編集・閲覧する権限がありません。</p>
        <button
          onClick={() => router.push("/problem_manager")}
          className="bg-gray-600 text-white font-bold py-2 px-4 rounded hover:bg-gray-700"
        >
          問題管理一覧へ戻る
        </button>
      </div>
    );
  }

  // 📝 更新処理 (PUT)
  const handleUpdate = async (e: React.FormEvent) => {
    // ... （ここは前回のコードと全く同じです）...
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
    // ... （ここは前回のコードと全く同じです）...
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
    <div className="max-w-2xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">問題の編集</h1>

      {errorMsg && (
        <div className="bg-red-100 text-red-700 p-3 rounded mb-6">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleUpdate} className="space-y-6">
        {/* 問題ID (変更不可) */}
        <div>
          <label className="block text-sm font-medium mb-1">問題ID (変更不可)</label>
          <input
            type="text"
            value={problemId}
            disabled
            className="w-full border rounded p-2 bg-gray-100 text-gray-500 cursor-not-allowed"
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

        {/* ボタンエリア */}
        <div className="flex space-x-4 pt-4">
          <button
            type="submit"
            disabled={isSubmitting || isDeleting}
            className="flex-1 bg-blue-600 text-white font-bold py-3 rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isSubmitting ? "更新中..." : "変更を保存する"}
          </button>
          
          <button
            type="button"
            onClick={handleDelete}
            disabled={isSubmitting || isDeleting}
            className="bg-red-600 text-white font-bold py-3 px-6 rounded hover:bg-red-700 disabled:bg-gray-400"
          >
            {isDeleting ? "削除中..." : "削除"}
          </button>
        </div>
      </form>
    </div>
  );
}