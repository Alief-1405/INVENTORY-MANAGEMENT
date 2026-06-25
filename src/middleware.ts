import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const secretKey = process.env.JWT_SECRET || "super-secret-inventory-key-32-chars-long!";
const key = new TextEncoder().encode(secretKey);

// Definisikan rute dan role yang diperbolehkan mengakses
const routeRoles: { path: string; allowed: string[] }[] = [
  { path: "/settings", allowed: ["SUPERADMIN"] },
  { path: "/api/settings", allowed: ["SUPERADMIN"] },
];

export async function middleware(request: NextRequest) {
  const sessionCookie = request.cookies.get("session")?.value;
  const { pathname } = request.nextUrl;

  // 1. Abaikan file statis, aset internal, dan logo setting agar logo tetap termuat di login/register
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/favicon.ico") ||
    pathname === "/api/settings/logo"
  ) {
    return NextResponse.next();
  }

  const isAuthPage = pathname.startsWith("/login") || pathname.startsWith("/register");

  // 2. Jika tidak ada sesi cookie
  if (!sessionCookie) {
    if (isAuthPage) {
      return NextResponse.next();
    }
    // Jika rute API, kembalikan json 401
    if (pathname.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Sesi tidak ditemukan." }, 
        { status: 401 }
      );
    }
    // Redirect halaman biasa ke login
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    // 3. Dekripsi dan verifikasi JWT token
    const { payload } = await jwtVerify(sessionCookie, key);
    const userRole = payload.role as string;

    // Jika user sudah login dan mencoba membuka halaman login/register
    if (isAuthPage) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    // 4. Cari apakah ada kecocokan aturan rute RBAC
    const matchingRule = routeRoles.find((rule) => pathname.startsWith(rule.path));

    if (matchingRule) {
      if (!matchingRule.allowed.includes(userRole)) {
        // Jika akses API, kembalikan status 403 Forbidden
        if (pathname.startsWith("/api/")) {
          return NextResponse.json(
            { success: false, message: `Akses ditolak: Role '${userRole}' tidak memiliki izin.` },
            { status: 403 }
          );
        }
        // Jika akses halaman biasa, redirect ke /unauthorized
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }
  } catch (error) {
    // Jika token kedaluwarsa atau terjadi manipulasi cookie, bersihkan cookie dan redirect ke login
    const response = NextResponse.redirect(new URL("/login", request.url));
    response.cookies.delete("session");
    return response;
  }

  return NextResponse.next();
}

// Konfigurasi matcher untuk memfilter rute
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
