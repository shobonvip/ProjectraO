"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useSession } from "next-auth/react";

// 🌟 Markdown & LaTeX 用のインポート
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface ContestProblemItem {
  id: string;
  label: string;
  title: string;
  isPublished: boolean;
  acCount: number;
  hasAC: boolean;
  points: number;
}

interface ContestData {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  writerNames?: string[]; // 🌟 追加
  canEdit?: boolean;      // 🌟 追加
}

export default function ContestDetailPage() {
  const params = useParams();
  const contestId = params.contestId as string;
  
  const { data: session, status: sessionStatus } = useSession();
  const [contest, setContest] = useState<ContestData | null>(null);
  const [problems, setProblems] = useState<ContestProblemItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  useEffect(() => {
    const fetchContestData = async () => {
      try {
        // 🚨 修正: 404を防ぐため単数形の /api/contests/ に統一
        const response = await fetch(`/api/contests/${contestId}`);
        if (!response.ok) {
          if (response.status === 404) throw new Error("コンテストが見つかりません");
          throw new Error("データ取得に失敗しました");
        }
        const data = await response.json();
        setContest(data.contest);
        setProblems(data.problems);
      } catch (err: any) {
        console.error(err);
        setError(err.message || "サーバーとの通信に失敗しました。");
      } finally {
        setLoading(false);
      }
    };

    fetchContestData();
  }, [contestId, sessionStatus]);

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

  if (error || !contest) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white p-8 rounded-2xl border border-rose-100 shadow-sm text-center">
          <span className="text-4xl block mb-4">⚠️</span>
          <p className="text-rose-600 font-bold">{error}</p>
          <Link href="/contests" className="text-indigo-600 mt-4 inline-block hover:underline">← コンテスト一覧へ戻る</Link>
        </div>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("ja-JP", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit"
    });
  };

  const formatDuration = (startMs: number, endMs: number) => {
    const diff = endMs - startMs;
    if (diff <= 0) return "00:00:00";
    
    const d = Math.floor(diff / (1000 * 60 * 60 * 24));
    const h = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const m = Math.floor((diff / 1000 / 60) % 60);
    const s = Math.floor((diff / 1000) % 60);

    let res = "";
    if (d > 0) res += `${d}日 `;
    res += `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return res;
  };

  const startTime = new Date(contest.startTime);
  const endTime = new Date(contest.endTime);
  
  let statusBadge = null;
  let timerDisplay = null;

  if (currentTime < startTime) {
    statusBadge = <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">開始前</span>;
    timerDisplay = <span className="font-mono text-slate-600 bg-slate-100 px-3 py-1 rounded-md border border-slate-200 text-sm font-semibold tracking-wider">開始まで {formatDuration(currentTime.getTime(), startTime.getTime())}</span>;
  } else if (currentTime > endTime) {
    statusBadge = <span className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs font-bold border border-slate-200">終了</span>;
    timerDisplay = <span className="text-slate-500 text-sm font-bold bg-slate-100 px-3 py-1 rounded-md border border-slate-200">コンテスト終了</span>;
  } else {
    statusBadge = <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold border border-emerald-200 animate-pulse">開催中</span>;
    timerDisplay = <span className="font-mono text-emerald-700 bg-emerald-50 px-3 py-1 rounded-md border border-emerald-200 text-sm font-bold tracking-wider">残り {formatDuration(currentTime.getTime(), endTime.getTime())}</span>;
  }

  return (
    <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* 🌟 整理された戻るリンク */}
        <div>
          <Link href="/contests" className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors">
            ← コンテスト一覧へ戻る
          </Link>
        </div>

        {/* コンテストヘッダー部分 */}
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 mb-4">
            <div className="w-full">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2 w-full">
                <div className="flex items-center gap-3">
                  <h1 className="text-3xl font-bold text-slate-800">{contest.title}</h1>
                  {statusBadge}
                </div>
                <div>{timerDisplay}</div>
              </div>

              {/* 🌟 Writer情報と編集ボタン */}
              <div className="flex flex-wrap items-center gap-4 mt-3 mb-6">
                {contest.writerNames && contest.writerNames.length > 0 && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-100 text-[10px]">✍️</span>
                    <span className="font-medium">Writer:</span>
                    <span className="text-slate-500">{contest.writerNames.join(", ")}</span>
                  </div>
                )}
                
                {contest.canEdit && (
                  <Link
                    href={`/contests/${contestId}/manage`}
                    className="inline-flex items-center justify-center px-4 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-xs font-bold transition-colors shadow-sm"
                  >
                    ⚙️ コンテストを編集
                  </Link>
                )}
              </div>

              {/* 🌟 Markdown対応の概要(Description) */}
              <div className="prose prose-sm sm:prose-base max-w-none text-slate-700 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                {contest.description ? (
                  <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
                    {contest.description}
                  </ReactMarkdown>
                ) : (
                  <p className="text-slate-400 italic">概要はありません。</p>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-6 pt-6 border-t border-slate-100">
            <div className="flex items-center gap-2 text-sm text-slate-500 font-mono bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <span>🕒 {formatDate(contest.startTime)}</span>
              <span>〜</span>
              <span>{formatDate(contest.endTime)}</span>
            </div>
            
            <Link
              href={`/contests/${contestId}/standings`}
              className="inline-flex items-center justify-center px-6 py-2.5 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-700 transition-all shadow-sm hover:shadow-md"
            >
              🏆 順位表を見る
            </Link>
          </div>
        </div>

        {/* 問題一覧テーブル */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="py-4 pl-6 pr-4 w-16 text-center">状態</th>
                  <th className="py-4 px-4 w-20 text-center">問題</th>
                  <th className="py-4 px-4">問題名</th>
                  <th className="py-4 px-4 text-center w-24">配点</th>
                  <th className="py-4 px-6 text-right w-32">正解者数</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {problems.length === 0 ? (
                  <tr><td colSpan={5} className="py-12 text-center text-slate-500">{currentTime < startTime ? "コンテスト開始前のため、問題はまだ公開されていません。" : "問題がありません。"}</td></tr>
                ) : (
                  problems.map((problem) => (
                    <tr key={problem.id} className={`hover:bg-slate-50 transition-colors ${!problem.isPublished && currentTime > endTime ? "opacity-70 bg-slate-50/50" : ""}`}>
                      <td className="py-4 pl-6 pr-4 text-center">
                        {problem.hasAC ? (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 font-bold text-xs" title="Accepted">✓</span>
                        ) : (
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-4 px-4 font-mono font-bold text-center text-lg">
                        <Link href={`/contests/${contestId}/${encodeURIComponent(problem.id)}`} className="text-indigo-600 hover:text-indigo-800 hover:underline transition-all">
                          {problem.label}
                        </Link>
                      </td>
                      <td className="py-4 px-4 font-semibold">
                        <Link href={`/contests/${contestId}/${encodeURIComponent(problem.id)}`} className="text-slate-800 hover:text-indigo-700 hover:underline decoration-indigo-300 underline-offset-4 transition-all">
                          {problem.title}
                        </Link>
                        {!problem.isPublished && (
                          <span className="ml-3 text-xs font-bold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">コンテスト限定公開</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center font-mono font-semibold text-slate-600">
                        {problem.points ?? "-"}
                      </td>
                      <td className="py-4 px-6 text-right font-mono text-slate-600">
                        {problem.acCount}
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