import { PrismaClient } from '@prisma/client'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaLibSql } = require('@prisma/adapter-libsql')

function createPrismaClient() {
  const url = process.env.DATABASE_URL!
  const authToken = process.env.DATABASE_AUTH_TOKEN

  const adapter = new PrismaLibSql({ url, authToken })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
