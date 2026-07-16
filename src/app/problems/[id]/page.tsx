"use client";

import React, { useState, useEffect, startTransition } from "react";
import { useParams } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link"; // 👈 編集ページへの遷移のために追加

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css'; // 🚨 超重要: KaTeXのCSSをインポートしないと崩れます！

interface ProblemData {
  id: string;
  title: string;
  statement: string;
  isPublished: boolean;
  acCount: number;
  hasAC: boolean;
  canEdit?: boolean;       // 追加
  authorNames?: string[];  // 追加
  answer?: string; // ACまたは管理者のみ取得可能
}

interface Solver {
  rank: number;
  userName: string;
  solvedAt: string;
}

export default function ProblemPage() {
  const params = useParams();
  const problemId = params?.id as string;

  const { data: session, status: sessionStatus } = useSession();

  // 取得した問題データを管理するステート
  const [problem, setProblem] = useState<ProblemData | null>(null);
  const [solvers, setSolvers] = useState<Solver[]>([]);
  const [activeTab, setActiveTab] = useState<"problem" | "solvers">("problem"); 
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [solversLoading, setSolversLoading] = useState(false);
  const [isAnswerRevealed, setIsAnswerRevealed] = useState(false);
  const [userAnswer, setUserAnswer] = useState("");
  const [status, setStatus] = useState<"IDLE" | "SUBMITTING" | "AC" | "WA" | "ERROR">("IDLE");
  const [errorMessage, setErrorMessage] = useState("");

  // 1. ページロード時にAPIから問題をセキュアに取得
  useEffect(() => {
    if (!problemId) return;

    const fetchProblem = async () => {
      try {
        const response = await fetch(`/api/problems/${problemId}`);
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
  }, [problemId]);

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
                    href={`/problems/${problem.id}/manage`}
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
                      あなたの解答を入力してください
                    </label>
                    <input
                      id="answer"
                      type="text"
                      value={userAnswer}
                      onChange={(e) => setUserAnswer(e.target.value)}
                      disabled={status === "SUBMITTING"}
                      placeholder={!session ? "ログインすると提出できます": "例: 3579"}
                      className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all disabled:bg-slate-50"
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

      </div>
    </main>
  );
}