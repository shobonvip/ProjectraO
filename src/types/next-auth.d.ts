import NextAuth, { DefaultSession } from "next-auth";
import { JWT } from "next-auth/jwt";

// NextAuth の型定義を拡張（上書き）する
declare module "next-auth" {
  interface Session {
    user: {
      // session.user.id が string 型として存在することを保証する
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    // token.id も string 型として扱えるように拡張する
    id?: string;
  }
}