import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/router'
import axios from 'axios'
import Image from 'next/image'
import Link from 'next/link'
import { NextPageWithLayout } from '@/lib/types'
import MainLayout from '@/components/layouts/MainLayout'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ReactElement } from 'react'
import { ShoppingCart, Heart, Search, FilterIcon, ChevronDown, Grid3X3, List, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination'
import { toast } from '@/components/ui/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { useCart } from '@/hooks/useCart'
import { useFavorites } from '@/hooks/useFavorites'
import { logProductStructure, logError } from '@/utils/debug'

// Kategori sayfasıyla aynı tipte Product tanımlaması
type Product = {
  id: number;
  name: string;
  description: string | null;
  slug: string;
  imageUrls: string[];
  price?: number;
  basePrice?: number;
  brand: {
    name: string;
    id: number;
  } | null;
  variants: {
    id: number;
    price: number;
    stock: number;
  }[];
  discount?: number;
  rating?: number;
  categoryId?: number;
  category?: {
    id: number;
    name: string;
    slug: string;
  } | null;
};

interface Brand {
  id: number
  name: string
  description: string | null
  content: string | null
  slug: string
  logoUrl: string | null
  bannerUrl: string | null
  coverImageUrl: string | null
}

// Kategori sayfasıyla uyumlu filtre tipi
type FilterState = {
  search: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
  inStock: boolean;
  categories: number[];
};

// Kategori tipi ekleniyor
type Category = {
  id: number;
  name: string;
  slug: string;
};

const BrandPage: NextPageWithLayout = () => {
  const router = useRouter()
  const { slug } = router.query
  
  const [brand, setBrand] = useState<Brand | null>(null)
  const [products, setProducts] = useState<Product[]>([])
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const { addToCart, isLoading: cartLoading } = useCart()
  const { toggleFavorite, isFavorite, isLoading: favoriteLoading } = useFavorites()
  
  // Markada bulunan kategorileri tutacak state
  const [categoriesInBrand, setCategoriesInBrand] = useState<Category[]>([])
  
  // Kategori sayfasıyla aynı pagination değişkenleri
  const pageSize = 12
  const [page, setPage] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  
  // Filtreleri kategori sayfasıyla aynı şekilde ayarla
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
    inStock: false,
    categories: []
  })
  
  // Fetch brand and products
  useEffect(() => {
    if (!slug) return
    
    const fetchBrand = async () => {
      try {
        setIsLoading(true)
        const response = await axios.get(`/api/brands/${slug}`)
        setBrand(response.data)
        
        // Kategori sayfasındaki gibi filtreleme yapmak için markanın ürünlerini getir
        const params = new URLSearchParams({
          brandId: response.data.id.toString(),
          published: 'true'
        });
        
        const productsResponse = await axios.get(`/api/products?${params.toString()}`)
        
        // Process products - kategori sayfasıyla aynı işleme
        const processedProducts = productsResponse.data.map((product: Product) => {
          // Varyantları filtrele - null/undefined ID'leri temizle
          const validVariants = product.variants?.filter(v => v.id !== null && v.id !== undefined) || [];
          return {
            ...product,
            variants: validVariants
          };
        });
        
        setProducts(processedProducts)
        setFilteredProducts(processedProducts)
        setTotalProducts(processedProducts.length)
        setTotalPages(Math.ceil(processedProducts.length / pageSize))
        
        // Markada bulunan tüm kategorileri getir
        await fetchCategoriesInBrand(response.data.id)
        
        setError(null)
      } catch (err: any) {
        console.error('Marka bilgileri yüklenirken hata:', err)
        setError('Marka bilgileri yüklenirken bir hata oluştu')
      } finally {
        setIsLoading(false)
      }
    }
    
    // Markada bulunan kategorileri getir
    const fetchCategoriesInBrand = async (brandId: number) => {
      try {
        // API'den bu markaya ait ürünlerin bulunduğu kategorileri getir
        const response = await axios.get(`/api/categories?brandId=${brandId}`)
        setCategoriesInBrand(response.data)
      } catch (err) {
        console.error('Kategoriler yüklenirken hata:', err)
      }
    }
    
    fetchBrand()
  }, [slug])
  
  // Apply filters - kategori sayfasıyla aynı mantıkta
  const applyFilters = useCallback(() => {
    let result = [...products]
    
    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      result = result.filter(product => 
        product.name.toLowerCase().includes(searchTerm) || 
        (product.description && product.description.toLowerCase().includes(searchTerm))
      )
    }
    
    // Price filters
    if (filters.minPrice) {
      const minPrice = parseFloat(filters.minPrice)
      result = result.filter(product => {
        const price = product.price || 
          (product.variants && product.variants.length > 0 ? product.variants[0].price : 0) ||
          product.basePrice || 0;
        return price >= minPrice
      })
    }
    
    if (filters.maxPrice) {
      const maxPrice = parseFloat(filters.maxPrice)
      result = result.filter(product => {
        const price = product.price || 
          (product.variants && product.variants.length > 0 ? product.variants[0].price : 0) ||
          product.basePrice || 0;
        return price <= maxPrice
      })
    }
    
    // Stock filter
    if (filters.inStock) {
      result = result.filter(product => {
        if (product.variants && product.variants.length > 0) {
          return product.variants.some(v => v.stock > 0)
        }
        return true // Assume in stock if no variants info
      })
    }
    
    // Kategori filtresi
    if (filters.categories.length > 0) {
      result = result.filter(product => {
        // Ürünün category veya categoryId alanı varsa filtreleme yap
        if (product.category) {
          return filters.categories.includes(product.category.id);
        } else if (product.categoryId !== undefined) {
          return filters.categories.includes(product.categoryId);
        }
        return false;
      });
    }
    
    // Sorting
    if (filters.sort === 'newest') {
      // Assume products are already sorted by newest
    } else if (filters.sort === 'price-asc') {
      result.sort((a, b) => {
        const priceA = a.price || 
          (a.variants && a.variants.length > 0 ? a.variants[0].price : 0) ||
          a.basePrice || 0;
        const priceB = b.price || 
          (b.variants && b.variants.length > 0 ? b.variants[0].price : 0) ||
          b.basePrice || 0;
        return priceA - priceB
      })
    } else if (filters.sort === 'price-desc') {
      result.sort((a, b) => {
        const priceA = a.price || 
          (a.variants && a.variants.length > 0 ? a.variants[0].price : 0) ||
          a.basePrice || 0;
        const priceB = b.price || 
          (b.variants && b.variants.length > 0 ? b.variants[0].price : 0) ||
          b.basePrice || 0;
        return priceB - priceA
      })
    } else if (filters.sort === 'name-asc') {
      result.sort((a, b) => a.name.localeCompare(b.name));
    } else if (filters.sort === 'name-desc') {
      result.sort((a, b) => b.name.localeCompare(a.name));
    }
    
    setFilteredProducts(result)
    setTotalProducts(result.length)
    setTotalPages(Math.ceil(result.length / pageSize))
    setPage(1) // Reset to first page when filters change
  }, [filters, products, pageSize])
  
  useEffect(() => {
    applyFilters()
  }, [applyFilters])
  
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }
  
  const clearFilters = () => {
    setFilters({
      search: '',
      minPrice: '',
      maxPrice: '',
      sort: 'newest',
      inStock: false,
      categories: []
    })
  }
  
  // Kategori sayfasıyla aynı sepete ekleme fonksiyonu
  const handleAddToCart = async (product: Product) => {
    try {
      logProductStructure(product, 'BrandPage-handleAddToCart');
      
      // Ürünün varyant ve fiyat bilgilerini kontrol et
      if (product.variants?.length > 0) {
        // Öncelikle tüm varyantların ID kontrolü - sadece geçerli sayısal ID'leri seç
        const validVariants = product.variants.filter(v => 
          v && typeof v.id === 'number' && v.id > 0 && v.stock > 0
        );
        
        // ID değerlerini kontrol et ve log'la
        console.log("Varyant ID'leri:", product.variants.map(v => ({
          id: v.id,
          type: typeof v.id,
          isValid: typeof v.id === 'number' && v.id > 0
        })));
        
        if (validVariants.length === 0) {
          toast({
            title: "Uyarı",
            description: "Bu ürün için geçerli varyant bilgisi bulunamadı.",
            variant: "destructive",
          });
          return;
        }
        
        // Varyantı olan ürünler için
        const firstVariant = validVariants[0];
        console.log("İlk varyant bilgileri:", {
          id: firstVariant.id,
          idType: typeof firstVariant.id,
          price: firstVariant.price,
          priceType: typeof firstVariant.price,
          stock: firstVariant.stock
        });
        
        // Stok kontrolü
        if (firstVariant.stock <= 0) {
          toast({
            title: "Uyarı",
            description: "Bu ürün stokta bulunmamaktadır.",
            variant: "destructive",
          });
          return;
        }

        // Direkt API nesnesi şeklinde ürünü ekle - ID'leri kesin olarak number tipinde olduğundan emin ol
        try {
          const processedVariants = validVariants.map(v => ({
            id: Number(v.id),
            price: Number(v.price),
            stock: Number(v.stock)
          }));
          
          // İlk varyantın ID'sini logla
          if (processedVariants.length > 0) {
            console.log("İlk varyant ID (işlenmiş):", processedVariants[0].id, "Tipi:", typeof processedVariants[0].id);
          }
          
          const result = await addToCart({
            id: product.id,
            name: product.name,
            imageUrls: product.imageUrls,
            variants: processedVariants
          });
          if (result) {
            toast({
              title: "Başarılı",
              description: "Ürün sepete eklendi",
            });
          }
        } catch (error) {
          console.error("Sepete eklerken hata:", error);
          toast({
            title: "Hata",
            description: "Sepete eklerken bir hata oluştu",
            variant: "destructive",
          });
        }
      } else if (product.price || product.basePrice) {
        // Varyant yoksa, ana fiyatı kullan
        const price = product.price || product.basePrice;
        const result = await addToCart({
          id: product.id,
          name: product.name,
          imageUrls: product.imageUrls,
          price: price
        });
        
        if (result) {
          toast({
            title: "Başarılı",
            description: "Ürün sepete eklendi",
          });
        }
      } else {
        toast({
          title: "Hata",
          description: "Ürünün fiyat bilgisi bulunamadı.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Sepete eklerken hata:', error);
      toast({
        title: "Hata",
        description: "Ürün sepete eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  }
  
  // Kategori sayfasıyla aynı favorilere ekleme fonksiyonu
  const handleToggleFavorite = (productId: number) => {
    toggleFavorite(productId);
    toast({
      title: isFavorite(productId) ? "Favorilerden çıkarıldı" : "Favorilere eklendi",
      description: isFavorite(productId) 
        ? "Ürün favorilerinizden çıkarıldı." 
        : "Ürün favorilerinize eklendi.",
    });
  }
  
  // Get paginated products
  const getPaginatedProducts = () => {
    const startIndex = (page - 1) * pageSize
    const endIndex = startIndex + pageSize
    return filteredProducts.slice(startIndex, endIndex)
  }
  
  if (isLoading) {
    return (
      <div className="container mx-auto flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mr-2" />
        <span>Yükleniyor...</span>
      </div>
    )
  }
  
  if (error || !brand) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold mb-4">Hata</h1>
        <p className="text-gray-600 mb-6">{error || 'Marka bulunamadı'}</p>
        <Link href="/">
          <Button>Ana Sayfaya Dön</Button>
        </Link>
      </div>
    )
  }
  
  return (
    <div className="container mx-auto px-4 py-8">
      <Toaster />
      
      {/* Marka Başlık ve Banner Bölümü - Kategori sayfasıyla aynı stil */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 mb-6">
        {brand.bannerUrl && (
          <div className="relative w-full h-64 mb-0">
            <Image 
              src={brand.bannerUrl} 
              alt={brand.name} 
              fill 
              className="object-cover"
              priority
            />
          </div>
        )}
        
        <div className="p-4">
          <div className="flex items-center gap-3 mb-2">
            {brand.logoUrl && (
              <div className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-100">
                <Image 
                  src={brand.logoUrl} 
                  alt={brand.name} 
                  fill 
                  className="object-contain"
                />
              </div>
            )}
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{brand.name}</h1>
              {brand.description && (
                <p className="text-gray-600 text-sm mt-1">{brand.description}</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="w-full md:w-1/4 lg:w-1/5">
          <div className="sticky top-24 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
            {/* Filtreleme Başlığı */}
            <div className="bg-gray-50 px-3 py-2 border-b border-gray-200">
              <h3 className="font-medium text-sm text-gray-800">Filtreler</h3>
            </div>
            
            {/* Arama Filtresi */}
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Input 
                  placeholder="Ürün adı ile ara..." 
                  className="pl-8 text-sm h-8"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              </div>
            </div>
            
            {/* Fiyat Aralığı Filtresi */}
            <div className="p-3 border-b border-gray-100">
              <h3 className="font-medium text-xs text-gray-700 mb-2">Fiyat Aralığı</h3>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">₺0</span>
                  <span className="text-xs text-gray-500">₺50.000</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full relative">
                  <div 
                    className="absolute h-full bg-primary rounded-full" 
                    style={{ 
                      width: `${((filters.maxPrice ? parseFloat(filters.maxPrice) : 50000) / 50000) * 100}%`,
                      left: `${((filters.minPrice ? parseFloat(filters.minPrice) : 0) / 50000) * 100}%` 
                    }}
                  ></div>
                  <div 
                    className="absolute h-3 w-3 bg-white border border-primary rounded-full top-1/2 transform -translate-y-1/2 cursor-pointer" 
                    style={{ left: `${((filters.minPrice ? parseFloat(filters.minPrice) : 0) / 50000) * 100}%` }}
                  ></div>
                </div>
                <div className="flex space-x-2">
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">₺</span>
                    <Input 
                      type="number" 
                      placeholder="Min" 
                      className="w-full pl-6 text-sm h-7"
                      value={filters.minPrice}
                      onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    />
                  </div>
                  <div className="relative">
                    <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-500">₺</span>
                    <Input 
                      type="number" 
                      placeholder="Max" 
                      className="w-full pl-6 text-sm h-7"
                      value={filters.maxPrice}
                      onChange={(e) => handleFilterChange('maxPrice', e.target.value)} 
                    />
                  </div>
                </div>
                <Button 
                  className="w-full text-xs" 
                  size="sm"
                  onClick={() => applyFilters()}
                >
                  Uygula
                </Button>
              </div>
            </div>
            
            {/* Stok Durumu Filtresi */}
            <div className="p-3 border-b border-gray-100">
              <button className="flex items-center justify-between w-full text-left">
                <h3 className="font-medium text-xs text-gray-700">Stok Durumu</h3>
                <ChevronDown className="h-3 w-3 text-gray-500" />
              </button>
              <div className="mt-2 space-y-1">
                <div className="flex items-center">
                  <input 
                    type="checkbox" 
                    id="stock-in" 
                    className="h-3 w-3 rounded border-gray-300 text-primary focus:ring-primary"
                    checked={filters.inStock}
                    onChange={(e) => handleFilterChange('inStock', e.target.checked)}
                  />
                  <label htmlFor="stock-in" className="ml-2 text-xs text-gray-700">
                    Stokta Var
                  </label>
                </div>
              </div>
            </div>
            
            {/* Kategori Filtresi */}
            {categoriesInBrand.length > 0 && (
              <div className="p-3 border-b border-gray-100">
                <button className="flex items-center justify-between w-full text-left">
                  <h3 className="font-medium text-xs text-gray-700">Kategoriler</h3>
                  <ChevronDown className="h-3 w-3 text-gray-500" />
                </button>
                <div className="mt-2 space-y-1 max-h-32 overflow-y-auto pr-1">
                  {categoriesInBrand.map((category) => (
                    <div key={category.id} className="flex items-center">
                      <input 
                        type="checkbox" 
                        id={`category-${category.id}`} 
                        className="h-3 w-3 rounded border-gray-300 text-primary focus:ring-primary"
                        checked={filters.categories.includes(category.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            handleFilterChange('categories', [...filters.categories, category.id]);
                          } else {
                            handleFilterChange('categories', filters.categories.filter(id => id !== category.id));
                          }
                        }}
                      />
                      <label htmlFor={`category-${category.id}`} className="ml-2 text-xs text-gray-700">
                        {category.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Filtreleri Temizle */}
            <div className="p-3 bg-gray-50 border-t border-gray-200">
              <Button 
                variant="outline" 
                className="w-full text-xs" 
                size="sm"
                onClick={clearFilters}
              >
                Filtreleri Temizle
              </Button>
            </div>
          </div>
        </div>
        
        <div className="w-full md:w-3/4 lg:w-4/5">
          <div className="bg-white rounded-xl p-3 mb-4 shadow-sm border border-gray-100">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div className="flex items-center mb-2 sm:mb-0">
                <span className="text-xs text-gray-500">Gösteriliyor:</span>
                <span className="ml-1 text-xs font-medium">{filteredProducts.length} / {products.length} ürün</span>
              </div>
              
              <div className="flex items-center space-x-2 w-full sm:w-auto">
                <Select 
                  value={filters.sort}
                  onValueChange={(value) => handleFilterChange('sort', value)}
                >
                  <SelectTrigger className="w-full sm:w-[150px] text-xs h-8">
                    <SelectValue placeholder="Sıralama" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">En Yeniler</SelectItem>
                    <SelectItem value="price-asc">Fiyata Göre (Artan)</SelectItem>
                    <SelectItem value="price-desc">Fiyata Göre (Azalan)</SelectItem>
                    <SelectItem value="name-asc">İsme Göre (A-Z)</SelectItem>
                    <SelectItem value="name-desc">İsme Göre (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
                
                <div className="hidden sm:flex border rounded-lg overflow-hidden">
                  <button 
                    className={`p-1.5 ${viewMode === 'grid' ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-primary'} transition-colors`}
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </button>
                  <button 
                    className={`p-1.5 ${viewMode === 'list' ? 'bg-primary text-white' : 'bg-white text-gray-500 hover:bg-gray-50 hover:text-primary'} transition-colors`}
                    onClick={() => setViewMode('list')}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-sm text-gray-600">Ürünler yükleniyor...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="bg-white text-center py-10 border rounded-xl shadow-sm">
              <div className="max-w-sm mx-auto">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShoppingCart className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-base font-semibold mb-2">Ürün Bulunamadı</h3>
                <p className="text-sm text-gray-500 mb-4">Bu markaya ait ürün bulunmamaktadır veya filtreleme kriterlerinize uygun ürün yoktur.</p>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={clearFilters}
                >Tüm Filtreleri Temizle</Button>
              </div>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
                  {getPaginatedProducts().map((product) => (
                    <div key={product.id} className="group bg-white border border-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-all duration-300">
                      <Link href={`/urunler/${product.slug}`} className="block relative h-48 overflow-hidden">
                        <Image 
                          src={product.imageUrls[0] || "/placeholder-product.jpg"} 
                          alt={product.name}
                          fill
                          className="object-cover transform group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="flex flex-col gap-1">
                            <Button 
                              variant="secondary" 
                              size="icon" 
                              className="h-7 w-7 rounded-full bg-white/80 hover:bg-white"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleToggleFavorite(product.id);
                              }}
                            >
                              <Heart className={`h-3.5 w-3.5 text-gray-700 ${isFavorite(product.id) ? 'fill-red-500' : ''}`} />
                            </Button>
                            <Button 
                              variant="secondary" 
                              size="icon" 
                              className="h-7 w-7 rounded-full bg-white/80 hover:bg-white"
                              onClick={async (e) => {
                                try {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  await handleAddToCart(product);
                                } catch (err) {
                                  console.error("Error in cart button onClick handler:", err);
                                  toast({
                                    title: "Hata",
                                    description: "İşlem sırasında bir hata oluştu.",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              disabled={cartLoading}
                            >
                              <ShoppingCart className="h-3.5 w-3.5 text-gray-700" />
                            </Button>
                          </div>
                        </div>
                      </Link>
                      
                      <div className="p-3">
                        <span className="text-xs font-medium text-gray-500 block">{brand.name}</span>
                        <h3 className="font-medium text-sm mb-1 line-clamp-2 h-10">
                          <Link href={`/urunler/${product.slug}`} className="hover:text-primary transition-colors">
                            {product.name}
                          </Link>
                        </h3>
                        
                        <div className="flex items-center justify-between mt-1">
                          <div>
                            {product.variants?.length > 0 ? (
                              <span className="font-bold text-sm text-gray-900">
                                {product.variants[0].price.toLocaleString('tr-TR')} TL
                              </span>
                            ) : product.basePrice ? (
                              <span className="font-bold text-sm text-gray-900">
                                {product.basePrice.toLocaleString('tr-TR')} TL
                              </span>
                            ) : (
                              <span className="text-xs text-red-500 font-medium">Stokta Yok</span>
                            )}
                          </div>
                          
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full"
                            disabled={cartLoading}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAddToCart(product);
                            }}
                          >
                            {cartLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <ShoppingCart className="h-4 w-4 mr-1" />
                                Sepete Ekle
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-3 mb-6">
                  {getPaginatedProducts().map((product) => (
                    <div key={product.id} className="bg-white border border-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-all duration-300">
                      <div className="flex">
                        <div className="relative w-32 sm:w-48 flex-shrink-0">
                          <Image 
                            src={product.imageUrls[0] || "/placeholder-product.jpg"} 
                            alt={product.name}
                            width={192}
                            height={192}
                            className="object-cover h-full w-full"
                          />
                        </div>
                        <div className="p-4 flex-1">
                          <span className="text-xs font-medium text-gray-500 block">{brand.name}</span>
                          <h3 className="font-medium text-base hover:text-primary transition-colors">
                            <Link href={`/urunler/${product.slug}`}>
                              {product.name}
                            </Link>
                          </h3>
                          
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{product.description}</p>
                          
                          <div className="flex items-center justify-between mt-4">
                            <div>
                              {product.variants?.length > 0 ? (
                                <span className="font-bold text-lg text-gray-900">
                                  {product.variants[0].price.toLocaleString('tr-TR')} TL
                                </span>
                              ) : product.basePrice ? (
                                <span className="font-bold text-lg text-gray-900">
                                  {product.basePrice.toLocaleString('tr-TR')} TL
                                </span>
                              ) : (
                                <span className="text-sm text-red-500 font-medium">Stokta Yok</span>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="h-8 rounded-lg flex items-center"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  handleToggleFavorite(product.id);
                                }}
                              >
                                <Heart className={`h-4 w-4 mr-1 ${isFavorite(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                                <span className="text-xs">Favorilere Ekle</span>
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8 rounded-lg flex items-center"
                                disabled={cartLoading}
                                onClick={async (e) => {
                                  try {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    await handleAddToCart(product);
                                  } catch (err) {
                                    console.error("Error in list view cart button onClick handler:", err);
                                    toast({
                                      title: "Hata",
                                      description: "İşlem sırasında bir hata oluştu.",
                                      variant: "destructive",
                                    });
                                  }
                                }}
                              >
                                {cartLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <>
                                    <ShoppingCart className="h-4 w-4 mr-1" />
                                    <span className="text-xs">Sepete Ekle</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              {totalPages > 1 && (
                <div className="flex justify-center">
                  <div className="bg-white px-3 py-2 border border-gray-100 rounded-lg shadow-sm">
                    <Pagination>
                      <PaginationContent>
                        <PaginationItem>
                          <PaginationPrevious 
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (page > 1) setPage(page - 1);
                            }}
                            className={page <= 1 ? "pointer-events-none opacity-50 h-8 w-8" : "h-8 w-8 cursor-pointer"}
                          />
                        </PaginationItem>
                        
                        {Array.from({ length: totalPages }).map((_, i) => {
                          const pageNum = i + 1;
                          // Çok fazla sayfa varsa bazı sayfaları gizle
                          if (
                            pageNum === 1 || 
                            pageNum === totalPages || 
                            (pageNum >= page - 1 && pageNum <= page + 1)
                          ) {
                            return (
                              <PaginationItem key={i}>
                                <PaginationLink 
                                  href="#"
                                  onClick={(e) => {
                                    e.preventDefault();
                                    setPage(pageNum);
                                  }}
                                  isActive={page === pageNum}
                                  className="h-8 w-8 cursor-pointer"
                                >
                                  {pageNum}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                          
                          // Arada nokta göster
                          if (pageNum === page - 2 || pageNum === page + 2) {
                            return (
                              <PaginationItem key={i}>
                                <PaginationEllipsis className="h-8" />
                              </PaginationItem>
                            );
                          }
                          
                          return null;
                        })}
                        
                        <PaginationItem>
                          <PaginationNext 
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              if (page < totalPages) setPage(page + 1);
                            }}
                            className={page >= totalPages ? "pointer-events-none opacity-50 h-8 w-8" : "h-8 w-8 cursor-pointer"}
                          />
                        </PaginationItem>
                      </PaginationContent>
                    </Pagination>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Marka hakkında bilgiler - kategori sayfasındaki gibi */}
      <div className="mt-8 mb-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
        <h2 className="text-lg font-semibold mb-3">Marka Hakkında</h2>
        <div className="prose prose-sm max-w-none text-gray-600 text-sm">
          {brand.content ? (
            <div dangerouslySetInnerHTML={{ __html: brand.content }} />
          ) : brand.description ? (
            <p>{brand.description}</p>
          ) : (
            <p>{brand.name} markasının birbirinden kaliteli ürünlerini uygun fiyatlarla satın alabilirsiniz. 
            Ürünler %100 orijinal ve garantilidir. Hızlı teslimat ve güvenli alışveriş imkanı sunarız.</p>
          )}
        </div>
      </div>
    </div>
  )
}

BrandPage.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>
}

export default BrandPage 