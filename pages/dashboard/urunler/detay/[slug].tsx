import { ReactElement, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import axios from '@/lib/axios'
import { toast } from '@/components/ui/use-toast'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Edit,
  Trash2,
  ExternalLink,
  Image as ImageIcon,
  Package,
  Tag,
  CircleDollarSign,
  Truck,
  BarChart3,
  CheckCircle2,
  XCircle,
  Barcode
} from 'lucide-react'
import Image from 'next/image'
import { Skeleton } from '@/components/ui/skeleton'

interface Variant {
  id: number
  productId: number
  price: number
  comparativePrice: number | null
  costPerItem: number | null
  stock: number
  imageUrls: string[]
  variantValues?: Array<{
    id: number
    value: string
    variantGroupId: number
  }>
}

interface VariantValue {
  id: number
  value: string
  variantGroupId: number
}

interface VariantGroup {
  id: number
  name: string
  productId: number
  values: VariantValue[]
}

interface Product {
  id: number
  name: string
  description: string | null
  slug: string
  published: boolean
  categoryId: number | null
  brandId: number | null
  seoTitle: string | null
  seoDescription: string | null
  imageUrls: string[]
  basePrice: number
  comparativePrice: number | null
  taxIncluded: boolean
  costPerItem: number | null
  sku: string | null
  barcode: string | null
  variants: Variant[]
  variantGroups: VariantGroup[]
  createdAt: string
  updatedAt: string
  isPhysicalProduct?: boolean
  weight?: number
  weightUnit?: string
  countryOfOrigin?: string
  hsCode?: string
}

interface Category {
  id: number
  name: string
  slug: string
}

interface Brand {
  id: number
  name: string
  slug: string
}

function ProductDetail() {
  const router = useRouter()
  const { slug } = router.query
  const [product, setProduct] = useState<Product | null>(null)
  const [category, setCategory] = useState<Category | null>(null)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetchProduct = async () => {
    if (!slug) return

    setLoading(true)
    try {
      const response = await axios.get(`/api/products/slug/${slug}`)
      console.log("Ürün verileri:", response.data);
      setProduct(response.data)

      // Kategori ve marka bilgilerini doğrudan ürün verisinden al
      if (response.data.category) {
        setCategory(response.data.category)
      }

      if (response.data.brand) {
        setBrand(response.data.brand)
      }

    } catch (err: any) {
      setError(err.response?.data?.error || 'Ürün bilgileri alınamadı')
      toast({
        title: 'Hata',
        description: 'Ürün bilgileri yüklenirken bir hata oluştu',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const deleteProduct = async () => {
    if (!product) return;
    
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.')) {
      return;
    }
    
    try {
      setDeleting(true);
      await axios.delete(`/api/products/by-id/${product.id}`);
      
      toast({
        title: 'Başarılı!',
        description: 'Ürün başarıyla silindi.',
      });
      
      // Ürünler sayfasına yönlendir
      router.push('/dashboard/urunler');
    } catch (error) {
      console.error('Ürün silinirken hata:', error);
      toast({
        title: 'Hata!',
        description: 'Ürün silinirken bir hata oluştu.',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  useEffect(() => {
    fetchProduct()
  }, [slug])

  // Tarih formatı yardımcı fonksiyonu
  const formatDate = (dateString: string | null | undefined): string => {
    if (!dateString) return 'Tarih bilgisi yok';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Geçersiz tarih';
      
      return date.toLocaleDateString('tr-TR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      console.error('Tarih formatlanırken hata:', error);
      return 'Tarih formatlanamadı';
    }
  };

  // Kar ve kar marjı hesaplama
  const calculateProfit = (price: number, cost: number): { profit: number; margin: number } => {
    if (!price || !cost) return { profit: 0, margin: 0 }
    
    const profit = price - cost
    const margin = cost > 0 ? (profit / price) * 100 : 0
    
    return { 
      profit: Math.round(profit * 100) / 100, 
      margin: Math.round(margin * 100) / 100 
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-4">
            <Skeleton className="h-80 w-full" />
            <div className="space-y-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-1/2" />
            </div>
          </div>
          <div className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-40 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !product) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-4">
          <XCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold">Ürün Bulunamadı</h2>
          <p className="text-muted-foreground">{error || 'Bu ürün bulunamadı veya erişim izniniz yok.'}</p>
          <Button variant="outline" asChild>
            <Link href="/dashboard/urunler">
              <ArrowLeft className="mr-2 h-4 w-4" /> Ürünlere Dön
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  // Varyant kombinasyonları
  const hasVariants = product.variants?.length > 1 || product.variantGroups?.length > 0
  const totalStock = product.variants?.reduce((sum, variant) => sum + variant.stock, 0) || 0
  const minPrice = product.variants?.length > 0 ? Math.min(...product.variants.map(v => v.price)) : product.basePrice || 0
  const maxPrice = product.variants?.length > 0 ? Math.max(...product.variants.map(v => v.price)) : product.basePrice || 0
  const minCompPrice = product.variants?.length > 0 ? 
    Math.min(...product.variants.filter(v => v.comparativePrice !== null).map(v => v.comparativePrice || 0)) : 
    product.comparativePrice || 0
  const maxCompPrice = product.variants?.length > 0 ? 
    Math.max(...product.variants.filter(v => v.comparativePrice !== null).map(v => v.comparativePrice || 0)) : 
    product.comparativePrice || 0
  const minCostPerItem = product.variants?.length > 0 ? 
    Math.min(...product.variants.filter(v => v.costPerItem !== null).map(v => v.costPerItem || 0)) : 
    product.costPerItem || 0
  const maxCostPerItem = product.variants?.length > 0 ? 
    Math.max(...product.variants.filter(v => v.costPerItem !== null).map(v => v.costPerItem || 0)) : 
    product.costPerItem || 0
  const hasPriceRange = minPrice !== maxPrice
  const hasCompPriceRange = minCompPrice !== maxCompPrice && minCompPrice > 0
  const hasCostRange = minCostPerItem !== maxCostPerItem && minCostPerItem > 0
  const imageUrls = product.imageUrls || []

  console.log("Render edilirken imageUrls:", imageUrls);

  return (
    <div className="p-6 bg-background space-y-6">
      {/* Üst kısım - Başlık ve Butonlar */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={product.published ? "default" : "secondary"}>
              {product.published ? 'Yayında' : 'Taslak'}
            </Badge>
            {product.slug && (
              <span className="text-sm text-muted-foreground">
                /{product.slug}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" asChild>
            <Link href="/dashboard/urunler">
              <ArrowLeft className="mr-2 h-4 w-4" /> Geri
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/urunler/${product.slug}`} target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" /> Sitede Görüntüle
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/urunler/${product.slug}`}>
              <Edit className="mr-2 h-4 w-4" /> Düzenle
            </Link>
          </Button>
          <Button variant="destructive" onClick={deleteProduct}>
            <Trash2 className="mr-2 h-4 w-4" /> Sil
          </Button>
        </div>
      </div>

      {/* İçerik */}
      <Tabs defaultValue="overview">
        <TabsList className="mb-4">
          <TabsTrigger value="overview">Genel Bakış</TabsTrigger>
          <TabsTrigger value="variants">Varyantlar{hasVariants && ` (${product.variants?.length || 0})`}</TabsTrigger>
          <TabsTrigger value="images">Görseller{` (${imageUrls.length})`}</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        {/* Genel Bakış Sekmesi */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Ürün Bilgileri */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Ürün Bilgileri</CardTitle>
                <CardDescription>
                  Temel ürün detayları ve açıklaması
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-medium mb-2">Açıklama</h3>
                  <div className="rounded-md bg-slate-50 p-4 text-sm">
                    {product.description ? (
                      <div dangerouslySetInnerHTML={{ __html: product.description }} />
                    ) : (
                      <p className="text-muted-foreground italic">Açıklama bulunmuyor</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-2">Kategori</h3>
                    <div className="flex items-center">
                      <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
                      {category ? (
                        <span>{category.name}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Kategori belirlenmemiş</span>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Marka</h3>
                    <div className="flex items-center">
                      <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                      {brand ? (
                        <span>{brand.name}</span>
                      ) : (
                        <span className="text-muted-foreground italic">Marka belirlenmemiş</span>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-2">Oluşturulma Tarihi</h3>
                    <div className="text-sm">
                      {formatDate(product.createdAt)}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-2">Son Güncelleme</h3>
                    <div className="text-sm">
                      {formatDate(product.updatedAt)}
                    </div>
                  </div>
                </div>
                
                {/* Kargo bilgileri */}
                {typeof product.isPhysicalProduct !== 'undefined' && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-medium mb-3">Kargo Bilgileri</h3>
                      <div className="rounded-md border p-4">
                        <div className="flex items-center mb-3">
                          <span className={`inline-flex items-center mr-2 ${product.isPhysicalProduct ? 'text-green-600' : 'text-orange-600'}`}>
                            {product.isPhysicalProduct ? <CheckCircle2 className="h-4 w-4 mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                          </span>
                          <span className="font-medium">{product.isPhysicalProduct ? 'Fiziksel Ürün' : 'Dijital Ürün'}</span>
                        </div>
                        
                        {product.isPhysicalProduct && (
                          <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                            {product.weight && (
                              <div>
                                <span className="text-muted-foreground">Ağırlık:</span>
                                <span className="ml-2 font-medium">
                                  {product.weight} {product.weightUnit || 'kg'}
                                </span>
                              </div>
                            )}
                            
                            {product.countryOfOrigin && (
                              <div>
                                <span className="text-muted-foreground">Menşe Ülke:</span>
                                <span className="ml-2 font-medium">
                                  {product.countryOfOrigin === 'TR' ? 'Türkiye' : 
                                   product.countryOfOrigin === 'CN' ? 'Çin' :
                                   product.countryOfOrigin === 'US' ? 'Amerika Birleşik Devletleri' :
                                   product.countryOfOrigin === 'DE' ? 'Almanya' :
                                   product.countryOfOrigin === 'IT' ? 'İtalya' :
                                   product.countryOfOrigin === 'FR' ? 'Fransa' :
                                   product.countryOfOrigin === 'GB' ? 'Birleşik Krallık' :
                                   product.countryOfOrigin === 'JP' ? 'Japonya' :
                                   product.countryOfOrigin === 'KR' ? 'Güney Kore' :
                                   product.countryOfOrigin}
                                </span>
                              </div>
                            )}
                            
                            {product.hsCode && (
                              <div className="col-span-2">
                                <span className="text-muted-foreground">HS Kodu:</span>
                                <span className="ml-2 font-medium">
                                  {product.hsCode}
                                </span>
                              </div>
                            )}
                            
                            {!product.weight && !product.countryOfOrigin && !product.hsCode && (
                              <div className="col-span-2 text-muted-foreground italic">
                                Detaylı kargo bilgisi bulunmuyor
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Yan Panel - Özet Bilgiler */}
            <div className="space-y-6">
              {/* Stok Bilgisi */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Stok Durumu</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>Toplam Stok</span>
                    </div>
                    <Badge variant={totalStock > 0 ? "default" : "destructive"}>
                      {totalStock > 0 ? totalStock : 'Stokta Yok'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* SKU ve Barkod Bilgisi */}
              {(product.sku || product.barcode) && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Stok Kodu ve Barkod</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      {product.sku && (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <Package className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>SKU (Stok Kodu)</span>
                          </div>
                          <span className="font-medium">{product.sku}</span>
                        </div>
                      )}
                      
                      {product.barcode && (
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center">
                            <Barcode className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>Barkod</span>
                          </div>
                          <span className="font-medium">{product.barcode}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Fiyat Bilgisi */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Fiyat Bilgisi</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col gap-2">
                    <h3 className="flex items-center gap-2 font-semibold text-lg">
                      <CircleDollarSign className="h-5 w-5 text-muted-foreground" />
                      Fiyat Bilgisi
                    </h3>
                    <div className="grid gap-2">
                      {hasPriceRange ? (
                        <div className="font-bold text-xl">
                          {minPrice.toLocaleString('tr-TR')}₺ - {maxPrice.toLocaleString('tr-TR')}₺
                        </div>
                      ) : (
                        <div className="font-bold text-xl">
                          {minPrice.toLocaleString('tr-TR')}₺
                        </div>
                      )}
                      
                      {/* Karşılaştırma Fiyatı */}
                      {(minCompPrice > 0 || product.comparativePrice) && (
                        <div className="text-muted-foreground">
                          <span className="line-through">
                            {hasCompPriceRange
                              ? `${minCompPrice.toLocaleString('tr-TR')}₺ - ${maxCompPrice.toLocaleString('tr-TR')}₺`
                              : `${(product.comparativePrice || minCompPrice).toLocaleString('tr-TR')}₺`}
                          </span>
                          {minCompPrice > 0 && minPrice > 0 && (
                            <span className="ml-2 text-emerald-600 font-medium">
                              {Math.round(((minCompPrice - minPrice) / minCompPrice) * 100)}% indirim
                            </span>
                          )}
                        </div>
                      )}

                      {/* Vergi Bilgisi */}
                      <div className="text-sm text-muted-foreground flex items-center mt-1">
                        <span className={`inline-flex items-center mr-2 ${product.taxIncluded ? 'text-green-600' : 'text-orange-600'}`}>
                          {product.taxIncluded ? <CheckCircle2 className="h-4 w-4 mr-1" /> : <XCircle className="h-4 w-4 mr-1" />}
                        </span>
                        {product.taxIncluded ? 'KDV dahil' : 'KDV hariç'}
                      </div>

                      {/* Maliyet ve Kar Bilgileri */}
                      {!product.taxIncluded && (product.costPerItem || minCostPerItem > 0) && (
                        <div className="mt-3 p-3 border rounded-md bg-background">
                          <h4 className="text-sm font-medium mb-2">Kar Hesabı</h4>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <span className="text-muted-foreground">Maliyet:</span>
                              <span className="ml-2 font-medium">
                                {hasCostRange
                                  ? `${minCostPerItem.toLocaleString('tr-TR')}₺ - ${maxCostPerItem.toLocaleString('tr-TR')}₺`
                                  : `${(product.costPerItem || minCostPerItem).toLocaleString('tr-TR')}₺`}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Kar:</span>
                              <span className="ml-2 font-medium">
                                {(minPrice - (product.costPerItem || minCostPerItem)).toLocaleString('tr-TR')}₺
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Kar Marjı:</span>
                              <span className="ml-2 font-medium">
                                %{calculateProfit(minPrice, (product.costPerItem || minCostPerItem)).margin.toFixed(1)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Ana Görsel */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Ana Görsel</CardTitle>
                </CardHeader>
                <CardContent>
                  {imageUrls && imageUrls.length > 0 ? (
                    <div className="relative h-40 w-full overflow-hidden rounded-md">
                      <Image
                        src={imageUrls[0]}
                        alt={product.name}
                        fill
                        sizes="(max-width: 640px) 100vw, 300px"
                        className="object-cover"
                        onError={(e) => {
                          // Görsel yüklenemezse placeholder göster
                          (e.target as any).src = 'https://via.placeholder.com/400x400?text=Görsel+Yok';
                        }}
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-40 bg-slate-100 rounded-md">
                      <ImageIcon className="h-10 w-10 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground mt-2">Görsel yok</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Varyantlar Sekmesi */}
        <TabsContent value="variants" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ürün Varyantları</CardTitle>
              <CardDescription>
                {hasVariants 
                  ? `${product.variants.length} farklı varyant yapılandırması`
                  : "Bu ürünün varyantları bulunmuyor"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasVariants ? (
                <div className="border rounded-md">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="py-3 px-4 text-left font-medium text-sm">Varyant</th>
                        <th className="py-3 px-4 text-right font-medium text-sm">Stok</th>
                        <th className="py-3 px-4 text-right font-medium text-sm">Fiyat</th>
                      </tr>
                    </thead>
                    <tbody>
                      {product.variants.map((variant, index) => {
                        // Varyant adını oluştur
                        let variantName = 'Varsayılan';
                        
                        if (product.variantGroups.length > 0 && variant.variantValues && variant.variantValues.length > 0) {
                          // Bu varyanta ait değerleri bul
                          const variantValueNames = variant.variantValues.map((vv: { id: number; value: string; variantGroupId: number }) => {
                            const group = product.variantGroups.find(g => g.id === vv.variantGroupId);
                            return `${group ? group.name + ': ' : ''}${vv.value}`;
                          });
                          
                          variantName = variantValueNames.join(' / ');
                        } else {
                          variantName = `Varyant #${index + 1}`;
                        }
                        
                        return (
                          <tr key={variant.id} className="border-b last:border-0">
                            <td className="py-3 px-4">
                              <div className="font-medium">{variantName}</div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <Badge variant={variant.stock > 0 ? "outline" : "secondary"}>
                                {variant.stock}
                              </Badge>
                            </td>
                            <td className="py-3 px-4 text-right font-medium">
                              {variant.price.toFixed(2)} TL
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-medium mb-1">Varyant Bulunmuyor</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Bu ürün için yapılandırılmış varyant bulunmuyor.
                  </p>
                  <Button variant="outline" asChild>
                    <Link href={`/dashboard/urunler/${product.slug}`}>
                      <Edit className="mr-2 h-4 w-4" /> Varyant Ekle
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Görseller Sekmesi */}
        <TabsContent value="images" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ürün Görselleri</CardTitle>
              <CardDescription>
                {imageUrls && imageUrls.length > 0 
                  ? `${imageUrls.length} görsel`
                  : "Bu ürüne ait görsel bulunmuyor"
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {imageUrls && imageUrls.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {imageUrls.map((url, index) => (
                    <div key={index} className="relative aspect-square rounded-md overflow-hidden border">
                      <Image
                        src={url}
                        alt={`${product.name} - Görsel ${index + 1}`}
                        fill
                        sizes="(max-width: 640px) 100vw, 300px"
                        className="object-cover"
                        onError={(e) => {
                          // Görsel yüklenemezse placeholder göster
                          (e.target as any).src = 'https://via.placeholder.com/400x400?text=Görsel+Yok';
                        }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-40 bg-slate-100 rounded-md">
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground mt-2">Görsel yok</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default ProductDetail

// getLayout fonksiyonunu ekleyelim
ProductDetail.getLayout = function getLayout(page: ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>
}