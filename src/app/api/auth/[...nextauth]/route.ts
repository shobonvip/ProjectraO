import NextAuth, { NextAuthOptions } from "next-auth";
import { PrismaClient } from "@prisma-client"; // パスエイリアスに合わせて適宜変更してください
import { Pool } from "pg";                       // ← 追加
import { PrismaPg } from "@prisma/adapter-pg";   // ← 追加

// Prisma 7 仕様の初期化
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

export const authOptions: NextAuthOptions = {
  // 1. カスタムプロバイダー（traQ）の定義
  providers: [
    {
      id: "traq",
      name: "traQ",
      type: "oauth",
      // traQ API v3 のエンドポイント
      authorization: {
        url: "https://q.trap.jp/api/v3/oauth2/authorize",
        params: { scope: "openid profile" },
      },
      token: "https://q.trap.jp/api/v3/oauth2/token",
      userinfo: "https://q.trap.jp/api/v3/users/me",
      jwks_endpoint: "https://q.trap.jp/api/v3/jwks",
	  clientId: process.env.TRAQ_CLIENT_ID,
      clientSecret: process.env.TRAQ_CLIENT_SECRET,
      issuer: "https://q.trap.jp",

	  client: {
        id_token_signed_response_alg: "ES256",
      },

      // プロフィール取得後のマッピング
      profile(profile) {
        return {
          id: profile.name,
          name: profile.traq.display_name || profile.name,
        };
      },
    },
  ],

  // 2. データベース保存とセッションのフックロジック
  callbacks: {
    // ログイン（OAuth連携）が成功した瞬間に走る処理
    async signIn({ user }) {
      if (!user.id || !user.name) return false;

      // データベースにユーザーが存在しなければ作成し、存在すれば更新（Upsert）する
      await prisma.user.upsert({
        where: { name: user.name },
        update: { id: user.id }, // UUIDが万が一変わった場合の更新
        create: {
          id: user.id,
          name: user.name,
          role: "USER", // デフォルトは一般ユーザー
        },
      });

      return true;
    },

    // サーバー側のセッショントークンにユーザーIDを焼き付ける
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },

    // フロントエンドに返すセッション情報にユーザーIDを含める
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  
  session: {
    strategy: "jwt",
  },
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };