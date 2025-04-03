import React, { useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { GetServerSideProps } from 'next'
import prisma from '@/lib/prisma'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import { useSession } from 'next-auth/react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
import MainLayout from '@/components/layouts/MainLayout'
import { NextPageWithLayout } from '@/lib/types'
import { ReactElement } from 'react'

interface BlogPost {
  id: string
  title: string
  slug: string
  excerpt: string | null
  content: string
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

interface BlogCategory {
  id: string
  name: string
  slug: string
  _count: {
    posts: number
  }
}

interface BlogTag {
  id: string
  name: string
  slug: string
  _count: {
    posts: number
  }
}

interface Props {
  posts: BlogPost[]
  categories: BlogCategory[]
  tags: BlogTag[]
  currentPage: number
  totalPages: number
  totalPosts: number
  featuredPost: BlogPost | null
}

const BlogPage: NextPageWithLayout = ({ posts, categories, tags, currentPage, totalPages, totalPosts, featuredPost }: Props) => {
  const router = useRouter()
  const { data: session } = useSession()
  const [searchTerm, setSearchTerm] = useState('')

  // SEO bilgileri
  const siteTitle = 'Blog | E-Ticaret Sitemiz - Güncel Ürün Bilgileri ve Haberler'
  const siteDescription = 'E-ticaret sitemizin blog bölümünde ürünler, endüstri trendleri ve faydalı bilgiler bulabilirsiniz. En son yazılarımızı keşfedin!'
  const siteKeywords = 'e-ticaret blog, online alışveriş blog, ürün incelemeleri, e-ticaret trendleri, alışveriş tavsiyeleri'
  const canonicalUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/blog`

  // Arama işlemi
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    router.push({
      pathname: '/blog',
      query: { ...router.query, search: searchTerm, page: 1 }
    })
  }

  // Kategori filtreleme
  const handleCategoryChange = (value: string) => {
    router.push({
      pathname: '/blog',
      query: { category: value, page: 1 }
    })
  }

  // Sayfalama işlemi
  const handlePageChange = (page: number) => {
    router.push({
      pathname: '/blog',
      query: { ...router.query, page }
    })
  }

  return (
    <>
      <Head>
        <title>{siteTitle}</title>
        <meta name="description" content={siteDescription} />
        <meta name="keywords" content={siteKeywords} />
        <link rel="canonical" href={canonicalUrl} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:title" content={siteTitle} />
        <meta property="og:description" content={siteDescription} />
        <meta property="og:image" content={`${process.env.NEXT_PUBLIC_SITE_URL}/images/blog-cover.jpg`} />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={canonicalUrl} />
        <meta property="twitter:title" content={siteTitle} />
        <meta property="twitter:description" content={siteDescription} />
        <meta property="twitter:image" content={`${process.env.NEXT_PUBLIC_SITE_URL}/images/blog-cover.jpg`} />
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
          </BreadcrumbList>
        </Breadcrumb>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Sol Kenar Çubuğu - Filtreler */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Blog</CardTitle>
                <CardDescription>Kategoriler ve etiketler</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Arama Formu */}
                <form onSubmit={handleSearch} className="space-y-2">
                  <Input
                    type="text"
                    placeholder="Blog yazılarında ara..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  <Button type="submit" className="w-full">Ara</Button>
                </form>

                {/* Kategori Listesi */}
                <div>
                  <h3 className="font-semibold mb-2">Kategoriler</h3>
                  <Select
                    onValueChange={handleCategoryChange}
                    defaultValue={router.query.category as string || "all"}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Kategori seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tüm Kategoriler</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.slug}>
                          {category.name} ({category._count.posts})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Etiket Listesi */}
                <div>
                  <h3 className="font-semibold mb-2">Popüler Etiketler</h3>
                  <div className="flex flex-wrap gap-2">
                    {tags.slice(0, 10).map((tag) => (
                      <Link
                        key={tag.id}
                        href={`/blog?tag=${tag.slug}`}
                        className="text-sm bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded"
                      >
                        {tag.name} ({tag._count.posts})
                      </Link>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Ana İçerik */}
          <div className="md:col-span-3">
            {/* Öne Çıkan Blog Yazısı */}
            {featuredPost && (
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-4">Öne Çıkan Yazı</h2>
                <Card className="overflow-hidden">
                  <div className="relative">
                    {featuredPost.imageUrl && (
                      <img 
                        src={featuredPost.imageUrl} 
                        alt={featuredPost.title}
                        className="w-full h-[300px] object-cover"
                      />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-6 text-white">
                      <h3 className="text-xl font-bold mb-2">{featuredPost.title}</h3>
                      <p className="mb-2 line-clamp-2">{featuredPost.excerpt}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-sm">
                          {featuredPost.publishedAt && (
                            format(new Date(featuredPost.publishedAt), 'dd MMMM yyyy', { locale: tr })
                          )}
                        </span>
                        <Link href={`/blog/${featuredPost.slug}`} className="text-white hover:underline">
                          Devamını Oku →
                        </Link>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Blog Yazı Listesi */}
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Blog Yazıları</h2>
                <span className="text-sm text-gray-600">Toplam {totalPosts} yazı</span>
              </div>

              {posts.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center">
                    <p>Henüz blog yazısı bulunmuyor.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {posts.map((post) => (
                    <Card key={post.id} className="overflow-hidden flex flex-col h-full">
                      <div className="relative h-48">
                        {post.imageUrl ? (
                          <img 
                            src={post.imageUrl} 
                            alt={post.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-400">Görsel Yok</span>
                          </div>
                        )}
                        {post.categories && post.categories.length > 0 && (
                          <div className="absolute top-2 right-2">
                            <span className="bg-primary text-white text-xs px-2 py-1 rounded">
                              {post.categories[0].name}
                            </span>
                          </div>
                        )}
                      </div>
                      <CardHeader className="pb-2">
                        <CardTitle className="line-clamp-2">
                          <Link href={`/blog/${post.slug}`} className="hover:text-primary transition-colors">
                            {post.title}
                          </Link>
                        </CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <span>
                            {post.author.firstName} {post.author.lastName}
                          </span>
                          <span>•</span>
                          <span>
                            {post.publishedAt && (
                              format(new Date(post.publishedAt), 'dd MMM yyyy', { locale: tr })
                            )}
                          </span>
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="flex-grow">
                        <p className="line-clamp-3 text-gray-600">
                          {post.excerpt || post.content.substring(0, 150)}...
                        </p>
                      </CardContent>
                      <CardFooter className="flex justify-between items-center">
                        <div className="flex items-center text-sm text-gray-500">
                          <span>{post.viewCount} görüntülenme</span>
                        </div>
                        <Link 
                          href={`/blog/${post.slug}`}
                          className="text-primary hover:underline text-sm"
                        >
                          Devamını Oku →
                        </Link>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              )}

              {/* Sayfalama */}
              {totalPages > 1 && (
                <div className="mt-8">
                  <Pagination>
                    <PaginationContent>
                      {currentPage > 1 && (
                        <PaginationItem>
                          <PaginationPrevious 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              handlePageChange(currentPage - 1);
                            }} 
                          />
                        </PaginationItem>
                      )}
                      
                      {Array.from({ length: totalPages }).map((_, i) => {
                        const pageNumber = i + 1;
                        // İlk, son ve aktif sayfanın etrafındaki 1 sayfayı göster
                        if (
                          pageNumber === 1 ||
                          pageNumber === totalPages ||
                          (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                        ) {
                          return (
                            <PaginationItem key={pageNumber}>
                              <PaginationLink 
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  handlePageChange(pageNumber);
                                }}
                                isActive={pageNumber === currentPage}
                              >
                                {pageNumber}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        }
                        
                        // İlk sayfadan sonra ve son sayfadan önce ellipsis göster
                        if (
                          (pageNumber === 2 && currentPage > 3) ||
                          (pageNumber === totalPages - 1 && currentPage < totalPages - 2)
                        ) {
                          return (
                            <PaginationItem key={pageNumber}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                        
                        return null;
                      })}
                      
                      {currentPage < totalPages && (
                        <PaginationItem>
                          <PaginationNext 
                            href="#" 
                            onClick={(e) => {
                              e.preventDefault();
                              handlePageChange(currentPage + 1);
                            }} 
                          />
                        </PaginationItem>
                      )}
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

BlogPage.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>
}

export default BlogPage

export const getServerSideProps: GetServerSideProps = async ({ query }) => {
  const page = parseInt(query.page as string || '1', 10)
  const limit = 9
  const skip = (page - 1) * limit
  
  // Filtreler
  const where: any = { published: true }
  
  // Kategori filtresi
  if (query.category) {
    where.categories = {
      some: {
        category: {
          slug: query.category as string
        }
      }
    }
  }
  
  // Etiket filtresi
  if (query.tag) {
    where.tags = {
      some: {
        tag: {
          slug: query.tag as string
        }
      }
    }
  }
  
  // Arama filtresi
  if (query.search) {
    where.OR = [
      { title: { contains: query.search as string, mode: 'insensitive' } },
      { content: { contains: query.search as string, mode: 'insensitive' } },
      { excerpt: { contains: query.search as string, mode: 'insensitive' } },
    ]
  }
  
  try {
    // Toplam yazı sayısı
    // @ts-ignore
    const totalPosts = await prisma.blogPost.count({ where })
    
    // Blog yazıları (en son yazılanlar ilk sırada)
    // @ts-ignore
    const postsData = await prisma.blogPost.findMany({
      where,
      skip,
      take: limit,
      orderBy: { publishedAt: 'desc' },
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
    
    // Kategorileri getir
    // @ts-ignore
    const categoriesData = await prisma.blogCategory.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: { posts: true },
        },
      },
    })
    
    // Etiketleri getir
    // @ts-ignore
    const tagsData = await prisma.blogTag.findMany({
      orderBy: [
        { posts: { _count: 'desc' } },
        { name: 'asc' },
      ],
      select: {
        id: true,
        name: true,
        slug: true,
        _count: {
          select: { posts: true },
        },
      },
    })
    
    // Öne çıkan yazı (en çok görüntülenen)
    // @ts-ignore
    const featuredPostData = await prisma.blogPost.findFirst({
      where: { published: true },
      orderBy: { viewCount: 'desc' },
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
    
    // Properly format all data for JSON serialization
    const posts = postsData.map((post: any) => ({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      imageUrl: post.imageUrl,
      published: post.published,
      publishedAt: post.publishedAt ? post.publishedAt.toISOString() : null,
      viewCount: post.viewCount,
      createdAt: post.createdAt.toISOString(),
      updatedAt: post.updatedAt.toISOString(),
      author: {
        id: post.author.id,
        firstName: post.author.firstName,
        lastName: post.author.lastName,
        avatarUrl: post.author.avatarUrl
      },
      categories: post.categories.map((c: any) => ({
        id: c.category.id,
        name: c.category.name,
        slug: c.category.slug
      })),
      tags: post.tags.map((t: any) => ({
        id: t.tag.id,
        name: t.tag.name,
        slug: t.tag.slug
      }))
    }))
    
    const categories = categoriesData.map((category: any) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      _count: category._count
    }))
    
    const tags = tagsData.map((tag: any) => ({
      id: tag.id,
      name: tag.name,
      slug: tag.slug,
      _count: tag._count
    }))
    
    const featuredPost = featuredPostData ? {
      id: featuredPostData.id,
      title: featuredPostData.title,
      slug: featuredPostData.slug,
      excerpt: featuredPostData.excerpt,
      content: featuredPostData.content,
      imageUrl: featuredPostData.imageUrl,
      published: featuredPostData.published,
      publishedAt: featuredPostData.publishedAt ? featuredPostData.publishedAt.toISOString() : null,
      viewCount: featuredPostData.viewCount,
      createdAt: featuredPostData.createdAt.toISOString(),
      updatedAt: featuredPostData.updatedAt.toISOString(),
      author: {
        id: featuredPostData.author.id,
        firstName: featuredPostData.author.firstName,
        lastName: featuredPostData.author.lastName,
        avatarUrl: featuredPostData.author.avatarUrl
      },
      categories: featuredPostData.categories.map((c: any) => ({
        id: c.category.id,
        name: c.category.name,
        slug: c.category.slug
      })),
      tags: featuredPostData.tags.map((t: any) => ({
        id: t.tag.id,
        name: t.tag.name,
        slug: t.tag.slug
      }))
    } : null
    
    return {
      props: {
        posts,
        categories,
        tags,
        currentPage: page,
        totalPages: Math.ceil(totalPosts / limit),
        totalPosts,
        featuredPost,
      },
    }
  } catch (error) {
    console.error('Blog sayfası veri getirme hatası:', error)
    return {
      props: {
        posts: [],
        categories: [],
        tags: [],
        currentPage: 1,
        totalPages: 1,
        totalPosts: 0,
        featuredPost: null,
      },
    }
  }
} 