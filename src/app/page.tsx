"use client";

import React from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";

export default function TopPage() {
  const { data: session, status } = useSession();

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="max-w-3xl w-full space-y-12 text-center">
        
        {/* ヒーローセクション */}
        <div className="space-y-6">
          <h1 className="text-5xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500 tracking-tight">
            ProjectraO
          </h1>
          <p className="text-lg sm:text-xl text-slate-600 font-medium">
            ぷろじぇくとっらお
          </p>
        </div>

        {/* アクションボタン */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {status === "loading" ? (
            <div className="animate-pulse h-12 w-40 bg-slate-200 rounded-full"></div>
          ) : session ? (
            <Link
              href="/problems"
              className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-full shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5 transition-all w-full sm:w-auto"
            >
              問題一覧へ進む
            </Link>
          ) : (
            <>
              <button
                onClick={() => signIn("traq")}
                className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-full shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5 transition-all w-full sm:w-auto"
              >
                traQでログインして始める
              </button>
              <Link
                href="/problems"
                className="px-8 py-4 bg-white text-indigo-600 border border-indigo-100 font-bold rounded-full shadow-sm hover:bg-indigo-50 transition-all w-full sm:w-auto"
              >
                ゲストとして問題を見る
              </Link>
            </>
          )}
        </div>

        {/* 特徴セクション（装飾） */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 border-t border-slate-200">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="text-3xl mb-3">🧮</div>
            <h3 className="font-bold text-slate-800 mb-2">Math & Logic</h3>
            <p className="text-sm text-slate-500">競プロの枠を超えた幅広い問題が出題</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-bold text-slate-800 mb-2">Instant Feedback</h3>
            <p className="text-sm text-slate-500">答えは単一。提出後すぐに正解判定される</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="font-bold text-slate-800 mb-2">Contest</h3>
            <p className="text-sm text-slate-500">他の人と競い合おう</p>
          </div>
        </div>

      </div>
    </main>
  );
}