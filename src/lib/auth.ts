// src/lib/auth.ts
import { NextAuthOptions } from "next-auth";
import { PrismaClient } from "@prisma-client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// 先ほどまで route.ts に書いていた authOptions を丸ごとこちらに移動！
export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "traq",
      name: "traQ",
      type: "oauth",
      authorization: { url: "https://q.trap.jp/api/v3/oauth2/authorize", params: { scope: "openid profile" } },
      token: "https://q.trap.jp/api/v3/oauth2/token",
      userinfo: "https://q.trap.jp/api/v3/users/me",
      jwks_endpoint: "https://q.trap.jp/api/v3/jwks",
      clientId: process.env.TRAQ_CLIENT_ID,
      clientSecret: process.env.TRAQ_CLIENT_SECRET,
      issuer: "https://q.trap.jp",
      client: { id_token_signed_response_alg: "ES256" },
      profile(profile) {
        return {
          id: profile.name,
          name: profile.traq.display_name || profile.name,
        };
      },
    },
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.id || !user.name) return false;
      await prisma.user.upsert({
        where: { id: user.id },
        update: { name: user.name },
        create: { id: user.id, name: user.name, role: "USER" },
      });
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.name = token.name as string;
      }
      return session;
    },
  },
  session: { strategy: "jwt" },
};