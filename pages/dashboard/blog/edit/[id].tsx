import React, { ReactElement, useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import axios from 'axios'
import { ArrowLeft, Save, X, Upload, Eye, EyeOff, Image as ImageIcon, Plus } from 'lucide-react'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Editor } from '@/components/Editor'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { tagSeparator } from '@/lib/constants'
import TagInput from '@/components/TagInput'
import { Skeleton } from '@/components/ui/skeleton'

// Blog yazısı şeması
const blogPostSchema = z.object({
  title: z.string().min(5, {
    message: 'Başlık en az 5 karakter olmalıdır.',
  }),
  excerpt: z.string().min(10, {
    message: 'Özet en az 10 karakter olmalıdır.',
  }).max(300, {
    message: 'Özet en fazla 300 karakter olabilir.',
  }),
  content: z.string().min(50, {
    message: 'İçerik en az 50 karakter olmalıdır.',
  }),
  featuredImage: z.string().optional().or(z.literal('')),
  categoryId: z.string().optional(),
  tags: z.array(z.string()).optional(),
  status: z.enum(['DRAFT', 'PUBLISHED', 'SCHEDULED']),
  publishedAt: z.date().optional().nullable(),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
})

// BlogCategory tipi
interface BlogCategory {
  id: string
  name: string
  slug: string
  description?: string | null
  _count?: {
    posts: number
  }
}

// BlogTag tipi
interface BlogTag {
  id: string
  name: string
  slug: string
  _count?: {
    posts: number
  }
}

// Blog yazısı tipi
interface BlogPost {
  id: string
  title: string
  slug: string
  content: string
  excerpt: string | null
  featuredImage: string | null
  published: boolean
  publishedAt: string | null
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
  createdAt: string
  updatedAt: string
  authorId: number
  categories: { 
    category: BlogCategory 
  }[]
  tags: { 
    tag: BlogTag 
  }[]
}

const EditBlogPost = () => {
  const router = useRouter()
  const { id } = router.query
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [tags, setTags] = useState<string[]>([])
  const [featuredImagePreview, setFeaturedImagePreview] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [blogData, setBlogData] = useState<BlogPost | null>(null)

  // Form tanımı
  const form = useForm<z.infer<typeof blogPostSchema>>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: '',
      excerpt: '',
      content: '',
      featuredImage: '',
      categoryId: '',
      tags: [],
      status: 'DRAFT',
      publishedAt: null,
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
    }
  })

  // Form değerlerini izle
  const watchFeaturedImage = form.watch('featuredImage')
  const watchSeoTitle = form.watch('seoTitle')
  const watchTitle = form.watch('title')
  const watchExcerpt = form.watch('excerpt')
  const watchSeoDescription = form.watch('seoDescription')
  const watchStatus = form.watch('status')

  // Blog yazısını yükle
  useEffect(() => {
    const fetchBlogPost = async () => {
      if (!id) return
      
      setIsLoading(true)
      try {
        const response = await axios.get(`/api/dashboard/blog/${id}`)
        const post = response.data
        setBlogData(post)
        
        // Form değerlerini doldur
        form.reset({
          title: post.title,
          excerpt: post.excerpt || '',
          content: post.content,
          featuredImage: post.featuredImage || '',
          categoryId: post.categories?.[0]?.category?.id || '',
          tags: post.tags?.map((t: any) => t.tag.name) || [],
          status: post.published ? 'PUBLISHED' : 'DRAFT',
          publishedAt: post.publishedAt ? new Date(post.publishedAt) : null,
          seoTitle: post.seoTitle || '',
          seoDescription: post.seoDescription || '',
          seoKeywords: post.seoKeywords || '',
        })

        // Etiketleri ayarla
        setTags(post.tags?.map((t: any) => t.tag.name) || [])
        
        // Resim önizlemesini ayarla
        if (post.featuredImage) {
          setFeaturedImagePreview(post.featuredImage)
        }
      } catch (error) {
        console.error('Blog yazısı yüklenirken hata:', error)
        toast({
          variant: 'destructive',
          title: 'Hata',
          description: 'Blog yazısı yüklenirken bir sorun oluştu.'
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchBlogPost()
  }, [id, form])

  // URL önizleme için görüntü URL'sini izle
  useEffect(() => {
    if (watchFeaturedImage) {
      setFeaturedImagePreview(watchFeaturedImage)
    } else {
      setFeaturedImagePreview('')
    }
  }, [watchFeaturedImage])

  // SEO başlığı otomatik doldur
  useEffect(() => {
    if (!watchSeoTitle && watchTitle) {
      form.setValue('seoTitle', watchTitle)
    }
  }, [watchTitle, watchSeoTitle, form])

  // SEO açıklaması otomatik doldur
  useEffect(() => {
    if (!watchSeoDescription && watchExcerpt) {
      form.setValue('seoDescription', watchExcerpt)
    }
  }, [watchExcerpt, watchSeoDescription, form])

  // Kategorileri yükle
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get('/api/dashboard/blog/categories')
        setCategories(response.data)
      } catch (error) {
        console.error('Kategoriler yüklenirken hata:', error)
        toast({
          variant: 'destructive',
          title: 'Hata',
          description: 'Kategoriler yüklenirken bir sorun oluştu.'
        })
      }
    }

    fetchCategories()
  }, [toast])

  // Handle image upload from computer
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Sadece JPG, PNG, GIF ve WebP formatları desteklenmektedir.'
      });
      return;
    }
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Dosya boyutu 5MB\'ı geçemez.'
      });
      return;
    }
    
    // Create form data
    const formData = new FormData();
    formData.append('file', file);
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      // Upload image to server
      const response = await axios.post('/api/upload/logo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setUploadProgress(progress);
        }
      });
      
      // Set image URL to form
      form.setValue('featuredImage', response.data.url);
      
      toast({
        title: 'Başarılı',
        description: 'Görsel başarıyla yüklendi.'
      });
    } catch (error) {
      console.error('Görsel yüklenirken hata:', error);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Görsel yüklenirken bir sorun oluştu.'
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Form onaylandığında
  const onSubmit = async (values: z.infer<typeof blogPostSchema>) => {
    if (!id) return;
    
    setIsSubmitting(true)
    
    try {
      // Verileri API'ye gönder
      await axios.put(`/api/dashboard/blog/${id}`, {
        ...values,
        published: values.status === 'PUBLISHED',
      })
      
      toast({
        title: 'Başarılı',
        description: 'Blog yazısı başarıyla güncellendi.'
      })
      
      // Yayın durumuna göre yönlendir
      if (values.status === 'PUBLISHED') {
        // Slug oluştur (burada basit bir şekilde title'dan oluşturuyoruz, gerçek slug API'den döner)
        const slug = blogData?.slug || values.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        router.push(`/blog/${slug}`)
      } else {
        router.push('/dashboard/blog')
      }
    } catch (error) {
      console.error('Blog yazısı güncellenirken hata:', error)
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Blog yazısı güncellenirken bir sorun oluştu.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Etiket ekleme/çıkarma işlemleri
  const handleTagsChange = (newTags: string[]) => {
    setTags(newTags)
    form.setValue('tags', newTags)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 space-y-8">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/blog" passHref>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Geri Dön</span>
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Blog Yazısı Düzenle</h1>
        </div>
        <Button
          type="submit"
          onClick={form.handleSubmit(onSubmit)}
          disabled={isSubmitting}
        >
          <Save className="mr-2 h-4 w-4" />
          Kaydet
        </Button>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid gap-8 md:grid-cols-3">
            {/* Ana içerik alanı */}
            <div className="md:col-span-2 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>İçerik</CardTitle>
                  <CardDescription>
                    Blog yazınızın başlık, özet ve içeriğini düzenleyin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Başlık</FormLabel>
                        <FormControl>
                          <Input placeholder="Blog yazısı başlığı" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="excerpt"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Özet</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Blog yazısı özeti" 
                            className="resize-none h-24" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Bu özet blog listesinde ve sosyal medya paylaşımlarında görünecektir.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="content"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>İçerik</FormLabel>
                        <FormControl>
                          <Editor 
                            value={field.value} 
                            onChange={field.onChange}
                            placeholder="Blog yazısı içeriği..."
                            minHeight="300px"
                            maxHeight="600px"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>SEO Ayarları</CardTitle>
                  <CardDescription>
                    Arama motorlarında daha iyi görünmek için SEO ayarlarını yapılandırın.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="seoTitle"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SEO Başlığı</FormLabel>
                        <FormControl>
                          <Input placeholder="SEO başlığı" {...field} />
                        </FormControl>
                        <FormDescription>
                          Boş bırakırsanız yazı başlığı kullanılacaktır.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="seoDescription"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SEO Açıklaması</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="SEO açıklaması" 
                            className="resize-none h-20" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Boş bırakırsanız yazı özeti kullanılacaktır.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="seoKeywords"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SEO Anahtar Kelimeleri</FormLabel>
                        <FormControl>
                          <Input placeholder="Virgülle ayırarak girin" {...field} />
                        </FormControl>
                        <FormDescription>
                          Anahtar kelimeleri virgülle ayırarak girin.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
            
            {/* Yan panel */}
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Yayın Ayarları</CardTitle>
                  <CardDescription>
                    Yazının yayın durumunu ve kategorisini ayarlayın.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Durum</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Durum seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DRAFT">Taslak</SelectItem>
                            <SelectItem value="PUBLISHED">Yayında</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Yazının yayın durumunu belirleyin.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Kategori</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Kategori seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Kategori Seçin</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Yazının kategorisini seçin.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Etiketler</FormLabel>
                        <FormControl>
                          <TagInput
                            tags={tags}
                            setTags={handleTagsChange}
                            placeholder="Etiket eklemek için yazıp Enter'a basın"
                          />
                        </FormControl>
                        <FormDescription>
                          Yazı ile ilgili etiketleri ekleyin.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Öne Çıkan Görsel</CardTitle>
                  <CardDescription>
                    Blog yazısı için öne çıkan bir görsel yükleyin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {featuredImagePreview ? (
                    <div className="relative rounded-md overflow-hidden aspect-video bg-muted">
                      <img
                        src={featuredImagePreview}
                        alt="Öne çıkan görsel"
                        className="w-full h-full object-cover"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/80 backdrop-blur-sm"
                        onClick={() => {
                          form.setValue('featuredImage', '')
                          setFeaturedImagePreview('')
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8 mb-2" />
                      <p className="text-sm text-center mb-2">
                        Görsel yüklemek için tıklayın veya sürükleyip bırakın
                      </p>
                      <p className="text-xs text-center">
                        PNG, JPG, GIF veya WEBP (maks. 5MB)
                      </p>
                      <div className="mt-4 relative">
                        <input
                          type="file"
                          id="featuredImage"
                          accept="image/*"
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                          onChange={handleImageUpload}
                          disabled={isUploading}
                        />
                        <Button variant="secondary" size="sm" disabled={isUploading}>
                          {isUploading ? (
                            <>
                              <Upload className="mr-2 h-4 w-4 animate-spin" />
                              {uploadProgress}%
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Görsel Seç
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <FormField
                    control={form.control}
                    name="featuredImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Görsel URL'si</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="https://example.com/image.jpg" 
                            {...field} 
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormDescription>
                          Görsel URL'sini manuel olarak da girebilirsiniz.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}

EditBlogPost.getLayout = (page: ReactElement) => {
  return <DashboardLayout>{page}</DashboardLayout>
}

export default EditBlogPost 