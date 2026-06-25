import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secretKey = process.env.JWT_SECRET || "super-secret-inventory-key-32-chars-long!";
const key = new TextEncoder().encode(secretKey);

// Definisikan rute dan role yang diperbolehkan mengakses
const routeRoles: { path: string; allowed: string[] }[] = [
  { path: "/settings", allowed: ["SUPERADMIN"] },
  { path: "/api/settings", allowed: ["SUPERADMIN"] },
];

export async function proxy(request: NextRequest) {
  const session = request.cookies.get('session')?.value
  const path = request.nextUrl.pathname

  // 1. Abaikan file statis, aset internal, dan logo setting agar logo tetap termuat
  if (
    path.startsWith("/_next") ||
    path.startsWith("/static") ||
    path.startsWith("/favicon.ico") ||
    path === "/api/settings/logo"
  ) {
    return NextResponse.next();
  }

  const isAuthPage = path.startsWith('/login') || path.startsWith('/register')

  // 2. Jika tidak ada sesi cookie
  if (!session) {
    if (isAuthPage) {
      return NextResponse.next();
    }
    // Jika rute API, kembalikan json 401
    if (path.startsWith("/api/")) {
      return NextResponse.json(
        { success: false, message: "Akses ditolak: Sesi tidak ditemukan." }, 
        { status: 401 }
      );
    }
    // Redirect halaman biasa ke login
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    // 3. Dekripsi dan verifikasi JWT token
    const { payload } = await jwtVerify(session, key, { algorithms: ["HS256"] });
    const userRole = payload.role as string;

    // Jika user sudah login dan mencoba membuka halaman login/register, biarkan tetap terbuka agar bisa multi-login/re-login di tab lain
    if (isAuthPage) {
      return NextResponse.next();
    }

    // 4. Cari apakah ada kecocokan aturan rute RBAC
    const matchingRule = routeRoles.find((rule) => path.startsWith(rule.path));

    if (matchingRule) {
      if (!matchingRule.allowed.includes(userRole)) {
        // Jika akses API, kembalikan status 403 Forbidden
        if (path.startsWith("/api/")) {
          return NextResponse.json(
            { success: false, message: `Akses ditolak: Role '${userRole}' tidak memiliki izin.` },
            { status: 403 }
          );
        }
        // Jika akses halaman biasa, redirect ke /unauthorized
        return NextResponse.redirect(new URL("/unauthorized", request.url));
      }
    }

    return NextResponse.next()
  } catch (err) {
    // Jika token kedaluwarsa atau terjadi manipulasi cookie, bersihkan cookie dan redirect ke login
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('session')
    return response
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
