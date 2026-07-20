"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

// --- 型定義 ---
interface Problem { id: string; label: string; points: number; }
interface ProblemDetail { status: string; waCount: number; acTime: string | null; }
interface StandingRow {
  rank: number;
  user: { id: string; name: string };
  totalScore: number;
  lastAcTime: string | null;
  details: Record<string, ProblemDetail>;
}

export default function StandingsPage() {
  const params = useParams();
  const contestId = params.contestId as string;
  
  const [data, setData] = useState<{ contest: any, problems: Problem[], standings: StandingRow[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const res = await fetch(`/api/contests/${contestId}/standings`);
        if (!res.ok) throw new Error("順位表の取得に失敗しました");
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    // 定期更新を入れたい場合は setInterval を使います
    fetchStandings();
  }, [contestId]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full" /></div>;
  if (error || !data) return <div className="min-h-screen flex items-center justify-center bg-slate-50 text-rose-600 font-bold">{error}</div>;

  // コンテスト開始時刻からの「経過時間」を MM:SS 形式で計算する関数
  const formatElapsedTime = (acTime: string | null) => {
    if (!acTime) return "-";
    const start = new Date(data.contest.startTime).getTime();
    const ac = new Date(acTime).getTime();
    const diffSeconds = Math.floor((ac - start) / 1000);
    if (diffSeconds < 0) return "-"; // コンテスト前のテスト提出など
    
    const min = Math.floor(diffSeconds / 60);
    const sec = diffSeconds % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex justify-between items-end">
          <div>
            <Link href={`/contests/${contestId}`} className="text-sm font-semibold text-slate-500 hover:text-indigo-600 mb-2 inline-block">
              ← コンテスト詳細へ戻る
            </Link>
            <h1 className="text-3xl font-bold text-slate-800">順位表</h1>
            <p className="text-slate-500 text-sm mt-1">{data.contest.title}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-600">
                  <th className="py-3 px-4 w-16">順位</th>
                  <th className="py-3 px-4 text-left w-48">ユーザー</th>
                  <th className="py-3 px-4 w-24">得点</th>
                  {data.problems.map(p => (
                    <th key={p.id} className="py-3 px-4 w-24 border-l border-slate-200">
                      <div className="text-indigo-600 text-base">{p.label}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">{p.points} pts</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {data.standings.length === 0 ? (
                  <tr>
                    <td colSpan={3 + data.problems.length} className="py-12 text-slate-400">提出がありません。</td>
                  </tr>
                ) : (
                  data.standings.map((row, i) => (
                    <tr key={row.user.id} className="hover:bg-slate-50 transition-colors">
                      {/* 順位 */}
                      <td className="py-3 px-4 font-mono font-bold text-slate-500">
                        {row.rank === 1 ? "🥇 1" : row.rank === 2 ? "🥈 2" : row.rank === 3 ? "🥉 3" : row.rank}
                      </td>
                      {/* ユーザー */}
                      <td className="py-3 px-4 text-left font-semibold text-slate-800">
                        {row.user.name}
                      </td>
                      {/* 合計得点と最終AC時間 */}
                      <td className="py-3 px-4 font-mono">
                        <div className="font-bold text-indigo-600">{row.totalScore}</div>
                        <div className="text-xs text-slate-400 mt-0.5">{formatElapsedTime(row.lastAcTime)}</div>
                      </td>
                      
                      {/* 各問題のステータス */}
                      {data.problems.map(p => {
                        const detail = row.details[p.id];
                        if (!detail) return <td key={p.id} className="border-l border-slate-100 bg-slate-50/50">-</td>;
                        
                        if (detail.status === "AC") {
                          return (
                            <td key={p.id} className="border-l border-slate-100 bg-emerald-50 relative">
                              <div className="font-bold text-emerald-700">{p.points}</div>
                              <div className="text-xs text-emerald-600/70 font-mono mt-0.5">{formatElapsedTime(detail.acTime)}</div>
                              {detail.waCount > 0 && (
                                <span className="absolute top-1 right-2 text-[10px] font-bold text-rose-500">
                                  {detail.waCount}
                                </span>
                              )}
                            </td>
                          );
                        } else {
                          // まだACしていないが、WAを出している状態
                          return (
                            <td key={p.id} className="border-l border-slate-100 bg-rose-50/30">
                              <div className="font-bold text-rose-500 text-lg">-</div>
                              {detail.waCount > 0 && (
                                <div className="text-[10px] font-bold text-rose-500 mt-0.5">({detail.waCount})</div>
                              )}
                            </td>
                          );
                        }
                      })}
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