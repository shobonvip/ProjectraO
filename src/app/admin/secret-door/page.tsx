"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";

export default function SecretDoorPage() {
  const { status } = useSession();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (status === "loading") return <div className="p-8 text-center text-slate-400">Loading...</div>;
  if (status === "unauthenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-300">
        このページにアクセスするにはログインが必要です。
      </div>
    );
  }

  // 権限を変更する統合関数
  const handleChangeRole = async (targetRole: "ADMIN" | "USER") => {
    if (!password) {
      setMessage("エラー: 合言葉を入力してください。");
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          secretToken: password,
          targetRole: targetRole 
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage(`${data.message} 設定を反映するため、自動的にログアウトします...`);
        // セッションを更新するため強制ログアウト
        setTimeout(() => {
          signOut({ callbackUrl: "/" });
        }, 2000);
      } else {
        setMessage(`エラー: ${data.error}`);
        setIsSubmitting(false);
      }
    } catch (error) {
      setMessage("通信エラーが発生しました。");
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="max-w-md w-full bg-slate-800 p-8 rounded-3xl border border-slate-700 shadow-2xl space-y-8">
        
        <div className="text-center space-y-3">
          <span className="text-5xl drop-shadow-md">🚪</span>
          <h1 className="text-2xl font-black text-slate-100 tracking-wider">管理者の隠れ家</h1>
          <p className="text-slate-400 text-sm font-medium">合言葉を入力して、権限を選択してください。</p>
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-sm font-bold animate-fade-in ${
            message.includes("設定しました") 
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          }`}>
            {message}
          </div>
        )}

        <div className="space-y-6">
          {/* パスワード入力欄 */}
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="SECRET_TOKEN"
              disabled={isSubmitting || message.includes("設定しました")}
              className="w-full px-5 py-4 bg-slate-900 border-2 border-slate-700 text-slate-100 rounded-xl focus:outline-none focus:border-indigo-500 transition-all font-mono placeholder:text-slate-600"
            />
          </div>
          
          {/* 権限切り替えボタンエリア */}
          <div className="grid grid-cols-2 gap-4">
            <button
              onClick={() => handleChangeRole("ADMIN")}
              disabled={!password || isSubmitting || message.includes("設定しました")}
              className="flex flex-col items-center justify-center py-4 bg-indigo-600/20 border border-indigo-500/50 text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white disabled:opacity-50 disabled:hover:bg-indigo-600/20 transition-all group"
            >
              <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">👑</span>
              <span className="font-bold text-sm">ADMINになる</span>
            </button>

            <button
              onClick={() => handleChangeRole("USER")}
              disabled={!password || isSubmitting || message.includes("設定しました")}
              className="flex flex-col items-center justify-center py-4 bg-slate-700/50 border border-slate-600 text-slate-400 rounded-xl hover:bg-slate-600 hover:text-white disabled:opacity-50 disabled:hover:bg-slate-700/50 transition-all group"
            >
              <span className="text-2xl mb-1 group-hover:scale-110 transition-transform">👤</span>
              <span className="font-bold text-sm">USERに戻る</span>
              <span className="text-[10px] opacity-80">(テスト用)</span>
            </button>
          </div>
        </div>

      </div>
    </main>
  );
}