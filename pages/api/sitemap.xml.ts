import { NextApiRequest, NextApiResponse } from 'next'
import prisma from '@/lib/prisma'

interface SitemapItem {
  slug: string
  updatedAt: Date
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Ana kategori ve ürün URL'lerini getir
    const categories = await prisma.category.findMany({
      where: { isActive: true, isArchived: false },
      select: { slug: true, updatedAt: true }
    })

    const products = await prisma.product.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true }
    })

    // Blog içeriklerini getir
    // @ts-ignore
    const blogPosts = await prisma.blogPost.findMany({
      where: { published: true },
      select: { slug: true, updatedAt: true }
    })

    // @ts-ignore
    const blogCategories = await prisma.blogCategory.findMany({
      select: { slug: true, updatedAt: true }
    })

    // @ts-ignore
    const blogTags = await prisma.blogTag.findMany({
      select: { slug: true, updatedAt: true }
    })

    // Site temel URL'i
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-site.com'

    // XML içeriğini oluştur
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <!-- Ana Sayfalar -->
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/hakkimizda</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/iletisim</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- Kategori Sayfaları -->
  ${categories.map((category: SitemapItem) => `
  <url>
    <loc>${baseUrl}/kategoriler/${category.slug}</loc>
    <lastmod>${category.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  `).join('')}
  
  <!-- Ürün Sayfaları -->
  ${products.map((product: SitemapItem) => `
  <url>
    <loc>${baseUrl}/urunler/${product.slug}</loc>
    <lastmod>${product.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
  `).join('')}
  
  <!-- Blog Ana Sayfası -->
  <url>
    <loc>${baseUrl}/blog</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>
  
  <!-- Blog Kategori Sayfaları -->
  ${blogCategories.map((category: SitemapItem) => `
  <url>
    <loc>${baseUrl}/blog/kategori/${category.slug}</loc>
    <lastmod>${category.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  `).join('')}
  
  <!-- Blog Etiket Sayfaları -->
  ${blogTags.map((tag: SitemapItem) => `
  <url>
    <loc>${baseUrl}/blog/etiket/${tag.slug}</loc>
    <lastmod>${tag.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.6</priority>
  </url>
  `).join('')}
  
  <!-- Blog Yazı Sayfaları -->
  ${blogPosts.map((post: SitemapItem) => `
  <url>
    <loc>${baseUrl}/blog/${post.slug}</loc>
    <lastmod>${post.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  `).join('')}
</urlset>`

    // XML yanıtını döndür
    res.setHeader('Content-Type', 'text/xml')
    res.setHeader('Cache-Control', 'public, s-maxage=1200, stale-while-revalidate=600')
    return res.status(200).send(sitemap)
  } catch (error) {
    console.error('Error generating sitemap:', error)
    return res.status(500).send('Error generating sitemap')
  }
} 