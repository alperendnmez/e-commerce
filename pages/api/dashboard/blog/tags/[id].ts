import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import prisma from '@/lib/prisma'
import { z } from 'zod'
import { rateLimit } from '@/lib/rateLimit'
import { ErrorType, ApiError } from '@/lib/errorHandler'

const limiter = rateLimit({
  interval: 60 * 1000, // 60 seconds
  uniqueTokenPerInterval: 500, // Max 500 users per second
})

// Validation schema for updating a tag
const updateTagSchema = z.object({
  name: z.string().min(2, {
    message: 'Etiket adı en az 2 karakter olmalıdır.',
  }),
  slug: z.string().min(2, {
    message: 'Etiket slug\'ı en az 2 karakter olmalıdır.',
  }).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    message: 'Slug sadece küçük harfler, sayılar ve tire (-) içerebilir.'
  })
})

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    // Rate limiting
    try {
      await limiter.check(res, 10, 'BLOG_TAGS_SINGLE_CACHE_TOKEN') // 10 requests per minute
    } catch (error) {
      return res.status(429).json({ error: 'Too Many Requests' })
    }

    // Auth check
    const session = await getServerSession(req, res, authOptions)
    if (!session) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    // Check if user has admin permission
    const user = await prisma.user.findUnique({
      where: { id: Number(session.user.id) },
      select: { role: true },
    })

    if (!user || user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Forbidden. Requires admin permission.' })
    }

    // Get tag ID from the URL
    const { id } = req.query
    
    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Invalid tag ID' })
    }

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return handleGET(req, res, id)
      case 'PUT':
        return handlePUT(req, res, id)
      case 'DELETE':
        return handleDELETE(req, res, id)
      default:
        return res.status(405).json({ error: 'Method Not Allowed' })
    }
  } catch (error) {
    console.error('Blog tag API error:', error)
    return handleError(error, res)
  }
}

// GET - Fetch a specific blog tag
async function handleGET(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const tags = await prisma.$queryRaw`
      SELECT 
        id, name, slug, "createdAt", "updatedAt",
        (SELECT COUNT(*) FROM "BlogPostToTag" WHERE "tagId" = "BlogTag".id) as "postCount"
      FROM "BlogTag" 
      WHERE id = ${id}
    `;

    const rawTag = Array.isArray(tags) && tags.length > 0 ? tags[0] : null;

    if (!rawTag) {
      return res.status(404).json({ error: 'Tag not found' })
    }

    // Convert BigInt to Number
    const tag = {
      ...rawTag,
      postCount: rawTag.postCount ? Number(rawTag.postCount) : 0
    };

    return res.status(200).json(tag)
  } catch (error) {
    console.error('Error fetching blog tag:', error)
    return handleError(error, res)
  }
}

// PUT - Update a blog tag
async function handlePUT(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // First check if tag exists
    const existingTags = await prisma.$queryRaw`
      SELECT id FROM "BlogTag" WHERE id = ${id}
    `;

    const existingTag = Array.isArray(existingTags) && existingTags.length > 0 ? existingTags[0] : null;

    if (!existingTag) {
      return res.status(404).json({ error: 'Tag not found' })
    }
    
    // Validate request body
    const validationResult = updateTagSchema.safeParse(req.body)
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationResult.error.format() 
      })
    }

    const { name, slug } = validationResult.data

    // Check if the slug is already in use by another tag
    const slugExistsTags = await prisma.$queryRaw`
      SELECT id FROM "BlogTag" WHERE slug = ${slug} AND id != ${id}
    `;

    const slugExistsOnOtherTag = Array.isArray(slugExistsTags) && slugExistsTags.length > 0;

    if (slugExistsOnOtherTag) {
      return res.status(400).json({ error: 'SLUG_EXISTS' })
    }

    // Update the tag
    await prisma.$executeRaw`
      UPDATE "BlogTag"
      SET name = ${name}, slug = ${slug}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    // Get the updated tag
    const updatedTags = await prisma.$queryRaw`
      SELECT id, name, slug, "createdAt", "updatedAt"
      FROM "BlogTag" 
      WHERE id = ${id}
    `;

    const updatedTag = Array.isArray(updatedTags) && updatedTags.length > 0 ? updatedTags[0] : null;

    return res.status(200).json(updatedTag || { id, name, slug, message: 'Updated but could not retrieve updated record' })
  } catch (error) {
    console.error('Error updating blog tag:', error)
    return handleError(error, res)
  }
}

// DELETE - Delete a blog tag
async function handleDELETE(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    // First check if tag exists
    const existingTags = await prisma.$queryRaw`
      SELECT id FROM "BlogTag" WHERE id = ${id}
    `;

    const existingTag = Array.isArray(existingTags) && existingTags.length > 0 ? existingTags[0] : null;

    if (!existingTag) {
      return res.status(404).json({ error: 'Tag not found' })
    }

    // Check if tag is associated with any posts
    const postsCountResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count FROM "BlogPostToTag" WHERE "tagId" = ${id}
    `;

    const postsCount = postsCountResult && Array.isArray(postsCountResult) && postsCountResult.length > 0 
      ? Number(postsCountResult[0].count) 
      : 0;

    if (postsCount > 0) {
      return res.status(400).json({ 
        error: 'TAG_HAS_POSTS',
        postsCount
      })
    }

    // Delete the tag
    await prisma.$executeRaw`
      DELETE FROM "BlogTag" WHERE id = ${id}
    `;

    return res.status(204).send('')
  } catch (error) {
    console.error('Error deleting blog tag:', error)
    return handleError(error, res)
  }
}

// Helper function to handle errors
function handleError(error: any, res: NextApiResponse) {
  if (error instanceof ApiError) {
    return res.status(error.type === ErrorType.INTERNAL ? 500 : 400).json({
      error: error.message,
      type: error.type
    });
  }
  
  return res.status(500).json({ 
    error: 'Internal Server Error',
    message: error.message
  });
} 