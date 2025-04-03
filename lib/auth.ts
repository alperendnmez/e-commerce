import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcrypt";
import prisma from '@/lib/prisma';

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET || "HfBXwVH0ZOxhbKUtlicZK9+7GYInVGE5SpK84a991tY=",
  session: {
    strategy: "jwt",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: {
            email: credentials.email,
          },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.password
        );

        if (!isValid) {
          return null;
        }

        return {
          id: user.id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        // Kullanıcının role bilgisini token'a ekleme
        token.role = user.role;
        token.id = user.id;
      }
      console.log("JWT callback çalıştı", { tokenExists: !!token, userExists: !!user });
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        // Token'dan role bilgisini session'a ekleme
        session.user.role = token.role;
        session.user.id = token.id;
      }
      console.log("Session callback çalıştı", { sessionExists: !!session, tokenExists: !!token });
      return session;
    },
  },
  pages: {
    signIn: "/auth/signin",
  },
};

export default authOptions; 