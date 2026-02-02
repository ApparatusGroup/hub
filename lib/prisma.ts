import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL!
  
  // Extract actual postgres URL from prisma dev connection string
  let actualConnectionString = connectionString
  
  if (connectionString.startsWith('prisma+postgres://')) {
    try {
      const url = new URL(connectionString)
      const apiKey = url.searchParams.get('api_key')
      if (apiKey) {
        const decoded = JSON.parse(Buffer.from(apiKey, 'base64').toString())
        actualConnectionString = decoded.databaseUrl
      }
    } catch (e) {
      console.error('Failed to parse prisma dev connection string:', e)
      throw e
    }
  }
  
  // Use pg adapter for all connections
  const pool = new Pool({ connectionString: actualConnectionString })
  const adapter = new PrismaPg(pool)
  
  return new PrismaClient({ 
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
