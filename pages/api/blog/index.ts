import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import type { NextAuthOptions } from 'next-auth'
import { isAdmin } from '@/utils/auth-helpers'
import slug from 'slug'

// Auth options'ı içe aktarın
import nextAuthOptions from '../auth/[...nextauth]'
const authOptions = nextAuthOptions as NextAuthOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req

    switch (method) {
      case 'GET':
        return await getBlogPosts(req, res)
      case 'POST':
        return await createBlogPost(req, res)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).end(`Method ${method} Not Allowed`)
    }
  } catch (error) {
    console.error('Blog error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

// Blog yazılarını getiren fonksiyon - SEO için optimize edilmiş
async function getBlogPosts(req: NextApiRequest, res: NextApiResponse) {
  const {
    page = '1',
    limit = '10',
    category,
    tag,
    published,
    search,
    order = 'desc',
    orderBy = 'publishedAt',
  } = req.query

  const pageNumber = parseInt(page as string, 10)
  const limitNumber = parseInt(limit as string, 10)
  const skip = (pageNumber - 1) * limitNumber

  try {
    // Filtreleme koşulları
    const where: any = {}

    // Sadece yayınlanmış blog yazılarını döndür (API'ye genel erişim için)
    if (published === 'true') {
      where.published = true
      where.publishedAt = { not: null }
    } else {
      // Admin yetkisi kontrolü
      const session = await getServerSession(req, res, authOptions)
      if (!session || !isAdmin(session)) {
        where.published = true
        where.publishedAt = { not: null }
      }
    }

    // Kategori filtresi
    if (category) {
      where.categories = {
        some: {
          category: {
            slug: category as string
          }
        }
      }
    }

    // Etiket filtresi
    if (tag) {
      where.tags = {
        some: {
          tag: {
            slug: tag as string
          }
        }
      }
    }

    // Arama filtresi
    if (search) {
      where.OR = [
        { title: { contains: search as string, mode: 'insensitive' } },
        { content: { contains: search as string, mode: 'insensitive' } },
        { excerpt: { contains: search as string, mode: 'insensitive' } },
        { seoKeywords: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    // Prisma'nın yeni versiyonunda koşullu olarak modellere erişmek gerekiyor
    // @ts-ignore - Prisma schema'da bu model tanımlı olmasına rağmen tip hatası alınıyor
    const posts = await prisma.blogPost.findMany({
      where,
      skip,
      take: limitNumber,
      orderBy: { [orderBy as string]: order },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
    })

    // Blog yazılarının toplam sayısını getir (sayfalama için)
    // @ts-ignore
    const total = await prisma.blogPost.count({ where })

    // Yanıtı SEO meta bilgileri ile zenginleştir
    const formattedPosts = posts.map((post: any) => ({
      ...post,
      categories: post.categories.map((c: any) => c.category),
      tags: post.tags.map((t: any) => t.tag),
    }))

    return res.status(200).json({
      posts: formattedPosts,
      meta: {
        total,
        pages: Math.ceil(total / limitNumber),
        currentPage: pageNumber,
      },
    })
  } catch (error) {
    console.error('Error fetching blog posts:', error)
    return res.status(500).json({ error: 'Failed to fetch blog posts' })
  }
}

// Yeni blog yazısı oluşturan fonksiyon
async function createBlogPost(req: NextApiRequest, res: NextApiResponse) {
  // Admin yetkisi kontrolü
  const session = await getServerSession(req, res, authOptions)
  if (!session || !isAdmin(session)) {
    return res.status(403).json({ error: 'Unauthorized' })
  }

  const {
    title,
    content,
    excerpt,
    imageUrl,
    published = false,
    categoryIds,
    tagIds,
    seoTitle,
    seoDescription,
    seoKeywords,
  } = req.body

  if (!title || !content) {
    return res.status(400).json({ error: 'Title and content are required' })
  }

  try {
    const userId = session.user.id

    // Slug oluştur - SEO dostu URL
    let slugUrl = slug(title.toLowerCase())
    
    // Slug benzersiz mi kontrol et
    // @ts-ignore
    const existingPost = await prisma.blogPost.findUnique({
      where: { slug: slugUrl },
    })

    // Eğer aynı slug varsa, sonuna tarih ekle
    if (existingPost) {
      slugUrl = `${slugUrl}-${Date.now()}`
    }

    // Blog yazısını oluştur
    // @ts-ignore
    const post = await prisma.blogPost.create({
      data: {
        title,
        slug: slugUrl,
        content,
        excerpt,
        imageUrl,
        published,
        publishedAt: published ? new Date() : null,
        seoTitle: seoTitle || title,
        seoDescription: seoDescription || excerpt,
        seoKeywords,
        author: {
          connect: { id: userId },
        },
        // Kategori bağlantıları
        categories: categoryIds ? {
          create: categoryIds.map((categoryId: string) => ({
            category: { connect: { id: categoryId } },
          })),
        } : undefined,
        // Etiket bağlantıları
        tags: tagIds ? {
          create: tagIds.map((tagId: string) => ({
            tag: { connect: { id: tagId } },
          })),
        } : undefined,
      },
    })

    return res.status(201).json(post)
  } catch (error) {
    console.error('Error creating blog post:', error)
    return res.status(500).json({ error: 'Failed to create blog post' })
  }
} 