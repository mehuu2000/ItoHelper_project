import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import prisma from "../../../lib/prisma"; // prismaクライアントのインポート

export default NextAuth({
    adapter: PrismaAdapter(prisma),
    providers: [
      CredentialsProvider({
        name: "Credentials",
        credentials: {
          name: { label: "Username", type: "text" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
            console.log("認証開始します");
            console.log(`username: ${credentials.username}`);
            console.log(`password: ${credentials.password}`);
          if(!credentials.username) {
            console.log("名前ないぞ");
            return null;
          }
          // ユーザー名に一致するユーザーをデータベースから取得
          const user = await prisma.user.findUnique({
            where: { name: credentials.username },
          });
  
          // ユーザーが存在する場合
          if (user) {
            if (user.hashPassword && credentials.password) {
              // パスワードが設定されている場合は、パスワードを検証
              const isValid = await bcrypt.compare(credentials.password, user.hashPassword);
              if (isValid) {
                return user;
              }
            } else if (!user.hashPassword) {
              // パスワードが設定されていない場合は、名前のみで認証
              return user;
            }
          };
          
          // それ以外の場合は認証失敗
          return null;
        },
      }),
    ],
    pages: {
        signIn: '/', 
        error: '/',    // ログインページを /login に設定（エラーページも含む）
    },
    session: {
      strategy: "jwt",
    },
    callbacks: {
      async jwt({ token, user }) {
        if (user) {
          token.id = user.id;
          token.name = user.name;
        }
        return token;
      },
      async session({ session, token }) {
        if (token) {
          session.user.id = token.id;
          session.user.name = token.name;
        }
        return session;
      },
    },
  });