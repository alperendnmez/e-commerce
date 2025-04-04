// pages/api/auth/[...nextauth].ts
import NextAuth, { NextAuthOptions, Session } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@next-auth/prisma-adapter";
import bcrypt from "bcrypt";
import prisma from '@/lib/prisma';
import { getToken } from "next-auth/jwt";
import { sendWelcomeEmail } from '@/lib/mail';
import { PrismaClient } from "@prisma/client";

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

// Session tipini genişlet
interface CustomSession extends Session {
  redirectUrl?: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    emailVerified: Date | null;
    image?: string | null;
  }
}

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
    GoogleProvider({
      clientId: process.env.CLIENT_ID as string,
      clientSecret: process.env.CLIENT_SECRET as string,
      allowDangerousEmailAccountLinking: true,
    }),
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
    async jwt({ token, user, account, profile }) {
      log("JWT callback çalıştı", { tokenExists: !!token, userExists: !!user, accountExists: !!account });
      
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role;
        token.firstName = user.firstName;
        token.lastName = user.lastName;
        token.emailVerified = user.emailVerified;
        
        // İlk giriş sırasında, yönlendirme URL'i belirle
        if (account) {
          token.isNewSession = true;
          token.redirectUrl = user.role === 'ADMIN' ? '/dashboard' : '/';
        }
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
        
        // Yönlendirme URL'ini session'a ekleyelim
        (session as CustomSession).redirectUrl = token.redirectUrl;
      }
      return session;
    },
    async redirect({ url, baseUrl }) {
      // URL dahili bir sayfa ise (örn. /dashboard) doğrudan o sayfaya yönlendir
      if (url.startsWith(baseUrl)) {
        return url;
      }
      
      // Harici URL'lere izin verme, varsayılan olarak ana sayfaya yönlendir
      return baseUrl;
    },
    async signIn({ user, account, profile }) {
      // Google ile giriş yapılmışsa veya kullanıcı varsa
      if (account?.provider === 'google') {
        // Kullanıcı bilgilerini güncelleme veya oluşturma
        try {
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email as string },
          });

          if (!existingUser) {
            // Kullanıcı yoksa, yeni bir kullanıcı oluşturalım
            try {
              const newUser = await prisma.user.create({
                data: {
                  email: user.email as string,
                  firstName: user.name?.split(' ')[0] || 'User',
                  lastName: user.name?.split(' ').slice(1).join(' ') || '',
                  password: await bcrypt.hash(Math.random().toString(36).slice(-10), 10),
                  emailVerified: new Date(),
                  role: "USER",
                  userAgreementAccepted: true,
                  kvkkAgreementAccepted: true,
                  image: user.image,
                },
              });
              
              console.log("Yeni Google kullanıcısı oluşturuldu:", newUser.email);
              
              // Hoş geldiniz e-postası gönder
              try {
                await sendWelcomeEmail(
                  newUser.email, 
                  newUser.firstName
                );
                console.log("Hoş geldiniz e-postası gönderildi:", newUser.email);
              } catch (emailError) {
                console.error("Google kullanıcısına hoş geldiniz e-postası gönderilirken hata:", emailError);
                // E-posta gönderiminde hata olsa bile kullanıcı oluşturmaya devam et
              }
            } catch (error) {
              console.error("Google kullanıcısı oluşturulurken hata:", error);
              return false;
            }
          } else {
            // Mevcut kullanıcıyı güncelleyelim
            try {
              await prisma.user.update({
                where: { id: Number(existingUser.id) },
                data: {
                  image: user.image,
                  emailVerified: existingUser.emailVerified || new Date(),
                  lastLogin: new Date(),
                },
              });

              // Google hesabını mevcut hesaba bağlayalım
              const existingAccount = await prisma.account.findFirst({
                where: {
                  provider: account.provider,
                  providerAccountId: account.providerAccountId,
                },
              });

              if (!existingAccount) {
                await prisma.account.create({
                  data: {
                    userId: existingUser.id,
                    type: account.type,
                    provider: account.provider,
                    providerAccountId: account.providerAccountId,
                    access_token: account.access_token,
                    expires_at: account.expires_at,
                    token_type: account.token_type,
                    scope: account.scope,
                    id_token: account.id_token,
                  },
                });
                
                console.log("Google hesabı kullanıcıya bağlandı:", existingUser.email);
              }
            } catch (error) {
              console.error("Google ile giriş yapan kullanıcı güncellenirken hata:", error);
              return false;
            }
          }

          return true;
        } catch (error) {
          console.error("Google signIn callback error:", error);
          return false;
        }
      }
      
      return true;
    },
  },
  pages: {
    signIn: "/giris-yap",
    signOut: "/account-deleted", // Çıkış sonrası account-deleted sayfasına yönlendir
    error: "/error-login", // Hata durumunda yönlendirme
  },
};

export default NextAuth(options);
export { options }; // authOptions'ı dışa aktarın
