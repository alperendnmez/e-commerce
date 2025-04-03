import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { options as authOptions } from '@/pages/api/auth/[...nextauth]'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { slugify } from '@/lib/utils'
import { rateLimit } from '@/lib/rateLimit'

const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  uniqueTokenPerInterval: 1000 // Max 1000 users per second
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Rate limiting - increasing limit to 100 requests per minute
    await limiter.check(res, 100, 'BLOG_CATEGORIES_TOKEN') // 100 requests per minute

    // Auth check
    const session = await getServerSession(req, res, authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Route handler based on HTTP method
    switch (req.method) {
      case 'GET':
        return getCategories(req, res)
      case 'POST':
        return createCategory(req, res)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Blog categories error:', error)
    
    // Enhanced error logging for better debugging
    if (error instanceof Error) {
      console.error('Handler error details:', error.message)
      if ('stack' in error) {
        console.error('Handler stack trace:', error.stack)
      }
    }
    
    // Check if it's a rate limit error
    if (error instanceof Error && error.message === 'İstek limiti aşıldı') {
      return res.status(429).json({ error: 'Too Many Requests' })
    }
    
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    })
  }
}

// GET - Tüm kategorileri getir
async function getCategories(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Using any type assertion to avoid Prisma type errors
    const categories = await (prisma as any).blogCategory.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        seoTitle: true,
        seoDescription: true,
        seoKeywords: true,
        createdAt: true,
        updatedAt: true,
        // İlişkili blog yazılarını saymak için _count kullanımı
        _count: {
          select: { posts: true }
        }
      }
    })

    // Yanıtı istemcinin beklediği formatta biçimlendir
    const formattedCategories = categories.map((category: any) => ({
      ...category,
      isActive: true // Bu alan şemada yok ama frontend tarafında kullanılıyor
    }))

    return res.status(200).json(formattedCategories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    
    // Enhanced error logging for better debugging
    if (error instanceof Error) {
      console.error('Error details:', error.message)
      if ('stack' in error) {
        console.error('Stack trace:', error.stack)
      }
    }
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      return res.status(400).json({ 
        error: `Database error: ${error.code}`,
        message: error.message
      })
    }
    
    return res.status(500).json({ 
      error: 'Failed to fetch categories',
      message: error instanceof Error ? error.message : String(error)
    })
  }
}

// POST - Yeni kategori oluştur
async function createCategory(req: NextApiRequest, res: NextApiResponse) {
  const { name, slug, description } = req.body

  // Zorunlu alanları kontrol et
  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  // Eğer slug sağlanmadıysa isimden oluştur
  const categorySlug = slug || slugify(name)

  try {
    // Slug zaten var mı kontrol et
    const existingCategory = await (prisma as any).blogCategory.findFirst({
      where: { slug: categorySlug }
    })

    if (existingCategory) {
      return res.status(400).json({ error: 'SLUG_EXISTS' })
    }

    // Yeni kategori oluştur - isActive field removed as it doesn't exist in schema
    const newCategory = await (prisma as any).blogCategory.create({
      data: {
        name,
        slug: categorySlug,
        description
      }
    })

    // Add virtual isActive field to response for frontend compatibility
    const responseCategory = {
      ...newCategory,
      isActive: true // Add this for the frontend that expects it
    }

    return res.status(201).json(responseCategory)
  } catch (error) {
    console.error('Error creating category:', error)
    // Enhanced error logging for better debugging
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      if ('stack' in error) {
        console.error('Stack trace:', error.stack);
      }
    }
    
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'SLUG_EXISTS' })
      }
      return res.status(400).json({ 
        error: `Database error: ${error.code}`,
        message: error.message
      });
    }
    return res.status(500).json({ 
      error: 'Failed to create category',
      message: error instanceof Error ? error.message : String(error)
    })
  }
} 