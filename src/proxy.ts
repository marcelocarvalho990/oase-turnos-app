import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET ?? 'fallback-secret-change-me'
)

async function getSession(token: string) {
  try {
    const { payload } = await jwtVerify(token, SECRET, { algorithms: ['HS256'] })
    return payload as { role: string; employeeId: string | null }
  } catch {
    return null
  }
}

const MANAGER_PATHS = ['/schedule', '/staff', '/shifts', '/coverage', '/fairness', '/gerente']
const EMPLOYEE_PATHS = ['/colaborador']
const PUBLIC_PATHS = ['/login']
const PUBLIC_API_PREFIXES = ['/api/auth/']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Static assets and Next.js internals — always allow
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Public API routes
  if (PUBLIC_API_PREFIXES.some(p => pathname.startsWith(p))) {
    return NextResponse.next()
  }

  const token = request.cookies.get('session')?.value
  const session = token ? await getSession(token) : null

  // Login page: redirect authenticated users away
  if (PUBLIC_PATHS.includes(pathname)) {
    if (session) {
      const dest = session.role === 'MANAGER' ? '/schedule' : '/colaborador'
      return NextResponse.redirect(new URL(dest, request.url))
    }
    return NextResponse.next()
  }

  // Root: redirect based on role
  if (pathname === '/') {
    if (!session) return NextResponse.redirect(new URL('/login', request.url))
    const dest = session.role === 'MANAGER' ? '/schedule' : '/colaborador'
    return NextResponse.redirect(new URL(dest, request.url))
  }

  // All other routes require auth
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Manager-only routes
  if (MANAGER_PATHS.some(p => pathname.startsWith(p)) && session.role !== 'MANAGER') {
    return NextResponse.redirect(new URL('/colaborador', request.url))
  }

  // Employee-only routes
  if (EMPLOYEE_PATHS.some(p => pathname.startsWith(p)) && session.role !== 'EMPLOYEE') {
    return NextResponse.redirect(new URL('/schedule', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
