import React, { ReactElement, useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, Controller } from 'react-hook-form'
import { z } from 'zod'
import Link from 'next/link'
import axios from '@/lib/axios'
import { toast } from '@/components/ui/use-toast'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from '@/components/ui/switch'
import {
  ArrowLeft,
  Save,
  Plus,
  Trash2,
  ImageIcon,
  XCircle,
  Package,
  Loader2,
  AlertCircle,
  CircleDollarSign,
  CheckCircle2,
  Edit,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { slugify } from '@/lib/slugify'
import { Label } from "@/components/ui/label"

// Form için doğrulama şeması
const productSchema = z.object({
  name: z.string().min(2, { message: 'Ürün adı en az 2 karakter olmalıdır' }),
  description: z.string().optional(),
  slug: z.string().min(2, { message: 'Slug en az 2 karakter olmalıdır' }),
  categoryId: z.string().optional(),
  brandId: z.string().optional(),
  published: z.boolean().default(false),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  price: z.string().optional(),
  comparativePrice: z.string().optional(),
  costPerItem: z.string().optional(),
  taxIncluded: z.boolean().default(true),
  stock: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  isPhysicalProduct: z.boolean().default(true),
  weight: z.string().optional(),
  weightUnit: z.string().default("kg"),
  countryOfOrigin: z.string().optional(),
  hsCode: z.string().optional(),
})

type ProductFormValues = z.infer<typeof productSchema>;

interface Variant {
  id: number
  productId: number
  price: number
  comparativePrice: number | null
  costPerItem: number | null
  stock: number
  imageUrls: string[]
  sku: string | null
  barcode: string | null
  variantValues?: VariantValue[]
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
  isPhysicalProduct: boolean
  weight: number | null
  weightUnit: string | null
  countryOfOrigin: string | null
  hsCode: string | null
  variants: Variant[]
  variantGroups: VariantGroup[]
  createdAt: string
  updatedAt: string
  category?: Category
  brand?: Brand
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

function ProductEditPage() {
  const router = useRouter()
  const { slug, categoryId } = router.query
  const [product, setProduct] = useState<Product | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [category, setCategory] = useState<Category | null>(null)
  const [brand, setBrand] = useState<Brand | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isNewProduct, setIsNewProduct] = useState(false)
  const [images, setImages] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)
  const [currentTab, setCurrentTab] = useState('basic')
  const [hasVariants, setHasVariants] = useState(false)
  const [totalStock, setTotalStock] = useState(0)
  const [minPrice, setMinPrice] = useState(0)
  const [maxPrice, setMaxPrice] = useState(0)
  const [hasPriceRange, setHasPriceRange] = useState(false)
  const [editingVariantId, setEditingVariantId] = useState<number | null>(null)

  // Form
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: '',
      description: '',
      slug: '',
      categoryId: '',
      brandId: '',
      published: false,
      seoTitle: '',
      seoDescription: '',
      price: '',
      comparativePrice: '',
      costPerItem: '',
      taxIncluded: true,
      stock: '',
      sku: '',
      barcode: '',
      isPhysicalProduct: true,
      weight: '',
      weightUnit: 'kg',
      countryOfOrigin: '',
      hsCode: '',
    },
  })

  // Ürün adı değiştiğinde slug otomatik oluşturma (sadece yeni ürün için)
  useEffect(() => {
    if (isNewProduct) {
      const subscription = form.watch((value, { name }) => {
        if (name === 'name') {
          const productName = value.name;
          if (productName) {
            const newSlug = slugify(productName as string);
            form.setValue('slug', newSlug);
          }
        }
      });
      
      return () => subscription.unsubscribe();
    }
  }, [form, isNewProduct]);

  // Ürün verilerini getir
  const fetchProductData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Slug'ı temizle
      const cleanSlug = typeof slug === 'string' ? slug : '';
      
      // Cache'i önlemek için timestamp ekle
      const timestamp = new Date().getTime();
      
      // Ürün verilerini getir
      const productRes = await axios.get(`/api/products/slug/${encodeURIComponent(cleanSlug)}?t=${timestamp}`);
      const productData = productRes.data;
      
      console.log('Alınan ürün verileri:', productData);
      
      // Kategorileri getir
      const categoriesRes = await axios.get('/api/categories');
      const categoriesData = categoriesRes.data;
      
      // Markaları getir
      const brandsRes = await axios.get('/api/brands');
      const brandsData = brandsRes.data;
      
      // Verileri ayarla
      setProduct(productData);
      setCategories(categoriesData);
      setBrands(brandsData);
      
      // Kategori ve marka bilgilerini ayarla
      if (productData.category) {
        setCategory(productData.category);
      }
      
      if (productData.brand) {
        setBrand(productData.brand);
      }
      
      // Ürün resimlerini ayarla
      if (productData.imageUrls && productData.imageUrls.length > 0) {
        setImages(productData.imageUrls);
      } else {
        setImages([]);
      }
      
      // Form değerlerini ayarla
      const formValues: ProductFormValues = {
        name: productData.name || '',
        description: productData.description || '',
        slug: productData.slug || '',
        categoryId: productData.categoryId !== null && productData.categoryId !== undefined ? String(productData.categoryId) : '',
        brandId: productData.brandId !== null && productData.brandId !== undefined ? String(productData.brandId) : '',
        published: Boolean(productData.published),
        seoTitle: productData.seoTitle || '',
        seoDescription: productData.seoDescription || '',
        price: productData.basePrice !== undefined ? String(productData.basePrice) : '',
        comparativePrice: productData.comparativePrice !== null && productData.comparativePrice !== undefined ? String(productData.comparativePrice) : '',
        costPerItem: productData.costPerItem !== null && productData.costPerItem !== undefined ? String(productData.costPerItem) : '',
        taxIncluded: productData.taxIncluded !== undefined ? productData.taxIncluded : true,
        stock: '',
        sku: productData.sku || '',
        barcode: productData.barcode || '',
        isPhysicalProduct: productData.isPhysicalProduct !== undefined ? productData.isPhysicalProduct : true,
        weight: productData.weight || '',
        weightUnit: productData.weightUnit || 'kg',
        countryOfOrigin: productData.countryOfOrigin || '',
        hsCode: productData.hsCode || '',
      };
      
      // Varyant bilgilerini güvenli bir şekilde ekle
      if (productData.variants && productData.variants.length > 0) {
        const variant = productData.variants[0];
        if (typeof variant.price === 'number') {
          formValues.price = variant.price.toString();
        }
        if (typeof variant.stock === 'number') {
          formValues.stock = variant.stock.toString();
        }
      }
      
      form.reset(formValues);
      
      setLoading(false);
    } catch (err) {
      console.error('Ürün verileri getirilirken hata oluştu:', err);
      setError('Ürün verileri yüklenirken bir hata oluştu.');
      setLoading(false);
      toast({
        title: 'Hata!',
        description: 'Ürün bilgileri yüklenirken bir hata oluştu.',
        variant: 'destructive',
      });
    }
  };

  // Ürün bilgilerini ve seçenekleri yükle
  useEffect(() => {
    const fetchData = async () => {
      if (!slug) return;
      
      // Eğer slug "yeni" ise, yeni ürün ekleme moduna geç
      if (slug === "yeni") {
        setIsNewProduct(true);
        setLoading(false);
        
        // Kategorileri ve markaları yükle
        try {
          const [categoriesRes, brandsRes] = await Promise.all([
            axios.get('/api/categories'),
            axios.get('/api/brands')
          ]);
          
          setCategories(categoriesRes.data);
          setBrands(brandsRes.data);
          
          // Eğer categoryId query parametresi varsa, onu seç
          if (categoryId && typeof categoryId === 'string') {
            const categoryIdNumber = parseInt(categoryId, 10);
            if (!isNaN(categoryIdNumber)) {
              form.setValue('categoryId', String(categoryIdNumber));
            }
          }
        } catch (error) {
          console.error('Kategori ve marka verileri yüklenirken hata:', error);
          toast({
            title: 'Hata',
            description: 'Kategori ve marka verileri yüklenirken bir hata oluştu',
            variant: 'destructive'
          });
        }
        
        return;
      }
      
      fetchProductData();
    };

    fetchData();
  }, [slug, categoryId, form, router]);

  // Yeni ürün sayfasına otomatik yönlendirme
  useEffect(() => {
    if (isNewProduct) {
      // Kısa bir gecikme ile yönlendirme yap
      const timer = setTimeout(() => {
        router.push('/dashboard/urunler/yeni-urun-ekle' + (categoryId ? `?categoryId=${categoryId}` : ''));
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isNewProduct, categoryId, router]);

  // Form gönderilmeden önce doğrulama
  const validateBeforeSubmit = (data: ProductFormValues) => {
    // Slug'daki boşlukları kontrol et
    if (data.slug.includes(' ')) {
      toast({
        title: 'Uyarı!',
        description: 'Slug boşluk içermemeli. Boşluklar otomatik olarak tire (-) ile değiştirilecek.',
      });
      
      // Slug'ı otomatik düzelt
      const cleanSlug = data.slug.replace(/\s+/g, '-');
      form.setValue('slug', cleanSlug);
      return false;
    }
    
    return true;
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

  // Form gönderme işlemi
  const onSubmit = async (data: ProductFormValues) => {
    if (!product) return;

    // Form doğrulama
    if (!validateBeforeSubmit(data)) {
      return;
    }

    setSaving(true);
    
    try {
      // Ürün verilerini hazırla
      const productData = {
        ...data,
        price: data.price ? parseFloat(data.price) : undefined,
        comparativePrice: data.comparativePrice ? parseFloat(data.comparativePrice) : null,
        costPerItem: data.costPerItem ? parseFloat(data.costPerItem) : null,
        taxIncluded: data.taxIncluded,
        sku: data.sku || '',
        barcode: data.barcode || '',
        images
      };
      
      console.log('Gönderilecek veriler:', productData);
      
      // API'ye gönder
      const response = await axios.put(`/api/products/slug/${data.slug}`, productData);
      
      if (response.status === 200) {
        toast({
          title: "Başarılı",
          description: "Ürün başarıyla güncellendi",
        });
        
        // Sayfayı yenile veya ürünler sayfasına yönlendir
        router.push('/dashboard/urunler');
      }
    } catch (error) {
      console.error('Ürün güncelleme hatası:', error);
      
      setError('Ürün güncellenirken bir hata oluştu.');
      
      toast({
        title: "Hata",
        description: "Ürün güncellenirken bir hata oluştu",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  // Slug oluşturucu - sadece yeni ürün için
  const generateSlug = () => {
    if (!isNewProduct) {
      toast({
        title: 'Bilgi',
        description: 'Mevcut ürünlerin slug değeri değiştirilemez.',
      });
      return;
    }
    
    const name = form.getValues('name');
    if (name) {
      // Boşlukları tire ile değiştir ve özel karakterleri kaldır
      const newSlug = slugify(name);
      form.setValue('slug', newSlug);
      
      // Kullanıcıya bilgi ver
      toast({
        title: 'Bilgi',
        description: 'Slug otomatik olarak oluşturuldu.',
      });
    } else {
      toast({
        title: 'Uyarı!',
        description: 'Slug oluşturmak için önce ürün adı girmelisiniz.',
      });
    }
  };

  // Resim yükleme işlemi
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImages(true);

    try {
      // Dosyaları base64'e çevir
      const base64Promises = Array.from(files).map(file => {
        return new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              resolve(reader.result);
            } else {
              reject(new Error('FileReader sonucu string değil'));
            }
          };
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
      });

      const base64Images = await Promise.all(base64Promises);
      setImages(prev => [...prev, ...base64Images]);

      toast({
        title: 'Başarılı!',
        description: `${files.length} adet görsel yüklendi.`,
      });
    } catch (err: any) {
      console.error('Görsel yükleme hatası:', err);
      toast({
        title: 'Hata!',
        description: 'Görseller yüklenirken bir hata oluştu.',
        variant: 'destructive'
      });
    } finally {
      setUploadingImages(false);
      // Input değerini sıfırla
      e.target.value = '';
    }
  };

  // Resim silme işlemi
  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

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

  // Varyantların ve stok bilgilerinin hesaplanması
  useEffect(() => {
    if (product && product.variants && product.variants.length > 0) {
      setHasVariants(true);
      setTotalStock(product.variants.reduce((total, variant) => total + variant.stock, 0));
      setMinPrice(Math.min(...product.variants.map(v => v.price)));
      setMaxPrice(Math.max(...product.variants.map(v => v.price)));
      setHasPriceRange(product.variants.length > 1);
    } else {
      setHasVariants(false);
      setTotalStock(0);
      setMinPrice(0);
      setMaxPrice(0);
      setHasPriceRange(false);
    }
  }, [product]);

  // handleVariantUpdate fonksiyonunu da güncelleyelim
  const handleVariantUpdate = (variantId: number, field: string, value: number | null | string) => {
    if (!product) return;
    
    setProduct(prevProduct => {
      if (!prevProduct) return null;
      
      const updatedVariants = prevProduct.variants.map(v => {
        if (v.id === variantId) {
          return {
            ...v,
            [field]: value
          };
        }
        return v;
      });
      
      return {
        ...prevProduct,
        variants: updatedVariants
      };
    });
    
    // API'ye güncelleme isteği gönder
    axios.put(`/api/variants/${variantId}`, { [field]: value })
      .then(response => {
        console.log(`Varyant ${field} güncellendi`, response.data);
      })
      .catch(error => {
        console.error(`Varyant ${field} güncellenirken hata:`, error);
        toast({
          title: "Hata",
          description: `Varyant güncellenirken bir hata oluştu: ${error.message}`,
          variant: "destructive"
        });
      });
  };

  // Open variant image edit modal (placeholder for now)
  const handleVariantImageEdit = (variantId: number) => {
    setEditingVariantId(variantId);
    // For now, just show a toast message
    toast({
      title: "Bilgi",
      description: "Varyant görsel düzenleme henüz tam olarak implement edilmedi.",
    });
  };

  return (
    <div className="p-6 bg-background">
      {loading ? (
        <div className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-10 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-10 w-1/2" />
          </div>
        </div>
      ) : isNewProduct ? (
        // Yeni ürün ekleme formu
        <div>
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Yeni Ürün Ekle</h1>
              <p className="text-muted-foreground mt-1">Yeni bir ürün eklemek için formu doldurun</p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/dashboard/urunler">
                <ArrowLeft className="mr-2 h-4 w-4" /> Ürünlere Dön
              </Link>
            </Button>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Yeni Ürün Bilgileri</CardTitle>
              <CardDescription>
                Lütfen yeni ürün için gerekli bilgileri girin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p>Yeni ürün ekleme sayfasına yönlendiriliyorsunuz...</p>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={() => router.push('/dashboard/urunler/yeni-urun-ekle' + (categoryId ? `?categoryId=${categoryId}` : ''))}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" /> Yeni Ürün Ekleme Sayfasına Git
              </Button>
            </CardFooter>
          </Card>
        </div>
      ) : error || !product ? (
        <div className="p-6 flex flex-col items-center justify-center min-h-[50vh]">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
            <h2 className="text-2xl font-bold">Ürün Bulunamadı</h2>
            <p className="text-muted-foreground">{error || 'Bu ürün bulunamadı veya erişim izniniz yok.'}</p>
            <Button variant="outline" asChild>
              <Link href="/dashboard/urunler">
                <ArrowLeft className="mr-2 h-4 w-4" /> Ürünlere Dön
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{product.name}</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={product.published ? "default" : "secondary"}>
                {product.published ? 'Yayında' : 'Taslak'}
              </Badge>
              <span className="text-sm text-muted-foreground">
                Son Güncelleme: {formatDate(product.updatedAt)}
              </span>
            </div>
          </div>
          <div className="flex mt-4 md:mt-0 gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/urunler">
                <ArrowLeft className="mr-2 h-4 w-4" /> Listeye Dön
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href={`/dashboard/urunler/detay/${product.slug}`}>
                <Package className="mr-2 h-4 w-4" /> Detay Görünümü
              </Link>
            </Button>
          </div>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <div className="grid gap-6">
            <Tabs 
              defaultValue="basic" 
              className="w-full"
              value={currentTab}
              onValueChange={setCurrentTab}
            >
              <TabsList className="mb-6">
                <TabsTrigger value="basic">Genel Bakış</TabsTrigger>
                <TabsTrigger value="variants">Varyantlar{hasVariants && ` (${product?.variants?.length || 0})`}</TabsTrigger>
                <TabsTrigger value="images">Görseller{product?.imageUrls ? ` (${product.imageUrls.length})` : ''}</TabsTrigger>
                <TabsTrigger value="inventory">Stok ve Fiyat</TabsTrigger>
                <TabsTrigger value="seo">SEO</TabsTrigger>
              </TabsList>

              {/* Genel Bakış Sekmesi (Eski Temel Bilgiler) */}
              <TabsContent value="basic" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle>Ürün Bilgileri</CardTitle>
                      <CardDescription>
                        Ürününüzün temel bilgilerini girin
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Ürün Adı */}
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ürün Adı</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ürün adını girin"
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              Ürünün tam adını girin. Bu ad ürün listelerinde ve detay sayfasında görünecektir.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Slug */}
                      <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                          <FormItem>
                            <div className="flex justify-between items-center">
                              <FormLabel>Slug</FormLabel>
                              {isNewProduct ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={generateSlug}
                                  className="h-8"
                                >
                                  Otomatik Oluştur
                                </Button>
                              ) : (
                                <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                  Değiştirilemez
                                </div>
                              )}
                            </div>
                            <FormControl>
                              <Input
                                placeholder="urun-adi-slug"
                                {...field}
                                disabled={!isNewProduct}
                                className={!isNewProduct ? "bg-muted" : ""}
                              />
                            </FormControl>
                            <FormDescription>
                              SEO dostu URL için kullanılan slug. {!isNewProduct && "Ürün oluşturulduktan sonra değiştirilemez."}
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Açıklama */}
                      <FormField
                        control={form.control}
                        name="description"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Ürün Açıklaması</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Ürünün detaylı açıklamasını girin"
                                className="min-h-[150px]"
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormDescription>
                              Ürünün özelliklerini, faydalarını ve diğer önemli bilgilerini içeren detaylı bir açıklama yazın.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Kategori */}
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
                                  {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={cat.id.toString()}>
                                      {cat.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Ürünün ait olduğu kategori
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        {/* Marka */}
                        <FormField
                          control={form.control}
                          name="brandId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Marka</FormLabel>
                              <Select 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                                value={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Marka seçin" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {brands.map((brand) => (
                                    <SelectItem key={brand.id} value={brand.id.toString()}>
                                      {brand.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormDescription>
                                Ürünün markası
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* SKU ve Barkod */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="sku"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>SKU (Stok Kodu)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="SKU kodu girin"
                                  {...field}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormDescription>
                                Ürün stok takibi için benzersiz tanımlayıcı kod
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="barcode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Barkod</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Barkod numarası girin"
                                  {...field}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormDescription>
                                Ürün barkod numarası (EAN, UPC, vb.)
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Yayında mı? */}
                      <FormField
                        control={form.control}
                        name="published"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                            <FormControl>
                              <Checkbox
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-1 leading-none">
                              <FormLabel>Yayında</FormLabel>
                              <FormDescription>
                                Bu seçeneği etkinleştirdiğinizde ürün web sitesinde görünür olacaktır.
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />

                      {/* Fiyat ve stok bilgisi (Varyant olmayan ürünler için) */}
                      {!hasVariants && (
                        <>
                          <div className="grid gap-6 md:grid-cols-2">
                            <FormField
                              control={form.control}
                              name="price"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ürün Fiyatı (₺)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      {...field}
                                      onChange={(e) => field.onChange(e.target.value)}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="comparativePrice"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Karşılaştırma Fiyatı (₺)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      {...field}
                                      onChange={(e) => field.onChange(e.target.value)}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Eski fiyat veya piyasa karşılaştırma fiyatı
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="costPerItem"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ürün Başına Maliyet (₺)</FormLabel>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      step="0.01"
                                      placeholder="0.00"
                                      {...field}
                                      onChange={(e) => field.onChange(e.target.value)}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Ürün başına düşen maliyet. Kar ve kar marjı hesaplamada kullanılır.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="taxIncluded"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                                  <div className="space-y-0.5">
                                    <FormLabel>Bu üründen vergi al</FormLabel>
                                    <FormDescription>
                                      Ürün fiyatına KDV dahil edilecek
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
                          </div>
                          
                          {!form.watch('taxIncluded') && form.watch('price') && form.watch('costPerItem') && (
                            <div className="mt-4 p-4 bg-muted/30 rounded-md border">
                              <h3 className="text-base font-medium mb-2">Kar Hesabı</h3>
                              <div className="grid grid-cols-2 gap-4">
                                <div>
                                  <Label>Kar</Label>
                                  <div className="mt-1 p-2 border rounded bg-background">
                                    {calculateProfit(
                                      parseFloat(form.watch('price') || '0'), 
                                      parseFloat(form.watch('costPerItem') || '0')
                                    ).profit.toFixed(2)} ₺
                                  </div>
                                </div>
                                <div>
                                  <Label>Kar Marjı</Label>
                                  <div className="mt-1 p-2 border rounded bg-background">
                                    %{calculateProfit(
                                      parseFloat(form.watch('price') || '0'), 
                                      parseFloat(form.watch('costPerItem') || '0')
                                    ).margin.toFixed(2)}
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </CardContent>
                    <CardFooter className="flex justify-between border-t px-6 py-4">
                      <Button
                        variant="outline"
                        type="button"
                        onClick={() => setCurrentTab('variants')}
                      >
                        Sonraki: Varyantlar
                      </Button>
                    </CardFooter>
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

                    {/* Fiyat Bilgisi */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Fiyat Bilgisi</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <CircleDollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>{hasPriceRange ? 'Fiyat Aralığı' : 'Fiyat'}</span>
                          </div>
                          <div className="font-medium">
                            {hasPriceRange ? (
                              `${minPrice.toFixed(2)} TL - ${maxPrice.toFixed(2)} TL`
                            ) : (
                              `${minPrice.toFixed(2)} TL`
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Durum Bilgisi */}
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base">Durum</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <CheckCircle2 className="h-4 w-4 mr-2 text-muted-foreground" />
                            <span>Yayın Durumu</span>
                          </div>
                          <Badge variant={product?.published ? "default" : "secondary"}>
                            {product?.published ? 'Yayında' : 'Taslak'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Varyantlar Sekmesi (Yeni) */}
              <TabsContent value="variants" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Ürün Varyantları</CardTitle>
                    <CardDescription>
                      {hasVariants 
                        ? `${product?.variants?.length || 0} farklı varyant yapılandırması`
                        : "Bu ürünün varyantları bulunmuyor"
                      }
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {hasVariants ? (
                      <div className="border rounded-md overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b">
                              <th className="py-3 px-4 text-left font-medium text-sm">Varyant</th>
                              <th className="py-3 px-4 text-right font-medium text-sm">Fiyat</th>
                              <th className="py-3 px-4 text-right font-medium text-sm">Karşılaştırma Fiyatı</th>
                              <th className="py-3 px-4 text-right font-medium text-sm">Maliyet</th>
                              <th className="py-3 px-4 text-right font-medium text-sm">Stok</th>
                              <th className="py-3 px-4 text-right font-medium text-sm">SKU</th>
                              <th className="py-3 px-4 text-right font-medium text-sm">Barkod</th>
                              <th className="py-3 px-4 text-right font-medium text-sm">İşlemler</th>
                              {!form.watch('taxIncluded') && <th className="py-3 px-4 text-right font-medium text-sm">Kar / Marj</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {product?.variants?.map((variant) => {
                              // Varyant adını oluştur
                              let variantName = 'Varsayılan';
                              
                              if (product.variantGroups?.length > 0 && variant.variantValues && variant.variantValues.length > 0) {
                                // Bu varyant için değerleri bul ve birleştir
                                const variantLabels = variant.variantValues.map(vv => {
                                  const group = product.variantGroups.find(g => g.values.some(v => v.id === vv.id));
                                  const value = group?.values.find(v => v.id === vv.id);
                                  
                                  if (!group || !value) return '';
                                  return `${group.name}: ${value.value}`;
                                });
                                
                                variantName = variantLabels.join(' / ');
                              }
                              
                              const { profit, margin } = calculateProfit(variant.price, variant.costPerItem || 0);
                              
                              return (
                                <tr key={variant.id} className="border-b last:border-0">
                                  <td className="py-3 px-4">
                                    <div className="font-medium">{variantName}</div>
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <Input
                                      type="number"
                                      placeholder="0.00"
                                      min="0"
                                      step="0.01"
                                      value={variant.price}
                                      onChange={(e) => handleVariantUpdate(variant.id, 'price', parseFloat(e.target.value))}
                                      className="w-28 text-right"
                                    />
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <Input
                                      type="number"
                                      placeholder="0.00"
                                      min="0"
                                      step="0.01"
                                      value={variant.comparativePrice || ''}
                                      onChange={(e) => handleVariantUpdate(variant.id, 'comparativePrice', e.target.value ? parseFloat(e.target.value) : null)}
                                      className="w-28 text-right"
                                    />
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <Input
                                      type="number"
                                      placeholder="0.00"
                                      min="0"
                                      step="0.01"
                                      value={variant.costPerItem || ''}
                                      onChange={(e) => handleVariantUpdate(variant.id, 'costPerItem', e.target.value ? parseFloat(e.target.value) : null)}
                                      className="w-28 text-right"
                                    />
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      min="0"
                                      step="1"
                                      value={variant.stock}
                                      onChange={(e) => handleVariantUpdate(variant.id, 'stock', parseInt(e.target.value))}
                                      className="w-28 text-right"
                                    />
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <Input
                                      type="text"
                                      placeholder="SKU"
                                      value={variant.sku || ''}
                                      onChange={(e) => handleVariantUpdate(variant.id, 'sku', e.target.value)}
                                      className="w-28 text-right"
                                    />
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <Input
                                      type="text"
                                      placeholder="Barkod"
                                      value={variant.barcode || ''}
                                      onChange={(e) => handleVariantUpdate(variant.id, 'barcode', e.target.value)}
                                      className="w-28 text-right"
                                    />
                                  </td>
                                  <td className="py-3 px-4 text-right">
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      onClick={() => handleVariantImageEdit(variant.id)}
                                    >
                                      <ImageIcon className="h-4 w-4 mr-2" /> Görseller
                                    </Button>
                                  </td>
                                  {!form.watch('taxIncluded') && (
                                    <td className="py-3 px-4 text-right">
                                      <div className="text-xs">
                                        <div className="font-medium">{profit.toFixed(2)}₺</div>
                                        <div className="text-muted-foreground">%{margin.toFixed(2)}</div>
                                      </div>
                                    </td>
                                  )}
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
                        <Button variant="outline">
                          <Plus className="mr-2 h-4 w-4" /> Varyant Ekle
                        </Button>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between border-t px-6 py-4">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setCurrentTab('basic')}
                    >
                      Önceki: Genel Bakış
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setCurrentTab('images')}
                    >
                      Sonraki: Görseller
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Görseller Sekmesi */}
              <TabsContent value="images" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Ürün Görselleri</CardTitle>
                    <CardDescription>
                      Ürününüzü en iyi şekilde gösteren yüksek kaliteli görseller yükleyin
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-md">
                      <ImageIcon className="h-10 w-10 text-muted-foreground mb-4" />
                      <div className="text-center space-y-2 mb-4">
                        <h3 className="font-medium">Görselleri buraya sürükleyin</h3>
                        <p className="text-sm text-muted-foreground">
                          veya bilgisayarınızdan seçin (Maksimum 5MB)
                        </p>
                      </div>
                      <div className="relative">
                        <Button
                          type="button"
                          variant="secondary"
                          disabled={uploadingImages}
                        >
                          {uploadingImages ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Yükleniyor...
                            </>
                          ) : (
                            <>
                              <Plus className="mr-2 h-4 w-4" />
                              Görsel Seç
                            </>
                          )}
                        </Button>
                        <input
                          type="file"
                          multiple
                          accept="image/*"
                          className="absolute inset-0 opacity-0 cursor-pointer"
                          onChange={handleImageUpload}
                          disabled={uploadingImages}
                        />
                      </div>
                    </div>

                    {/* Yüklenen görseller */}
                    {images.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-3">Yüklenen Görseller ({images.length})</h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                          {images.map((url, index) => (
                            <div key={index} className="relative group">
                              <div className="aspect-square rounded-md overflow-hidden border">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={url}
                                  alt={`Ürün görseli ${index + 1}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    // Görsel yüklenemezse placeholder göster
                                    (e.target as any).src = 'https://via.placeholder.com/400x400?text=Görsel+Yok';
                                  }}
                                />
                              </div>
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => removeImage(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                  <CardFooter className="flex justify-between border-t px-6 py-4">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setCurrentTab('variants')}
                    >
                      Önceki: Varyantlar
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setCurrentTab('inventory')}
                    >
                      Sonraki: Stok ve Fiyat
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* Stok ve Fiyat Sekmesi */}
              <TabsContent value="inventory" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Stok ve Fiyat Bilgileri</CardTitle>
                    <CardDescription>
                      Ürününüzün stok durumu ve fiyat bilgilerini belirleyin
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Fiyat */}
                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fiyat (₺)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0.00"
                                step="0.01"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Ürününüzün satış fiyatını TL cinsinden girin.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {/* Stok */}
                      <FormField
                        control={form.control}
                        name="stock"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Stok Miktarı</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                              />
                            </FormControl>
                            <FormDescription>
                              Satışa sunulacak stok miktarını girin.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="mt-4">
                      <h3 className="text-sm font-medium mb-2">Varyant Fiyatlandırması</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        {hasVariants 
                          ? "Bu ürünün varyantları olduğu için, her varyantın fiyatı ve stok miktarı 'Varyantlar' sekmesinden yönetilmelidir."
                          : "Bu ürünün varyantları bulunmuyor. Varyant eklemek için 'Varyantlar' sekmesini kullanabilirsiniz."
                        }
                      </p>
                    </div>

                    {/* Bu üründen vergi al */}
                    <FormField
                      control={form.control}
                      name="taxIncluded"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5">
                            <FormLabel>Bu üründen vergi al</FormLabel>
                            <FormDescription>
                              Ürün fiyatına KDV dahil edilecek
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

                    {/* SKU ve Barkod */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                      <FormField
                        control={form.control}
                        name="sku"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>SKU (Stok Kodu)</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="SKU kodunu girin..."
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormDescription>
                              Stok takibi için benzersiz ürün kodu
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="barcode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Barkod</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Barkod numarasını girin..."
                                {...field}
                                value={field.value || ''}
                              />
                            </FormControl>
                            <FormDescription>
                              Ürün barkod numarası (EAN, UPC, vb.)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Ürün Başına Maliyet */}
                    <FormField
                      control={form.control}
                      name="costPerItem"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Ürün Başına Maliyet (₺)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="0.00"
                              step="0.01"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Ürün başına düşen maliyet. Kar ve kar marjı hesaplamada kullanılır.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Kar ve kar marjı bilgisi */}
                    {!form.watch('taxIncluded') && form.watch('price') && form.watch('costPerItem') && (
                      <div className="mt-4 p-4 bg-muted/30 rounded-md border">
                        <h3 className="text-base font-medium mb-2">Kar Hesabı</h3>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>Kar</Label>
                            <div className="mt-1 p-2 border rounded bg-background">
                              {calculateProfit(
                                parseFloat(form.watch('price') || '0'), 
                                parseFloat(form.watch('costPerItem') || '0')
                              ).profit.toFixed(2)} ₺
                            </div>
                          </div>
                          <div>
                            <Label>Kar Marjı</Label>
                            <div className="mt-1 p-2 border rounded bg-background">
                              %{calculateProfit(
                                parseFloat(form.watch('price') || '0'), 
                                parseFloat(form.watch('costPerItem') || '0')
                              ).margin.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Kargo Bilgileri */}
                    <div className="mt-8 border-t pt-6">
                      <h3 className="text-lg font-medium mb-4">Kargo Bilgileri</h3>
                      
                      <FormField
                        control={form.control}
                        name="isPhysicalProduct"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm mb-6">
                            <div className="space-y-0.5">
                              <FormLabel>Bu bir fiziksel üründür</FormLabel>
                              <FormDescription>
                                Dijital ürünler için devre dışı bırakın
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
                      
                      {form.watch('isPhysicalProduct') && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                              <FormField
                                control={form.control}
                                name="weight"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Ağırlık</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        placeholder="0.0"
                                        {...field}
                                        value={field.value || ''}
                                      />
                                    </FormControl>
                                    <FormDescription>
                                      Ürünün paketlenmiş ağırlığı
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            <div>
                              <FormField
                                control={form.control}
                                name="weightUnit"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Ağırlık Birimi</FormLabel>
                                    <Select 
                                      onValueChange={field.onChange} 
                                      defaultValue={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Birim seçin" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="kg">kg</SelectItem>
                                        <SelectItem value="g">g</SelectItem>
                                        <SelectItem value="lb">lb</SelectItem>
                                        <SelectItem value="oz">oz</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormDescription>
                                      Ağırlık birimini seçin
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField
                              control={form.control}
                              name="countryOfOrigin"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Menşe Ülke/Bölge</FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger>
                                        <SelectValue placeholder="Menşe ülke seçin" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="TR">Türkiye</SelectItem>
                                      <SelectItem value="CN">Çin</SelectItem>
                                      <SelectItem value="US">Amerika Birleşik Devletleri</SelectItem>
                                      <SelectItem value="DE">Almanya</SelectItem>
                                      <SelectItem value="IT">İtalya</SelectItem>
                                      <SelectItem value="FR">Fransa</SelectItem>
                                      <SelectItem value="GB">Birleşik Krallık</SelectItem>
                                      <SelectItem value="JP">Japonya</SelectItem>
                                      <SelectItem value="KR">Güney Kore</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription>
                                    Ürünün üretildiği veya geldiği ülke
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="hsCode"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Armonize Sistem (HS) Kodu</FormLabel>
                                  <FormControl>
                                    <Input
                                      placeholder="HS kodunu girin..."
                                      {...field}
                                      value={field.value || ''}
                                    />
                                  </FormControl>
                                  <FormDescription>
                                    Uluslararası gönderimler için gereklidir
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between border-t px-6 py-4">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setCurrentTab('images')}
                    >
                      Önceki: Görseller
                    </Button>
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setCurrentTab('seo')}
                    >
                      Sonraki: SEO
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>

              {/* SEO Sekmesi */}
              <TabsContent value="seo" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>SEO Bilgileri</CardTitle>
                    <CardDescription>
                      Arama motorlarında daha iyi sıralamalara ulaşmak için SEO bilgilerini optimize edin
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* SEO Başlığı */}
                    <FormField
                      control={form.control}
                      name="seoTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SEO Başlığı</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="SEO Başlığı"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Tarayıcı sekmesinde ve arama sonuçlarında görünecek başlık. Boş bırakılırsa ürün adı kullanılır.
                            <div className="mt-2 text-xs text-muted-foreground">
                              Önerilen uzunluk: 50-60 karakter
                              <div className="w-full bg-gray-200 h-1 mt-1 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${field.value && field.value.length > 60 ? 'bg-red-500' : field.value && field.value.length > 50 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                  style={{ width: `${Math.min(100, (field.value?.length || 0) * 100 / 60)}%` }}
                                />
                              </div>
                            </div>
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* SEO Açıklaması */}
                    <FormField
                      control={form.control}
                      name="seoDescription"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>SEO Açıklaması</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="SEO Açıklaması"
                              className="min-h-[100px]"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Arama sonuçlarında görünecek meta açıklama. 160 karakteri geçmemelidir.
                            <div className="mt-2 text-xs text-muted-foreground">
                              Önerilen uzunluk: 120-160 karakter
                              <div className="w-full bg-gray-200 h-1 mt-1 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${field.value && field.value.length > 160 ? 'bg-red-500' : field.value && field.value.length > 120 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                  style={{ width: `${Math.min(100, (field.value?.length || 0) * 100 / 160)}%` }}
                                />
                              </div>
                            </div>
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* URL Yapısı */}
                    <div>
                      <h3 className="font-medium mb-2">URL Yapısı</h3>
                      <div className="rounded-md border p-4">
                        <code className="text-sm break-all">
                          {`${typeof window !== 'undefined' ? window.location.origin : ''}/urunler/${product?.slug || ''}`}
                        </code>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-between border-t px-6 py-4">
                    <Button
                      variant="outline"
                      type="button"
                      onClick={() => setCurrentTab('inventory')}
                    >
                      Önceki: Stok ve Fiyat
                    </Button>
                    <Button
                      type="submit"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Kaydediliyor...
                        </>
                      ) : (
                        <>
                          <Save className="mr-2 h-4 w-4" />
                          Değişiklikleri Kaydet
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </form>
      </Form>
    </div>
  )
}

ProductEditPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>
}

export default ProductEditPage