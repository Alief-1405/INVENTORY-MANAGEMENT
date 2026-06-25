import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const secretKey = process.env.JWT_SECRET || "super-secret-inventory-key-32-chars-long!";
const key = new TextEncoder().encode(secretKey);

export async function proxy(request: NextRequest) {
  const session = request.cookies.get('session')?.value
  const path = request.nextUrl.pathname

  const isAuthPage = path.startsWith('/login') || path.startsWith('/register')

  if (isAuthPage) {
    if (session) {
      try {
        await jwtVerify(session, key, { algorithms: ["HS256"] });
        // Jika token valid dan mencoba akses login/register, tendang ke home
        return NextResponse.redirect(new URL('/', request.url))
      } catch (err) {
        // Token invalid, biarkan akses halaman auth
      }
    }
    return NextResponse.next()
  }

  // Proteksi semua rute lainnya (kecuali API dan assets)
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  try {
    await jwtVerify(session, key, { algorithms: ["HS256"] });
    return NextResponse.next()
  } catch (err) {
    // Jika token kadaluarsa/invalid, hapus session
    const response = NextResponse.redirect(new URL('/login', request.url))
    response.cookies.delete('session')
    return response
  }
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
}
