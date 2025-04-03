import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { rateLimit } from '@/lib/rateLimit'

const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  uniqueTokenPerInterval: 500 // Max 500 users per second
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Rate limiting
    await limiter.check(res, 20, 'CACHE_TOKEN') // 20 requests per minute

    // Route handler based on HTTP method
    switch (req.method) {
      case 'GET':
        return getCategories(req, res)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Blog categories error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// GET - Tüm kategorileri getir
async function getCategories(req: NextApiRequest, res: NextApiResponse) {
  try {
    // BlogCategory modelini kullan
    const categories = await prisma.$queryRaw`
      SELECT 
        bc.id, 
        bc.name, 
        bc.slug, 
        bc.description, 
        bc."seoTitle", 
        bc."seoDescription", 
        bc."seoKeywords", 
        bc."createdAt", 
        bc."updatedAt",
        COUNT(bpc."postId") as "postCount"
      FROM "BlogCategory" bc
      LEFT JOIN "BlogPostToCategory" bpc ON bc.id = bpc."categoryId"
      GROUP BY bc.id
      ORDER BY bc.name ASC
    `

    // Yanıtı frontend için uygun formata dönüştür
    const formattedCategories = Array.isArray(categories) 
      ? categories.map((category: any) => ({
          ...category,
          isActive: true, // Frontend'in beklediği alan
          _count: {
            posts: Number(category.postCount) || 0
          }
        }))
      : []

    return res.status(200).json(formattedCategories)
  } catch (error) {
    console.error('Error fetching categories:', error)
    return res.status(500).json({ error: 'Failed to fetch categories' })
  }
} 