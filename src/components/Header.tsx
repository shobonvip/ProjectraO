// src/components/Header.tsx
"use client";

import React from "react";
import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export default function Header() {
  const { data: session, status: sessionStatus } = useSession();

  return (
    <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* ロゴ ＆ 簡単なナビゲーション */}
        <div className="flex items-center space-x-6">
          <Link 
            href="/" 
            className="text-xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-500 hover:opacity-80 transition-opacity"
          >
            ProjectraO
          </Link>
          <Link 
            href="/problems" 
            className="text-sm font-semibold text-slate-500 hover:text-indigo-600 transition-colors"
          >
            問題一覧
          </Link>
        </div>

        {/* ログインステータス表示 (元のコードをそのまま流用) */}
        <div className="flex items-center">
          {sessionStatus === "loading" ? (
            <div className="text-sm text-slate-400 font-medium animate-pulse">
              認証情報を確認中...
            </div>
          ) : session ? (
            <div className="flex items-center space-x-4 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
              <div className="text-sm">
                <span className="text-slate-500 mr-2">ログイン中:</span>
                <span className="font-bold text-slate-800">{session.user?.name}</span>
                <span className="text-xs text-slate-400 ml-1">(@{session.user?.id})</span>
              </div>
              <div className="w-px h-4 bg-slate-200"></div>
              <button
                onClick={() => signOut()}
                className="text-xs font-bold text-rose-500 hover:text-rose-600 transition-colors"
              >
                ログアウト
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-4 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
              <span className="text-sm font-medium text-slate-500">ゲストユーザー</span>
              <button
                onClick={() => signIn("traq")}
                className="text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-1.5 rounded-full transition-colors shadow-sm"
              >
                traQでログイン
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
}