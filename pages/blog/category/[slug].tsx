import React from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { GetServerSideProps } from 'next'
import prisma from '@/lib/prisma'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { slugify } from '@/lib/utils'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  imageUrl: string | null
  published: boolean
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  viewCount: number
  author: {
    id: number
    firstName: string
    lastName: string
    avatarUrl: string | null
  }
}

interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  _count: {
    posts: number
  }
}

interface Props {
  category: Category
  posts: BlogPost[]
  pagination: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
  seo: {
    title: string
    description: string
    keywords: string
    openGraph: {
      title: string
      description: string
      url: string
      type: string
      images: {
        url: string
        width: number
        height: number
        alt: string
      }[]
    }
  }
}

export default function CategoryPage({ category, posts, pagination, seo }: Props) {
  if (!category) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold">Kategori bulunamadı</h1>
        <p className="mt-4">
          Bu kategori mevcut değil veya kaldırılmış olabilir.
        </p>
        <Link href="/blog" className="mt-6 inline-block text-primary hover:underline">
          Blog sayfasına dön
        </Link>
      </div>
    )
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
        {seo.openGraph.images[0] && (
          <>
            <meta property="og:image" content={seo.openGraph.images[0].url} />
            <meta property="og:image:width" content={String(seo.openGraph.images[0].width)} />
            <meta property="og:image:height" content={String(seo.openGraph.images[0].height)} />
            <meta property="og:image:alt" content={seo.openGraph.images[0].alt} />
          </>
        )}
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={seo.openGraph.url} />
        <meta property="twitter:title" content={seo.openGraph.title} />
        <meta property="twitter:description" content={seo.openGraph.description} />
        {seo.openGraph.images[0] && (
          <meta property="twitter:image" content={seo.openGraph.images[0].url} />
        )}
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
              <BreadcrumbLink href={`/blog/category/${category.slug}`}>{category.name}</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Kategori Başlığı ve Açıklaması */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl md:text-4xl font-bold mb-3">{category.name}</h1>
          {category.description && (
            <p className="text-gray-600 max-w-2xl mx-auto">{category.description}</p>
          )}
          <div className="mt-2 text-gray-500">
            {category._count.posts} yazı bulundu
          </div>
        </div>
        
        {/* Blog Yazıları */}
        {posts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {posts.map(post => (
              <Card key={post.id} className="h-full flex flex-col">
                <CardHeader className="p-0">
                  {post.imageUrl && (
                    <div className="aspect-video w-full overflow-hidden rounded-t-lg">
                      <img
                        src={post.imageUrl}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    </div>
                  )}
                </CardHeader>
                <CardContent className="flex-grow pt-6">
                  <CardTitle className="mb-2">
                    <Link 
                      href={`/blog/${post.slug}`}
                      className="hover:text-primary transition-colors line-clamp-2"
                    >
                      {post.title}
                    </Link>
                  </CardTitle>
                  <CardDescription className="line-clamp-3">
                    {post.excerpt || ''}
                  </CardDescription>
                </CardContent>
                <CardFooter className="flex justify-between items-center text-sm text-gray-500 pt-0">
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
                  <span>
                    {post.publishedAt 
                      ? format(new Date(post.publishedAt), 'dd MMM yyyy', { locale: tr })
                      : format(new Date(post.createdAt), 'dd MMM yyyy', { locale: tr })
                    }
                  </span>
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h3 className="text-xl font-medium mb-2">Bu kategoride henüz yazı bulunmuyor</h3>
            <p className="text-gray-600 mb-6">Daha sonra tekrar kontrol edebilir veya diğer kategorilere göz atabilirsiniz.</p>
            <Link 
              href="/blog" 
              className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/90 transition-colors"
            >
              Tüm yazıları gör
            </Link>
          </div>
        )}
        
        {/* Sayfalama */}
        {pagination.totalPages > 1 && (
          <Pagination className="mt-8">
            <PaginationContent>
              {pagination.page > 1 && (
                <PaginationItem>
                  <PaginationPrevious href={`/blog/category/${category.slug}?page=${pagination.page - 1}`} />
                </PaginationItem>
              )}
              
              {Array.from({ length: pagination.totalPages }).map((_, i) => {
                const pageNumber = i + 1
                // İlk, son ve aktif sayfanın etrafındaki 1 sayfayı göster
                if (
                  pageNumber === 1 ||
                  pageNumber === pagination.totalPages ||
                  (pageNumber >= pagination.page - 1 && pageNumber <= pagination.page + 1)
                ) {
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink 
                        href={`/blog/category/${category.slug}?page=${pageNumber}`}
                        isActive={pageNumber === pagination.page}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  )
                }
                
                // İlk sayfadan sonra ve son sayfadan önce ellipsis göster
                if (
                  (pageNumber === 2 && pagination.page > 3) ||
                  (pageNumber === pagination.totalPages - 1 && pagination.page < pagination.totalPages - 2)
                ) {
                  return (
                    <PaginationItem key={pageNumber}>
                      <PaginationEllipsis />
                    </PaginationItem>
                  )
                }
                
                return null
              })}
              
              {pagination.page < pagination.totalPages && (
                <PaginationItem>
                  <PaginationNext href={`/blog/category/${category.slug}?page=${pagination.page + 1}`} />
                </PaginationItem>
              )}
            </PaginationContent>
          </Pagination>
        )}
      </div>
    </>
  )
}

export const getServerSideProps: GetServerSideProps = async ({ params, query }) => {
  try {
    const slug = params?.slug as string

    if (!slug) {
      return { notFound: true }
    }

    // Kategoriyi getir
    const category = await prisma.blogCategory.findUnique({
      where: { slug },
      include: {
        _count: {
          select: {
            posts: true
          }
        }
      }
    })

    if (!category) {
      return { notFound: true }
    }

    const page = Number(query.page) || 1
    const pageSize = 9 // Sayfa başına gösterilecek yazı sayısı
    const skip = (page - 1) * pageSize

    // Kategorinin yazılarını getir
    const posts = await prisma.blogPostToCategory.findMany({
      where: {
        categoryId: category.id,
        post: {
          published: true
        }
      },
      include: {
        post: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
      orderBy: {
        post: {
          publishedAt: 'desc'
        }
      },
      skip,
      take: pageSize,
    })

    // Toplam yazı sayısını getir
    const total = await prisma.blogPostToCategory.count({
      where: {
        categoryId: category.id,
        post: {
          published: true
        }
      }
    })

    const totalPages = Math.ceil(total / pageSize)

    // SEO verilerini oluştur
    const seoData = {
      title: `${category.name} - Blog Kategorisi`,
      description: category.description || 
        `${category.name} kategorisindeki en güncel blog yazılarımız. Toplam ${total} yazı sizleri bekliyor.`,
      keywords: `${category.name}, blog, yazılar, makaleler`,
      openGraph: {
        title: `${category.name} - Blog Kategorisi`,
        description: category.description || 
          `${category.name} kategorisindeki en güncel blog yazılarımız. Toplam ${total} yazı sizleri bekliyor.`,
        url: `${process.env.NEXT_PUBLIC_SITE_URL}/blog/category/${category.slug}`,
        type: 'website',
        images: [
          {
            url: `${process.env.NEXT_PUBLIC_SITE_URL}/images/blog-category.jpg`,
            width: 1200,
            height: 630,
            alt: `${category.name} Kategorisi`,
          },
        ],
      }
    }

    // Veriyi formatlayarak döndür
    const formattedPosts = posts.map(postToCategory => ({
      id: postToCategory.post.id,
      title: postToCategory.post.title,
      slug: postToCategory.post.slug,
      excerpt: postToCategory.post.excerpt,
      imageUrl: postToCategory.post.imageUrl,
      published: postToCategory.post.published,
      publishedAt: postToCategory.post.publishedAt?.toISOString() || null,
      createdAt: postToCategory.post.createdAt.toISOString(),
      updatedAt: postToCategory.post.updatedAt.toISOString(),
      viewCount: postToCategory.post.viewCount,
      author: {
        id: postToCategory.post.author.id,
        firstName: postToCategory.post.author.firstName,
        lastName: postToCategory.post.author.lastName,
        avatarUrl: postToCategory.post.author.avatarUrl,
      },
    }))

    return {
      props: {
        category,
        posts: formattedPosts,
        pagination: {
          total,
          page,
          pageSize,
          totalPages,
        },
        seo: seoData,
      },
    }
  } catch (error) {
    console.error('Kategori sayfası hatası:', error)
    return { notFound: true }
  }
} 