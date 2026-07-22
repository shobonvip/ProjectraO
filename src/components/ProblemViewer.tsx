"use client";

import React, { useState, useEffect, startTransition } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

// --- インターフェース定義は元のままでOKです ---
interface ForumPost { id: string; content: string; createdAt: string; user: { name: string; role: string }; }
interface ProblemData { id: string; title: string; statement: string; isPublished: boolean; acCount: number; hasAC: boolean; canEdit?: boolean; authorNames?: string[]; answer?: string; }
interface Solver { rank: number; userName: string; solvedAt: string; }

// 💡 共通コンポーネント用のPropsを定義
interface ProblemViewerProps {
  problemId: string;
  contestId?: string; // コンテスト経由の場合は指定する
  backLink?: { href: string; text: string }; // 戻るボタン用のリンク情報
}

export default function ProblemViewer({ problemId, contestId, backLink }: ProblemViewerProps) {
  const { data: session, status: sessionStatus } = useSession();

  const [problem, setProblem] = useState<ProblemData | null>(null);
  const [solvers, setSolvers] = useState<Solver[]>([]);
  const [activeTab, setActiveTab] = useState<"problem" | "solvers" | "forum">("problem"); 
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [solversLoading, setSolversLoading] = useState(false);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [status, setStatus] = useState<"IDLE" | "SUBMITTING" | "AC" | "WA" | "ERROR">("IDLE");
  const [errorMessage, setErrorMessage] = useState("");

  const [forumPosts, setForumPosts] = useState<ForumPost[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  // 1. 問題データの取得（コンテストIDがあればクエリパラメータで渡す）
  useEffect(() => {
    if (!problemId) return;
    const fetchProblem = async () => {
      try {
        // 🚨 contestId がある場合はAPIに伝えて、非公開問題でも表示許可をもらう
        const url = `/api/problems/${problemId}${contestId ? `?contestId=${contestId}` : ""}`;
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
          setFetchError(data.error || "問題の読み込みに失敗しました。");
          return;
        }
        setProblem(data);
      } catch (err) {
        console.error(err);
        setFetchError("サーバーとの通信に失敗しました。");
      } finally {
        setLoading(false);
      }
    };
    fetchProblem();
  }, [problemId, contestId]);

  // 2. 正解者一覧の取得（正解者タブが開かれたらフェッチする）
  useEffect(() => {
    if (activeTab !== "solvers" || !problemId) return;

    const fetchSolvers = async () => {
      setSolversLoading(true);
      try {
        const response = await fetch(`/api/problems/${problemId}/solvers`);
        if (response.ok) {
          const data = await response.json();
          setSolvers(data);
        }
      } catch (err) {
        console.error("Failed to fetch solvers:", err);
      } finally {
        setSolversLoading(false);
      }
    };

    fetchSolvers();
  }, [activeTab, problemId]);

  useEffect(() => {
    if (activeTab !== "forum" || !problemId) return;

    const fetchForumPosts = async () => {
      try {
        const response = await fetch(`/api/problems/${problemId}/forum`);
        if (response.ok) {
          const data = await response.json();
          setForumPosts(data);
        }
      } catch (err) {
        console.error("Failed to fetch forum posts:", err);
      }
    };
    fetchForumPosts();
  }, [activeTab, problemId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userAnswer.trim() || !problem) return;

    setStatus("SUBMITTING");
    setErrorMessage("");

    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId: problem.id,
          userAnswer: userAnswer,
        }),
      });

      const data = await response.json();

      if (response.status === 429) {
        setStatus("ERROR");
        setErrorMessage(data.error || "連投制限中です。");
        const seconds = parseInt(data.error.replace(/[^0-9]/g, ""), 10) || 5;
        return;
      }

      if (!response.ok) {
        setStatus("ERROR");
        setErrorMessage(data.error || "エラーが発生しました。");
        return;
      }

      setStatus(data.status === "AC" ? "AC" : "WA");
    } catch (error) {
      console.error(error);
      setStatus("ERROR");
      setErrorMessage("サーバーとの通信に失敗しました。");
    }
  };

  const handlePostForum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;
    setIsPosting(true);

    try {
      const response = await fetch(`/api/problems/${problemId}/forum`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newPostContent }),
      });
      if (response.ok) {
        const { post } = await response.json();
        setForumPosts([...forumPosts, post]); // 画面に即時反映
        setNewPostContent(""); // 入力欄をクリア
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsPosting(false);
    }
  };

  // 📝 編集モードを開始する
  const startEditing = (post: ForumPost) => {
    setEditingPostId(post.id);
    setEditContent(post.content);
  };

  // 📝 編集内容を保存する
  const handleUpdatePost = async (postId: string) => {
    if (!editContent.trim()) return;
    try {
      const response = await fetch(`/api/problems/${problemId}/forum/${postId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editContent }),
      });
      if (response.ok) {
        const { post } = await response.json();
        // 更新した投稿をリストに反映
        setForumPosts(forumPosts.map(p => p.id === postId ? post : p));
        setEditingPostId(null);
      } else {
        const data = await response.json();
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // 🗑️ 投稿を削除する
  const handleDeletePost = async (postId: string) => {
    if (!window.confirm("この投稿を削除しますか？\n※この操作は取り消せません。")) return;
    try {
      const response = await fetch(`/api/problems/${problemId}/forum/${postId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        // 削除した投稿をリストから除外
        setForumPosts(forumPosts.filter(p => p.id !== postId));
      } else {
        const data = await response.json();
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full mx-auto"></div>
          <p className="text-slate-500 font-medium">問題を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl border border-rose-100 shadow-sm text-center space-y-4">
          <span className="text-4xl">⚠️</span>
          <h2 className="text-xl font-bold text-slate-800">アクセスエラー</h2>
          <p className="text-slate-500 text-sm">{fetchError}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-8">

		{/* 戻るボタン */}
		{backLink && (
          <Link href={backLink.href} className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
            {backLink.text}
          </Link>
        )}

        {/* 問題詳細カード */}
        {problem && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 space-y-6">
            <div className="flex justify-between items-start border-b border-slate-100 pb-4">
              <div>
                <span
                className={`text-sm font-semibold px-3 py-1 rounded-full ${
                    problem.isPublished
                    ? "text-indigo-600 bg-indigo-50" // 公開時のスタイル（青）
                    : "text-rose-600 bg-rose-50 border border-rose-200" // 非公開時のスタイル（赤）
                }`}
                >
                {problem.isPublished ? "公開" : "非公開"}
                </span>
                <h1 className="text-2xl font-bold text-slate-800 mt-2">
                  {problem.title}
                </h1>
                {/* 作問者(Writer)リストの表示 */}
                {problem.authorNames && problem.authorNames.length > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-slate-600">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-[10px]">✍️</span>
                    <span className="font-medium">Writer:</span> 
                    <span className="text-slate-500">{problem.authorNames.join(", ")}</span>
                  </div>
                )}
              </div>
              
              <div className="text-right">
                <span className="text-sm font-medium text-slate-500 block">
                  正解者数: <strong className="text-slate-800">{problem.acCount}</strong> 名
                </span>
                {problem.hasAC && (
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md mt-1 inline-block">
                    ✓ 正解済み
                  </span>
                )}

                <span className="text-xs text-slate-400 font-mono block mt-1">ID: {problem.id}</span>
                
                {/* 追加: 編集ボタン（権限がある場合のみ表示） */}
                {problem.canEdit && (
                  <Link
                    href={`/problems/${encodeURIComponent(problem.id)}/manage`}
                    className="mt-2 inline-flex items-center justify-center px-4 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors shadow-sm"
                  >
                    編集する
                  </Link>
                )}
              </div>
            </div>



            {/* タブ切り替えボタン */}
            <div className="flex border-b border-slate-100 pt-2">
              <button
                onClick={() => startTransition(() => setActiveTab("problem"))}
                className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === "problem"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                問題文
              </button>
              <button
                onClick={() => startTransition(() => setActiveTab("solvers"))}
                className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                  activeTab === "solvers"
                    ? "border-indigo-600 text-indigo-600"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                正解者一覧 ({problem.acCount})
              </button>
              {/* AC済み、または編集権限がある場合のみフォーラムタブを表示！ */}
              {(problem.hasAC || problem.canEdit) && (
                <button
                  onClick={() => startTransition(() => setActiveTab("forum"))}
                  className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-all ${
                    activeTab === "forum"
                      ? "border-indigo-600 text-indigo-600"
                      : "border-transparent text-slate-400 hover:text-slate-600"
                  }`}
                >
                  🔒 フォーラム
                </button>
              )}
            </div>
           </div>

            
            
        )}

        
        {activeTab === "problem" && problem && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            {/* 問題文カード */}
              <div className="prose max-w-none text-slate-700 leading-relaxed">
                <ReactMarkdown
                  remarkPlugins={[remarkMath]}
                  rehypePlugins={[rehypeKatex]}
                >
                  {problem.statement}
                </ReactMarkdown>
              </div>

            </div>

            {/* 解答・正解表示セクション */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
              {problem.hasAC && (
                // 【正解済みの場合】解答フォームを隠し、生の答えを表示！
                <div className="space-y-4">
                  <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                    <span className="text-4xl">🎉</span>
                    <h3 className="text-lg font-bold text-emerald-800">AC</h3>
                    <p className="text-sm text-emerald-600">この問題は正解済みです！</p>
                  </div>
                  
{problem.answer && (
                    <div className="border border-slate-100 rounded-xl p-5 bg-slate-50 flex justify-between items-center transition-all">
                      <span className="text-sm font-semibold text-slate-500">
                        この問題の正解データ:
                      </span>
                      
                      {!isAnswerRevealed ? (
                        <button
                          onClick={() => setIsAnswerRevealed(true)}
                          type="button"
                          className="px-4 py-1.5 bg-slate-800 text-white text-sm font-bold rounded-lg hover:bg-slate-700 transition-colors shadow-sm flex items-center space-x-2"
                        >
                          <span>👀</span>
                          <span>ネタバレを表示する</span>
                        </button>
                      ) : (
                        <code className="text-lg font-mono font-bold text-indigo-600 bg-white px-4 py-1.5 rounded-lg border border-slate-200 animate-fade-in">
                          {problem.answer}
                        </code>
                      )}
                    </div>
                  )}
                </div>
              )}
                
				
				{/* 解答表示フォーム */}
				<form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="answer" className="block text-sm font-semibold text-slate-700 mb-2">
                      解答を入力
                    </label>
                    <input
                      id="answer"
                      type="text"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      disabled={status === "SUBMITTING"}
                      placeholder={!session ? "ログインすると提出できます": "例: 3579"}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all disabled:bg-slate-50 text-slate-900 bg-white placeholder:text-slate-400 font-medium disabled:text-slate-500"
                    />
                  </div>


                    {status === "AC" && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center space-x-3 text-emerald-800">
                        <span className="text-xl">🎉</span>
                        <span className="font-bold">AC (Accepted): 正解です！おめでとうございます！</span>
                    </div>
                    )}

                    {status === "WA" && (
                    <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center space-x-3 text-rose-800">
                        <span className="text-xl">❌</span>
                        <span className="font-bold">WA (Wrong Answer): 残念ながら不正解です。</span>
                    </div>
                    )}

                    {status === "ERROR" && (
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center space-x-3 text-amber-800">
                        <span className="text-xl">⚠️</span>
                        <span className="font-semibold">{errorMessage}</span>
                    </div>
                    )}

            <div className="flex items-center justify-between">

              <button
                type="submit"
                disabled={!session || status === "SUBMITTING" || !userAnswer.trim()}
                className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none transition-all"
              >
                {status === "SUBMITTING" ? "ジャッジ中..." : "提出する"}
              </button>
            </div>
          </form>
        </div>

      </div>
        )}

        {/* 正解者一覧コンテンツ */}
        {activeTab === "solvers" && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-800">正解者ランキング</h2>
              <p className="text-xs text-slate-400 mt-1">
                ※最速で正解した日時が記録されます。管理者および問題の権限者はランキングから除外されています。
              </p>
            </div>

            {solversLoading ? (
              <div className="py-12 text-center text-slate-400 font-medium">
                データを読み込み中...
              </div>
            ) : solvers.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-medium">
                まだこの問題を解いたユーザーはいません。最初の正解者になりましょう！
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="pb-3 pl-4 w-16">順位</th>
                      <th className="pb-3 pl-4">ユーザー名</th>
                      <th className="pb-3 pr-4 text-right">正解時刻</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-sm">
                    {solvers.map((solver) => (
                      <tr key={solver.rank} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 pl-4 font-mono font-semibold text-slate-500">
                          {solver.rank === 1 ? "🥇 1" : solver.rank === 2 ? "🥈 2" : solver.rank === 3 ? "🥉 3" : solver.rank}
                        </td>
                        <td className="py-3 pl-4 font-semibold text-slate-700">
                          {solver.userName}
                        </td>
                        <td className="py-3 pr-4 text-right text-slate-400 font-mono text-xs">
                          {new Date(solver.solvedAt).toLocaleString("ja-JP")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            
          </div>
        )}

        {/* フォーラムコンテンツ */}{/* フォーラムコンテンツ */}
        {activeTab === "forum" && (
          <div className="space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8">
              <h2 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                <span>💬</span> 正解者専用フォーラム
              </h2>
              
              {/* 投稿一覧 */}
              <div className="space-y-6 mb-8">
                {forumPosts.length === 0 ? (
                  <p className="text-slate-400 text-center py-8 text-sm">まだ投稿がありません。解法や感想を共有してみましょう！</p>
                ) : (
                  forumPosts.map(post => {
                    // 投稿者が自分か、または問題の管理権限（ADMIN/Writer）があるか
                    const isMyPost = session?.user?.name === post.user.name;
                    const canManage = isMyPost || problem?.canEdit;

                    return (
                      <div key={post.id} className="border border-slate-100 rounded-xl p-5 bg-slate-50/50 group">
                        <div className="flex items-center gap-2 mb-3 border-b border-slate-200/50 pb-2">
                          <span className="font-bold text-slate-700 text-sm">{post.user.name}</span>
                          {post.user.role === "ADMIN" && (
                            <span className="bg-indigo-100 text-indigo-700 text-[10px] font-bold px-1.5 py-0.5 rounded">ADMIN</span>
                          )}
                          <span className="text-xs text-slate-400 ml-auto">
                            {new Date(post.createdAt).toLocaleString("ja-JP")}
                          </span>
                          
                          {/* 編集・削除ボタン（権限がある場合のみ表示） */}
                          {canManage && editingPostId !== post.id && (
                            <div className="flex gap-2 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => startEditing(post)} className="text-xs text-indigo-600 hover:underline">編集</button>
                              <button onClick={() => handleDeletePost(post.id)} className="text-xs text-rose-600 hover:underline">削除</button>
                            </div>
                          )}
                        </div>
                        
                        {/* 📝 編集モード or 通常表示 */}
                        {editingPostId === post.id ? (
                          <div className="space-y-3">
                            <textarea
                              value={editContent}
                              onChange={(e) => setEditContent(e.target.value)}
                              rows={4}
                              className="w-full px-4 py-3 border border-indigo-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-sm text-slate-900 bg-white"
                            />
                            <div className="flex justify-end gap-2 mt-2">
                              <button onClick={() => setEditingPostId(null)} className="px-4 py-1.5 bg-slate-200 text-slate-700 text-sm font-bold rounded-lg hover:bg-slate-300">キャンセル</button>
                              <button onClick={() => handleUpdatePost(post.id)} className="px-4 py-1.5 bg-indigo-600 text-white text-sm font-bold rounded-lg hover:bg-indigo-700">保存</button>
                            </div>
                            
                            {/* 編集プレビュー */}
                            <div className="mt-4 pt-4 border-t border-slate-200">
                              <span className="text-xs font-bold text-slate-400 block mb-2">プレビュー</span>
                              <div className="prose prose-sm max-w-none text-slate-600 p-4 bg-white rounded-lg border border-slate-100">
                                <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{editContent}</ReactMarkdown>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="prose prose-sm max-w-none text-slate-600">
                            <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                              {post.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* 新規投稿フォーム (リアルタイムプレビュー付き) */}
              <form onSubmit={handlePostForum} className="mt-6 border-t border-slate-100 pt-6">
                <label className="block text-sm font-semibold text-slate-700 mb-4">
                  新しい投稿を書く (Markdown / LaTeX 対応)
                </label>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {/* エディタ側 */}
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-500 mb-1">エディタ</span>
                    <textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      rows={6}
                      className="w-full flex-grow px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-900 bg-white placeholder:text-slate-400 font-mono text-sm"
                      placeholder="解法のアプローチや感想を書いてみましょう！&#13;&#10;コードブロックや $O(N \log N)$ などの数式も使えます。"
                      required
                    />
                  </div>
                  
                  {/* プレビュー側 */}
                  <div className="flex flex-col h-full">
                    <span className="text-xs font-bold text-indigo-500 mb-1">ライブプレビュー</span>
                    <div className="flex-grow w-full border border-indigo-100 bg-indigo-50/30 rounded-xl p-4 overflow-y-auto">
                      <div className="prose prose-sm max-w-none text-slate-700">
                        {newPostContent ? (
                          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                            {newPostContent}
                          </ReactMarkdown>
                        ) : (
                          <span className="text-slate-400 italic">ここにプレビューが表示されます...</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <button
                    type="submit"
                    disabled={isPosting || !newPostContent.trim()}
                    className="px-8 py-3 bg-slate-800 text-white text-sm font-bold rounded-xl shadow-md hover:bg-slate-700 disabled:bg-slate-300 transition-all"
                  >
                    {isPosting ? "送信中..." : "投稿する"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}