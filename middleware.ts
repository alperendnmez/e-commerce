// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

const secret = process.env.NEXTAUTH_SECRET;

export async function middleware(req: NextRequest) {
  const token = await getToken({ req, secret });
  const { pathname } = req.nextUrl;

  // Dashboard erişimi kontrolü - Sadece admin kullanıcılar
  if (pathname.startsWith("/dashboard")) {
    if (!token || token.role !== "ADMIN") {
      const url = req.nextUrl.clone();
      url.pathname = "/giris-yap"; // Doğru giriş sayfasına yönlendir
      return NextResponse.redirect(url);
    }
  }

  // Authenticated gerekli olan sayfalar için koruma
  // Örneğin: profil, satın alma, sepet, vb.
  if (pathname.startsWith("/profile") || pathname.startsWith("/checkout") || pathname.startsWith("/cart")) {
    if (!token) {
      const url = req.nextUrl.clone();
      url.pathname = "/giris-yap";
      url.search = `?callbackUrl=${encodeURIComponent(pathname)}`;
      return NextResponse.redirect(url);
    }
  }

  // Giriş yapmış kullanıcılar için auth sayfalarına erişimi engelle
  // kayit-ol ve giris-yap sayfaları
  if ((pathname === "/kayit-ol" || pathname === "/giris-yap") && token) {
    // Admin kullanıcıları dashboard'a, diğerleri ana sayfaya yönlendir
    const url = req.nextUrl.clone();
    url.pathname = token.role === "ADMIN" ? "/dashboard" : "/";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*", 
    "/profile/:path*",
    "/checkout/:path*",
    "/cart/:path*",
    "/kayit-ol",
    "/giris-yap"
  ],
};
