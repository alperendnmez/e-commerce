import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth/next'
import type { NextAuthOptions } from 'next-auth'
import { isAdmin } from '@/utils/auth-helpers'
import slug from 'slug'

// Auth options'ı içe aktarın
import nextAuthOptions from '../../auth/[...nextauth]'
const authOptions = nextAuthOptions as NextAuthOptions

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { method } = req

    switch (method) {
      case 'GET':
        return await getTags(req, res)
      case 'POST':
        return await createTag(req, res)
      default:
        res.setHeader('Allow', ['GET', 'POST'])
        return res.status(405).end(`Method ${method} Not Allowed`)
    }
  } catch (error) {
    console.error('Blog tag error:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

// Blog etiketlerini getiren fonksiyon
async function getTags(req: NextApiRequest, res: NextApiResponse) {
  try {
    // @ts-ignore
    const tags = await prisma.blogTag.findMany({
      orderBy: {
        name: 'asc',
      },
      include: {
        // Etiket başına blog yazısı sayısını getir
        _count: {
          select: {
            posts: true,
          },
        },
      },
    })

    return res.status(200).json(tags)
  } catch (error) {
    console.error('Error fetching blog tags:', error)
    return res.status(500).json({ error: 'Failed to fetch blog tags' })
  }
}

// Yeni etiket oluşturan fonksiyon
async function createTag(req: NextApiRequest, res: NextApiResponse) {
  // Admin yetkisi kontrolü
  const session = await getServerSession(req, res, authOptions)
  if (!session || !isAdmin(session)) {
    return res.status(403).json({ error: 'Unauthorized' })
  }

  const { name } = req.body

  if (!name) {
    return res.status(400).json({ error: 'Tag name is required' })
  }

  try {
    // Slug oluştur
    let slugUrl = slug(name.toLowerCase())
    
    // Slug benzersiz mi kontrol et
    // @ts-ignore
    const existingTag = await prisma.blogTag.findUnique({
      where: { slug: slugUrl },
    })

    // Eğer aynı slug varsa, sonuna tarih ekle
    if (existingTag) {
      slugUrl = `${slugUrl}-${Date.now()}`
    }

    // Etiket oluştur
    // @ts-ignore
    const tag = await prisma.blogTag.create({
      data: {
        name,
        slug: slugUrl,
      },
    })

    return res.status(201).json(tag)
  } catch (error) {
    console.error('Error creating blog tag:', error)
    return res.status(500).json({ error: 'Failed to create blog tag' })
  }
} 