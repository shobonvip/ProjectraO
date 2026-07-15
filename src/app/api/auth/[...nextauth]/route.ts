// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth"; // ← さっき作ったファイルをインポート！
// ※ "@/lib/auth" でエラーが出る場合は "../../../../../lib/auth" のように相対パスにしてください

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };