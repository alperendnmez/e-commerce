import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { GetServerSideProps } from 'next'
import prisma from '@/lib/prisma'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import MainLayout from '@/components/layouts/MainLayout'
import { NextPageWithLayout } from '@/lib/types'
import { ReactElement } from 'react'

interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  imageUrl: string | null
  published: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  viewCount: number
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
  author: {
    id: number
    firstName: string
    lastName: string
    avatarUrl: string | null
  }
  categories: {
    id: string
    name: string
    slug: string
  }[]
  tags: {
    id: string
    name: string
    slug: string
  }[]
}

interface Props {
  post: BlogPost
  relatedPosts: BlogPost[]
  seo: {
    title: string
    description: string
    keywords: string
    openGraph: {
      title: string
      description: string
      url: string
      type: string
      article: {
        publishedTime: string | null
        modifiedTime: string
        authors: string[]
        tags: string[]
      }
      images: {
        url: string
        width: number
        height: number
        alt: string
      }[]
    }
  }
}

const BlogPostPage: NextPageWithLayout<Props> = ({ post, relatedPosts, seo }: Props) => {
  if (!post) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold">Blog yazısı bulunamadı</h1>
        <p className="mt-4">
          Bu blog yazısı mevcut değil veya kaldırılmış olabilir.
        </p>
        <Link href="/blog" className="mt-6 inline-block text-primary hover:underline">
          Blog sayfasına dön
        </Link>
      </div>
    )
  }

  // Yayınlanma tarihini biçimlendir
  const publishDate = post.publishedAt 
    ? format(new Date(post.publishedAt), 'dd MMMM yyyy', { locale: tr })
    : format(new Date(post.createdAt), 'dd MMMM yyyy', { locale: tr })

  // Blog içeriğini HTML olarak render et
  const renderContent = () => {
    return { __html: post.content }
  }

  return (
    <>
      <Head>
        <title>{seo.title}</title>
        <meta name="description" content={seo.description} />
        {seo.keywords && <meta name="keywords" content={seo.keywords} />}
        <link rel="canonical" href={seo.openGraph.url} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content={seo.openGraph.type} />
        <meta property="og:url" content={seo.openGraph.url} />
        <meta property="og:title" content={seo.openGraph.title} />
        <meta property="og:description" content={seo.openGraph.description} />
        <meta property="og:image" content={seo.openGraph.images[0].url} />
        <meta property="og:image:width" content={String(seo.openGraph.images[0].width)} />
        <meta property="og:image:height" content={String(seo.openGraph.images[0].height)} />
        <meta property="og:image:alt" content={seo.openGraph.images[0].alt} />
        
        {/* Article Specifics */}
        {seo.openGraph.article.publishedTime && (
          <meta property="article:published_time" content={seo.openGraph.article.publishedTime} />
        )}
        <meta property="article:modified_time" content={seo.openGraph.article.modifiedTime} />
        {seo.openGraph.article.authors.map((author, i) => (
          <meta key={i} property="article:author" content={author} />
        ))}
        {seo.openGraph.article.tags.map((tag, i) => (
          <meta key={i} property="article:tag" content={tag} />
        ))}
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={seo.openGraph.url} />
        <meta property="twitter:title" content={seo.openGraph.title} />
        <meta property="twitter:description" content={seo.openGraph.description} />
        <meta property="twitter:image" content={seo.openGraph.images[0].url} />
        
        {/* JSON-LD Structured Data */}
        <script 
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BlogPosting",
              "headline": post.title,
              "image": [
                post.imageUrl || `${process.env.NEXT_PUBLIC_SITE_URL}/images/default-blog.jpg`
              ],
              "datePublished": post.publishedAt || post.createdAt,
              "dateModified": post.updatedAt,
              "author": {
                "@type": "Person",
                "name": `${post.author.firstName} ${post.author.lastName}`
              },
              "publisher": {
                "@type": "Organization",
                "name": "E-Ticaret Sitemiz",
                "logo": {
                  "@type": "ImageObject",
                  "url": `${process.env.NEXT_PUBLIC_SITE_URL}/logo.png`
                }
              },
              "description": post.excerpt || seo.description,
              "mainEntityOfPage": {
                "@type": "WebPage",
                "@id": seo.openGraph.url
              },
              "keywords": post.tags.map(tag => tag.name).join(', ')
            })
          }}
        />
      </Head>

      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/">Ana Sayfa</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/blog">Blog</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href={`/blog/${post.slug}`}>{post.title}</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            {/* Blog Yazı Başlığı */}
            <h1 className="text-3xl md:text-4xl font-bold mb-4">{post.title}</h1>
            
            {/* Meta Bilgiler */}
            <div className="flex flex-wrap items-center gap-3 text-gray-600 mb-6">
              <div className="flex items-center gap-2">
                {post.author.avatarUrl ? (
                  <img 
                    src={post.author.avatarUrl} 
                    alt={`${post.author.firstName} ${post.author.lastName}`}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-gray-200"></div>
                )}
                <span>{post.author.firstName} {post.author.lastName}</span>
              </div>
              <span>•</span>
              <span>{publishDate}</span>
              <span>•</span>
              <span>{post.viewCount} görüntülenme</span>
            </div>
            
            {/* Blog Görseli */}
            {post.imageUrl && (
              <div className="mb-8">
                <img 
                  src={post.imageUrl} 
                  alt={post.title}
                  className="w-full h-auto rounded-lg object-cover max-h-[500px]"
                />
              </div>
            )}
            
            {/* Kategori ve Etiketler */}
            <div className="flex flex-wrap gap-2 mb-6">
              {post.categories.map(category => (
                <Link 
                  key={category.id}
                  href={`/blog?category=${category.slug}`}
                  className="bg-primary text-white text-sm px-3 py-1 rounded-full hover:bg-primary/90 transition-colors"
                >
                  {category.name}
                </Link>
              ))}
              {post.tags.map(tag => (
                <Link 
                  key={tag.id}
                  href={`/blog?tag=${tag.slug}`}
                  className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full hover:bg-gray-200 transition-colors"
                >
                  #{tag.name}
                </Link>
              ))}
            </div>
            
            {/* Blog İçeriği */}
            <Card>
              <CardContent className="py-6">
                <div 
                  className="prose lg:prose-xl prose-headings:text-gray-900 prose-p:text-gray-700 prose-a:text-primary prose-img:rounded-lg prose-blockquote:border-primary prose-blockquote:text-gray-600 prose-blockquote:bg-gray-50 prose-blockquote:p-4 max-w-none"
                  dangerouslySetInnerHTML={renderContent()}
                />
              </CardContent>
            </Card>
            
            {/* Paylaşım Linkleri */}
            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-3">Bu yazıyı paylaş:</h3>
              <div className="flex gap-3">
                <a 
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(seo.openGraph.url)}&text=${encodeURIComponent(post.title)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#1DA1F2] text-white px-4 py-2 rounded-md hover:bg-[#1DA1F2]/90 transition-colors"
                >
                  Twitter
                </a>
                <a 
                  href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(seo.openGraph.url)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#4267B2] text-white px-4 py-2 rounded-md hover:bg-[#4267B2]/90 transition-colors"
                >
                  Facebook
                </a>
                <a 
                  href={`https://wa.me/?text=${encodeURIComponent(post.title + ' ' + seo.openGraph.url)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-[#25D366] text-white px-4 py-2 rounded-md hover:bg-[#25D366]/90 transition-colors"
                >
                  WhatsApp
                </a>
              </div>
            </div>
            
            {/* En Son Yazılar */}
            <div className="mt-12">
              <h3 className="text-2xl font-bold mb-6">En Son Yazılar</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedPosts.length > 0 ? (
                  relatedPosts.slice(0, 3).map(related => (
                    <Card key={related.id} className="h-full flex flex-col">
                      <CardHeader className="p-0">
                        {related.imageUrl && (
                          <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                            <img
                              src={related.imageUrl}
                              alt={related.title}
                              className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                            />
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="flex-grow pt-6">
                        <CardTitle className="mb-2">
                          <Link 
                            href={`/blog/${related.slug}`}
                            className="hover:text-primary transition-colors line-clamp-2"
                          >
                            {related.title}
                          </Link>
                        </CardTitle>
                        <div className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                          <span>
                            {related.publishedAt ? (
                              format(new Date(related.publishedAt), 'dd MMM yyyy', { locale: tr })
                            ) : (
                              format(new Date(related.createdAt), 'dd MMM yyyy', { locale: tr })
                            )}
                          </span>
                          <span>•</span>
                          <span>{related.viewCount} görüntülenme</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <p className="text-gray-500 col-span-3 text-center">İlgili yazı bulunamadı.</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Sağ Kenar Çubuğu */}
          <div className="lg:col-span-1">
            {/* İlgili Yazılar */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">İlgili Yazılar</h3>
                <div className="space-y-4">
                  {relatedPosts.length > 0 ? (
                    relatedPosts.map(related => (
                      <div key={related.id} className="border-b border-gray-100 pb-4 last:border-b-0 last:pb-0">
                        <Link 
                          href={`/blog/${related.slug}`}
                          className="font-medium hover:text-primary transition-colors line-clamp-2"
                        >
                          {related.title}
                        </Link>
                        <p className="text-gray-500 text-sm mt-1">
                          {related.publishedAt ? (
                            format(new Date(related.publishedAt), 'dd MMM yyyy', { locale: tr })
                          ) : (
                            format(new Date(related.createdAt), 'dd MMM yyyy', { locale: tr })
                          )}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500">İlgili yazı bulunamadı.</p>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Popüler Etiketler */}
            <Card className="mt-6">
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Popüler Etiketler</h3>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map(tag => (
                    <Link 
                      key={tag.id}
                      href={`/blog?tag=${tag.slug}`}
                      className="bg-gray-100 text-gray-700 text-sm px-3 py-1 rounded-full hover:bg-gray-200 transition-colors"
                    >
                      #{tag.name}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* Blog Footer */}
      <div className="bg-gray-50 border-t mt-16">
        <div className="container mx-auto px-4 py-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Site Hakkında */}
            <div>
              <h4 className="text-lg font-bold mb-4">E-Ticaret Sitemiz</h4>
              <p className="text-gray-600 mb-6">
                Kaliteli ürünler, uygun fiyatlar ve güvenilir alışveriş deneyimi ile hizmetinizdeyiz. 
                Blog sayfamızda ürünlerimiz, sektör haberleri ve güncel bilgiler sunuyoruz.
              </p>
            </div>
            
            {/* Kategoriler */}
            <div>
              <h4 className="text-lg font-bold mb-4">Popüler Kategoriler</h4>
              <ul className="space-y-2">
                {post.categories.map(category => (
                  <li key={category.id}>
                    <Link 
                      href={`/blog/category/${category.slug}`}
                      className="text-gray-600 hover:text-primary transition-colors"
                    >
                      {category.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link 
                    href="/blog"
                    className="text-primary hover:underline"
                  >
                    Tüm Kategorileri Gör →
                  </Link>
                </li>
              </ul>
            </div>
            
            {/* Bağlantılar */}
            <div>
              <h4 className="text-lg font-bold mb-4">Bizi Takip Edin</h4>
              <div className="flex space-x-4 mb-6">
                <a 
                  href="https://twitter.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-[#1DA1F2] text-white w-10 h-10 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <span className="sr-only">Twitter</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
                </a>
                <a 
                  href="https://facebook.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-[#4267B2] text-white w-10 h-10 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <span className="sr-only">Facebook</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                </a>
                <a 
                  href="https://instagram.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-[#E1306C] text-white w-10 h-10 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <span className="sr-only">Instagram</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
                </a>
                <a 
                  href="https://youtube.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="bg-[#FF0000] text-white w-10 h-10 rounded-full flex items-center justify-center hover:opacity-90 transition-opacity"
                >
                  <span className="sr-only">Youtube</span>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"></path><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"></polygon></svg>
                </a>
              </div>
              <Link 
                href="/"
                className="text-primary hover:underline"
              >
                Ana Sayfaya Dön
              </Link>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t text-center text-gray-500 text-sm">
            <p>© {new Date().getFullYear()} E-Ticaret Sitemiz. Tüm hakları saklıdır.</p>
          </div>
        </div>
      </div>
    </>
  )
}

BlogPostPage.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>
}

export const getServerSideProps: GetServerSideProps = async ({ params, req }) => {
  try {
    const slug = params?.slug as string

    if (!slug) {
      return { notFound: true }
    }

    // Blog yazısını getir
    // @ts-ignore
    const post = await prisma.blogPost.findFirst({
      where: { 
        slug,
        published: true 
      },
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
      return { notFound: true }
    }

    // Görüntülenme sayısını artır (bot olmayan gerçek kullanıcılar için)
    const userAgent = req.headers['user-agent'] || ''
    if (userAgent && !userAgent.includes('bot')) {
      // @ts-ignore
      await prisma.blogPost.update({
        where: { id: post.id },
        data: { viewCount: { increment: 1 } }
      })
    }

    // İlgili blog yazılarını getir (aynı kategoriden ve etiketlerden)
    const categoryIds = post.categories.map((c: any) => c.category.id)
    const tagIds = post.tags.map((t: any) => t.tag.id)

    // @ts-ignore
    const relatedPosts = await prisma.blogPost.findMany({
      where: {
        AND: [
          { published: true },
          { id: { not: post.id } }, // Ana yazıyı hariç tut
          {
            OR: [
              { categories: { some: { categoryId: { in: categoryIds } } } },
              { tags: { some: { tagId: { in: tagIds } } } },
            ]
          }
        ]
      },
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
      orderBy: { viewCount: 'desc' },
      take: 5, // En popüler 5 ilgili yazı
    })

    // SEO verilerini oluştur
    const seoData = {
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt || `${post.content.substring(0, 160)}...`,
      keywords: post.seoKeywords || post.tags.map((t: any) => t.tag.name).join(', '),
      openGraph: {
        title: post.seoTitle || post.title,
        description: post.seoDescription || post.excerpt || `${post.content.substring(0, 160)}...`,
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/blog/${post.slug}`,
        type: 'article',
        article: {
          publishedTime: post.publishedAt?.toISOString() || null,
          modifiedTime: post.updatedAt.toISOString(),
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

    // Veriyi formatlayarak döndür
    const formattedPost = {
      ...post,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      publishedAt: post.publishedAt?.toISOString() || null,
      categories: post.categories.map((c: any) => c.category),
      tags: post.tags.map((t: any) => t.tag),
      imageUrl: post.featuredImage || post.imageUrl // Hem featuredImage hem de imageUrl'i kontrol et
    }

    const formattedRelatedPosts = relatedPosts.map((related: any) => ({
      ...related,
      createdAt: related.createdAt.toISOString(),
      updatedAt: related.updatedAt.toISOString(),
      publishedAt: related.publishedAt?.toISOString() || null,
      categories: related.categories.map((c: any) => c.category),
      tags: related.tags.map((t: any) => t.tag),
    }))

    return {
      props: {
        post: formattedPost,
        relatedPosts: formattedRelatedPosts,
        seo: seoData,
      },
    }
  } catch (error) {
    console.error('Blog yazısı detay sayfası hatası:', error)
    return { notFound: true }
  }
}

export default BlogPostPage 