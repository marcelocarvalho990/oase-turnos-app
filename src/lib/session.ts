import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export interface SessionPayload {
  role: 'MANAGER' | 'EMPLOYEE'
  employeeId: string | null
  employeeName: string | null
}

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? '')
const COOKIE_NAME = 'session'
const MAX_AGE = 7 * 24 * 60 * 60 // 7 days

export async function encrypt(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET)
}

export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET, { algorithms: ['HS256'] })
    return {
      role: payload.role as 'MANAGER' | 'EMPLOYEE',
      employeeId: payload.employeeId as string | null,
      employeeName: payload.employeeName as string | null,
    }
  } catch {
    return null
  }
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await encrypt(payload)
  const jar = await cookies()
  jar.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: MAX_AGE,
  })
}

export async function deleteSession(): Promise<void> {
  const jar = await cookies()
  jar.delete(COOKIE_NAME)
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies()
  const token = jar.get(COOKIE_NAME)?.value
  if (!token) return null
  return decrypt(token)
}
