"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";

interface ProblemListItem {
  id: string;
  title: string;
  isPublished: boolean;
  acCount: number;
  hasAC: boolean;
  canEdit?: boolean;
  authorName?: string;
}

export default function ProblemsListPage() {
  const { data: session, status: sessionStatus } = useSession();
  const [problems, setProblems] = useState<ProblemListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchProblems = async () => {
      try {
        const response = await fetch("/api/problems");
        if (!response.ok) throw new Error("問題一覧の取得に失敗しました");
        const data = await response.json();
        setProblems(data);
      } catch (err) {
        console.error(err);
        setError("サーバーとの通信に失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchProblems();
  }, [sessionStatus]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-2xl border border-rose-100 shadow-sm text-center">
          <span className="text-4xl block mb-4">⚠️</span>
          <p className="text-rose-600 font-bold">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* ヘッダー部分 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">問題一覧</h1>
            <p className="text-sm text-slate-500 mt-1">
              全 {problems.length} 問中、 {problems.filter(p => p.hasAC).length} 問正解
            </p>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              ← トップへ戻る
            </Link>

            {/* 📝 追加: ログイン中のみ表示される新規作成ボタン */}
            {session && (
              <Link
                href="/new_problems/"
                className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm hover:shadow"
              >
                ＋ 新規問題作成
              </Link>
            )}
          </div>
        </div>

        {/* 問題一覧テーブル */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 pl-6 pr-4 w-16 text-center">状態</th>
                  <th className="py-4 px-4 w-24">ID</th>
                  <th className="py-4 px-4 w-32">作問者</th> {/* 👈 ヘッダーを追加 */}
                  <th className="py-4 px-4">問題名</th>
                  <th className="py-4 px-6 text-right w-32">正解者数</th>
                  <th className="py-4 px-6 text-center w-24">操作</th> {/* 👈 追加 */}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {problems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      公開されている問題がありません。
                    </td>
                  </tr>
                ) : (
                  problems.map((problem) => (
                    <tr 
                      key={problem.id} 
                      className={`hover:bg-slate-50 transition-colors ${!problem.isPublished ? "opacity-60 bg-slate-50/50" : ""}`}
                    >
                      {/* ACステータス */}
                      <td className="py-4 pl-6 pr-4 text-center">
                        {problem.hasAC ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 font-bold text-xs" title="Accepted">
                            ✓
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400 text-xs">
                            -
                          </span>
                        )}
                      </td>
                      


                      {/* ID */}
                      <td className="py-4 px-4 font-mono font-medium text-slate-500">
                        {problem.id}
                      </td>

                      {/* 作問者 (Writer) の表示 */}
                      <td className="py-4 px-4 text-slate-600 font-medium">
                        {problem.authorName ? (
                          <span className="flex items-center gap-1.5">
                            {problem.authorName}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      {/* 問題名 */}
                      <td className="py-4 px-4 font-semibold">
                        <Link 
                          href={`/problems/${problem.id}`}
                          className="text-indigo-600 hover:text-indigo-800 hover:underline decoration-indigo-300 underline-offset-4 transition-all"
                        >
                          {problem.title}
                        </Link>
                        {!problem.isPublished && (
                          <span className="ml-3 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                            非公開
                          </span>
                        )}
                      </td>
                      
                      {/* 正解者数 */}
                      <td className="py-4 px-6 text-right font-mono text-slate-600">
                        {problem.acCount}
                      </td>

                      {/* 操作 (編集ボタン) */}
                      <td className="py-4 px-6 text-center">
                        {problem.canEdit && (
                          <Link
                            href={`/problems/${problem.id}/manage`}
                            className="inline-flex items-center justify-center px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-md text-xs font-bold transition-colors shadow-sm"
                          >
                            編集
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}