import { ReactElement, useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { ArrowLeft, Save, AlertCircle, Image as ImageIcon, Upload, X, Archive, Trash2 } from 'lucide-react'
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
import { useToast } from '@/components/ui/use-toast'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import Image from 'next/image'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

// Marka şeması
const brandSchema = z.object({
  name: z.string().min(2, {
    message: 'Marka adı en az 2 karakter olmalıdır.',
  }),
  description: z.string().optional(),
  content: z.string().optional(),
  logoUrl: z.string().optional(),
  bannerUrl: z.string().optional(),
  coverImageUrl: z.string().optional(),
  isActive: z.boolean().default(true),
  displayOrder: z.coerce.number().int().optional().default(0),
  isFeatured: z.boolean().default(false),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  seoKeywords: z.string().optional(),
  showInHeader: z.boolean().default(true),
  showInFooter: z.boolean().default(false),
  showInSidebar: z.boolean().default(true),
  productListingType: z.string().optional(),
  productsPerPage: z.coerce.number().int().optional().default(12),
  defaultSortOrder: z.string().optional(),
})

type BrandFormValues = z.infer<typeof brandSchema>

// Marka tipi
interface Brand {
  id: number
  name: string
  description: string | null
  content: string | null
  slug: string
  logoUrl: string | null
  bannerUrl: string | null
  coverImageUrl: string | null
  isActive: boolean
  displayOrder: number
  isFeatured: boolean
  seoTitle: string | null
  seoDescription: string | null
  seoKeywords: string | null
  showInHeader: boolean
  showInFooter: boolean
  showInSidebar: boolean
  productListingType: string | null
  productsPerPage: number
  defaultSortOrder: string | null
  createdAt?: string
  updatedAt?: string
  isArchived: boolean
}

function BrandEditPage() {
  const router = useRouter()
  const { slug } = router.query
  const { toast } = useToast()

  const [brand, setBrand] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState<number>(0)
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  // Banner ve kapak görseli için state'ler
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState<string | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [bannerUploadProgress, setBannerUploadProgress] = useState<number>(0)
  const [coverUploadProgress, setCoverUploadProgress] = useState<number>(0)
  const [isBannerUploading, setIsBannerUploading] = useState<boolean>(false)
  const [isCoverUploading, setIsCoverUploading] = useState<boolean>(false)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const coverInputRef = useRef<HTMLInputElement>(null)

  // Form tanımla
  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: '',
      description: '',
      content: '',
      logoUrl: '',
      bannerUrl: '',
      coverImageUrl: '',
      isActive: true,
      displayOrder: 0,
      isFeatured: false,
      seoTitle: '',
      seoDescription: '',
      seoKeywords: '',
      showInHeader: true,
      showInFooter: false,
      showInSidebar: true,
      productListingType: 'grid',
      productsPerPage: 12,
      defaultSortOrder: 'newest',
    },
  })

  // Marka verilerini yükle
  useEffect(() => {
    if (!slug) return

    const fetchBrand = async () => {
      setLoading(true)
      try {
        const { data } = await axios.get(`/api/brands/slug/${slug}`)
        setBrand(data)

        // Form alanlarını marka verileriyle doldur
        form.reset({
          name: data.name,
          description: data.description || '',
          content: data.content || '',
          logoUrl: data.logoUrl || '',
          bannerUrl: data.bannerUrl || '',
          coverImageUrl: data.coverImageUrl || '',
          isActive: data.isActive !== false,
          displayOrder: data.displayOrder || 0,
          isFeatured: data.isFeatured || false,
          seoTitle: data.seoTitle || '',
          seoDescription: data.seoDescription || '',
          seoKeywords: data.seoKeywords || '',
          showInHeader: data.showInHeader !== false,
          showInFooter: data.showInFooter || false,
          showInSidebar: data.showInSidebar !== false,
          productListingType: data.productListingType || 'grid',
          productsPerPage: data.productsPerPage || 12,
          defaultSortOrder: data.defaultSortOrder || 'newest',
        })

        setError(null)
      } catch (err: any) {
        setError(err.response?.data?.error || 'Marka yüklenirken bir hata oluştu')
        toast({
          variant: 'destructive',
          title: 'Hata',
          description: err.response?.data?.error || 'Marka yüklenirken bir hata oluştu'
        })
      } finally {
        setLoading(false)
      }
    }

    fetchBrand()
  }, [slug, form, toast])

  // Form gönderme işlemi
  const onSubmit = async (values: BrandFormValues) => {
    if (!brand) return

    setSaving(true)
    
    try {
      // Gönderilecek verileri konsola yazdır
      console.log('Gönderilecek veriler:', {
        name: values.name,
        description: values.description || null,
        content: values.content || null,
        logoUrl: values.logoUrl || null,
        bannerUrl: values.bannerUrl || null,
        coverImageUrl: values.coverImageUrl || null,
        isActive: Boolean(values.isActive),
        displayOrder: Number(values.displayOrder) || 0,
        isFeatured: Boolean(values.isFeatured),
        seoTitle: values.seoTitle || null,
        seoDescription: values.seoDescription || null,
        seoKeywords: values.seoKeywords || null,
        showInHeader: Boolean(values.showInHeader),
        showInFooter: Boolean(values.showInFooter),
        showInSidebar: Boolean(values.showInSidebar),
        productListingType: values.productListingType || null,
        productsPerPage: Number(values.productsPerPage) || 12,
        defaultSortOrder: values.defaultSortOrder || null,
      });

      const response = await axios.put(`/api/brands/slug/${brand.slug}`, {
        name: values.name,
        description: values.description || null,
        content: values.content || null,
        logoUrl: values.logoUrl || null,
        bannerUrl: values.bannerUrl || null,
        coverImageUrl: values.coverImageUrl || null,
        isActive: Boolean(values.isActive),
        displayOrder: Number(values.displayOrder) || 0,
        isFeatured: Boolean(values.isFeatured),
        seoTitle: values.seoTitle || null,
        seoDescription: values.seoDescription || null,
        seoKeywords: values.seoKeywords || null,
        showInHeader: Boolean(values.showInHeader),
        showInFooter: Boolean(values.showInFooter),
        showInSidebar: Boolean(values.showInSidebar),
        productListingType: values.productListingType || null,
        productsPerPage: Number(values.productsPerPage) || 12,
        defaultSortOrder: values.defaultSortOrder || null,
      })

      // Yanıtı konsola yazdır
      console.log('API yanıtı:', response.data)

      toast({
        title: 'Başarılı',
        description: 'Marka başarıyla güncellendi',
      })

      // Detay sayfasına yönlendir
      router.push(`/dashboard/markalar/${response.data.slug}`)
    } catch (err: any) {
      console.error('Marka güncellenirken hata:', err.response?.data || err)
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: err.response?.data?.error || 'Marka güncellenirken bir hata oluştu'
      })
    } finally {
      setSaving(false)
    }
  }

  // Logo dosyası değiştiğinde önizleme oluştur
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLogoFile(file)
    
    // Dosya önizlemesi oluştur
    const reader = new FileReader()
    reader.onload = () => {
      setLogoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Banner dosyası değiştiğinde önizleme oluştur
  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setBannerFile(file)
    
    // Dosya önizlemesi oluştur
    const reader = new FileReader()
    reader.onload = () => {
      setBannerPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Kapak görseli değiştiğinde önizleme oluştur
  const handleCoverChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setCoverFile(file)
    
    // Dosya önizlemesi oluştur
    const reader = new FileReader()
    reader.onload = () => {
      setCoverPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  // Görsel optimizasyonu
  const optimizeImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        if (!event.target?.result) {
          reject(new Error('Failed to read file'));
          return;
        }
        
        const img = document.createElement('img');
        img.src = event.target.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          const MAX_HEIGHT = 800;
          let width = img.width;
          let height = img.height;
          
          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas context'));
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob conversion failed'));
              return;
            }
            const optimizedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(optimizedFile);
          }, 'image/jpeg', 0.8); // 0.8 kalite ile JPEG olarak sıkıştır
        };
        img.onerror = () => {
          reject(new Error('Image loading failed'));
        };
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Logo yükleme
  const handleLogoUpload = async () => {
    if (!logoFile) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Görsel optimizasyonu uygula
      const optimizedFile = await optimizeImage(logoFile);
      
      // FormData oluştur
      const formData = new FormData();
      formData.append('file', optimizedFile);
      formData.append('width', '300');
      formData.append('height', '300');
      formData.append('quality', '90');
      
      // Dosyayı özel logo endpoint'ine yükle
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
      
      console.log('Logo upload response:', response.data);
      
      // Logo URL'sini form'a set et
      form.setValue('logoUrl', response.data.url);
      
      // Önizlemeyi temizle
      setLogoPreview(null);
      setLogoFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
      toast({
        title: 'Başarılı',
        description: 'Logo başarıyla yüklendi',
      });
    } catch (err: any) {
      console.error('Logo yüklenirken hata:', err);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: err.response?.data?.error || 'Logo yüklenirken bir hata oluştu'
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Banner yükleme
  const handleBannerUpload = async () => {
    if (!bannerFile) return;
    
    try {
      setIsBannerUploading(true);
      setBannerUploadProgress(0);
      
      // Görsel optimizasyonu uygula
      const optimizedFile = await optimizeImage(bannerFile);
      
      // FormData oluştur
      const formData = new FormData();
      formData.append('file', optimizedFile);
      formData.append('width', '1200');
      formData.append('height', '400');
      formData.append('quality', '90');
      formData.append('type', 'brand-banner');
      
      // Dosyayı upload endpoint'ine yükle
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total 
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setBannerUploadProgress(progress);
        }
      });
      
      console.log('Banner upload response:', response.data);
      
      // Banner URL'sini form'a set et
      form.setValue('bannerUrl', response.data.url);
      
      // Önizlemeyi temizle
      setBannerPreview(null);
      setBannerFile(null);
      if (bannerInputRef.current) {
        bannerInputRef.current.value = '';
      }
      
      toast({
        title: 'Başarılı',
        description: 'Banner başarıyla yüklendi',
      });
    } catch (err: any) {
      console.error('Banner yüklenirken hata:', err);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: err.response?.data?.error || 'Banner yüklenirken bir hata oluştu'
      });
    } finally {
      setIsBannerUploading(false);
    }
  };

  // Kapak görseli yükleme
  const handleCoverUpload = async () => {
    if (!coverFile) return;
    
    try {
      setIsCoverUploading(true);
      setCoverUploadProgress(0);
      
      // Görsel optimizasyonu uygula
      const optimizedFile = await optimizeImage(coverFile);
      
      // FormData oluştur
      const formData = new FormData();
      formData.append('file', optimizedFile);
      formData.append('width', '1200');
      formData.append('height', '600');
      formData.append('quality', '90');
      formData.append('type', 'brand-cover');
      
      // Dosyayı upload endpoint'ine yükle
      const response = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const progress = progressEvent.total 
            ? Math.round((progressEvent.loaded * 100) / progressEvent.total)
            : 0;
          setCoverUploadProgress(progress);
        }
      });
      
      console.log('Cover upload response:', response.data);
      
      // Kapak görseli URL'sini form'a set et
      form.setValue('coverImageUrl', response.data.url);
      
      // Önizlemeyi temizle
      setCoverPreview(null);
      setCoverFile(null);
      if (coverInputRef.current) {
        coverInputRef.current.value = '';
      }
      
      toast({
        title: 'Başarılı',
        description: 'Kapak görseli başarıyla yüklendi',
      });
    } catch (err: any) {
      console.error('Kapak görseli yüklenirken hata:', err);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: err.response?.data?.error || 'Kapak görseli yüklenirken bir hata oluştu'
      });
    } finally {
      setIsCoverUploading(false);
    }
  };

  // Logo önizlemesini temizle
  const clearLogoPreview = () => {
    setLogoFile(null)
    setLogoPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Banner önizlemesini temizle
  const clearBannerPreview = () => {
    setBannerFile(null)
    setBannerPreview(null)
    if (bannerInputRef.current) {
      bannerInputRef.current.value = ''
    }
  }

  // Kapak görseli önizlemesini temizle
  const clearCoverPreview = () => {
    setCoverFile(null)
    setCoverPreview(null)
    if (coverInputRef.current) {
      coverInputRef.current.value = ''
    }
  }

  const handleArchive = async () => {
    if (!brand) return;

    try {
      const response = await axios.put(`/api/brands/slug/${brand.slug}/archive`);

      toast({
        title: 'Başarılı',
        description: 'Marka başarıyla arşivlendi',
      });

      router.push(`/dashboard/markalar/${response.data.slug}`);
    } catch (err: any) {
      console.error('Marka arşivlenirken hata:', err.response?.data || err);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: err.response?.data?.error || 'Marka arşivlenirken bir hata oluştu'
      });
    }
  };

  const handleUnarchive = async () => {
    if (!brand) return;

    try {
      const response = await axios.put(`/api/brands/slug/${brand.slug}/unarchive`);

      toast({
        title: 'Başarılı',
        description: 'Marka başarıyla arşivden çıkarıldı',
      });

      router.push(`/dashboard/markalar/${response.data.slug}`);
    } catch (err: any) {
      console.error('Marka arşivden çıkarılırken hata:', err.response?.data || err);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: err.response?.data?.error || 'Marka arşivden çıkarılırken bir hata oluştu'
      });
    }
  };

  const handleDelete = async () => {
    if (!brand) return;

    try {
      await axios.delete(`/api/brands/slug/${brand.slug}`);

      toast({
        title: 'Başarılı',
        description: 'Marka başarıyla silindi',
      });

      router.push('/dashboard/markalar');
    } catch (err: any) {
      console.error('Marka silinirken hata:', err.response?.data || err);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: err.response?.data?.error || 'Marka silinirken bir hata oluştu'
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-background">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold">Marka Düzenle</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-center min-h-[300px]">
              <p>Yükleniyor...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error || !brand) {
    return (
      <div className="p-6 bg-background">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold">Marka Düzenle</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
              <p className="text-xl text-center font-medium text-red-500">
                {error || 'Marka bulunamadı'}
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/dashboard/markalar">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Markalara Dön
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 bg-background">
      <div className="mb-6">
        <div className="flex">
          <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Dashboard
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <Link href="/dashboard/markalar" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Markalar
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <Link href={`/dashboard/markalar/${brand.slug}`} className="text-sm font-medium text-muted-foreground hover:text-foreground">
            {brand.name}
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span className="text-sm font-medium">
            Düzenle
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">Marka Düzenle: {brand.name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/dashboard/markalar/${brand.slug}`}>
              <ArrowLeft className="mr-2 h-4 w-4" /> Detaya Dön
            </Link>
          </Button>
          
          {brand.isArchived ? (
            <Button variant="outline" onClick={handleUnarchive}>
              <Archive className="mr-2 h-4 w-4" /> Arşivden Çıkar
            </Button>
          ) : (
            <Button variant="outline" onClick={handleArchive}>
              <Archive className="mr-2 h-4 w-4" /> Arşivle
            </Button>
          )}
          
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Sil
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Marka Bilgileri</CardTitle>
            <CardDescription>
              Marka bilgilerini düzenleyin
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Tabs defaultValue="general">
                  <TabsList className="mb-4">
                    <TabsTrigger value="general">Genel Bilgiler</TabsTrigger>
                    <TabsTrigger value="media">Medya</TabsTrigger>
                    <TabsTrigger value="display">Görünüm</TabsTrigger>
                    <TabsTrigger value="products">Ürün Listesi</TabsTrigger>
                    <TabsTrigger value="content">İçerik</TabsTrigger>
                    <TabsTrigger value="seo">SEO Ayarları</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="general" className="space-y-6">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marka Adı</FormLabel>
                          <FormControl>
                            <Input placeholder="Marka adı" {...field} />
                          </FormControl>
                          <FormDescription>
                            Bu isim marka listesinde ve ürün detaylarında görünecektir.
                          </FormDescription>
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
                              placeholder="Marka hakkında kısa bir açıklama"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Markanın ne yaptığına dair kısa bir açıklama.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="logoUrl"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Logo</FormLabel>
                          <FormDescription>
                            Marka logosu yükleyin veya URL girin
                          </FormDescription>
                          
                          <div className="space-y-4">
                            <FormControl>
                              <Input 
                                placeholder="https://example.com/logo.png" 
                                {...field} 
                                value={field.value || ''} 
                              />
                            </FormControl>
                            
                            <div className="flex flex-col space-y-2">
                              <div className="flex items-center gap-2">
                                <Input
                                  type="file"
                                  ref={fileInputRef}
                                  accept="image/*"
                                  onChange={handleLogoChange}
                                  className="max-w-xs"
                                />
                                
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="sm" 
                                  onClick={handleLogoUpload}
                                  disabled={!logoFile || isUploading}
                                >
                                  <Upload className="mr-2 h-4 w-4" />
                                  {isUploading ? `Yükleniyor ${uploadProgress}%` : 'Yükle'}
                                </Button>
                                
                                {logoPreview && (
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={clearLogoPreview}
                                  >
                                    <X className="mr-2 h-4 w-4" />
                                    Temizle
                                  </Button>
                                )}
                              </div>
                              
                              {isUploading && (
                                <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                                  <div 
                                    className="bg-primary h-2.5 rounded-full" 
                                    style={{ width: `${uploadProgress}%` }}
                                  ></div>
                                </div>
                              )}
                              
                              {logoPreview && (
                                <div className="mt-2 relative w-32 h-32 border rounded-md overflow-hidden">
                                  <Image
                                    src={logoPreview}
                                    alt="Logo önizleme"
                                    fill
                                    className="object-contain p-2"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="displayOrder"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Sıralama</FormLabel>
                            <FormControl>
                              <Input type="number" placeholder="0" {...field} />
                            </FormControl>
                            <FormDescription>
                              Markanın görüntülenme sırası. Düşük değerler daha önce gösterilir.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex items-end">
                        <FormField
                          control={form.control}
                          name="isActive"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 w-full">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Aktif</FormLabel>
                                <FormDescription>
                                  Bu marka aktif olarak gösterilsin mi?
                                </FormDescription>
                              </div>
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
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
                            <FormLabel>Öne Çıkan</FormLabel>
                            <FormDescription>
                              Bu markayı vitrin/anasayfada öne çıkar
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                  
                  <TabsContent value="media" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <FormField
                          control={form.control}
                          name="logoUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Logo</FormLabel>
                              <FormDescription>
                                Marka logosu yükleyin veya URL girin
                              </FormDescription>
                              
                              <div className="space-y-4">
                                <FormControl>
                                  <Input 
                                    placeholder="https://example.com/logo.png" 
                                    {...field} 
                                    value={field.value || ''} 
                                  />
                                </FormControl>
                                
                                <div className="flex flex-col space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="file"
                                      ref={fileInputRef}
                                      accept="image/*"
                                      onChange={handleLogoChange}
                                      className="max-w-xs"
                                    />
                                    
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={handleLogoUpload}
                                      disabled={!logoFile || isUploading}
                                    >
                                      <Upload className="mr-2 h-4 w-4" />
                                      {isUploading ? `Yükleniyor ${uploadProgress}%` : 'Yükle'}
                                    </Button>
                                    
                                    {logoPreview && (
                                      <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={clearLogoPreview}
                                      >
                                        <X className="mr-2 h-4 w-4" />
                                        Temizle
                                      </Button>
                                    )}
                                  </div>
                                  
                                  {isUploading && (
                                    <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                                      <div 
                                        className="bg-primary h-2.5 rounded-full" 
                                        style={{ width: `${uploadProgress}%` }}
                                      ></div>
                                    </div>
                                  )}
                                  
                                  {logoPreview && (
                                    <div className="mt-2 relative w-32 h-32 border rounded-md overflow-hidden">
                                      <Image
                                        src={logoPreview}
                                        alt="Logo önizleme"
                                        fill
                                        className="object-contain p-2"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                              
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div>
                        <FormField
                          control={form.control}
                          name="bannerUrl"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Banner</FormLabel>
                              <FormDescription>
                                Marka sayfasının üst kısmında görüntülenecek banner
                              </FormDescription>
                              <div className="space-y-4">
                                <FormControl>
                                  <Input placeholder="https://example.com/banner.jpg" {...field} value={field.value || ''} />
                                </FormControl>
                                
                                <div className="flex flex-col space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="file"
                                      ref={bannerInputRef}
                                      accept="image/*"
                                      onChange={handleBannerChange}
                                      className="max-w-xs"
                                    />
                                    
                                    <Button 
                                      type="button" 
                                      variant="outline" 
                                      size="sm" 
                                      onClick={handleBannerUpload}
                                      disabled={!bannerFile || isBannerUploading}
                                    >
                                      <Upload className="mr-2 h-4 w-4" />
                                      {isBannerUploading ? `Yükleniyor ${bannerUploadProgress}%` : 'Yükle'}
                                    </Button>
                                    
                                    {bannerPreview && (
                                      <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={clearBannerPreview}
                                      >
                                        <X className="mr-2 h-4 w-4" />
                                        Temizle
                                      </Button>
                                    )}
                                  </div>
                                  
                                  {isBannerUploading && (
                                    <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                                      <div 
                                        className="bg-primary h-2.5 rounded-full" 
                                        style={{ width: `${bannerUploadProgress}%` }}
                                      ></div>
                                    </div>
                                  )}
                                  
                                  {bannerPreview && (
                                    <div className="mt-2 relative h-32 border rounded-md overflow-hidden">
                                      <Image
                                        src={bannerPreview}
                                        alt="Banner önizleme"
                                        fill
                                        className="object-cover"
                                      />
                                    </div>
                                  )}
                                </div>
                              </div>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        {brand.bannerUrl && (
                          <div className="mt-2 relative h-32 border rounded-md overflow-hidden">
                            <Image
                              src={brand.bannerUrl}
                              alt="Banner önizleme"
                              fill
                              className="object-cover"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                          </div>
                        )}
                        
                        <div className="mt-6">
                          <FormField
                            control={form.control}
                            name="coverImageUrl"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Kapak Görseli</FormLabel>
                                <FormDescription>
                                  Marka sayfasında kullanılacak kapak görseli
                                </FormDescription>
                                <div className="space-y-4">
                                  <FormControl>
                                    <Input placeholder="https://example.com/cover.jpg" {...field} value={field.value || ''} />
                                  </FormControl>
                                  
                                  <div className="flex flex-col space-y-2">
                                    <div className="flex items-center gap-2">
                                      <Input
                                        type="file"
                                        ref={coverInputRef}
                                        accept="image/*"
                                        onChange={handleCoverChange}
                                        className="max-w-xs"
                                      />
                                      
                                      <Button 
                                        type="button" 
                                        variant="outline" 
                                        size="sm" 
                                        onClick={handleCoverUpload}
                                        disabled={!coverFile || isCoverUploading}
                                      >
                                        <Upload className="mr-2 h-4 w-4" />
                                        {isCoverUploading ? `Yükleniyor ${coverUploadProgress}%` : 'Yükle'}
                                      </Button>
                                      
                                      {coverPreview && (
                                        <Button 
                                          type="button" 
                                          variant="outline" 
                                          size="sm" 
                                          onClick={clearCoverPreview}
                                        >
                                          <X className="mr-2 h-4 w-4" />
                                          Temizle
                                        </Button>
                                      )}
                                    </div>
                                    
                                    {isCoverUploading && (
                                      <div className="w-full bg-muted rounded-full h-2.5 mt-2">
                                        <div 
                                          className="bg-primary h-2.5 rounded-full" 
                                          style={{ width: `${coverUploadProgress}%` }}
                                        ></div>
                                      </div>
                                    )}
                                    
                                    {coverPreview && (
                                      <div className="mt-2 relative h-32 border rounded-md overflow-hidden">
                                        <Image
                                          src={coverPreview}
                                          alt="Kapak görseli önizleme"
                                          fill
                                          className="object-cover"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          {brand.coverImageUrl && (
                            <div className="mt-2 relative h-32 border rounded-md overflow-hidden">
                              <Image
                                src={brand.coverImageUrl}
                                alt="Kapak görseli önizleme"
                                fill
                                className="object-cover"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="display" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card>
                        <CardHeader>
                          <CardTitle>Görünüm Ayarları</CardTitle>
                          <CardDescription>
                            Markanın sitede nerede görüntüleneceğini belirleyin
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
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
                                  <FormLabel>Header&apos;da Göster</FormLabel>
                                  <FormDescription>
                                    Marka, sitenin üst menüsünde görüntülenecek
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
                                  <FormLabel>Footer&apos;da Göster</FormLabel>
                                  <FormDescription>
                                    Marka, sitenin alt kısmında görüntülenecek
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
                                    Marka, kategori sayfalarının yan menüsünde görüntülenecek
                                  </FormDescription>
                                </div>
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="products" className="space-y-6">
                    <Card>
                      <CardHeader>
                        <CardTitle>Ürün Listeleme Ayarları</CardTitle>
                        <CardDescription>
                          Marka sayfasında ürünlerin nasıl listeleneceğini belirleyin
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <FormField
                          control={form.control}
                          name="productListingType"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Listeleme Tipi</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value || 'grid'}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Listeleme tipini seçin" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="grid">Grid (Izgara)</SelectItem>
                                  <SelectItem value="list">Liste</SelectItem>
                                  <SelectItem value="compact">Kompakt</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Ürünlerin görüntülenme şekli
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="productsPerPage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Sayfa Başına Ürün</FormLabel>
                              <FormControl>
                                <Input type="number" min="4" max="48" step="4" {...field} />
                              </FormControl>
                              <FormDescription>
                                Bir sayfada gösterilecek maksimum ürün sayısı
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="defaultSortOrder"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Varsayılan Sıralama</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value || 'newest'}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Sıralama tipini seçin" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="newest">En Yeniler</SelectItem>
                                  <SelectItem value="price_asc">Fiyat (Artan)</SelectItem>
                                  <SelectItem value="price_desc">Fiyat (Azalan)</SelectItem>
                                  <SelectItem value="name_asc">İsim (A-Z)</SelectItem>
                                  <SelectItem value="name_desc">İsim (Z-A)</SelectItem>
                                  <SelectItem value="popularity">Popülerlik</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Ürünlerin varsayılan sıralama düzeni
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="content" className="space-y-6">
                    <FormField
                      control={form.control}
                      name="content"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Marka İçeriği</FormLabel>
                          <FormDescription>
                            Marka hakkında detaylı bilgi, hikaye veya tanıtım metni
                          </FormDescription>
                          <div className="border rounded-md p-4">
                            <div className="flex gap-2 mb-2 border-b pb-2">
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const before = text.substring(0, start);
                                    const after = text.substring(end, text.length);
                                    const newText = before + '<h2>Başlık</h2>' + after;
                                    field.onChange(newText);
                                    textarea.focus();
                                    textarea.selectionStart = start + 4;
                                    textarea.selectionEnd = start + 10;
                                  }
                                }}
                              >
                                H2
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const before = text.substring(0, start);
                                    const after = text.substring(end, text.length);
                                    const newText = before + '<h3>Alt Başlık</h3>' + after;
                                    field.onChange(newText);
                                    textarea.focus();
                                    textarea.selectionStart = start + 4;
                                    textarea.selectionEnd = start + 13;
                                  }
                                }}
                              >
                                H3
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const before = text.substring(0, start);
                                    const after = text.substring(end, text.length);
                                    const selection = text.substring(start, end);
                                    const newText = before + '<strong>' + (selection || 'Kalın Metin') + '</strong>' + after;
                                    field.onChange(newText);
                                    textarea.focus();
                                  }
                                }}
                              >
                                B
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const before = text.substring(0, start);
                                    const after = text.substring(end, text.length);
                                    const selection = text.substring(start, end);
                                    const newText = before + '<em>' + (selection || 'İtalik Metin') + '</em>' + after;
                                    field.onChange(newText);
                                    textarea.focus();
                                  }
                                }}
                              >
                                I
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const before = text.substring(0, start);
                                    const after = text.substring(end, text.length);
                                    const newText = before + '<ul>\n  <li>Liste öğesi 1</li>\n  <li>Liste öğesi 2</li>\n  <li>Liste öğesi 3</li>\n</ul>' + after;
                                    field.onChange(newText);
                                    textarea.focus();
                                  }
                                }}
                              >
                                UL
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const before = text.substring(0, start);
                                    const after = text.substring(end, text.length);
                                    const selection = text.substring(start, end);
                                    const newText = before + '<a href="https://example.com">' + (selection || 'Bağlantı') + '</a>' + after;
                                    field.onChange(newText);
                                    textarea.focus();
                                  }
                                }}
                              >
                                Link
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  const textarea = document.getElementById('content-editor') as HTMLTextAreaElement;
                                  if (textarea) {
                                    const start = textarea.selectionStart;
                                    const end = textarea.selectionEnd;
                                    const text = textarea.value;
                                    const before = text.substring(0, start);
                                    const after = text.substring(end, text.length);
                                    const newText = before + '<img src="https://example.com/image.jpg" alt="Görsel açıklaması" />' + after;
                                    field.onChange(newText);
                                    textarea.focus();
                                  }
                                }}
                              >
                                Görsel
                              </Button>
                            </div>
                            <FormControl>
                              <Textarea
                                id="content-editor"
                                placeholder="Marka içeriği..."
                                className="min-h-[300px] font-mono"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="border rounded-md p-4 mt-4">
                      <h3 className="text-lg font-medium mb-2">Önizleme</h3>
                      <div 
                        className="prose max-w-none p-4 bg-muted rounded-md"
                        dangerouslySetInnerHTML={{ __html: form.watch('content') || '<p>İçerik henüz girilmedi.</p>' }}
                      />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="seo" className="space-y-6">
                    <FormField
                      control={form.control}
                      name="seoTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SEO Başlığı</FormLabel>
                          <FormControl>
                            <Input placeholder="SEO Başlığı" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormDescription>
                            Tarayıcı sekmesinde ve arama sonuçlarında görünecek başlık. Boş bırakılırsa marka adı kullanılır.
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
                              placeholder="SEO Açıklaması"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Arama sonuçlarında görünecek açıklama. 150-160 karakter olması önerilir.
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
                            <Input placeholder="anahtar,kelime,virgülle,ayırın" {...field} value={field.value || ''} />
                          </FormControl>
                          <FormDescription>
                            Arama motorları için anahtar kelimeler. Virgülle ayırın.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </TabsContent>
                </Tabs>
                
                <div className="flex justify-end">
                  <Button type="submit" disabled={saving}>
                    {saving ? 'Kaydediliyor...' : (
                      <>
                        <Save className="mr-2 h-4 w-4" /> Kaydet
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Mevcut Logo</CardTitle>
            <CardDescription>
              Marka logosu önizlemesi
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-4 bg-muted rounded-lg aspect-square">
              <div className="flex flex-col items-center justify-center text-muted-foreground">
                <ImageIcon className="h-16 w-16 mb-2" />
                <p className="text-center">Logo yok</p>
              </div>
              {brand.logoUrl && (
                <div className="relative w-full h-full">
                  <Image
                    src={brand.logoUrl}
                    alt={brand.name}
                    fill
                    className="object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.parentElement!.style.display = 'none';
                      const fallbackEl = e.currentTarget.parentElement!.previousElementSibling;
                      if (fallbackEl) {
                        (fallbackEl as HTMLElement).style.display = 'flex';
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="text-center text-sm text-muted-foreground">
            Logo URL&apos;sini değiştirerek logoyu güncelleyebilirsiniz.
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}

BrandEditPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>
}

export default BrandEditPage 