import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { options as authOptions } from '@/pages/api/auth/[...nextauth]'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { slugify } from '@/lib/utils'
import { rateLimit } from '@/lib/rateLimit'

const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  uniqueTokenPerInterval: 500, // Max 500 users per second
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Rate limiting
    await limiter.check(res, 10, 'CACHE_TOKEN') // 10 requests per minute

    // Auth check
    const session = await getServerSession(req, res, authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Route handler based on HTTP method
    switch (req.method) {
      case 'GET':
        return getPosts(req, res)
      case 'POST':
        return createPost(req, res)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Blog posts error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// GET - Blog yazılarını getir (filtre, sıralama ve sayfalama ile)
async function getPosts(req: NextApiRequest, res: NextApiResponse) {
  const {
    page = '1',
    limit = '10',
    status,
    categoryId,
    search,
    sortBy = 'updatedAt',
    sortOrder = 'desc'
  } = req.query

  // Parametreleri doğrula
  const pageNum = parseInt(page as string) || 1
  const limitNum = parseInt(limit as string) || 10
  const skip = (pageNum - 1) * limitNum

  // Filtreleme koşullarını oluştur
  const where: any = {}

  // Durum filtresi
  if (status && ['DRAFT', 'PUBLISHED', 'ARCHIVED'].includes(status as string)) {
    where.published = status === 'PUBLISHED'
  }

  // Kategori filtresi
  if (categoryId) {
    where.categories = {
      some: {
        categoryId: categoryId as string
      }
    }
  }

  // Arama filtresi
  if (search && typeof search === 'string') {
    where.OR = [
      { title: { contains: search, mode: 'insensitive' } },
      { content: { contains: search, mode: 'insensitive' } },
      { excerpt: { contains: search, mode: 'insensitive' } }
    ]
  }

  // Sıralama seçeneklerini doğrula ve oluştur
  const validSortFields = ['title', 'createdAt', 'updatedAt', 'publishedAt', 'viewCount']
  const sortField = validSortFields.includes(sortBy as string) ? sortBy : 'updatedAt'
  const order = (sortOrder as string)?.toLowerCase() === 'asc' ? 'asc' : 'desc'

  const orderBy: any = { [sortField as string]: order }

  try {
    // Veritabanı sorgusu
    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy,
        skip,
        take: limitNum,
        include: {
          categories: {
            include: {
              category: true
            }
          },
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true
            }
          },
          tags: {
            include: {
              tag: true
            }
          }
        }
      }),
      prisma.blogPost.count({ where })
    ])

    // Yanıtı düzenle ve gönder
    // Map the posts to the expected structure for the frontend
    const formattedPosts = posts.map((post: any) => {
      // Determine the status based on the published field
      let status = post.published ? 'PUBLISHED' : 'DRAFT';
      
      // Extract category info
      const categoryInfo = post.categories.length > 0
        ? {
            categoryId: post.categories[0].category.id,
            categoryName: post.categories[0].category.name
          }
        : { categoryId: null, categoryName: null };
      
      // Extract tag names
      const tagNames = post.tags.map((t: any) => t.tag.name);
      
      // Create a formatted post object
      return {
        id: post.id,
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        content: post.content,
        featuredImage: post.imageUrl,
        status,
        viewCount: post.viewCount,
        authorId: post.authorId,
        authorName: `${post.author.firstName} ${post.author.lastName}`,
        createdAt: post.createdAt,
        updatedAt: post.updatedAt,
        publishedAt: post.publishedAt,
        ...categoryInfo,
        tags: tagNames
      };
    });

    // Return just the formatted posts array, not nested inside a posts object
    return res.status(200).json(formattedPosts);
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    return res.status(500).json({ error: 'Failed to fetch blog posts' })
  }
}

// POST - Yeni blog yazısı oluştur
async function createPost(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const { 
    title, 
    excerpt, 
    content, 
    featuredImage, 
    categoryId, 
    tags, 
    status, 
    seoTitle, 
    seoDescription, 
    seoKeywords,
    publishedAt
  } = req.body

  // Zorunlu alanları kontrol et
  if (!title) {
    return res.status(400).json({ error: 'Title is required' })
  }

  // Slug oluştur
  const slug = slugify(title)

  try {
    // Slug çakışma kontrolü
    const existingPost = await prisma.blogPost.findFirst({
      where: { slug }
    })

    // Blog yazısı verileri
    const postData: any = {
      title,
      slug: existingPost ? `${slug}-${Date.now().toString().slice(-6)}` : slug,
      excerpt: excerpt || '',
      content: content || '',
      imageUrl: featuredImage,
      published: status === 'PUBLISHED',
      authorId: parseInt(session.user.id as string),
      seoTitle: seoTitle || title,
      seoDescription: seoDescription || excerpt,
      seoKeywords: seoKeywords || '',
      publishedAt: status === 'PUBLISHED' ? (publishedAt ? new Date(publishedAt) : new Date()) : null
    }

    const post = await prisma.blogPost.create({
      data: postData
    })

    // Kategori ilişkisi oluştur
    if (categoryId) {
      await prisma.blogPostToCategory.create({
        data: {
          postId: post.id,
          categoryId
        }
      })
    }

    // Etiketleri oluştur ve iliştir
    if (Array.isArray(tags) && tags.length > 0) {
      for (const tagName of tags) {
        // Önce tag'i bul veya oluştur
        const slugifiedTag = slugify(tagName)
        let tag = await prisma.blogTag.findFirst({
          where: { slug: slugifiedTag }
        })

        if (!tag) {
          tag = await prisma.blogTag.create({
            data: {
              name: tagName,
              slug: slugifiedTag
            }
          })
        }

        // Yazı ile ilişkilendir
        await prisma.blogPostToTag.create({
          data: {
            postId: post.id,
            tagId: tag.id
          }
        })
      }
    }

    return res.status(201).json(post)
  } catch (error) {
    console.error('Error creating blog post:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Slug already exists' })
      } else if (error.code === 'P2003') {
        return res.status(400).json({ error: 'Invalid category ID' })
      }
    }
    return res.status(500).json({ error: 'Failed to create blog post' })
  }
} 