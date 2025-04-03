import React, { ReactElement, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from 'axios'
import { format } from 'date-fns'
import { tr } from 'date-fns/locale'
import {
  Eye,
  ArrowLeft,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon,
  X,
  Plus,
  Check,
  Archive,
  Upload
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useToast } from '@/components/ui/use-toast'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import Image from 'next/image'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts'
import {
  Alert,
  AlertDescription,
  AlertTitle
} from '@/components/ui/alert'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

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
  archivedAt?: string
}

function BrandDetail() {
  const router = useRouter()
  const { slug } = router.query
  const { toast } = useToast()

  const [brand, setBrand] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false)
  const [productError, setProductError] = useState<string | null>(null)
  const [stats, setStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState<boolean>(false)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<any>({ values: {} })

  // Marka verilerini yükle
  const fetchBrandData = async () => {
    if (!slug) return;
    
    setLoading(true);
    try {
      const { data } = await axios.get(`/api/brands/slug/${slug}`);
      setBrand(data);
      setForm({ 
        values: data,
        setValue: (key: string, value: any) => {
          setForm((prev: { values: Record<string, any> }) => ({
            ...prev,
            values: {
              ...prev.values,
              [key]: value
            }
          }));
        },
        getValues: () => form.values
      });
      setError(null);
      } catch (err: any) {
      setError(err.response?.data?.error || 'Marka yüklenirken bir hata oluştu');
        toast({
          variant: 'destructive',
          title: 'Hata',
          description: err.response?.data?.error || 'Marka yüklenirken bir hata oluştu'
      });
      } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!slug) return;
    fetchBrandData();
  }, [slug]);

  // Markaya ait ürünleri getir
  useEffect(() => {
    if (!brand) return;

    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const { data } = await axios.get(`/api/products?brandId=${brand.id}`);
        setProducts(Array.isArray(data) ? data : data.products || []);
        setProductError(null);
      } catch (err: any) {
        console.error('Ürünler yüklenirken hata:', err);
        setProductError(err.response?.data?.error || 'Ürünler yüklenirken bir hata oluştu');
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
  }, [brand]);

  // Marka istatistiklerini getir
  useEffect(() => {
    if (!brand) return;

    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const { data } = await axios.get(`/api/brands/stats/${brand.slug}`);
        setStats(data);
        setStatsError(null);
      } catch (err: any) {
        console.error('İstatistikler yüklenirken hata:', err);
        setStatsError(err.response?.data?.message || 'İstatistikler yüklenirken bir hata oluştu');
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, [brand]);

  // Görsel sıkıştırma ve optimize etme fonksiyonu
  const compressImage = (file: File, maxWidth = 800, maxHeight = 800, quality = 0.8): Promise<string> => {
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

  // Marka silme işlemi
  const handleDelete = async () => {
    if (!brand) return;
    
    if (!confirm(`"${brand.name}" markasını silmek istediğinize emin misiniz?`)) {
      return;
    }
    
    try {
      setLoading(true);
      await axios.delete(`/api/brands/slug/${brand.slug}`);
      
      toast({
        title: 'Başarılı!',
        description: 'Marka başarıyla silindi.',
      });
      
      router.push('/dashboard/markalar');
    } catch (err: any) {
      console.error('Marka silinirken hata:', err);
      toast({
        title: 'Hata!',
        description: err.response?.data?.message || 'Marka silinirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Markayı arşivleme işlemi
  const handleArchive = async () => {
    if (!brand) return;
    
    try {
      setLoading(true);
      await axios.patch(`/api/brands/slug/${brand.slug}`, { 
        isArchived: true,
        archivedAt: new Date().toISOString()
      });
      
      toast({ 
        title: 'Başarılı!',
        description: 'Marka arşivlendi.',
      });
      
      // Markayı yeniden yükle
      if (slug) {
        fetchBrandData();
      }
    } catch (err: any) {
      console.error('Marka arşivlenirken hata:', err);
      toast({
        title: 'Hata!',
        description: err.response?.data?.message || 'Marka arşivlenirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Markayı arşivden çıkarma işlemi
  const handleUnarchive = async () => {
    if (!brand) return;
    
    try {
      setLoading(true);
      await axios.patch(`/api/brands/slug/${brand.slug}`, { 
        isArchived: false,
        archivedAt: null
      });
      
      toast({ 
        title: 'Başarılı!',
        description: 'Marka arşivden çıkarıldı.',
      });
      
      // Markayı yeniden yükle
      if (slug) {
        fetchBrandData();
      }
    } catch (err: any) {
      console.error('Marka arşivden çıkarılırken hata:', err);
      toast({
        title: 'Hata!',
        description: err.response?.data?.message || 'Marka arşivden çıkarılırken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Logo yükleme
  const handleLogoUpload = async () => {
    if (!logoFile || !brand) return;
    
    try {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Dosya boyutu kontrolü (10MB)
      if (logoFile.size > 10 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'Hata',
          description: 'Dosya boyutu 10MB\'dan büyük olamaz.'
        });
        setIsUploading(false);
        return;
      }
      
      // Dosya tipi kontrolü
      if (!logoFile.type.startsWith('image/')) {
        toast({
          variant: 'destructive',
          title: 'Hata',
          description: 'Sadece görsel dosyaları yükleyebilirsiniz.'
        });
        setIsUploading(false);
        return;
      }
      
      // FormData oluştur
      const formData = new FormData();
      formData.append('file', logoFile);
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
      
      // Marka kaydını yeni logo URL'si ile güncelle
      const updateResponse = await axios.patch(`/api/brands/slug/${brand.slug}`, { 
        logoUrl: response.data.url 
      });
      
      // Marka verilerini güncelle
      setBrand(updateResponse.data);
      
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
        description: err.response?.data?.message || 'Logo yüklenirken bir hata oluştu'
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Logo değişikliği
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          setLogoPreview(event.target.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Logo önizlemeyi temizle
  const clearLogoPreview = () => {
    setLogoPreview(null);
    setLogoFile(null);
  };

  // Marka güncelleme fonksiyonu
  const updateBrand = async (updatedData: any) => {
    if (!brand) return;
    
    try {
      const response = await axios.patch(`/api/brands/slug/${brand.slug}`, updatedData);
      setBrand(response.data);
      toast({
        title: 'Başarılı',
        description: 'Marka bilgileri güncellendi',
      });
      return response.data;
    } catch (err: any) {
      console.error('Marka güncellenirken hata:', err);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: err.response?.data?.error || 'Marka güncellenirken bir hata oluştu'
      });
      throw err;
    }
  };

  if (loading) {
    return (
      <div className="p-6 bg-background">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold">Marka Detayı</h1>
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
          <h1 className="text-4xl font-bold">Marka Detayı</h1>
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
          <span className="text-sm font-medium">
            {brand.name}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">{brand.name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/markalar">
              <ArrowLeft className="mr-2 h-4 w-4" /> Geri
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/markalar/edit/${brand.slug}`}>
              <Pencil className="mr-2 h-4 w-4" /> Düzenle
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

      {brand.isArchived && (
        <Alert variant="warning" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Arşivlenmiş Marka</AlertTitle>
          <AlertDescription>
            Bu marka arşivlenmiştir ve müşteriler tarafından görüntülenmez. 
            {brand.archivedAt && (
              <span className="ml-1">
                Arşivlenme tarihi: {format(new Date(brand.archivedAt), 'PPP', { locale: tr })}
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="products">Ürünler</TabsTrigger>
          <TabsTrigger value="media">Medya</TabsTrigger>
          <TabsTrigger value="content">İçerik</TabsTrigger>
          <TabsTrigger value="settings">Ayarlar</TabsTrigger>
          <TabsTrigger value="stats">İstatistikler</TabsTrigger>
        </TabsList>

        {/* Genel Bakış Sekmesi */}
        <TabsContent value="overview">
            <Card>
          <CardHeader>
            <CardTitle>Marka Bilgileri</CardTitle>
            <CardDescription>
                Marka detayları ve yapılandırması
            </CardDescription>
          </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Marka Adı</h3>
                  <p className="text-base">{brand.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Slug</h3>
                  <p className="text-base">{brand.slug}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Durum</h3>
                  <Badge variant={brand.isActive ? "outline" : "secondary"}>
                    {brand.isActive ? "Aktif" : "Pasif"}
                  </Badge>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Öne Çıkan</h3>
                  <Badge variant={brand.isFeatured ? "default" : "secondary"}>
                    {brand.isFeatured ? "Evet" : "Hayır"}
                  </Badge>
              </div>
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Sıralama</h3>
                  <p className="text-base">{brand.displayOrder}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Oluşturulma Tarihi</h3>
                <p className="text-base">
                    {brand.createdAt ? format(new Date(brand.createdAt), 'PPP', { locale: tr }) : '-'}
                </p>
                </div>
              </div>

              <Separator />
              
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">Açıklama</h3>
                <p className="text-base">{brand.description || 'Açıklama bulunmuyor'}</p>
              </div>
              
              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Header'da Göster</h3>
                  <Badge variant={brand.showInHeader ? "default" : "secondary"}>
                    {brand.showInHeader ? "Evet" : "Hayır"}
                    </Badge>
                </div>
              <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Footer'da Göster</h3>
                  <Badge variant={brand.showInFooter ? "default" : "secondary"}>
                    {brand.showInFooter ? "Evet" : "Hayır"}
                  </Badge>
                  </div>
              <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Yan Menüde Göster</h3>
                  <Badge variant={brand.showInSidebar ? "default" : "secondary"}>
                    {brand.showInSidebar ? "Evet" : "Hayır"}
                  </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
          {/* Logo Kartı */}
          <Card className="mt-6">
          <CardHeader>
            <CardTitle>Logo</CardTitle>
          </CardHeader>
          <CardContent>
              <div className="flex items-center gap-6">
                {brand.logoUrl ? (
                  <div className="relative h-32 w-32 rounded-md overflow-hidden border">
                  <Image
                    src={brand.logoUrl}
                    alt={brand.name}
                    fill
                    className="object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                </div>
                ) : (
                  <div className="flex items-center justify-center h-32 w-32 rounded-md bg-muted">
                    <ImageIcon className="h-10 w-10 text-muted-foreground" />
                </div>
                )}
                
                <div className="space-y-2">
                  <h3 className="text-sm font-medium">Logo Yükleme</h3>
                  <div className="flex items-center gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      id="logo-upload"
                      ref={fileInputRef}
                      className="hidden"
                      onChange={handleLogoChange}
                    />
                    <Button
                      variant="outline"
                      onClick={() => document.getElementById('logo-upload')?.click()}
                      disabled={isUploading}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Logo Seç
                    </Button>
                    {logoFile && (
                      <>
                        <Button
                          variant="outline"
                          onClick={handleLogoUpload}
                          disabled={isUploading}
                        >
                          {isUploading ? (
                            <>Yükleniyor {uploadProgress}%</>
                          ) : (
                            <>
                              <Check className="mr-2 h-4 w-4" />
                              Yükle
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={clearLogoPreview}
                          disabled={isUploading}
                        >
                          <X className="mr-2 h-4 w-4" />
                          İptal
                        </Button>
                      </>
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
                    <div className="mt-2">
                      <p className="text-sm text-muted-foreground mb-1">Önizleme:</p>
                      <div className="relative h-20 w-20 rounded-md overflow-hidden border">
                        <Image
                          src={logoPreview}
                          alt="Logo önizleme"
                          fill
                          className="object-contain"
                        />
                      </div>
                    </div>
                  )}
                </div>
            </div>
          </CardContent>
        </Card>
        </TabsContent>

        {/* Ürünler Sekmesi */}
        <TabsContent value="products">
          <Card>
          <CardHeader>
              <CardTitle>Markaya Ait Ürünler</CardTitle>
            <CardDescription>
                Bu markaya ait tüm ürünlerin listesi
            </CardDescription>
          </CardHeader>
          <CardContent>
              {products.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">Bu markaya ait ürün bulunamadı.</p>
                  <Button variant="outline" className="mt-4" asChild>
                    <Link href="/dashboard/urunler/ekle">
                      <Plus className="mr-2 h-4 w-4" /> Yeni Ürün Ekle
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Ürün Adı</TableHead>
                        <TableHead>Fiyat</TableHead>
                        <TableHead>Stok</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Array.isArray(products) ? products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>{product.id}</TableCell>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>{product.price} TL</TableCell>
                          <TableCell>{product.stock}</TableCell>
                          <TableCell>
                            <Badge variant={product.published ? "default" : "secondary"}>
                              {product.published ? "Yayında" : "Taslak"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/dashboard/urunler/detay/${product.slug}`}>
                                  <Eye className="h-4 w-4" />
                                </Link>
                              </Button>
                              <Button variant="ghost" size="icon" asChild>
                                <Link href={`/dashboard/urunler/${product.slug}`}>
                                  <Pencil className="h-4 w-4" />
                                </Link>
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )) : null}
                    </TableBody>
                  </Table>
                </div>
              )}
          </CardContent>
        </Card>
        </TabsContent>

        {/* Medya Sekmesi */}
        <TabsContent value="media">
          <Card>
        <CardHeader>
              <CardTitle>Marka Medya</CardTitle>
          <CardDescription>
                Marka logosu, banner ve kapak görselleri
          </CardDescription>
        </CardHeader>
        <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Logo */}
            <div>
                  <h3 className="text-sm font-medium mb-2">Logo</h3>
                  {brand.logoUrl ? (
                    <div className="relative h-40 w-full rounded-md overflow-hidden border">
                      <Image
                        src={brand.logoUrl}
                        alt={brand.name}
                        fill
                        className="object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-40 w-full rounded-md bg-muted">
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
            </div>
            
                {/* Banner */}
            <div>
                  <h3 className="text-sm font-medium mb-2">Banner</h3>
                  {brand.bannerUrl ? (
                    <div className="relative h-40 w-full rounded-md overflow-hidden border">
                      <Image
                        src={brand.bannerUrl}
                        alt={`${brand.name} banner`}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-40 w-full rounded-md bg-muted">
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    </div>
                  )}
            </div>
            
                {/* Kapak Görseli */}
            <div>
                  <h3 className="text-sm font-medium mb-2">Kapak Görseli</h3>
                  {brand.coverImageUrl ? (
                    <div className="relative h-40 w-full rounded-md overflow-hidden border">
                      <Image
                        src={brand.coverImageUrl}
                        alt={`${brand.name} kapak görseli`}
                        fill
                        className="object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                  </div>
                ) : (
                    <div className="flex items-center justify-center h-40 w-full rounded-md bg-muted">
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                    </div>
                )}
            </div>
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        {/* İçerik Sekmesi */}
        <TabsContent value="content">
          <Card>
        <CardHeader>
              <CardTitle>Marka İçeriği</CardTitle>
          <CardDescription>
                Marka hakkında detaylı bilgi ve açıklama
          </CardDescription>
        </CardHeader>
        <CardContent>
              {brand.content ? (
                <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: brand.content }} />
              ) : (
                <p className="text-muted-foreground">Bu marka için içerik bulunmuyor.</p>
              )}
                  </CardContent>
                </Card>
        </TabsContent>
                
        {/* Ayarlar Sekmesi */}
        <TabsContent value="settings">
                <Card>
            <CardHeader>
              <CardTitle>Marka Ayarları</CardTitle>
              <CardDescription>
                Marka görünüm ve listeleme ayarları
              </CardDescription>
                  </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Ürün Listeleme Tipi</h3>
                  <p className="text-base">{brand.productListingType || 'Varsayılan'}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Sayfa Başına Ürün</h3>
                  <p className="text-base">{brand.productsPerPage}</p>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Varsayılan Sıralama</h3>
                  <p className="text-base">{brand.defaultSortOrder || 'Varsayılan'}</p>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-1">SEO Bilgileri</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">SEO Başlığı</h4>
                    <p className="text-sm">{brand.seoTitle || brand.name}</p>
                    </div>
                  <div>
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">SEO Anahtar Kelimeleri</h4>
                    <p className="text-sm">{brand.seoKeywords || '-'}</p>
                  </div>
                  <div className="md:col-span-2">
                    <h4 className="text-xs font-medium text-muted-foreground mb-1">SEO Açıklaması</h4>
                    <p className="text-sm">{brand.seoDescription || '-'}</p>
                  </div>
                </div>
              </div>
                  </CardContent>
                </Card>
        </TabsContent>

        {/* İstatistikler Sekmesi */}
        <TabsContent value="stats">
                <Card>
                  <CardHeader>
              <CardTitle>Marka İstatistikleri</CardTitle>
                    <CardDescription>
                Marka performansı ve satış istatistikleri
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
              {stats ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-muted p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Toplam Ürün</h3>
                      <p className="text-2xl font-bold">{stats.totalProducts}</p>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Toplam Satış</h3>
                      <p className="text-2xl font-bold">{stats.totalSales}</p>
                    </div>
                    <div className="bg-muted p-4 rounded-lg">
                      <h3 className="text-sm font-medium text-muted-foreground mb-1">Toplam Gelir</h3>
                      <p className="text-2xl font-bold">{stats.totalRevenue} TL</p>
                    </div>
                  </div>

                    <div className="h-80">
                    <h3 className="text-sm font-medium mb-2">Aylık Satış Grafiği</h3>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                        data={stats.monthlySales}
                        margin={{
                          top: 5,
                          right: 30,
                          left: 20,
                          bottom: 5,
                        }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                        <YAxis />
                          <RechartsTooltip />
                          <Legend />
                        <Bar dataKey="sales" fill="#8884d8" name="Satış Adedi" />
                        <Bar dataKey="revenue" fill="#82ca9d" name="Gelir (TL)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
            </div>
          ) : (
                <p className="text-muted-foreground">İstatistik verisi bulunamadı.</p>
          )}
        </CardContent>
      </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

BrandDetail.getLayout = function getLayout(page: ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>
}

export default BrandDetail 