import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import type { NextAuthOptions } from 'next-auth'
import { isAdmin } from '@/utils/auth-helpers'

// Auth options'ı içe aktarın
import nextAuthOptions from '../auth/[...nextauth]'
const authOptions = nextAuthOptions as NextAuthOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req
    const { slug } = req.query

    if (!slug || Array.isArray(slug)) {
      return res.status(400).json({ error: 'Invalid slug parameter' })
    }

    switch (method) {
      case 'GET':
        return await getBlogPost(req, res, slug)
      case 'PUT':
        return await updateBlogPost(req, res, slug)
      case 'DELETE':
        return await deleteBlogPost(req, res, slug)
      default:
        res.setHeader('Allow', ['GET', 'PUT', 'DELETE'])
        return res.status(405).end(`Method ${method} Not Allowed`)
    }
  } catch (error) {
    console.error('Blog error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

// Blog yazısı detayını getiren fonksiyon - Yayınlanma durumuna göre filtreleme içerir
async function getBlogPost(req: NextApiRequest, res: NextApiResponse, slug: string) {
  try {
    // Admin kontrolü
    const session = await getServerSession(req, res, authOptions)
    const isAdminUser = session && isAdmin(session)
    
    // Admin değilse sadece yayınlanmış içeriği görüntüleyebilir
    const where = {
      slug,
      ...(isAdminUser ? {} : { published: true })
    }

    // @ts-ignore
    const post = await prisma.blogPost.findFirst({
      where,
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

    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' })
    }

    // Blog yazısını görüntüleme sayısını artır (SEO için trend yazıları belirleme)
    if (req.headers['user-agent'] && !req.headers['user-agent'].includes('bot')) {
      // @ts-ignore
      await prisma.blogPost.update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } }
      })
    }

    // Kategori ve etiketleri düzenleme
    const formattedPost = {
      ...post,
      categories: post.categories.map((c: any) => c.category),
      tags: post.tags.map((t: any) => t.tag),
    }

    // SEO verilerini yanıta ekle
    const seoMeta = {
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt || '',
      keywords: post.seoKeywords || '',
      openGraph: {
        title: post.seoTitle || post.title,
        description: post.seoDescription || post.excerpt || '',
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/blog/${post.slug}`,
        type: 'article',
        article: {
          publishedTime: post.publishedAt,
          modifiedTime: post.updatedAt,
          authors: [`${post.author.firstName} ${post.author.lastName}`],
          tags: post.tags.map((t: any) => t.tag.name),
        },
        images: [
          {
            url: post.imageUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/images/default-blog.jpg`,
            width: 1200,
            height: 630,
            alt: post.title,
          },
        ],
      }
    }

    return res.status(200).json({
      post: formattedPost,
      seo: seoMeta
    })
  } catch (error) {
    console.error('Error fetching blog post:', error)
    return res.status(500).json({ error: 'Failed to fetch blog post' })
  }
}

// Blog yazısını güncelleyen fonksiyon
async function updateBlogPost(req: NextApiRequest, res: NextApiResponse, slug: string) {
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
    published,
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
    // Önce mevcut blog yazısını kontrol et
    // @ts-ignore
    const existingPost = await prisma.blogPost.findUnique({
      where: { slug },
      include: {
        categories: true,
        tags: true,
      },
    })

    if (!existingPost) {
      return res.status(404).json({ error: 'Blog post not found' })
    }

    // Yayın durumu değişiyorsa publishedAt güncelle
    const publishedDate = published && !existingPost.published 
      ? new Date() 
      : existingPost.publishedAt

    // Güncelleme işlemi
    // @ts-ignore
    const updatedPost = await prisma.blogPost.update({
      where: { id: existingPost.id },
      data: {
        title,
        content,
        excerpt,
        imageUrl,
        published,
        publishedAt: publishedDate,
        seoTitle,
        seoDescription,
        seoKeywords,
        updatedAt: new Date(),
      },
    })

    // Kategorileri güncelle
    if (categoryIds) {
      // Önce mevcut kategorileri kaldır
      // @ts-ignore
      await prisma.blogPostToCategory.deleteMany({
        where: { postId: existingPost.id },
      })

      // Yeni kategorileri ekle
      await Promise.all(
        categoryIds.map(async (categoryId: string) => {
          // @ts-ignore
          return prisma.blogPostToCategory.create({
            data: {
              postId: existingPost.id,
              categoryId,
            },
          })
        })
      )
    }

    // Etiketleri güncelle
    if (tagIds) {
      // Önce mevcut etiketleri kaldır
      // @ts-ignore
      await prisma.blogPostToTag.deleteMany({
        where: { postId: existingPost.id },
      })

      // Yeni etiketleri ekle
      await Promise.all(
        tagIds.map(async (tagId: string) => {
          // @ts-ignore
          return prisma.blogPostToTag.create({
            data: {
              postId: existingPost.id,
              tagId,
            },
          })
        })
      )
    }

    return res.status(200).json(updatedPost)
  } catch (error) {
    console.error('Error updating blog post:', error)
    return res.status(500).json({ error: 'Failed to update blog post' })
  }
}

// Blog yazısını silen fonksiyon
async function deleteBlogPost(req: NextApiRequest, res: NextApiResponse, slug: string) {
  // Admin yetkisi kontrolü
  const session = await getServerSession(req, res, authOptions)
  if (!session || !isAdmin(session)) {
    return res.status(403).json({ error: 'Unauthorized' })
  }

  try {
    // @ts-ignore
    const post = await prisma.blogPost.findUnique({
      where: { slug },
    })

    if (!post) {
      return res.status(404).json({ error: 'Blog post not found' })
    }

    // İlişkili kategori bağlantılarını sil
    // @ts-ignore
    await prisma.blogPostToCategory.deleteMany({
      where: { postId: post.id },
    })

    // İlişkili etiket bağlantılarını sil
    // @ts-ignore
    await prisma.blogPostToTag.deleteMany({
      where: { postId: post.id },
    })

    // Blog yazısını sil
    // @ts-ignore
    await prisma.blogPost.delete({
      where: { id: post.id },
    })

    return res.status(200).json({ message: 'Blog post deleted successfully' })
  } catch (error) {
    console.error('Error deleting blog post:', error)
    return res.status(500).json({ error: 'Failed to delete blog post' })
  }
} 