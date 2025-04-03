import { PrismaClient } from '@prisma/client'

// TypeScript için global tanımı
declare global {
  var prisma: PrismaClient | undefined
}

// Global olarak PrismaClient örneğini tanımla
// Bu, her istekte yeni bir bağlantı açılmasını önler
let prisma: PrismaClient

if (process.env.NODE_ENV === 'production') {
  try {
    prisma = new PrismaClient()
  } catch (error) {
    console.error('Prisma initialization error in production:', error)
    // Fallback
    prisma = new PrismaClient()
  }
} else {
  // Geliştirme ortamında hot reloading sırasında 
  // çoklu bağlantıları önlemek için global değişkeni kullan
  if (!global.prisma) {
    try {
      global.prisma = new PrismaClient({
        log: ['query', 'error', 'warn'],
      })
    } catch (error) {
      console.error('Prisma initialization error in development:', error)
      // Fallback
      global.prisma = new PrismaClient()
    }
  }
  prisma = global.prisma
}

export default prisma 