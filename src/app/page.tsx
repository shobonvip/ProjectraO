"use client";

import React from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";

export default function TopPage() {
  const { data: session, status } = useSession(); //[cite: 6]

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8"> {/*[cite: 6] */}
      <div className="max-w-3xl w-full space-y-12 text-center"> {/*[cite: 6] */}
        
        {/* ヒーローセクション */}
        <div className="space-y-6"> {/*[cite: 6] */}
          <h1 className="text-5xl sm:text-6xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500 tracking-tight">
            ProjectraO
          </h1> {/*[cite: 6] */}
          <p className="text-lg sm:text-xl text-slate-600 font-medium">
            ぷろじぇくとっらお
          </p> {/*[cite: 6] */}
        </div>

        {/* アクションボタン */}
        <div className="flex flex-col items-center justify-center gap-4">
          {status === "loading" ? ( //[cite: 6]
            <div className="animate-pulse h-12 w-40 bg-slate-200 rounded-full"></div> //[cite: 6]
          ) : session ? ( //[cite: 6]
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
              {/* 🌟 ログイン時：メインをコンテストボタンにし、問題一覧はサブカラーに */}
              
              <Link
                href="/contests"
                className="px-8 py-4 bg-amber-600 text-white border border-amber-100 font-bold rounded-full shadow-sm hover:bg-amber-700 transition-all w-full sm:w-auto"
              >
                🏆 コンテスト一覧へ
              </Link>
              <Link
                href="/problems"
                className="px-8 py-4 bg-indigo-600 text-white border border-indigo-100 font-bold rounded-full shadow-sm hover:bg-indigo-700 transition-all w-full sm:w-auto"
              >
                📚 問題一覧へ進む
              </Link>
            </div>
          ) : ( //[cite: 6]
            <div className="flex flex-col items-center gap-4 w-full">
              {/* 🌟 非ログイン時：一番目立つのはログインボタン */}
              <button
                onClick={() => signIn("traq")}
                className="px-8 py-4 bg-indigo-600 text-white font-bold rounded-full shadow-lg shadow-indigo-200 hover:bg-indigo-700 hover:shadow-xl hover:-translate-y-0.5 transition-all w-full sm:w-auto"
              >
                traQでログインして始める
              </button> {/*[cite: 6] */}
              
              <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mt-2">
                <Link
                  href="/contests"
                  className="px-6 py-3 bg-white text-indigo-600 border border-indigo-100 font-bold rounded-full shadow-sm hover:bg-indigo-50 transition-all w-full sm:w-auto text-sm"
                >
                  コンテストを見る
                </Link>
                <Link
                  href="/problems"
                  className="px-6 py-3 bg-white text-indigo-600 border border-indigo-100 font-bold rounded-full shadow-sm hover:bg-indigo-50 transition-all w-full sm:w-auto text-sm"
                >
                  ゲストとして問題を見る
                </Link> {/*[cite: 6] */}
              </div>
            </div>
          )}
        </div>

        {/* 特徴セクション（装飾兼ナビゲーション） */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 pt-12 border-t border-slate-200"> {/*[cite: 6] */}
          {/* 🌟 リンク化してホバー時のアニメーションを追加 */}
          <Link href="/problems" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 hover:-translate-y-1 transition-all group block text-left">
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">🧮</div> {/*[cite: 6] */}
            <h3 className="font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">Math & Logic</h3> {/*[cite: 6] */}
            <p className="text-sm text-slate-500">通常の競プロの枠を超えた幅広い問題が出題</p> {/*[cite: 6] */}
          </Link>
          
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 text-left"> {/*[cite: 6] */}
            <div className="text-3xl mb-3">⚡</div> {/*[cite: 6] */}
            <h3 className="font-bold text-slate-800 mb-2">Instant Feedback</h3> {/*[cite: 6] */}
            <p className="text-sm text-slate-500">答えは単一。提出後すぐに正解判定される</p> {/*[cite: 6] */}
          </div>
          
          {/* 🌟 リンク化してホバー時のアニメーションを追加 */}
          <Link href="/contests" className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md hover:border-indigo-200 hover:-translate-y-1 transition-all group block text-left">
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform origin-left">🏆</div> {/*[cite: 6] */}
            <h3 className="font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">Contest</h3> {/*[cite: 6] */}
            <p className="text-sm text-slate-500">コンテストで他の人と競い合おう</p> {/*[cite: 6] */}
          </Link>
        </div>

      </div>
    </main>
  );
}