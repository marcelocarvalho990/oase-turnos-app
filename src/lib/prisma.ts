import { PrismaClient } from '@prisma/client'
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PrismaLibSql } = require('@prisma/adapter-libsql')
import path from 'path'
import fs from 'fs'

function getDbPath(): string {
  if (process.env.VERCEL) {
    // Vercel: /tmp is the only writable directory. Copy bundled db on first use.
    const tmpDb = '/tmp/dev.db'
    if (!fs.existsSync(tmpDb)) {
      const bundled = path.resolve(process.cwd(), 'dev.db')
      fs.copyFileSync(bundled, tmpDb)
    }
    return tmpDb
  }
  return path.resolve(process.cwd(), 'dev.db')
}

function createPrismaClient() {
  const dbPath = getDbPath()
  const adapter = new PrismaLibSql({ url: `file://${dbPath}` })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
