import { ReactElement, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Image from 'next/image'
import axios from 'axios'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save, AlertCircle, Upload, ImageIcon, X, Plus } from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useToast } from '@/components/ui/use-toast'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { slugify } from '@/lib/slugify'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'

// Kategori şeması
const categorySchema = z.object({
  name: z.string().min(2, {
    message: 'Kategori adı en az 2 karakter olmalıdır.',
  }),
  description: z.string().optional(),
  parentSlug: z.string().optional(),
  displayOrder: z.coerce.number().int().optional(),
  isActive: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  showInSlider: z.boolean().default(false),
  isArchived: z.boolean().default(false),
  showInHeader: z.boolean().default(false),
  showInFooter: z.boolean().default(false),
  showInSidebar: z.boolean().default(true),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  bannerUrl: z.string().optional(),
  productsPerPage: z.coerce.number().int().min(1).default(12),
  defaultSortOrder: z.string().optional(),
  customFilters: z.string().optional(), // JSON string olarak alınacak
  featuredProducts: z.string().optional(), // JSON string olarak alınacak
  imageUrl: z.string().optional(),
  iconUrl: z.string().optional(),
  mobileBannerUrl: z.string().optional(),
  customAttributes: z.string().optional(), // Kategori özel öznitelikleri (JSON string)
  compareAttributes: z.string().optional(), // Karşılaştırma için kullanılacak öznitelikler (JSON string)
  allowProductComparison: z.boolean().default(true), // Ürün karşılaştırma özelliği aktif mi
  maxCompareProducts: z.coerce.number().int().min(2).max(10).default(4), // Maksimum karşılaştırılabilir ürün sayısı
  
  // Gelişmiş kategori özellikleri
  priceRanges: z.string().optional(), // Kategori için önerilen fiyat aralıkları (JSON string)
  allowedBrands: z.string().optional(), // Kategori için önerilen markalar (JSON string)
  stockFilterEnabled: z.boolean().default(true), // Stok durumu filtreleme aktif mi
  showOutOfStock: z.boolean().default(true), // Stokta olmayan ürünler gösterilsin mi
  
  // Teslimat ve ödeme seçenekleri
  deliveryOptions: z.string().optional(), // Kategori için geçerli teslimat seçenekleri (JSON string)
  paymentOptions: z.string().optional(), // Kategori için geçerli ödeme seçenekleri (JSON string)
  freeShipping: z.boolean().default(false), // Ücretsiz kargo seçeneği
  freeShippingThreshold: z.coerce.number().optional(), // Ücretsiz kargo için minimum sepet tutarı
})

type CategoryFormValues = z.infer<typeof categorySchema>

// Kategori tipi
interface Category {
  id: number
  name: string
  description: string | null
  slug: string
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
  bannerUrl: string | null
  parentId: number | null
  isActive?: boolean
  isFeatured?: boolean
  showInSlider?: boolean
  isArchived?: boolean
  archivedAt?: string
  showInHeader?: boolean
  showInFooter?: boolean
  showInSidebar?: boolean
  productsPerPage?: number
  defaultSortOrder?: string
  customFilters?: string
  featuredProducts?: string
  displayOrder?: number
  children: Category[]
  customAttributes?: string // Kategori özel öznitelikleri (JSON string)
  compareAttributes?: string // Karşılaştırma için kullanılacak öznitelikler (JSON string)
  allowProductComparison?: boolean // Ürün karşılaştırma özelliği aktif mi
  maxCompareProducts?: number // Maksimum karşılaştırılabilir ürün sayısı
  
  // Gelişmiş kategori özellikleri
  priceRanges?: string // Kategori için önerilen fiyat aralıkları (JSON string)
  allowedBrands?: string // Kategori için önerilen markalar (JSON string)
  stockFilterEnabled?: boolean // Stok durumu filtreleme aktif mi
  showOutOfStock?: boolean // Stokta olmayan ürünler gösterilsin mi
  
  // Teslimat ve ödeme seçenekleri
  deliveryOptions?: string // Kategori için geçerli teslimat seçenekleri (JSON string)
  paymentOptions?: string // Kategori için geçerli ödeme seçenekleri (JSON string)
  freeShipping?: boolean // Ücretsiz kargo seçeneği
  freeShippingThreshold?: number // Ücretsiz kargo için minimum sepet tutarı
}

function CategoryEditPage() {
  const router = useRouter()
  const { slug } = router.query
  const { toast } = useToast()

  const [category, setCategory] = useState<Category | null>(null)
  const [parentCategory, setParentCategory] = useState<Category | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form tanımla
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      description: '',
      parentSlug: '',
      displayOrder: 0,
      isActive: true,
      isFeatured: false,
      showInSlider: false,
      isArchived: false,
      showInHeader: false,
      showInFooter: false,
      showInSidebar: true,
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
      bannerUrl: '',
      productsPerPage: 12,
      defaultSortOrder: '',
      customFilters: '',
      featuredProducts: '',
      imageUrl: '',
      iconUrl: '',
      mobileBannerUrl: '',
      customAttributes: '',
      compareAttributes: '',
      allowProductComparison: true,
      maxCompareProducts: 4,
      priceRanges: '',
      allowedBrands: '',
      stockFilterEnabled: true,
      showOutOfStock: true,
      deliveryOptions: '',
      paymentOptions: '',
      freeShipping: false,
      freeShippingThreshold: undefined
    },
  })

  // Kategori verilerini yükle
  useEffect(() => {
    if (!slug) return

    const fetchData = async () => {
      setLoading(true)
      try {
        // Önce tüm kategorileri yükle
        const { data: allCategories } = await axios.get('/api/categories')
        setCategories(allCategories)
        
        // Sonra mevcut kategoriyi yükle
        const { data: categoryData } = await axios.get(`/api/categories/slug/${slug}`)
        setCategory(categoryData)

        // Kendisini ve alt kategorilerini filtreleyerek çıkar (döngüsel bağımlılık olmaması için)
        const filteredCategories = allCategories.filter((cat: Category) => cat.id !== categoryData.id)
        setCategories(filteredCategories)

        // Eğer üst kategori varsa onu da yükle
        if (categoryData.parentId) {
          try {
            // parentId yerine parentSlug kullan
            const parentCat = filteredCategories.find((cat: Category) => cat.id === categoryData.parentId);
            if (parentCat) {
              const { data: parentData } = await axios.get(`/api/categories/slug/${parentCat.slug}`)
            setParentCategory(parentData)
            }
          } catch (err) {
            console.error('Üst kategori yüklenirken hata:', err)
          }
        }

        // Parent kategori slug'ını bul
        let parentSlugValue = 'none';
        if (categoryData.parentId) {
          const parentCat = filteredCategories.find((cat: Category) => cat.id === categoryData.parentId);
          if (parentCat) {
            parentSlugValue = parentCat.slug;
          }
        }

        console.log('Form verilerini dolduruyorum:', {
          parentId: categoryData.parentId,
          parentSlugValue,
          displayOrder: categoryData.displayOrder
        });

        // Form alanlarını kategori verileriyle doldur
        form.reset({
          name: categoryData.name,
          description: categoryData.description || '',
          parentSlug: parentSlugValue,
          displayOrder: typeof categoryData.displayOrder === 'number' ? categoryData.displayOrder : 0,
          isActive: categoryData.isActive !== false,
          isFeatured: categoryData.isFeatured !== false,
          showInSlider: categoryData.showInSlider !== false,
          isArchived: categoryData.isArchived !== false,
          showInHeader: categoryData.showInHeader !== false,
          showInFooter: categoryData.showInFooter !== false,
          showInSidebar: categoryData.showInSidebar !== false,
          seoTitle: categoryData.seoTitle || '',
          seoDescription: categoryData.seoDescription || '',
          seoKeywords: categoryData.seoKeywords || '',
          bannerUrl: categoryData.bannerUrl || '',
          productsPerPage: typeof categoryData.productsPerPage === 'number' ? categoryData.productsPerPage : 12,
          defaultSortOrder: categoryData.defaultSortOrder || '',
          customFilters: categoryData.customFilters || '',
          featuredProducts: categoryData.featuredProducts || '',
          imageUrl: categoryData.imageUrl || '',
          iconUrl: categoryData.iconUrl || '',
          mobileBannerUrl: categoryData.mobileBannerUrl || '',
          customAttributes: categoryData.customAttributes || '',
          compareAttributes: categoryData.compareAttributes || '',
          allowProductComparison: categoryData.allowProductComparison !== false,
          maxCompareProducts: typeof categoryData.maxCompareProducts === 'number' ? categoryData.maxCompareProducts : 4,
          priceRanges: categoryData.priceRanges || '',
          allowedBrands: categoryData.allowedBrands || '',
          stockFilterEnabled: categoryData.stockFilterEnabled !== false,
          showOutOfStock: categoryData.showOutOfStock !== false,
          deliveryOptions: categoryData.deliveryOptions || '',
          paymentOptions: categoryData.paymentOptions || '',
          freeShipping: categoryData.freeShipping !== false,
          freeShippingThreshold: typeof categoryData.freeShippingThreshold === 'number' ? categoryData.freeShippingThreshold : undefined
        });

        setError(null)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Kategori yüklenirken bir hata oluştu')
        toast({
          variant: 'destructive',
          title: 'Hata',
          description: err.response?.data?.error || 'Kategori yüklenirken bir hata oluştu'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [slug, form, toast])

  // Form gönderme işlemi
  const onSubmit = async (values: CategoryFormValues) => {
    if (!category) return

    setSaving(true)
    console.log('Form verileri gönderiliyor:', values);
    
    try {
      const response = await axios.put(`/api/categories/slug/${category.slug}`, {
        name: values.name,
        description: values.description || null,
        parentSlug: values.parentSlug === 'none' ? null : values.parentSlug || null,
        displayOrder: values.displayOrder || 0,
        isActive: values.isActive,
        isFeatured: values.isFeatured,
        showInSlider: values.showInSlider,
        isArchived: values.isArchived,
        showInHeader: values.showInHeader,
        showInFooter: values.showInFooter,
        showInSidebar: values.showInSidebar,
        seoTitle: values.seoTitle || null,
        seoDescription: values.seoDescription || null,
        seoKeywords: values.seoKeywords || null,
        bannerUrl: values.bannerUrl || null,
        productsPerPage: values.productsPerPage || 12,
        defaultSortOrder: values.defaultSortOrder || '',
        customFilters: values.customFilters || '',
        featuredProducts: values.featuredProducts || '',
        imageUrl: values.imageUrl || null,
        iconUrl: values.iconUrl || null,
        mobileBannerUrl: values.mobileBannerUrl || null,
        customAttributes: values.customAttributes || null,
        compareAttributes: values.compareAttributes || null,
        allowProductComparison: values.allowProductComparison,
        maxCompareProducts: values.maxCompareProducts || 4,
        priceRanges: values.priceRanges || null,
        allowedBrands: values.allowedBrands || null,
        stockFilterEnabled: values.stockFilterEnabled,
        showOutOfStock: values.showOutOfStock,
        deliveryOptions: values.deliveryOptions || null,
        paymentOptions: values.paymentOptions || null,
        freeShipping: values.freeShipping,
        freeShippingThreshold: values.freeShippingThreshold
      })

      console.log('API yanıtı:', response.data);

      toast({
        title: 'Başarılı',
        description: 'Kategori başarıyla güncellendi',
      })

      // Slug değişmiş olabileceği için detay sayfasına yönlendir
      const newSlug = slugify(values.name)
      router.push(`/dashboard/kategoriler/${newSlug}`)
    } catch (err: any) {
      console.error('Kategori güncellenirken hata:', err.response?.data || err);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: err.response?.data?.error || 'Kategori güncellenirken bir hata oluştu'
      })
    } finally {
      setSaving(false)
    }
  }

  const [imageQuality, setImageQuality] = useState<number>(80);

  // Resim boyutunu küçültmek için yardımcı fonksiyon
  const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          // Resmin orijinal boyutlarını al
          let width = img.width;
          let height = img.height;
          
          // En-boy oranını koru
          if (width > height) {
            if (width > maxWidth) {
              height = Math.round(height * maxWidth / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round(width * maxHeight / height);
              height = maxHeight;
            }
          }
          
          // Canvas oluştur
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          
          // Resmi canvas'a çiz
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D context oluşturulamadı'));
            return;
          }
          
          ctx.drawImage(img, 0, 0, width, height);
          
          // Canvas içeriğini base64 formatında al
          let format = 'image/jpeg';
          if (file.type === 'image/png') {
            format = 'image/png';
          } else if (file.type === 'image/webp') {
            format = 'image/webp';
          }
          
          resolve(canvas.toDataURL(format, quality));
        };
        img.onerror = () => {
          reject(new Error('Resim yüklenirken hata oluştu'));
        };
      };
      reader.onerror = () => {
        reject(new Error('Dosya okunamadı'));
      };
    });
  };

  // Görsel yükleme işleyicisi
  const handleImageUpload = async (file: File, type: 'main' | 'icon' | 'banner' | 'mobileBanner') => {
    if (!file) return;
    
    // Dosya boyutu kontrolü (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Dosya boyutu 10MB\'dan büyük olamaz.'
      });
      return;
    }
    
    // Dosya tipi kontrolü
    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Sadece görsel dosyaları yükleyebilirsiniz.'
      });
      return;
    }
    
    try {
      // Yükleme başladığını bildir
      toast({
        title: "Bilgi",
        description: "Görsel yükleniyor ve optimize ediliyor...",
      });
      
      // Görsel boyutlarını belirle
      let maxWidth = 800;
      let maxHeight = 800;
      
      if (type === 'main') {
        maxWidth = 800;
        maxHeight = 800;
      } else if (type === 'icon') {
        maxWidth = 64;
        maxHeight = 64;
      } else if (type === 'banner') {
        maxWidth = 1920;
        maxHeight = 400;
      } else if (type === 'mobileBanner') {
        maxWidth = 800;
        maxHeight = 400;
      }
      
      // Görseli sıkıştır ve optimize et
      const compressedImage = await compressImage(file, maxWidth, maxHeight, imageQuality / 100);
      
      // Form alanını güncelle
      if (type === 'main') {
        form.setValue('imageUrl', compressedImage);
      } else if (type === 'icon') {
        form.setValue('iconUrl', compressedImage);
      } else if (type === 'banner') {
        form.setValue('bannerUrl', compressedImage);
      } else if (type === 'mobileBanner') {
        form.setValue('mobileBannerUrl', compressedImage);
      }
      
      toast({
        title: 'Başarılı',
        description: 'Görsel başarıyla yüklendi ve optimize edildi.'
      });
    } catch (err: any) {
      console.error('Görsel yüklenirken hata:', err);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: err.message || 'Görsel yüklenirken bir hata oluştu.'
      });
    }
  };

    return (
      <div className="p-6 bg-background">
      {loading ? (
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
        </div>
      ) : error ? (
        <div className="bg-destructive/15 p-4 rounded-md text-destructive flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <p>{error}</p>
            </div>
      ) : !category ? (
        <div className="bg-destructive/15 p-4 rounded-md text-destructive flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          <p>Kategori bulunamadı</p>
      </div>
      ) : (
        <div>
          <div className="mb-4 text-sm text-muted-foreground">
            <Link href="/dashboard/kategoriler" className="text-primary hover:underline">
              Kategoriler
            </Link>
            <span className="mx-2">/</span>
            <Link href={`/dashboard/kategoriler/${category.slug}`} className="text-primary hover:underline">
              {category.name}
            </Link>
            <span className="mx-2">/</span>
            <span className="text-muted-foreground">
              Düzenle
            </span>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Kategori Düzenle: {category.name}</h1>
        <Button variant="outline" asChild>
          <Link href={`/dashboard/kategoriler/${category.slug}`}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Geri
          </Link>
        </Button>
      </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
              <Tabs defaultValue="basic">
                <TabsList>
                  <TabsTrigger value="basic">Temel Bilgiler</TabsTrigger>
                  <TabsTrigger value="seo">SEO</TabsTrigger>
                  <TabsTrigger value="display">Görünüm</TabsTrigger>
                  <TabsTrigger value="comparison">Karşılaştırma</TabsTrigger>
                  <TabsTrigger value="advanced">Gelişmiş</TabsTrigger>
                </TabsList>

                <TabsContent value="basic">
      <Card>
        <CardHeader>
                      <CardTitle>Temel Bilgiler</CardTitle>
          <CardDescription>
                        Kategori temel bilgilerini düzenleyin
          </CardDescription>
        </CardHeader>
                    <CardContent className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                            <FormLabel>Kategori Adı</FormLabel>
                      <FormControl>
                              <Input placeholder="Kategori adı" {...field} />
                      </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Açıklama</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Kategori açıklaması"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="parentSlug"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Üst Kategori</FormLabel>
                        <Select 
                          onValueChange={field.onChange}
                              value={field.value || "none"}
                        >
                              <FormControl>
                          <SelectTrigger>
                                  <SelectValue placeholder="Üst kategori seçin" />
                          </SelectTrigger>
                              </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Üst Kategori Yok</SelectItem>
                                {categories
                                  .filter(cat => cat.id !== category?.id)
                                  .map((cat) => (
                              <SelectItem key={cat.slug} value={cat.slug}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="displayOrder"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Görüntüleme Sırası</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="0"
                                placeholder="0"
                                {...field}
                              />
                      </FormControl>
                      <FormDescription>
                              Düşük değerler daha önce gösterilir
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="seo">
                  <Card>
                    <CardHeader>
                      <CardTitle>SEO Bilgileri</CardTitle>
                      <CardDescription>
                        Arama motoru optimizasyonu için SEO bilgilerini düzenleyin
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
                              <Input placeholder="SEO başlığı" {...field} value={field.value || ''} />
                            </FormControl>
                            <FormDescription>
                              Arama motorlarında gösterilecek başlık
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
                        {...field}
                                value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                              Arama motorlarında gösterilecek açıklama
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
                              <Input
                                placeholder="Anahtar kelimeler (virgülle ayırın)"
                                {...field}
                                value={field.value || ''}
                              />
                      </FormControl>
                      <FormDescription>
                              Arama motorları için anahtar kelimeler
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="display">
                  <Card>
                    <CardHeader>
                      <CardTitle>Görünüm Ayarları</CardTitle>
                      <CardDescription>
                        Kategorinin görünüm ve görüntülenme ayarlarını düzenleyin
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex flex-col space-y-4">
                        <h3 className="text-lg font-medium">Görüntülenme Seçenekleri</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control}
                            name="isActive"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Aktif</FormLabel>
                                  <FormDescription>
                                    Kategori mağaza ön yüzünde görünür
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="isFeatured"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Öne Çıkan Kategori</FormLabel>
                                  <FormDescription>
                                    Kategori ana sayfada "Öne Çıkan Kategoriler" bölümünde gösterilir
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="showInSlider"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Ana Slider'da Göster</FormLabel>
                                  <FormDescription>
                                    Kategori ana sayfadaki slider'da gösterilir (En fazla 3 kategori gösterilir)
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                          <FormField
                            control={form.control}
                            name="showInHeader"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Header'da Göster</FormLabel>
                                  <FormDescription>
                                    Kategori üst menüde gösterilir
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="showInFooter"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Footer'da Göster</FormLabel>
                                  <FormDescription>
                                    Kategori alt menüde gösterilir
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="showInSidebar"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                                <FormControl>
                                  <Checkbox
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                  />
                                </FormControl>
                                <div className="space-y-1 leading-none">
                                  <FormLabel>Yan Menüde Göster</FormLabel>
                                  <FormDescription>
                                    Kategori yan menüde gösterilir
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>

                      <Separator />
                      
                <FormField
                  control={form.control}
                        name="imageUrl"
                  render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kategori Görseli</FormLabel>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                      <FormControl>
                                  <Input
                                    placeholder="Kategori görseli URL"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Kategori listesinde ve detay sayfasında gösterilecek ana görsel
                                </FormDescription>
                                <FormMessage />
                                
                                <div className="mt-4">
                                  <Label htmlFor="mainImage">Veya görsel yükle:</Label>
                                  <Input 
                                    id="mainImage" 
                                    type="file" 
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleImageUpload(file, 'main');
                                      }
                                    }}
                                    className="mt-1"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Önerilen boyut: 800x800px, maksimum 10MB
                                  </p>
                                </div>
                                
                                <div className="mt-2">
                                  <Label htmlFor="mainImageQuality">Görsel Kalitesi: {imageQuality}%</Label>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs">Düşük</span>
                                    <Slider
                                      id="mainImageQuality"
                                      min={10}
                                      max={100}
                                      step={5}
                                      defaultValue={[imageQuality]}
                                      onValueChange={(value) => setImageQuality(value[0])}
                                      className="flex-1"
                                    />
                                    <span className="text-xs">Yüksek</span>
                                  </div>
                                </div>
                              </div>
                              
                              <div>
                                {field.value ? (
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-2">Önizleme:</p>
                                    <div className="relative h-40 w-40 overflow-hidden rounded-md border">
                                      <Image
                                        src={field.value}
                                        alt="Kategori görseli önizleme"
                                        fill
                                        className="object-cover w-full h-full"
                                        onError={(e) => {
                                          (e.target as any).src = 'https://via.placeholder.com/400x400?text=Görsel+Yüklenemedi';
                                        }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center h-40 w-40 rounded-md bg-gray-100">
                                    <ImageIcon className="h-10 w-10 text-gray-400" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </FormItem>
                        )}
                      />

                      <Separator />

                      <FormField
                        control={form.control}
                        name="iconUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Kategori İkonu</FormLabel>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <FormControl>
                                  <Input
                                    placeholder="Kategori ikon URL"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Menülerde ve kategori listesinde gösterilecek ikon
                                </FormDescription>
                                <FormMessage />
                                
                                <div className="mt-4">
                                  <Label htmlFor="iconImage">Veya ikon yükle:</Label>
                                  <Input 
                                    id="iconImage" 
                                    type="file" 
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleImageUpload(file, 'icon');
                                      }
                                    }}
                                    className="mt-1"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Önerilen boyut: 64x64px, maksimum 2MB
                                  </p>
                                </div>
                              </div>
                              
                              <div>
                                {field.value ? (
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-2">Önizleme:</p>
                                    <div className="relative h-16 w-16 overflow-hidden rounded-md border">
                                      <Image
                                        src={field.value}
                                        alt="Kategori ikon önizleme"
                                        fill
                                        className="object-cover w-full h-full"
                                        onError={(e) => {
                                          (e.target as any).src = 'https://via.placeholder.com/64x64?text=İkon+Yüklenemedi';
                                        }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center h-16 w-16 rounded-md bg-gray-100">
                                    <ImageIcon className="h-6 w-6 text-gray-400" />
                                  </div>
                                )}
                              </div>
                            </div>
                          </FormItem>
                        )}
                      />

                      <Separator />

                      <FormField
                        control={form.control}
                        name="bannerUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Banner Görseli</FormLabel>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <FormControl>
                                  <Input
                                    placeholder="Banner görseli URL"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Kategori sayfasında gösterilecek banner görseli
                                </FormDescription>
                                <FormMessage />
                                
                                <div className="mt-4">
                                  <Label htmlFor="bannerImage">Veya banner yükle:</Label>
                                  <Input 
                                    id="bannerImage" 
                                    type="file" 
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleImageUpload(file, 'banner');
                                      }
                                    }}
                                    className="mt-1"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Önerilen boyut: 1920x400px, maksimum 10MB
                                  </p>
                                </div>
                              </div>
                              
                              <div>
                                {field.value ? (
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-2">Önizleme:</p>
                                    <div className="relative h-40 w-full overflow-hidden rounded-md border">
                                      <Image
                                        src={field.value}
                                        alt="Banner önizleme"
                                        fill
                                        className="object-cover w-full h-full"
                                        onError={(e) => {
                                          (e.target as any).src = 'https://via.placeholder.com/800x200?text=Görsel+Yüklenemedi';
                                        }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center h-40 w-full rounded-md bg-gray-100">
                                    <div className="text-center">
                                      <ImageIcon className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                                      <p className="text-sm text-gray-500">Banner görseli yok</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </FormItem>
                        )}
                      />

                      <Separator />

                      <FormField
                        control={form.control}
                        name="mobileBannerUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Mobil Banner Görseli</FormLabel>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <FormControl>
                                  <Input
                                    placeholder="Mobil banner görseli URL"
                                    {...field}
                                    value={field.value || ''}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Mobil cihazlarda gösterilecek banner görseli
                                </FormDescription>
                                <FormMessage />
                                
                                <div className="mt-4">
                                  <Label htmlFor="mobileBannerImage">Veya mobil banner yükle:</Label>
                                  <Input 
                                    id="mobileBannerImage" 
                                    type="file" 
                                    accept="image/*"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleImageUpload(file, 'mobileBanner');
                                      }
                                    }}
                                    className="mt-1"
                                  />
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Önerilen boyut: 800x400px, maksimum 5MB
                                  </p>
                                </div>
                              </div>
                              
                              <div>
                                {field.value ? (
                                  <div>
                                    <p className="text-sm text-muted-foreground mb-2">Önizleme:</p>
                                    <div className="relative h-40 w-64 overflow-hidden rounded-md border">
                                      <Image
                                        src={field.value}
                                        alt="Mobil banner önizleme"
                                        fill
                                        className="object-cover w-full h-full"
                                        onError={(e) => {
                                          (e.target as any).src = 'https://via.placeholder.com/400x200?text=Görsel+Yüklenemedi';
                                        }}
                                      />
                                    </div>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center h-40 w-64 rounded-md bg-gray-100">
                                    <div className="text-center">
                                      <ImageIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                      <p className="text-sm text-gray-500">Mobil banner görseli yok</p>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="comparison">
                  <Card>
                    <CardHeader>
                      <CardTitle>Karşılaştırma Ayarları</CardTitle>
                      <CardDescription>
                        Ürün karşılaştırma özelliklerini yapılandırın
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <FormField
                        control={form.control}
                        name="allowProductComparison"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">Ürün Karşılaştırma</FormLabel>
                              <FormDescription>
                                Bu kategoride ürünlerin karşılaştırılmasına izin ver
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                          </FormItem>
                        )}
                      />

                      {form.watch("allowProductComparison") && (
                        <>
                          <FormField
                            control={form.control}
                            name="maxCompareProducts"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Maksimum Karşılaştırma</FormLabel>
                        <FormDescription>
                                  Aynı anda karşılaştırılabilecek maksimum ürün sayısı
                        </FormDescription>
                                <FormControl>
                                  <div className="flex items-center space-x-4">
                                    <Slider
                                      min={2}
                                      max={10}
                                      step={1}
                                      value={[field.value]}
                                      onValueChange={(value) => field.onChange(value[0])}
                                      className="w-[60%]"
                                    />
                                    <Input
                                      type="number"
                                      value={field.value}
                                      onChange={(e) => {
                                        const value = parseInt(e.target.value);
                                        if (value >= 2 && value <= 10) {
                                          field.onChange(value);
                                        }
                                      }}
                                      className="w-20"
                                    />
                      </div>
                                </FormControl>
                                <FormMessage />
                    </FormItem>
                  )}
                />

                          <FormField
                            control={form.control}
                            name="compareAttributes"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Karşılaştırma Özellikleri</FormLabel>
                                <FormDescription>
                                  Ürünlerin karşılaştırılacağı özellikleri belirleyin
                                </FormDescription>
                                <FormControl>
                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      {(field.value ? JSON.parse(field.value) : []).map((attr: string, index: number) => (
                                        <div key={index} className="flex items-center gap-2">
                                          <Input
                                            value={attr}
                                            onChange={(e) => {
                                              const attributes = field.value ? JSON.parse(field.value) : [];
                                              attributes[index] = e.target.value;
                                              field.onChange(JSON.stringify(attributes));
                                            }}
                                          />
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                              const attributes = field.value ? JSON.parse(field.value) : [];
                                              attributes.splice(index, 1);
                                              field.onChange(JSON.stringify(attributes));
                                            }}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ))}
                                    </div>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      onClick={() => {
                                        const attributes = field.value ? JSON.parse(field.value) : [];
                                        attributes.push("");
                                        field.onChange(JSON.stringify(attributes));
                                      }}
                                    >
                                      <Plus className="mr-2 h-4 w-4" /> Özellik Ekle
                                    </Button>
                                  </div>
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="advanced">
                  <Card>
                    <CardHeader>
                      <CardTitle>Gelişmiş Ayarlar</CardTitle>
                      <CardDescription>
                        Kategori için gelişmiş ayarları yapılandırın
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                        name="priceRanges"
                      render={({ field }) => (
                        <FormItem>
                            <FormLabel>Önerilen Fiyat Aralıkları (JSON)</FormLabel>
                          <FormControl>
                              <Textarea
                                placeholder='{"min": 100, "max": 500}'
                                {...field}
                                value={field.value || ''}
                                className="font-mono text-sm"
                              />
                          </FormControl>
                          <FormDescription>
                              Kategori için önerilen fiyat aralıkları (JSON formatında)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                        name="allowedBrands"
                      render={({ field }) => (
                        <FormItem>
                            <FormLabel>Önerilen Markalar (JSON)</FormLabel>
                          <FormControl>
                            <Textarea 
                                placeholder='["Adidas", "Nike"]'
                              {...field} 
                                value={field.value || ''}
                                className="font-mono text-sm"
                            />
                          </FormControl>
                          <FormDescription>
                              Kategori için önerilen markalar (JSON dizisi)
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                      <FormField
                        control={form.control}
                        name="stockFilterEnabled"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Stok Durumu Filtreleme</FormLabel>
                              <FormDescription>
                                Kategori sayfasında stok durumu filtreleme aktif mi?
                              </FormDescription>
                  </div>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="showOutOfStock"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Stokta Olmayan Ürünleri Göster</FormLabel>
                              <FormDescription>
                                Kategori sayfasında stokta olmayan ürünler gösterilsin mi?
                              </FormDescription>
                </div>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end space-x-4 sticky bottom-0 bg-background p-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.back()}
                  disabled={saving}
                >
                  İptal
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-background mr-2"></div>
                      Kaydediliyor...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" /> Kaydet
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      )}
    </div>
  )
}

CategoryEditPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>
}

export default CategoryEditPage 