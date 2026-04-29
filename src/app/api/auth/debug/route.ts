export async function GET() {
  const url = process.env.DATABASE_URL ?? 'NOT SET'
  const hasToken = !!process.env.DATABASE_AUTH_TOKEN
  const jwtSet = !!process.env.JWT_SECRET
  const pwSet = !!process.env.MANAGER_PASSWORD

  try {
    const { prisma } = await import('@/lib/prisma')
    const count = await prisma.employee.count()
    return Response.json({ ok: true, url, hasToken, jwtSet, pwSet, employeeCount: count })
  } catch (e) {
    return Response.json({
      ok: false,
      url,
      hasToken,
      jwtSet,
      pwSet,
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack?.slice(0, 500) : undefined,
    }, { status: 500 })
  }
}
