import { ReactElement, useEffect, useState, useCallback } from 'react'
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
  ChevronDown,
  ChevronRight,
  LayoutGrid,
  Plus,
  Image as ImageIcon,
  Check,
  X,
  Search,
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
  Tabs,
  TabsList,
  TabsContent,
  TabsTrigger
} from '@/components/ui/tabs'
import {
  Input
} from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Checkbox
} from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { useForm, FormProvider } from 'react-hook-form'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

// Category tipi
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
  parent?: Category | null
  children: Category[]
  isActive?: boolean
  isFeatured?: boolean
  isArchived?: boolean
  archivedAt?: string
  showInHeader?: boolean
  showInFooter?: boolean
  showInSidebar?: boolean
  productsPerPage?: number
  defaultSortOrder?: string
  customFilters?: any
  featuredProducts?: any
  displayOrder?: number
  products?: any[]
  createdAt?: string
  updatedAt?: string
  imageUrl?: string
  iconUrl?: string
  mobileBannerUrl?: string
  allowProductComparison?: boolean
  maxCompareProducts?: number
  compareAttributes?: string
  priceRanges?: string
  allowedBrands?: string
  stockFilterEnabled?: boolean
  showOutOfStock?: boolean
  deliveryOptions?: string
  paymentOptions?: string
  freeShipping?: boolean
  freeShippingThreshold?: number
}

function CategoryDetail() {
  const router = useRouter()
  const { slug } = router.query
  const { toast } = useToast()

  const [category, setCategory] = useState<Category | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [products, setProducts] = useState<any[]>([])
  const [productError, setProductError] = useState<string | null>(null)
  const [showAddProductModal, setShowAddProductModal] = useState(false)
  const [showProductManagement, setShowProductManagement] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({})
  const [stats, setStats] = useState<any>(null)
  const [loadingStats, setLoadingStats] = useState<boolean>(false)
  const [statsError, setStatsError] = useState<string | null>(null)
  const [promotionType, setPromotionType] = useState<'percentage' | 'fixed'>('percentage')
  const [promotionValue, setPromotionValue] = useState<string>('')
  const [promotionError, setPromotionError] = useState<string | null>(null)
  const [loadingProducts, setLoadingProducts] = useState<boolean>(false)
  const [productSearchTerm, setProductSearchTerm] = useState<string>('')
  const [selectedProducts, setSelectedProducts] = useState<number[]>([])
  const [availableProducts, setAvailableProducts] = useState<any[]>([])
  const [sortCriteria, setSortCriteria] = useState<string>('name_asc')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [priceAction, setPriceAction] = useState<string>('increase_percent')
  const [priceValue, setPriceValue] = useState<string>('')
  const [stockAction, setStockAction] = useState<string>('increase')
  const [stockValue, setStockValue] = useState<string>('')
  const [discountType, setDiscountType] = useState<string>('percent')
  const [discountValue, setDiscountValue] = useState<string>('')
  const [discountStartDate, setDiscountStartDate] = useState<string>('')
  const [discountEndDate, setDiscountEndDate] = useState<string>('')
  const [promotionLabel, setPromotionLabel] = useState<string>('')
  const [selectedCategoryProducts, setSelectedCategoryProducts] = useState<number[]>([])
  const [saving, setSaving] = useState<boolean>(false)
  const [searchTerm, setSearchTerm] = useState('')

  const methods = useForm({
    defaultValues: {
      // Add your form fields here
    }
  })

  // Kategori silme işlemi
  const handleDelete = async () => {
    if (!category) {
        toast({
          variant: 'destructive',
          title: 'Hata',
        description: 'Kategori bulunamadı',
      })
      return
    }
    
    try {
      await axios.delete(`/api/categories/${category.id}`)
      toast({
        title: 'Başarılı',
        description: 'Kategori başarıyla silindi',
      })
      router.push('/dashboard/kategoriler')
    } catch (error: any) {
      console.error('Kategori silinirken hata:', error)
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: error.response?.data?.error || 'Kategori silinirken bir hata oluştu',
      })
    }
  }

  // Alt kategorileri ağaç yapısında gösterme
  const renderChildrenTree = (children: Category[]) => {
    if (!children || children.length === 0) return null

    return (
      <div className="space-y-2">
        {children.map((child) => (
          <div key={child.id} className="border rounded-md">
            <div 
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50"
                  onClick={() => toggleCategory(child.slug)}
            >
              <div className="flex items-center">
                {child.children && child.children.length > 0 ? (
                  expandedCategories[child.slug] ? (
                    <ChevronDown className="h-4 w-4 mr-2 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 mr-2 text-muted-foreground" />
                  )
                ) : (
                  <div className="w-6" />
                )}
                <span>{child.name}</span>
                {child.isActive === false && (
                  <Badge variant="outline" className="ml-2 bg-gray-50 text-gray-700">Pasif</Badge>
                )}
                {child.isFeatured && (
                  <Badge variant="default" className="ml-2 bg-yellow-500 hover:bg-yellow-600">Öne Çıkan</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/kategoriler/${child.slug}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Görüntüle</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/dashboard/kategoriler/edit/${child.slug}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Düzenle</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            
            {expandedCategories[child.slug] && child.children && child.children.length > 0 && (
              <div className="pl-6 pr-3 pb-3">
                {renderChildrenTree(child.children)}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  const onSubmit = async (data: any) => {
    setSaving(true)
    try {
      // Handle form submission
      toast({
        title: 'Başarılı',
        description: 'Değişiklikler kaydedildi.',
      })
    } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Hata',
        description: 'Değişiklikler kaydedilirken bir hata oluştu.',
        })
      } finally {
      setSaving(false)
    }
  }

  // Kategoriye ait ürünleri getir
  const fetchProducts = useCallback(async () => {
    try {
      // Kategori ID'si yerine slug kullanarak ürünleri getir
      const { data } = await axios.get(`/api/products?categoryId=${category?.slug}`)
      // API doğrudan ürün listesini döndürüyor, products özelliği yok
      setProducts(Array.isArray(data) ? data : [])
    } catch (error) {
      console.error('Ürünler yüklenirken hata:', error)
      toast({
        title: 'Hata',
        description: 'Ürünler yüklenirken bir hata oluştu',
        variant: 'destructive'
      })
    }
  }, [category?.slug, toast]);

  // Kategori detayını getir
  const fetchCategory = useCallback(async () => {
    try {
      const { data } = await axios.get(`/api/categories/slug/${slug}`)
      setCategory(data)
      setError(null)
    } catch (error: any) {
      console.error('Kategori yüklenirken hata:', error)
      setError(error.response?.data?.error || 'Kategori yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }, [slug])

  // Alt kategori açma/kapama
  const toggleCategory = (slug: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [slug]: !prev[slug]
    }))
  }

  // Kategori değiştiğinde ürünleri yükle
  useEffect(() => {
    if (!category) return;
    fetchProducts();
  }, [category, fetchProducts]);

  // Sayfa yüklendiğinde kategori bilgilerini getir
  useEffect(() => {
    if (slug) {
      fetchCategory();
    }
  }, [slug, fetchCategory]);

  // Kategori istatistiklerini getir
  useEffect(() => {
    if (!category) return;

    const fetchStats = async () => {
      setLoadingStats(true);
      try {
        const { data } = await axios.get(`/api/categories/stats/${category.slug}`);
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
  }, [category]);

  // Ürün yönetimi işlemleri
  const handleSearchProducts = async () => {
    if (!category) return

    try {
      const { data } = await axios.get(`/api/products?categoryId=${category.slug}&search=${productSearchTerm}`)
      setAvailableProducts(data)
    } catch (err: any) {
      console.error('Ürünler yüklenirken hata:', err)
      setProductError(err.response?.data?.error || 'Ürünler yüklenirken bir hata oluştu')
    }
  }

  const handleRemoveProductsFromCategory = async () => {
    if (!category || selectedCategoryProducts.length === 0) return

    try {
      await axios.delete(`/api/categories/slug/${category.slug}/products`, { 
        data: { productIds: selectedCategoryProducts } 
      })
      toast({
        title: 'Başarılı',
        description: 'Ürünler başarıyla kategoriden çıkarıldı',
      })
      setSelectedCategoryProducts([])
      // Ürün listesini yenile
      const { data } = await axios.get(`/api/products?categoryId=${category.slug}`);
      setProducts(data)
    } catch (err: any) {
      console.error('Ürünler kategoriden çıkarılırken hata:', err)
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: err.response?.data?.error || 'Ürünler kategoriden çıkarılırken bir hata oluştu'
      })
    }
  }

  const resetFilters = () => {
    setSortCriteria('name_asc')
    setStatusFilter('all')
  }

  const applyFilters = async () => {
    if (!category) return

    try {
      let url = `/api/products?categoryId=${category.slug}`;
      
      // Sıralama parametrelerini ekle
      if (sortCriteria) {
        const [field, order] = sortCriteria.split('_');
        url += `&sortBy=${field}&sortOrder=${order}`;
      }
      
      // Durum filtresini ekle
      if (statusFilter && statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      
      const { data } = await axios.get(url);
      setProducts(data);
    } catch (err: any) {
      console.error('Ürünler filtrelenirken hata:', err);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: err.response?.data?.error || 'Ürünler filtrelenirken bir hata oluştu'
      });
    }
  }

  const resetBulkActions = () => {
    setPriceAction('increase_percent')
    setPriceValue('')
    setStockAction('increase')
    setStockValue('')
  }

  const applyBulkUpdate = async () => {
    if (!category || (!priceValue && !stockValue)) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Lütfen fiyat veya stok değeri girin'
      });
      return;
    }

    // Eğer hiç ürün seçilmemişse, kategorideki tüm ürünleri güncelle
    const productIds = selectedCategoryProducts.length > 0 
      ? selectedCategoryProducts 
      : products.map(p => p.id);

    if (productIds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Güncellenecek ürün bulunamadı'
      });
      return;
    }

    try {
      await axios.post(`/api/categories/slug/${category.slug}/bulk-update`, {
        productIds,
        priceAction: priceValue ? priceAction : null,
        priceValue: priceValue || null,
        stockAction: stockValue ? stockAction : null,
        stockValue: stockValue || null
      });
      
      toast({
        title: 'Başarılı',
        description: 'Ürünler başarıyla güncellendi'
      });
      
      // Ürün listesini yenile
      const { data } = await axios.get(`/api/products?categoryId=${category.slug}`);
      setProducts(data);
      
      // Değerleri sıfırla
      resetBulkActions();
    } catch (err: any) {
      console.error('Ürünler güncellenirken hata:', err);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: err.response?.data?.error || 'Ürünler güncellenirken bir hata oluştu'
      });
    }
  }

  const resetPromotions = () => {
    setDiscountType('percent')
    setDiscountValue('')
    setDiscountStartDate('')
    setDiscountEndDate('')
    setPromotionLabel('')
  }

  const applyPromotions = async () => {
    if (!category || !discountValue) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'Lütfen indirim değeri girin'
      });
      return;
    }

    // Eğer hiç ürün seçilmemişse, kategorideki tüm ürünleri güncelle
    const productIds = selectedCategoryProducts.length > 0 
      ? selectedCategoryProducts 
      : products.map(p => p.id);

    if (productIds.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: 'İndirim uygulanacak ürün bulunamadı'
      });
      return;
    }

    try {
      await axios.post(`/api/categories/slug/${category.slug}/promotions`, {
        productIds,
        discountType,
        discountValue,
        startDate: discountStartDate || null,
        endDate: discountEndDate || null,
        label: promotionLabel || null
      });
      
      toast({
        title: 'Başarılı',
        description: 'İndirim başarıyla uygulandı'
      });
      
      // Ürün listesini yenile
      const { data } = await axios.get(`/api/products?categoryId=${category.slug}`);
      setProducts(data);
      
      // Değerleri sıfırla
      resetPromotions();
    } catch (err: any) {
      console.error('İndirim uygulanırken hata:', err);
      toast({
        variant: 'destructive',
        title: 'Hata',
        description: err.response?.data?.error || 'İndirim uygulanırken bir hata oluştu'
      });
    }
  }

  if (loading) {
    return (
      <div className="p-6 bg-background">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold">Kategori Detayı</h1>
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

  if (error || !category) {
    return (
      <div className="p-6 bg-background">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold">Kategori Detayı</h1>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center min-h-[300px]">
              <AlertCircle className="h-8 w-8 text-red-500 mb-4" />
              <p className="text-xl text-center font-medium text-red-500">
                {error || 'Kategori bulunamadı'}
              </p>
              <Button variant="outline" className="mt-4" asChild>
                <Link href="/dashboard/kategoriler">
                  <ArrowLeft className="mr-2 h-4 w-4" /> Kategorilere Dön
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
          <Link href="/dashboard/kategoriler" className="text-sm font-medium text-muted-foreground hover:text-foreground">
            Kategoriler
          </Link>
          <span className="mx-2 text-muted-foreground">/</span>
          <span className="text-sm font-medium">
            {category.name}
          </span>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-4xl font-bold">{category.name}</h1>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/kategoriler">
              <ArrowLeft className="mr-2 h-4 w-4" /> Geri
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/dashboard/kategoriler/edit/${category.slug}`}>
              <Pencil className="mr-2 h-4 w-4" /> Düzenle
            </Link>
          </Button>
          <Button variant="destructive" onClick={() => {
            if (!window.confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) return
            handleDelete()
          }}>
            <Trash2 className="mr-2 h-4 w-4" /> Sil
          </Button>
        </div>
      </div>

      <Tabs defaultValue="basic" className="space-y-4">
        <TabsList>
          <TabsTrigger value="basic">Temel Bilgiler</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
          <TabsTrigger value="display">Görünüm</TabsTrigger>
          <TabsTrigger value="comparison">Karşılaştırma</TabsTrigger>
          <TabsTrigger value="advanced">Gelişmiş</TabsTrigger>
          <TabsTrigger value="products">Ürünler</TabsTrigger>
          <TabsTrigger value="subcategories">Alt Kategoriler</TabsTrigger>
        </TabsList>

        <TabsContent value="basic">
          <Card>
            <CardHeader>
              <CardTitle>Kategori Bilgileri</CardTitle>
              <CardDescription>
                Kategori temel bilgileri
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Kategori Adı</p>
                  <p className="font-medium">{category.name}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Slug</p>
                  <p className="font-medium">{category.slug}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Durum</p>
                  {category.isActive !== false ? (
                    <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Aktif
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-gray-50 text-gray-700 hover:bg-gray-50">
                      Pasif
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Üst Kategori</p>
                  <p className="font-medium">
                    {category.parent ? (
                      <Link href={`/dashboard/kategoriler/${category.parent.slug}`} className="text-primary hover:underline">
                        {category.parent.name}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">Yok</span>
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Görüntülenme Sırası</p>
                  <p className="font-medium">{category.displayOrder || 0}</p>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-muted-foreground mb-1">Açıklama</p>
                <p>{category.description || 'Açıklama bulunmuyor'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="seo">
          <Card>
            <CardHeader>
              <CardTitle>SEO Bilgileri</CardTitle>
              <CardDescription>
                Arama motoru optimizasyonu bilgileri
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">SEO Başlığı</p>
                <p>{category.seoTitle || 'SEO başlığı bulunmuyor'}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">SEO Açıklaması</p>
                <p>{category.seoDescription || 'SEO açıklaması bulunmuyor'}</p>
              </div>

              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">SEO Anahtar Kelimeleri</p>
                <p>{category.seoKeywords || 'SEO anahtar kelimeleri bulunmuyor'}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="display">
          <Card>
            <CardHeader>
              <CardTitle>Görünüm Ayarları</CardTitle>
              <CardDescription>
                Kategorinin görünüm ve görüntülenme ayarları
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Öne Çıkarılmış</p>
                  <p className="font-medium">
                    {category.isFeatured ? (
                      <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                        Öne Çıkan
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Hayır</span>
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Slider'da Göster</p>
                  <p className="font-medium">
                    {category.showInSlider ? (
                      <Badge variant="default" className="bg-blue-500 hover:bg-blue-600">
                        Evet
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Hayır</span>
                    )}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Header'da Göster</p>
                  <p className="font-medium">
                    {category.showInHeader ? (
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                        Evet
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Hayır</span>
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Footer'da Göster</p>
                  <p className="font-medium">
                    {category.showInFooter ? (
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                        Evet
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Hayır</span>
                    )}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Sidebar'da Göster</p>
                  <p className="font-medium">
                    {category.showInSidebar ? (
                      <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                        Evet
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Hayır</span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison">
          <Card>
            <CardHeader>
              <CardTitle>Karşılaştırma Ayarları</CardTitle>
              <CardDescription>
                Kategori ürün karşılaştırma özellikleri
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Ürün Karşılaştırma</h4>
                    <p className="text-sm text-muted-foreground">
                      Bu kategoride ürün karşılaştırma özelliği
                    </p>
                  </div>
                  <Badge variant={category?.allowProductComparison ? "outline" : "secondary"}>
                    {category?.allowProductComparison ? "Aktif" : "Pasif"}
                  </Badge>
                </div>

                {category?.allowProductComparison && (
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">Maksimum Karşılaştırma</h4>
                        <p className="text-sm text-muted-foreground">
                          Aynı anda karşılaştırılabilecek maksimum ürün sayısı
                        </p>
                      </div>
                      <Badge variant="outline">{category?.maxCompareProducts || 4}</Badge>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Karşılaştırma Özellikleri</h4>
                      <div className="border rounded-md p-4">
                        {category?.compareAttributes ? (
                          <div className="grid grid-cols-2 gap-4">
                            {JSON.parse(category.compareAttributes).map((attr: string, index: number) => (
                              <div key={index} className="flex items-center gap-2">
                                <Check className="h-4 w-4 text-green-500" />
                                <span>{attr}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Henüz karşılaştırma özelliği belirlenmemiş
                          </p>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced">
          <Card>
            <CardHeader>
              <CardTitle>Gelişmiş Ayarlar</CardTitle>
              <CardDescription>
                Kategori için gelişmiş ayarlar ve yapılandırmalar
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Sayfa Başına Ürün</p>
                  <p className="font-medium">{category.productsPerPage || 12}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Varsayılan Sıralama</p>
                  <p className="font-medium">
                    {category.defaultSortOrder ? (
                      (() => {
                        const sortOptions = {
                          default: "Varsayılan",
                          newest: "En Yeniler",
                          price_asc: "Fiyat (Artan)",
                          price_desc: "Fiyat (Azalan)",
                          name_asc: "İsim (A-Z)",
                          name_desc: "İsim (Z-A)",
                          popularity: "Popülerlik"
                        };
                        return sortOptions[category.defaultSortOrder as keyof typeof sortOptions] || category.defaultSortOrder;
                      })()
                    ) : (
                      <span className="text-gray-400">Varsayılan</span>
                    )}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Stok Durumu Filtreleme</p>
                  <Badge variant={category.stockFilterEnabled !== false ? "outline" : "secondary"}>
                    {category.stockFilterEnabled !== false ? "Aktif" : "Pasif"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Stokta Olmayan Ürünleri Göster</p>
                  <Badge variant={category.showOutOfStock !== false ? "outline" : "secondary"}>
                    {category.showOutOfStock !== false ? "Aktif" : "Pasif"}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Ücretsiz Kargo</p>
                  <Badge variant={category.freeShipping ? "outline" : "secondary"}>
                    {category.freeShipping ? "Aktif" : "Pasif"}
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Ücretsiz Kargo Minimum Sepet Tutarı</p>
                  <p className="font-medium">
                    {category.freeShippingThreshold 
                      ? `${category.freeShippingThreshold.toLocaleString('tr-TR')} ₺` 
                      : 'Tanımlanmamış'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="products">
          <Card>
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle>Kategoriye Ait Ürünler</CardTitle>
                <CardDescription>
                  Bu kategoriye ait ürünlerin listesi ve yönetimi
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => setShowProductManagement(!showProductManagement)}>
                  <LayoutGrid className="mr-2 h-4 w-4" /> Ürün Yönetimi
                </Button>
                <Button onClick={() => setShowAddProductModal(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Yeni Ürün Ekle
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {showProductManagement && (
                <div className="mb-6 border rounded-md p-4 bg-slate-50">
                  {!category?.allowProductComparison ? (
                    <div className="text-center py-4 text-muted-foreground">
                      <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                      <p>Bu kategoride ürün karşılaştırma özelliği devre dışı.</p>
                    </div>
                  ) : (
                    <div>
                      <div className="text-sm text-muted-foreground mt-2">
                        Not: En fazla {category?.maxCompareProducts || 4} ürün karşılaştırabilirsiniz.
                      </div>
                    </div>
                  )}
        </div>
              )}
              
              {loadingProducts ? (
                <div className="flex justify-center items-center py-8">
                  <p>Ürünler yükleniyor...</p>
                </div>
              ) : productError ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-red-500">{productError}</p>
                </div>
              ) : products.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Bu kategoriye ait ürün bulunamadı.</p>
                  <Button variant="outline" className="mt-4" onClick={() => setShowAddProductModal(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Ürün Ekle
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">ID</TableHead>
                        <TableHead className="w-12">Görsel</TableHead>
                        <TableHead>Ürün Adı</TableHead>
                        <TableHead>Fiyat</TableHead>
                        <TableHead>Stok</TableHead>
                        <TableHead>Durum</TableHead>
                        <TableHead className="text-right">İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((product) => (
                        <TableRow key={product.id}>
                          <TableCell>{product.id}</TableCell>
                          <TableCell>
                            {product.imageUrls && product.imageUrls.length > 0 ? (
                              <div className="relative h-10 w-10 rounded-md overflow-hidden">
                                <Image
                                  src={product.imageUrls[0]}
                                  alt={product.name}
                                  width={40}
                                  height={40}
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="flex items-center justify-center h-10 w-10 rounded-md bg-gray-100">
                                <ImageIcon className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                          </TableCell>
                          <TableCell>{product.name}</TableCell>
                          <TableCell>{product.price} ₺</TableCell>
                          <TableCell>{product.stock}</TableCell>
                          <TableCell>
                            {product.published ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <Check className="mr-1 h-3 w-3" /> Yayında
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                                <X className="mr-1 h-3 w-3" /> Taslak
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Checkbox 
                                checked={selectedCategoryProducts.includes(product.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedCategoryProducts([...selectedCategoryProducts, product.id]);
                                  } else {
                                    setSelectedCategoryProducts(selectedCategoryProducts.filter(id => id !== product.id));
                                  }
                                }}
                                className="mr-2"
                              />
                              <Link href={`/dashboard/urunler/${product.slug}`}>
                                <Button variant="outline" size="icon">
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </Link>
                              <Link href={`/dashboard/urunler/edit/${product.slug}`}>
                                <Button variant="outline" size="icon">
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  {selectedCategoryProducts.length > 0 && (
                    <div className="flex justify-end mt-4">
                      <Button variant="destructive" onClick={handleRemoveProductsFromCategory}>
                        Seçili Ürünleri Kategoriden Çıkar ({selectedCategoryProducts.length})
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subcategories">
          <Card>
            <CardHeader>
              <CardTitle>Alt Kategoriler</CardTitle>
              <CardDescription>
                Bu kategoriye ait alt kategoriler
              </CardDescription>
            </CardHeader>
            <CardContent>
              {category.children && category.children.length > 0 ? (
                renderChildrenTree(category.children)
              ) : (
                <p className="text-muted-foreground italic">Alt kategori bulunmuyor</p>
              )}
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/dashboard/kategoriler">
                  <LayoutGrid className="mr-2 h-4 w-4" /> Tüm Kategorileri Görüntüle
                </Link>
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Ürün Ekleme Modalı */}
      <Dialog open={showAddProductModal} onOpenChange={setShowAddProductModal}>
        <DialogContent className="sm:max-w-[800px]">
          <DialogHeader>
            <DialogTitle>Kategoriye Ürün Ekle</DialogTitle>
            <DialogDescription>
              Bu kategoriye yeni ürün ekleyin veya toplu olarak ürün ekleyin.
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Yeni Ürün Ekle</CardTitle>
                  <CardDescription>
                    Bu kategoriye özel yeni bir ürün oluşturun
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Yeni ürün ekleme sayfasına yönlendirileceksiniz ve bu kategori otomatik olarak seçilecektir.
                  </p>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full"
                    onClick={() => {
                      router.push(`/dashboard/urunler/yeni-urun-ekle?categoryId=${category?.id}`);
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" /> Yeni Ürün Ekle
                  </Button>
                </CardFooter>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Toplu Ürün Ekle</CardTitle>
                  <CardDescription>
                    CSV veya Excel dosyası ile toplu ürün ekleyin
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    CSV veya Excel dosyası yükleyerek bu kategoriye toplu olarak yeni ürünler ekleyebilirsiniz.
                  </p>
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                      <Upload className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm font-medium">Dosya yüklemek için tıklayın veya sürükleyin</p>
                      <p className="text-xs text-muted-foreground mt-1">CSV, XLS veya XLSX (max 5MB)</p>
                      <Input 
                        type="file" 
                        className="hidden" 
                        accept=".csv,.xls,.xlsx"
                        id="file-upload"
                        onChange={(e) => {
                          // Dosya yükleme işlemi burada yapılacak
                          console.log(e.target.files?.[0]);
                          toast({
                            title: "Bilgi",
                            description: "Toplu ürün ekleme özelliği henüz geliştirme aşamasındadır.",
                          });
                        }}
                      />
                      <label htmlFor="file-upload">
                        <Button variant="outline" className="mt-4" type="button">
                          <Upload className="mr-2 h-4 w-4" /> Dosya Seç
                        </Button>
                      </label>
                    </div>
                    
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Dosya formatı:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Ürün Adı (zorunlu)</li>
                        <li>Açıklama (zorunlu)</li>
                        <li>Fiyat (zorunlu)</li>
                        <li>Stok (zorunlu)</li>
                        <li>Marka (opsiyonel)</li>
                        <li>Görsel URL'leri (opsiyonel, virgülle ayrılmış)</li>
                      </ul>
                      <Button variant="link" className="p-0 h-auto text-xs mt-2" onClick={() => {
                        toast({
                          title: "Bilgi",
                          description: "Örnek şablon indirme özelliği henüz geliştirme aşamasındadır.",
                        });
                      }}>
                        Örnek şablonu indir
                      </Button>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => {
                      toast({
                        title: "Bilgi",
                        description: "Toplu ürün ekleme özelliği henüz geliştirme aşamasındadır.",
                      });
                    }}
                  >
                    <Upload className="mr-2 h-4 w-4" /> Dosyayı Yükle ve İşle
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProductModal(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

CategoryDetail.getLayout = function getLayout(page: ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>
}

export default CategoryDetail 