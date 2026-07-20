"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
// 🚨 修正: クライアントコンポーネントでは getServerSession は使えないため削除し、useSession に変更しました
import { useSession } from "next-auth/react";

interface ContestListItem {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  problemCount: number;
}

export default function ContestsListPage() {
  // 🌟 追加: ログイン状態を取得
  const { data: session } = useSession();

  const [contests, setContests] = useState<ContestListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    const fetchContests = async () => {
      try {
        const response = await fetch("/api/contests");
        if (!response.ok) throw new Error("コンテスト一覧の取得に失敗しました");
        const data = await response.json();
        setContests(data);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "サーバーとの通信に失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchContests();
  }, []);

  useEffect(() => {
    setCurrentTime(new Date());
    const timerId = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

  if (loading || !currentTime) {
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP", {
      timeZone: "Asia/Tokyo", // 🌟 追加: 念のためフロント側でも日本時間を強制
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  };

  const getDurationMinutes = (start: string, end: string) => {
    const diffMs = new Date(end).getTime() - new Date(start).getTime();
    return Math.floor(diffMs / (1000 * 60));
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* ヘッダー部分 */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-800">コンテスト</h1>
            <p className="text-sm text-slate-500 mt-1">
              開催予定・過去のコンテスト一覧
            </p>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
            >
              ← トップへ戻る
            </Link>

            {/* 🌟 追加: ログイン中のみ表示されるコンテスト新規作成ボタン */}
            {session && (
              <Link
                href="/new_contests"
                className="inline-flex items-center justify-center px-5 py-2.5 bg-indigo-600 text-white text-sm font-bold rounded-xl hover:bg-indigo-700 transition-all shadow-sm hover:shadow"
              >
                ＋ 新規コンテスト作成
              </Link>
            )}
          </div>
        </div>

        {/* コンテスト一覧テーブル */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 pl-6 pr-4 w-24 text-center">状態</th>
                  <th className="py-4 px-4 min-w-[200px]">コンテスト名</th>
                  <th className="py-4 px-4 w-48">開始日時</th>
                  <th className="py-4 px-4 w-24 text-center">時間</th>
                  <th className="py-4 px-6 w-24 text-center">問題数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {contests.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-slate-400">
                      コンテストがありません。
                    </td>
                  </tr>
                ) : (
                  contests.map((contest) => {
                    const startTime = new Date(contest.startTime);
                    const endTime = new Date(contest.endTime);
                    
                    let statusBadge;
                    let rowOpacity = "";
                    if (currentTime < startTime) {
                      statusBadge = <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 font-bold text-xs border border-slate-200">開始前</span>;
                    } else if (currentTime > endTime) {
                      statusBadge = <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-bold text-xs border border-slate-200">終了</span>;
                      rowOpacity = "opacity-70 bg-slate-50/30";
                    } else {
                      statusBadge = <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 animate-pulse shadow-sm">開催中</span>;
                    }

                    return (
                      <tr 
                        key={contest.id} 
                        className={`hover:bg-slate-50 transition-colors ${rowOpacity}`}
                      >
                        <td className="py-4 pl-6 pr-4 text-center whitespace-nowrap">
                          {statusBadge}
                        </td>
                        <td className="py-4 px-4 font-semibold">
                          <Link 
                            href={`/contests/${contest.id}`}
                            className="text-slate-800 hover:text-indigo-700 hover:underline decoration-indigo-300 underline-offset-4 transition-all"
                          >
                            {contest.title}
                          </Link>
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-600 whitespace-nowrap">
                          {formatDate(contest.startTime)}
                        </td>
                        <td className="py-4 px-4 text-center font-mono text-slate-500 whitespace-nowrap">
                          {getDurationMinutes(contest.startTime, contest.endTime)} 分
                        </td>
                        <td className="py-4 px-6 text-center font-mono text-slate-500">
                          {contest.problemCount}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </main>
  );
}