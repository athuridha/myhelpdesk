import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import pg from 'pg'

const HARDCODED_URL = "postgres://1ba944cd5453fb859eab1e5302a15d3bf801551d15655fc4314c935e33dc3249:sk_l2vClFKButHRc9pxnddjq@db.prisma.io:5432/postgres?sslmode=require"

const connectionString = process.env.DATABASE_URL || process.env.PRISMA_DATABASE_URL || HARDCODED_URL

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function initPrisma(): PrismaClient {
  try {
    if (typeof require !== 'undefined' && require.cache) {
      Object.keys(require.cache).forEach((key) => {
        if (key.includes('@prisma') || key.includes('.prisma')) {
          delete require.cache[key]
        }
      })
    }

    const DynamicClient =
      typeof require !== 'undefined'
        ? require('@prisma/client').PrismaClient
        : PrismaClient

    const Pool = pg.Pool || (pg as unknown as { default: { Pool: typeof pg.Pool } }).default?.Pool
    const isSsl = Boolean(
      connectionString &&
        (connectionString.includes('sslmode=') || connectionString.includes('prisma.io'))
    )
    const pool = new Pool({
      connectionString,
      ssl: isSsl ? { rejectUnauthorized: false } : undefined,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    })
    const adapter = new PrismaPg(pool)
    return new DynamicClient({ adapter, log: ['error', 'warn'] })
  } catch (err) {
    console.error('Error initializing PrismaPg adapter, falling back to standard PrismaClient:', err)
    const DynamicClient =
      typeof require !== 'undefined'
        ? require('@prisma/client').PrismaClient
        : PrismaClient
    return new DynamicClient({ log: ['error', 'warn'] })
  }
}

export function getPrisma(): PrismaClient {
  if (!globalForPrisma.prisma || !(globalForPrisma.prisma as any).meetingRoom) {
    globalForPrisma.prisma = initPrisma()
  }
  return globalForPrisma.prisma
}

export const prisma: PrismaClient = getPrisma()

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
