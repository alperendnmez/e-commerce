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
  id: string  // şemadaki UUID'ye uygun
  name: string
  slug: string
  description?: string | null
  isActive: boolean  // API'dan gelecek
  _count?: {
    posts: number
  }
}

const NewBlogPost = () => {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [categories, setCategories] = useState<BlogCategory[]>([])
  const [featuredImagePreview, setFeaturedImagePreview] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Form tanımı
  const form = useForm<z.infer<typeof blogPostSchema>>({
    resolver: zodResolver(blogPostSchema),
    defaultValues: {
      title: '',
      excerpt: '',
      content: '',
      featuredImage: '',
      categoryId: 'none',  // "none" değeri ile başla
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
        const response = await axios.get('/api/dashboard/blog/categories')  // Use the dashboard endpoint instead of blog endpoint
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
      
      // Set the uploaded image URL to the form
      form.setValue('featuredImage', response.data.url);
      setFeaturedImagePreview(response.data.url);
      
      toast({
        title: 'Başarılı',
        description: 'Görsel başarıyla yüklendi.'
      });
    } catch (error) {
      console.error('Görsel yükleme hatası:', error);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Görsel yüklenirken bir sorun oluştu.'
      });
    } finally {
      setIsUploading(false);
      // Reset file input
      e.target.value = '';
    }
  };

  // Form gönderildiğinde
  const onSubmit = async (values: z.infer<typeof blogPostSchema>) => {
    setIsSubmitting(true)
    
    try {
      // Verileri API'ye gönder
      const response = await axios.post('/api/dashboard/blog', {
        ...values,
        published: values.status === 'PUBLISHED'
      })
      
      toast({
        title: 'Başarılı',
        description: 'Blog yazısı başarıyla oluşturuldu.'
      })
      
      if (values.status === 'PUBLISHED') {
        // Slug oluştur
        const slug = response.data.slug
        router.push(`/blog/${slug}`)
      } else {
        router.push('/dashboard/blog')
      }
    } catch (error) {
      console.error('Blog yazısı oluşturulurken hata:', error)
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Blog yazısı oluşturulurken bir sorun oluştu.'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Başlık ve Geri Dön butonu */}
      <div className="flex flex-col sm:flex-row gap-4 sm:justify-between sm:items-center">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/blog" passHref>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Geri Dön</span>
            </Button>
          </Link>
          <h1 className="text-3xl font-bold tracking-tight">Yeni Blog Yazısı</h1>
        </div>
      </div>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_300px] gap-6">
            {/* Sol kolon - Ana içerik */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Yazı İçeriği</CardTitle>
                  <CardDescription>
                    Blog yazınızın başlık, özet ve içeriğini girin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Başlık</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Yazınızın başlığı" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Yazınızın ana başlığı.
                        </FormDescription>
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
                            placeholder="Yazınız hakkında kısa bir özet..." 
                            className="resize-none min-h-[100px] max-h-[100px] overflow-y-auto"
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Bu özet, blog listesinde ve paylaşımlarda görünecektir.
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
                            placeholder="Blog yazınızın içeriği..."
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
                    Arama motorları için optimize edin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <Tabs defaultValue="basic">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="basic">Temel SEO</TabsTrigger>
                      <TabsTrigger value="advanced">Gelişmiş</TabsTrigger>
                    </TabsList>
                    <TabsContent value="basic" className="space-y-4 mt-4">
                      <FormField
                        control={form.control}
                        name="seoTitle"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SEO Başlığı</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="SEO için başlık (boş bırakılırsa yazı başlığı kullanılır)" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Tarayıcı sekmesinde ve arama sonuçlarında görünecek başlık.
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
                                placeholder="SEO için açıklama (boş bırakılırsa özet kullanılır)" 
                                className="resize-none"
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Arama sonuçlarında görünecek açıklama.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                    
                    <TabsContent value="advanced" className="space-y-4 mt-4">
                      <FormField
                        control={form.control}
                        name="seoKeywords"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SEO Anahtar Kelimeleri</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="Anahtar kelimeler (virgülle ayırın)" 
                                {...field} 
                              />
                            </FormControl>
                            <FormDescription>
                              Meta keywords etiketinde kullanılacak anahtar kelimeler.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </div>

            {/* Sağ kolon - Ayarlar */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Yayınlama</CardTitle>
                  <CardDescription>
                    Yayınlama durumunu belirleyin.
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
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Durum seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="DRAFT">
                              <div className="flex items-center">
                                <EyeOff className="h-4 w-4 mr-2" />
                                <span>Taslak</span>
                              </div>
                            </SelectItem>
                            <SelectItem value="PUBLISHED">
                              <div className="flex items-center">
                                <Eye className="h-4 w-4 mr-2" />
                                <span>Yayında</span>
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          "Taslak" seçilirse, yazı kaydedilir ama yayınlanmaz.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting} 
                    className="w-full"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Kaydediliyor...' : 'Kaydet'}
                  </Button>
                </CardFooter>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Kategori</CardTitle>
                  <CardDescription>
                    Blog yazınızın kategorisini seçin.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <Select 
                          onValueChange={field.onChange} 
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Kategori seçin" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Kategori Yok</SelectItem>
                            {categories.map((category) => (
                              <SelectItem key={category.id} value={category.id}>
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="pt-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full" 
                      asChild
                    >
                      <Link href="/dashboard/blog/categories">
                        <Plus className="mr-2 h-4 w-4" />
                        Yeni Kategori Ekle
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Etiketler</CardTitle>
                  <CardDescription>
                    Blog yazınızı etiketleyin.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FormField
                    control={form.control}
                    name="tags"
                    render={({ field }) => (
                      <FormItem>
                        <TagInput
                          placeholder="Etiket ekleyin..."
                          tags={field.value || []}
                          setTags={(newTags) => field.onChange(newTags)}
                          maxTags={10}
                        />
                        <FormDescription>
                          En fazla 10 etiket ekleyebilirsiniz.
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
                    Yazınızın kapak görseli.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={form.control}
                    name="featuredImage"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input 
                            placeholder="Görsel URL'si" 
                            {...field} 
                          />
                        </FormControl>
                        <FormDescription>
                          Görsel için bir URL girin veya bilgisayarınızdan yükleyin.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="mt-4 space-y-4">
                    <div className="flex flex-col space-y-2">
                      <input
                        type="file"
                        id="image-upload"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="hidden"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => document.getElementById('image-upload')?.click()}
                        disabled={isUploading}
                        className="w-full"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        {isUploading ? `Yükleniyor ${uploadProgress}%` : 'Bilgisayardan Yükle'}
                      </Button>
                      
                      {isUploading && (
                        <div className="w-full h-2 bg-muted rounded-full overflow-hidden mt-2">
                          <div 
                            className="h-full bg-primary" 
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {featuredImagePreview && (
                    <div className="mt-4">
                      <p className="text-sm text-muted-foreground mb-2">Önizleme:</p>
                      <div className="aspect-video bg-muted relative rounded-md overflow-hidden">
                        <img
                          src={featuredImagePreview}
                          alt="Önizleme"
                          className="object-cover w-full h-full"
                          onError={() => setFeaturedImagePreview('')}
                        />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}

NewBlogPost.getLayout = (page: ReactElement) => {
  return <DashboardLayout>{page}</DashboardLayout>
}

export default NewBlogPost 