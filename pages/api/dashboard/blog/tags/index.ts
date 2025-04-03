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

// Validation schema for creating a new tag
const createTagSchema = z.object({
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
      await limiter.check(res, 10, 'BLOG_TAGS_CACHE_TOKEN') // 10 requests per minute
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

    // Handle different HTTP methods
    switch (req.method) {
      case 'GET':
        return handleGET(req, res)
      case 'POST':
        return handlePOST(req, res)
      default:
        return res.status(405).json({ error: 'Method Not Allowed' })
    }
  } catch (error) {
    console.error('Blog tags API error:', error)
    return handleError(error, res)
  }
}

// GET - Fetch all blog tags
async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Use Prisma raw query since BlogTag might not be fully defined in the schema yet
    const tags = await prisma.$queryRaw`
      SELECT 
        id, name, slug, "createdAt", "updatedAt",
        (SELECT COUNT(*) FROM "BlogPostToTag" WHERE "tagId" = "BlogTag".id) as "postCount"
      FROM "BlogTag" 
      ORDER BY name ASC
    `;

    // Convert BigInt values to Number before sending response
    const sanitizedTags = Array.isArray(tags) ? tags.map(tag => ({
      ...tag,
      postCount: tag.postCount ? Number(tag.postCount) : 0
    })) : [];

    return res.status(200).json(sanitizedTags);
  } catch (error) {
    console.error('Error fetching blog tags:', error)
    return handleError(error, res)
  }
}

// POST - Create a new blog tag
async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Validate request body
    const validationResult = createTagSchema.safeParse(req.body)
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Validation failed', 
        details: validationResult.error.format() 
      })
    }

    const { name, slug } = validationResult.data

    // Check if slug already exists using raw query
    const existingTags = await prisma.$queryRaw`
      SELECT id FROM "BlogTag" WHERE slug = ${slug} LIMIT 1
    `;

    if (existingTags && Array.isArray(existingTags) && existingTags.length > 0) {
      return res.status(400).json({ error: 'SLUG_EXISTS' })
    }

    // Create new tag using raw query
    const result = await prisma.$executeRaw`
      INSERT INTO "BlogTag" (id, name, slug, "createdAt", "updatedAt")
      VALUES (gen_random_uuid(), ${name}, ${slug}, NOW(), NOW())
      RETURNING id, name, slug, "createdAt", "updatedAt"
    `;

    // Get the newly created tag
    const newTags = await prisma.$queryRaw`
      SELECT id, name, slug, "createdAt", "updatedAt"
      FROM "BlogTag" 
      WHERE slug = ${slug}
      LIMIT 1
    `;
    
    const newTag = Array.isArray(newTags) && newTags.length > 0 ? newTags[0] : null;

    return res.status(201).json(newTag || { 
      name, 
      slug, 
      message: 'Tag created but could not retrieve the full record' 
    })
  } catch (error) {
    console.error('Error creating blog tag:', error)
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