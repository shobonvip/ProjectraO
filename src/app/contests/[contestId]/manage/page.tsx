"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface ProblemInput {
  problemId: string;
  label: string;
  points: number;
  order: number;
}

export default function EditContestPage() {
  const router = useRouter();
  const params = useParams();
  const contestId = params.contestId as string;
  const { data: session, status } = useSession();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [writerIds, setWriterIds] = useState(""); 
  
  const [problems, setProblems] = useState<ProblemInput[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 📝 DBのUTC日付を、input type="datetime-local" 用の文字列(YYYY-MM-DDTHH:mm)に変換する関数
  const formatForInput = (dateString: string) => {
    const d = new Date(dateString);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  // 1. 初期データの読み込み
  useEffect(() => {
    if (!contestId) return;

    const fetchContest = async () => {
      try {
        const res = await fetch(`/api/contests/${contestId}`);
        if (!res.ok) throw new Error("コンテストの読み込みに失敗しました");
        const data = await res.json();

        setTitle(data.contest.title);
        setDescription(data.contest.description || "");
        setStartTime(formatForInput(data.contest.startTime));
        setEndTime(formatForInput(data.contest.endTime));
        
        // Writer名（自分以外もカンマ区切りで表示）
        if (data.contest.writerIds) {
          setWriterIds(data.contest.writerIds.join(", "));
        }

        // 問題リストの復元
        if (data.problems && data.problems.length > 0) {
          setProblems(data.problems.map((p: any) => ({
            problemId: p.id,
            label: p.label,
            points: p.points,
            order: p.order || 1
          })));
        } else {
          setProblems([{ problemId: "", label: "A", points: 1, order: 1 }]);
        }

      } catch (err: any) {
        setErrorMsg(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchContest();
  }, [contestId]);

  if (status === "loading" || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin h-8 w-8 border-4 border-indigo-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <div className="p-8 text-rose-500 font-bold text-center">アクセス権限がありません。</div>;
  }

  const handleAddProblem = () => {
    const nextOrder = problems.length + 1;
    const nextLabel = String.fromCharCode(64 + nextOrder);
    setProblems([...problems, { problemId: "", label: nextLabel, points: 1, order: nextOrder }]);
  };

  const handleRemoveProblem = (index: number) => {
    setProblems(problems.filter((_, i) => i !== index));
  };

  const handleProblemChange = (index: number, field: keyof ProblemInput, value: any) => {
    const updated = [...problems];
    updated[index] = { ...updated[index], [field]: value };
    setProblems(updated);
  };

  // 2. 更新リクエスト
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    if (problems.some(p => !p.problemId.trim())) {
      setErrorMsg("問題IDが入力されていない項目があります。");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/contests/${contestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description,
          startTime: new Date(startTime).toISOString(),
          endTime: new Date(endTime).toISOString(),
          writerIds,
          problems
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "更新に失敗しました");

      alert("コンテスト情報を更新しました！");
      router.push(`/contests/${contestId}`);
      router.refresh();
      
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };


  // 3. コンテスト削除リクエスト (🌟新規追加)
  const handleDelete = async () => {
    // 誤操作防止の確認ダイアログ
    if (!window.confirm("本当にこのコンテストを削除しますか？\n※この操作は取り消せません。")) {
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/contests/${contestId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "削除に失敗しました");

      alert("コンテストを削除しました。");
      router.push("/contests"); // 削除後はコンテスト一覧へリダイレクト
      router.refresh();
      
    } catch (error: any) {
      setErrorMsg(error.message);
      setIsSubmitting(false);
    }
  };
  
  return (
    <main className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-slate-800">コンテスト編集</h1>
          <Link href={`/contests/${contestId}`} className="text-sm font-bold text-indigo-600 hover:underline">
            ← コンテスト詳細へ戻る
          </Link>
        </div>

        {errorMsg && (
          <div className="bg-rose-100 border border-rose-200 text-rose-700 p-4 rounded-xl mb-6 font-bold">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* コンテストID (読取専用) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">コンテストID</label>
            <input
              type="text"
              value={contestId}
              disabled
              className="w-full border border-slate-200 rounded-lg p-3 text-slate-500 bg-slate-100 font-mono cursor-not-allowed"
            />
          </div>

          {/* タイトル */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">コンテスト名 <span className="text-rose-500">*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full border border-slate-300 rounded-lg p-3 text-slate-900 bg-white font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          {/* 📝 説明文 (2カラム・ライブプレビュー) */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">説明文 (Markdown & LaTeX対応)</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-500 mb-1">エディタ</span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={8}
                  className="w-full flex-grow border border-slate-300 rounded-lg p-4 focus:ring-2 focus:ring-indigo-500 font-mono text-sm"
                />
              </div>
              <div className="flex flex-col h-full">
                <span className="text-xs font-bold text-indigo-500 mb-1">ライブプレビュー</span>
                <div className="w-full h-full min-h-[12rem] border border-indigo-100 bg-indigo-50/30 rounded-lg p-5 overflow-y-auto">
                  <div className="prose prose-sm max-w-none text-slate-700">
                    <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>{description}</ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 開催期間 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 border border-slate-200 rounded-xl">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">開始日時 <span className="text-rose-500">*</span></label>
              <input type="datetime-local" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">終了日時 <span className="text-rose-500">*</span></label>
              <input type="datetime-local" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500" />
            </div>
          </div>

          {/* 共同権限者 */}
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">共同権限者</label>
            <input
              type="text"
              value={writerIds}
              onChange={(e) => setWriterIds(e.target.value)}
              placeholder="カンマ区切りで入力 (例: user1, user2)"
              className="w-full border border-slate-300 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* 問題リスト */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h2 className="text-xl font-bold text-slate-800">問題の設定</h2>
            {problems.map((prob, index) => (
              <div key={index} className="flex flex-wrap items-end gap-3 p-4 bg-white border border-slate-200 rounded-xl">
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold text-slate-500 mb-1">問題ID</label>
                  <input type="text" required value={prob.problemId} onChange={(e) => handleProblemChange(index, "problemId", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="w-20">
                  <label className="block text-xs font-bold text-slate-500 mb-1">ラベル</label>
                  <input type="text" required value={prob.label} onChange={(e) => handleProblemChange(index, "label", e.target.value)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-center font-bold text-indigo-600 focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="w-24">
                  <label className="block text-xs font-bold text-slate-500 mb-1">配点</label>
                  <input type="number" required value={prob.points} onChange={(e) => handleProblemChange(index, "points", parseInt(e.target.value) || 0)} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                </div>
                {problems.length > 1 && (
                  <button type="button" onClick={() => handleRemoveProblem(index)} className="px-3 py-2 bg-rose-100 text-rose-600 rounded-lg text-sm font-bold hover:bg-rose-200 h-[38px]">削除</button>
                )}
              </div>
            ))}
            <button type="button" onClick={handleAddProblem} className="w-full py-3 border-2 border-dashed border-indigo-200 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50">
              ＋ 問題を追加する
            </button>
          </div>
		  
		  {/* 送信ボタン */}
          <div className="pt-8 flex flex-col sm:flex-row gap-4 border-t border-slate-200 mt-8">
            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="flex-1 bg-slate-800 text-white font-bold py-4 rounded-xl hover:bg-slate-700 disabled:bg-slate-400 transition-all shadow-sm"
            >
              {isSubmitting ? "処理中..." : "変更を保存する"}
            </button>
            
            {/* 🌟 削除ボタンを追加 */}
            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleDelete}
              className="px-8 py-4 bg-rose-50 text-rose-600 font-bold rounded-xl border border-rose-200 hover:bg-rose-100 disabled:opacity-50 transition-all"
            >
              コンテストを削除
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}