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
    // Rate limiting
    await limiter.check(res, 50, 'BLOG_CATEGORIES_ID_TOKEN') // 50 requests per minute

    // Auth check
    const session = await getServerSession(req, res, authOptions)
    if (!session || session.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // ID parametresini kontrol et
    const { id } = req.query
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid category ID' })
    }

    // Route handler based on HTTP method
    switch (req.method) {
      case 'GET':
        return getCategory(req, res, id)
      case 'PUT':
        return updateCategory(req, res, id)
      case 'DELETE':
        return deleteCategory(req, res, id)
      default:
        return res.status(405).json({ error: 'Method not allowed' })
    }
  } catch (error) {
    console.error('Blog category error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}

// GET - Belirli bir kategoriyi getir
async function getCategory(
  req: NextApiRequest,
  res: NextApiResponse,
  categoryId: string
) {
  try {
    const category = await prisma.blogCategory.findUnique({
      where: { id: categoryId },
      include: {
        parent: {
          select: {
            id: true,
            name: true
          }
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        posts: true
      }
    })

    if (!category) {
      return res.status(404).json({ error: 'Category not found' })
    }

    const formattedCategory = {
      ...category,
      postCount: category.posts.length,
      posts: undefined
    }

    return res.status(200).json(formattedCategory)
  } catch (error) {
    console.error('Error fetching category:', error)
    return res.status(500).json({ error: 'Failed to fetch category' })
  }
}

// PUT - Kategoriyi güncelle
async function updateCategory(
  req: NextApiRequest,
  res: NextApiResponse,
  categoryId: string
) {
  const { name, slug, description, parentId, isActive } = req.body

  try {
    // Önceki kategoriyi kontrol et
    const existingCategory = await prisma.blogCategory.findUnique({
      where: { id: categoryId }
    })

    if (!existingCategory) {
      return res.status(404).json({ error: 'Category not found' })
    }

    // Parent ID kendisi olamaz
    if (parentId && parentId === categoryId) {
      return res.status(400).json({ error: 'A category cannot be its own parent' })
    }

    // Bir kategori alt kategorisini parent olarak alamaz (döngüsel ilişki)
    if (parentId) {
      const childCategories = await prisma.blogCategory.findMany({
        where: { parentId: categoryId },
        select: { id: true }
      })

      const childIds = childCategories.map(c => c.id)
      if (childIds.includes(parentId)) {
        return res.status(400).json({ error: 'Circular reference detected' })
      }
    }

    const categorySlug = slug || (name && name !== existingCategory.name ? slugify(name) : existingCategory.slug)

    // Slug zaten var mı kontrol et (kendi dışında)
    if (categorySlug !== existingCategory.slug) {
      const slugExists = await prisma.blogCategory.findFirst({
        where: {
          slug: categorySlug,
          id: { not: categoryId }
        }
      })

      if (slugExists) {
        return res.status(400).json({ error: 'SLUG_EXISTS' })
      }
    }

    // Kategoriyi güncelle
    const updatedCategory = await prisma.blogCategory.update({
      where: { id: categoryId },
      data: {
        name: name || existingCategory.name,
        slug: categorySlug,
        description,
        parentId: parentId === undefined ? existingCategory.parentId : parentId,
        isActive: isActive === undefined ? existingCategory.isActive : isActive
      }
    })

    return res.status(200).json(updatedCategory)
  } catch (error) {
    console.error('Error updating category:', error)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return res.status(400).json({ error: 'SLUG_EXISTS' })
      }
    }
    return res.status(500).json({ error: 'Failed to update category' })
  }
}

// DELETE - Kategoriyi sil
async function deleteCategory(
  req: NextApiRequest,
  res: NextApiResponse,
  categoryId: string
) {
  try {
    // Önce kategori var mı kontrol et
    const category = await prisma.blogCategory.findUnique({
      where: { id: categoryId },
      include: {
        children: true,
        posts: true
      }
    })

    if (!category) {
      return res.status(404).json({ error: 'Category not found' })
    }

    // Alt kategorisi varsa silme
    if (category.children.length > 0) {
      return res.status(400).json({ error: 'CATEGORY_HAS_CHILDREN' })
    }

    // İçinde yazı varsa silme
    if (category.posts.length > 0) {
      return res.status(400).json({ error: 'CATEGORY_HAS_POSTS' })
    }

    // Kategoriyi sil
    await prisma.blogCategory.delete({
      where: { id: categoryId }
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return res.status(500).json({ error: 'Failed to delete category' })
  }
} 