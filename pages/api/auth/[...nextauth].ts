// pages/api/auth/[...nextauth].ts
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcrypt";
import prisma from '@/lib/prisma';

// Rate limiter
const LOGIN_ATTEMPTS = new Map();
const MAX_ATTEMPTS = 5;
const COOLDOWN_PERIOD = 15 * 60 * 1000; // 15 dakika

// Auth loglarını devre dışı bırakan fonksiyon
const isProduction = process.env.NODE_ENV === 'production';
const log = (message: string, data?: any) => {
  if (!isProduction) {
    console.log(message, data || '');
  }
};

const options: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  secret: process.env.NEXTAUTH_SECRET || "HfBXwVH0ZOxhbKUtlicZK9+7GYInVGE5SpK84a991tY=",
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 gün
  },
  jwt: {
    maxAge: 60 * 60 * 24 * 30, // 30 gün
  },
  debug: process.env.NODE_ENV === "development", // Sadece geliştirme ortamında debug aktif
  logger: {
    error(code, metadata) {
      console.error(`Auth Error [${code}]:`, metadata);
    },
    warn(code) {
      console.warn(`Auth Warning [${code}]`);
    },
    debug(message, ...args) {
      // Üretimde debug logları basılmaz
      if (process.env.NODE_ENV !== 'production') {
        console.debug("AUTH DEBUG:", message, ...args);
      }
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        log("Auth başlatılıyor, bilgiler:", 
          credentials ? { email: credentials.email, passwordLength: credentials.password?.length } : "Bilgiler yok");
          
        if (!credentials?.email || !credentials?.password) {
          log("Hata: Email veya şifre belirtilmedi");
          throw new Error("Email and password are required");
        }

        try {
          // Rate limiting uygula
          // req parametresi tanımsız olabilir
          let clientIp = 'unknown';
          
          if (req) {
            const xForwardedFor = req.headers?.['x-forwarded-for'];
            clientIp = Array.isArray(xForwardedFor) 
              ? xForwardedFor[0] 
              : typeof xForwardedFor === 'string' 
                ? xForwardedFor.split(',')[0].trim() 
                : 'unknown';
          }
          
          const key = `${clientIp}:${credentials.email}`;
          
          // Mevcut giriş denemelerini kontrol et
          const attempts = LOGIN_ATTEMPTS.get(key) || { count: 0, lastAttempt: 0 };
          const now = Date.now();
          
          // Soğuma süresi geçti mi kontrol et
          if (now - attempts.lastAttempt > COOLDOWN_PERIOD) {
            attempts.count = 0; // Soğuma süresi geçtiyse sayacı sıfırla
          }
          
          // Çok fazla başarısız deneme varsa engelleyelim
          if (attempts.count >= MAX_ATTEMPTS) {
            const remainingTime = Math.ceil((COOLDOWN_PERIOD - (now - attempts.lastAttempt)) / 60000);
            log(`Rate limiter aktif: ${key} için çok fazla başarısız giriş denemesi. Kalan süre: ${remainingTime} dakika`);
            throw new Error(`Too many login attempts, please try again in ${remainingTime} minutes`);
          }
          
          log("Kullanıcı aranıyor:", credentials.email);
          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });

          if (!user) {
            // Kullanıcı bulunamadı, başarısız girişi kaydet
            attempts.count += 1;
            attempts.lastAttempt = now;
            LOGIN_ATTEMPTS.set(key, attempts);
            
            log("Hata: Kullanıcı bulunamadı:", credentials.email);
            throw new Error("Invalid credentials");
          }

          log("Şifre karşılaştırılıyor...");
          const isValid = await bcrypt.compare(credentials.password, user.password);
          
          if (!isValid) {
            // Geçersiz şifre, başarısız girişi kaydet
            attempts.count += 1;
            attempts.lastAttempt = now;
            LOGIN_ATTEMPTS.set(key, attempts);
            
            log("Hata: Geçersiz şifre");
            throw new Error("Invalid credentials");
          }

          // Başarılı giriş, başarısız giriş sayısını sıfırla
          LOGIN_ATTEMPTS.delete(key);
          
          log("Giriş başarılı, kullanıcı bilgileri:", { 
            id: user.id, 
            email: user.email, 
            role: user.role 
          });
          
          // Sadece `User` tipine uygun alanları döndür
          return {
            id: user.id.toString(),
            email: user.email,
            role: user.role,
            firstName: user.firstName,
            lastName: user.lastName,
            emailVerified: user.emailVerified,
          } as any;
        } catch (error) {
          console.error("Auth sırasında hata:", error);
          throw error;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      log("JWT callback çalıştı", { tokenExists: !!token, userExists: !!user });
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.emailVerified = user.emailVerified;
      }
      return token;
    },
    async session({ session, token }) {
      log("Session callback çalıştı", { sessionExists: !!session, tokenExists: !!token });
      if (token) {
        session.user.id = token.id;
        session.user.email = token.email;
        session.user.role = token.role;
        session.user.name = `${token.firstName} ${token.lastName}`;
        session.user.firstName = token.firstName;
        session.user.lastName = token.lastName;
        session.user.emailVerified = token.emailVerified;
      }
      return session;
    },
  },
  pages: {
    signIn: "/giris-yap",
    error: "/error-login", // Hata durumunda yönlendirme
  },
};

export default NextAuth(options);
export { options }; // authOptions'ı dışa aktarın
