import { NextApiRequest, NextApiResponse } from 'next'

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://your-site.com'
  
  // robots.txt içeriği
  const robotsTxt = `# https://www.robotstxt.org/robotstxt.html
User-agent: *
Allow: /

# Belirli sayfaları arama motorlarından gizle
Disallow: /giris-yap
Disallow: /kayit-ol
Disallow: /profil
Disallow: /dashboard/
Disallow: /api/
Disallow: /404
Disallow: /500

# Sitemap
Sitemap: ${baseUrl}/api/sitemap.xml
`

  // text/plain olarak yanıt döndür
  res.setHeader('Content-Type', 'text/plain')
  res.setHeader('Cache-Control', 'public, max-age=3600')
  return res.status(200).send(robotsTxt)
} 