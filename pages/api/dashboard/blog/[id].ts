import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { options as authOptions } from '@/pages/api/auth/[...nextauth]'
import prisma from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { slugify } from '@/lib/utils'
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
    await limiter.check(res, 10, 'CACHE_TOKEN') // 10 requests per minute

    // Auth check
    const session = await getServerSession(req, res, authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // ID parametresini kontrol et
    const { id } = req.query
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid post ID' })
    }

    // Route handler based on HTTP method
    switch (req.method) {
      case 'GET':
        return getPost(req, res, id)
      case 'PUT':
        return updatePost(req, res, id)
      case 'PATCH':
        return patchPost(req, res, id)
      case 'DELETE':
        return deletePost(req, res, id)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Blog post error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// GET - Belirli bir blog yazısını getir
async function getPost(
  req: NextApiRequest,
  res: NextApiResponse,
  postId: string
) {
  try {
    const post = await prisma.blogPost.findUnique({
      where: { id: postId },
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
    })

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    return res.status(200).json(post)
  } catch (error) {
    console.error('Error fetching blog post:', error)
    return res.status(500).json({ error: 'Failed to fetch blog post' })
  }
}

// PUT - Blog yazısını güncelle
async function updatePost(
  req: NextApiRequest,
  res: NextApiResponse,
  postId: string
) {
  const { 
    title, 
    slug,
    excerpt, 
    content, 
    featuredImage, 
    categoryIds, 
    tags, 
    published, 
    seoTitle, 
    seoDescription, 
    seoKeywords,
    publishedAt
  } = req.body

  try {
    // Mevcut yazıyı kontrol et
    const existingPost = await prisma.blogPost.findUnique({
      where: { id: postId },
      include: {
        categories: true,
        tags: true
      }
    })

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Slug kontrolü
    let postSlug = slug
    if (!postSlug && title && title !== existingPost.title) {
      postSlug = slugify(title)
    } else if (!postSlug) {
      postSlug = existingPost.slug
    }

    // Eğer slug değiştiyse, çakışmayı kontrol et
    if (postSlug !== existingPost.slug) {
      const slugExists = await prisma.blogPost.findFirst({
        where: {
          slug: postSlug,
          id: { not: postId }
        }
      })

      if (slugExists) {
        // Slug çakışıyorsa, sonuna rastgele kod ekle
        const now = new Date()
        postSlug = `${postSlug}-${now.getTime().toString().slice(-6)}`
      }
    }

    // Yayınlanma tarihi kontrolü
    let updatedPublishedAt = existingPost.publishedAt
    if (published && !existingPost.publishedAt) {
      updatedPublishedAt = publishedAt ? new Date(publishedAt) : new Date()
    } else if (published && publishedAt) {
      updatedPublishedAt = new Date(publishedAt)
    } else if (!published) {
      updatedPublishedAt = null
    }

    // Yazıyı güncelle
    const updatedPost = await prisma.blogPost.update({
      where: { id: postId },
      data: {
        title: title || existingPost.title,
        slug: postSlug,
        excerpt: excerpt !== undefined ? excerpt : existingPost.excerpt,
        content: content !== undefined ? content : existingPost.content,
        imageUrl: featuredImage !== undefined ? featuredImage : existingPost.imageUrl,
        published: published !== undefined ? published : existingPost.published,
        seoTitle: seoTitle !== undefined ? seoTitle : existingPost.seoTitle,
        seoDescription: seoDescription !== undefined ? seoDescription : existingPost.seoDescription,
        seoKeywords: seoKeywords !== undefined ? seoKeywords : existingPost.seoKeywords,
        publishedAt: updatedPublishedAt
      }
    })

    // Kategorileri güncelle (önce eski bağlantıları sil)
    if (categoryIds && Array.isArray(categoryIds)) {
      // Mevcut kategorileri temizle
      await prisma.blogPostToCategory.deleteMany({
        where: { postId }
      })

      // Yeni kategorileri ekle
      for (const categoryId of categoryIds) {
        await prisma.blogPostToCategory.create({
          data: {
            postId,
            categoryId
          }
        })
      }
    }

    // Etiketleri güncelle (önce eski bağlantıları sil)
    if (tags && Array.isArray(tags)) {
      // Mevcut etiketleri temizle
      await prisma.blogPostToTag.deleteMany({
        where: { postId }
      })

      // Yeni etiketleri ekle
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
            postId,
            tagId: tag.id
          }
        })
      }
    }

    return res.status(200).json(updatedPost)
  } catch (error) {
    console.error('Error updating blog post:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'Slug already exists' })
      } else if (error.code === 'P2003') {
        return res.status(400).json({ error: 'Invalid category ID' })
      }
    }
    return res.status(500).json({ error: 'Failed to update blog post' })
  }
}

// PATCH - Blog yazısının durumunu değiştir
async function patchPost(
  req: NextApiRequest,
  res: NextApiResponse,
  postId: string
) {
  const { status, published } = req.body

  try {
    // Mevcut yazıyı kontrol et
    const existingPost = await prisma.blogPost.findUnique({
      where: { id: postId }
    })

    if (!existingPost) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // Yayınlanma durumunu kontrol et
    let updatedPublishedAt = existingPost.publishedAt
    if (published && !existingPost.publishedAt) {
      updatedPublishedAt = new Date()
    } else if (published === false) {
      updatedPublishedAt = null
    }

    // Yazı durumunu güncelle
    const updatedPost = await prisma.blogPost.update({
      where: { id: postId },
      data: {
        published: published !== undefined ? published : existingPost.published,
        publishedAt: updatedPublishedAt
      }
    })

    return res.status(200).json({
      ...updatedPost,
      status: updatedPost.published ? 'PUBLISHED' : 'DRAFT'
    })
  } catch (error) {
    console.error('Error updating blog post status:', error)
    return res.status(500).json({ error: 'Failed to update blog post status' })
  }
}

// DELETE - Blog yazısını sil
async function deletePost(
  req: NextApiRequest,
  res: NextApiResponse,
  postId: string
) {
  try {
    // Yazı var mı kontrol et
    const post = await prisma.blogPost.findUnique({
      where: { id: postId }
    })

    if (!post) {
      return res.status(404).json({ error: 'Post not found' })
    }

    // İlişkileri temizle
    await prisma.blogPostToCategory.deleteMany({
      where: { postId }
    })

    await prisma.blogPostToTag.deleteMany({
      where: { postId }
    })

    // Yazıyı sil
    await prisma.blogPost.delete({
      where: { id: postId }
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error deleting blog post:', error)
    return res.status(500).json({ error: 'Failed to delete blog post' })
  }
} 