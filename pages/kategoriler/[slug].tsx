import { GetServerSideProps } from 'next';
import React, { useState, useEffect, useCallback } from 'react';
import prisma from '@/lib/prisma';
import MainLayout from '@/components/layouts/MainLayout';
import { NextPageWithLayout } from '@/lib/types';
import { ReactElement } from 'react';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Heart, Search, FilterIcon, ChevronDown, Grid3X3, List, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '@/components/ui/pagination';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import axios from 'axios';
import { toast } from '@/components/ui/use-toast';
import { Toaster } from '@/components/ui/toaster';
import { useCart } from '@/hooks/useCart';
import { useFavorites } from '@/hooks/useFavorites';
import { logProductStructure, logError } from '@/utils/debug';

type Product = {
  id: number;
  name: string;
  description: string | null;
  slug: string;
  imageUrls: string[];
  price?: number;
  brand: {
    name: string;
    id: number;
  } | null;
  variants: {
    id: number;
    price: number;
    stock: number;
  }[];
};

type Category = {
  id: number;
  name: string;
  description: string | null;
  slug: string;
  bannerUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  parentId: number | null;
  parent: {
    name: string;
    slug: string;
  } | null;
  children: {
    id: number;
    name: string;
    slug: string;
  }[];
};

type Brand = {
  id: number;
  name: string;
};

type FilterState = {
  search: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
  brands: number[];
  inStock: boolean;
};

type Props = {
  category: Category;
  products: Product[];
  totalProducts: number;
  page: number;
  pageSize: number;
  brandsInCategory: Brand[];
};

const CategoryPage: NextPageWithLayout<Props> = ({ category, products: initialProducts, totalProducts: initialTotal, page: initialPage, pageSize, brandsInCategory }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [totalProducts, setTotalProducts] = useState(initialTotal);
  const [totalPages, setTotalPages] = useState(Math.ceil(initialTotal / pageSize));
  const [page, setPage] = useState(initialPage);
  const { addToCart, isLoading: cartLoading } = useCart();
  const { toggleFavorite, isFavorite, isLoading: favoriteLoading } = useFavorites();
  
  // Filtreleri ayarla
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
    brands: [],
    inStock: false
  });

  // Filtrele ve ürünleri güncelle
  const fetchFilteredProducts = useCallback(async (currentPage = page) => {
    setIsLoading(true);
    try {
      // Ana sayfayla aynı endpoint'i kullan
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: pageSize.toString(),
        categoryId: category.id.toString(),
        published: 'true'
      });

      if (filters.search) params.append('search', filters.search);
      if (filters.minPrice) params.append('minPrice', filters.minPrice);
      if (filters.maxPrice) params.append('maxPrice', filters.maxPrice);
      
      // Sıralama parametrelerini ayarla
      if (filters.sort === 'newest') {
        params.append('sortField', 'createdAt');
        params.append('sortOrder', 'desc');
      } else if (filters.sort === 'price-asc') {
        params.append('sortField', 'price');
        params.append('sortOrder', 'asc');
      } else if (filters.sort === 'price-desc') {
        params.append('sortField', 'price');
        params.append('sortOrder', 'desc');
      }
      
      if (filters.brands.length > 0) {
        filters.brands.forEach(brandId => params.append('brandId', brandId.toString()));
      }

      const response = await axios.get(`/api/products?${params.toString()}`);
      
      // Varyant ID'lerini işle
      const processedProducts = response.data.map((product: Product) => {
        // Varyantları filtrele - null/undefined ID'leri temizle
        const validVariants = product.variants?.filter(v => v.id !== null && v.id !== undefined) || [];
        return {
          ...product,
          variants: validVariants
        };
      });
      
      setProducts(processedProducts);
      setTotalProducts(processedProducts.length); // API pagination bilgisi dönmüyor, toplam sayıyı ürün sayısından alıyoruz
      setTotalPages(Math.ceil(processedProducts.length / pageSize));
    } catch (error) {
      console.error('Error fetching filtered products:', error);
      toast({
        title: "Hata",
        description: "Ürünler yüklenirken bir hata oluştu.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [category.id, filters, page, pageSize]);
  
  // Komponent ilk yüklendiğinde ürünleri getir - fetchFilteredProducts tanımlandıktan sonra çağrıldı
  useEffect(() => {
    // Kategorinin ilk açılışında ürünleri yükle
    fetchFilteredProducts(page);
  }, [fetchFilteredProducts, page]);

  // Sepete ürün ekleme fonksiyonu - kategori sayfası için özelleştirilmiş
  const handleAddToCart = async (product: Product) => {
    try {
      logProductStructure(product, 'CategoryPage-handleAddToCart');
      
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
          console.log("addToCart sonucu:", result);
        } catch (error) {
          logError('CategoryPage-addToCart', error);
          toast({
            title: "Hata",
            description: "Ürün sepete eklenirken bir hata oluştu.",
            variant: "destructive",
          });
        }
      }
      // Varyantı olmayan ama fiyatı olan ürünler için
      else if (product.price) {
        console.log(`Varyantı olmayan ürün için addToCart çağrılıyor - product.id: ${product.id}, price: ${product.price}`);
        try {
          const result = await addToCart({
            id: product.id,
            name: product.name,
            imageUrls: product.imageUrls,
            price: Number(product.price)
          });
          if (result) {
            toast({
              title: "Başarılı",
              description: "Ürün sepete eklendi",
            });
          }
          console.log("addToCart sonucu:", result);
        } catch (error) {
          logError('CategoryPage-addToCart-noVariant', error);
          toast({
            title: "Hata",
            description: "Ürün sepete eklenirken bir hata oluştu.",
            variant: "destructive",
          });
        }
      }
      // Ne varyant ne de fiyat yoksa
      else {
        toast({
          title: "Uyarı",
          description: "Bu ürün için fiyat bilgisi bulunamadı.",
          variant: "destructive",
        });
      }
    } catch (error) {
      logError('CategoryPage-handleAddToCart', error);
      toast({
        title: "Hata",
        description: "Ürün sepete eklenirken bir hata oluştu.",
        variant: "destructive",
      });
    }
  };

  // Filtre değişikliklerinde ürünleri güncelle
  useEffect(() => {
    fetchFilteredProducts(1); // Filtre değişikliklerinde her zaman ilk sayfaya dön
  }, [filters, fetchFilteredProducts]);

  // Sayfa değişikliklerinde ürünleri güncelle
  useEffect(() => {
    if (page !== 1) {
      fetchFilteredProducts(page);
    }
  }, [page, fetchFilteredProducts]);

  // Filtre değerlerini güncelle
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  // Filtre temizleme
  const clearFilters = () => {
    setFilters({
      search: '',
      minPrice: '',
      maxPrice: '',
      sort: 'newest',
      brands: [],
      inStock: false
    });
  };

  return (
    <div className="container mx-auto px-4 py-4 sm:py-6">
      <Toaster />
      {/* Breadcrumb navigasyonu */}
      <nav className="flex mb-3" aria-label="Breadcrumb">
        <ol className="inline-flex items-center space-x-1 md:space-x-2 text-xs">
          <li className="inline-flex items-center">
            <Link href="/" className="text-gray-500 hover:text-primary transition-colors">
              Ana Sayfa
            </Link>
          </li>
          <li>
            <div className="flex items-center">
              <span className="mx-1 text-gray-400">/</span>
              <Link href="/kategoriler" className="text-gray-500 hover:text-primary transition-colors">
                Kategoriler
              </Link>
            </div>
          </li>
          {category.parent && (
            <li>
              <div className="flex items-center">
                <span className="mx-1 text-gray-400">/</span>
                <Link href={`/kategoriler/${category.parent.slug}`} className="text-gray-500 hover:text-primary transition-colors">
                  {category.parent.name}
                </Link>
              </div>
            </li>
          )}
          <li aria-current="page">
            <div className="flex items-center">
              <span className="mx-1 text-gray-400">/</span>
              <span className="text-primary font-medium">{category.name}</span>
            </div>
          </li>
        </ol>
      </nav>
      
      {/* Kategori Banner ve Alt Kategoriler - birleştirilmiş daha kompakt yapı */}
      <div className="mb-4 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div className="relative bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="absolute inset-0 bg-cover bg-center opacity-10" 
               style={{backgroundImage: `url(${category.bannerUrl || '/images/pattern-bg.jpg'})`}}></div>
          <div className="relative z-10 px-4 py-4 flex flex-row items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-800">{category.name}</h1>
              {category.description && (
                <p className="text-xs text-gray-600 max-w-2xl line-clamp-1 mt-1">{category.description}</p>
              )}
              <div className="mt-1 flex space-x-2">
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {totalProducts} Ürün
                </span>
                {category.children.length > 0 && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {category.children.length} Alt Kategori
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {category.children.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-500">Alt Kategoriler:</span>
              {category.children.slice(0, 5).map((subCategory) => (
                <Link 
                  key={subCategory.id} 
                  href={`/kategoriler/${subCategory.slug}`}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white border border-gray-100 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all duration-200"
                >
                  {subCategory.name}
                </Link>
              ))}
              {category.children.length > 5 && (
                <Link 
                  href={`#`}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-all duration-200"
                >
                  +{category.children.length - 5} daha
                </Link>
              )}
            </div>
          </div>
        )}
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
                  onClick={() => fetchFilteredProducts(1)}
                >
                  Uygula
                </Button>
              </div>
            </div>
            
            {/* Marka Filtresi */}
            <div className="p-3 border-b border-gray-100">
              <button className="flex items-center justify-between w-full text-left">
                <h3 className="font-medium text-xs text-gray-700">Markalar</h3>
                <ChevronDown className="h-3 w-3 text-gray-500" />
              </button>
              <div className="mt-2 space-y-1 max-h-32 overflow-y-auto pr-1">
                {brandsInCategory && brandsInCategory.map((brand) => (
                  <div key={brand.id} className="flex items-center">
                    <input 
                      type="checkbox" 
                      id={`brand-${brand.id}`} 
                      className="h-3 w-3 rounded border-gray-300 text-primary focus:ring-primary"
                      checked={filters.brands.includes(brand.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          handleFilterChange('brands', [...filters.brands, brand.id]);
                        } else {
                          handleFilterChange('brands', filters.brands.filter(id => id !== brand.id));
                        }
                      }}
                    />
                    <label htmlFor={`brand-${brand.id}`} className="ml-2 text-xs text-gray-700">
                      {brand.name}
                    </label>
                  </div>
                ))}
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
                <span className="ml-1 text-xs font-medium">{products.length} / {totalProducts} ürün</span>
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
                    <SelectItem value="price_asc">Fiyata Göre (Artan)</SelectItem>
                    <SelectItem value="price_desc">Fiyata Göre (Azalan)</SelectItem>
                    <SelectItem value="name_asc">İsme Göre (A-Z)</SelectItem>
                    <SelectItem value="name_desc">İsme Göre (Z-A)</SelectItem>
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
          ) : products.length === 0 ? (
            <div className="bg-white text-center py-10 border rounded-xl shadow-sm">
              <div className="max-w-sm mx-auto">
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <ShoppingCart className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-base font-semibold mb-2">Ürün Bulunamadı</h3>
                <p className="text-sm text-gray-500 mb-4">Bu kategoride henüz ürün bulunmamaktadır veya filtreleme kriterlerinize uygun ürün yoktur.</p>
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
                  {products.map((product) => (
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
                                toggleFavorite(product.id);
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
                              disabled={cartLoading || 
                                (product.variants?.filter(v => v.id !== null && v.id !== undefined).length === 0 && !product.price)}
                            >
                              <ShoppingCart className="h-3.5 w-3.5 text-gray-700" />
                            </Button>
                          </div>
                        </div>
                      </Link>
                      
                      <div className="p-3">
                        {product.brand && (
                          <span className="text-xs font-medium text-gray-500 block">{product.brand.name}</span>
                        )}
                        <h3 className="font-medium text-sm mb-1 line-clamp-2 h-10">
                          <Link href={`/urunler/${product.slug}`} className="hover:text-primary transition-colors">
                            {product.name}
                          </Link>
                        </h3>
                        
                        <div className="flex items-center justify-between mt-1">
                          <div>
                            {product.variants?.filter(v => v.id !== null && v.id !== undefined).length > 0 ? (
                              <span className="font-bold text-sm text-gray-900">
                                {product.variants.find(v => v.id !== null && v.id !== undefined)?.price.toLocaleString('tr-TR')} TL
                              </span>
                            ) : product.price ? (
                              <span className="font-bold text-sm text-gray-900">
                                {product.price.toLocaleString('tr-TR')} TL
                              </span>
                            ) : (
                              <span className="text-xs text-red-500 font-medium">Stokta Yok</span>
                            )}
                          </div>
                          
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full"
                            disabled={cartLoading || 
                              (product.variants?.filter(v => v.id !== null && v.id !== undefined).length === 0 && !product.price)}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleAddToCart(product);
                            }}
                          >
                            {cartLoading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (product.variants?.filter(v => v.id !== null && v.id !== undefined).length === 0 && !product.price) ? (
                              "Stokta Yok"
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
                  {products.map((product) => (
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
                          {product.brand && (
                            <span className="text-xs font-medium text-gray-500 block">{product.brand.name}</span>
                          )}
                          <h3 className="font-medium text-base hover:text-primary transition-colors">
                            <Link href={`/urunler/${product.slug}`}>
                              {product.name}
                            </Link>
                          </h3>
                          
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">{product.description}</p>
                          
                          <div className="flex items-center justify-between mt-4">
                            <div>
                              {product.variants?.filter(v => v.id !== null && v.id !== undefined).length > 0 ? (
                                <span className="font-bold text-lg text-gray-900">
                                  {product.variants.find(v => v.id !== null && v.id !== undefined)?.price.toLocaleString('tr-TR')} TL
                                </span>
                              ) : product.price ? (
                                <span className="font-bold text-lg text-gray-900">
                                  {product.price.toLocaleString('tr-TR')} TL
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
                                  toggleFavorite(product.id);
                                }}
                              >
                                <Heart className={`h-4 w-4 mr-1 ${isFavorite(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                                <span className="text-xs">Favorilere Ekle</span>
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                className="h-8 rounded-lg flex items-center"
                                disabled={cartLoading || 
                                  (product.variants?.filter(v => v.id !== null && v.id !== undefined).length === 0 && !product.price)}
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
                                ) : (product.variants?.filter(v => v.id !== null && v.id !== undefined).length === 0 && !product.price) ? (
                                  <span className="text-xs">Stokta Yok</span>
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
      
      {/* Kategoriyle ilgili bilgiler ve SEO içeriği - daha kompakt */}
      <div className="mt-8 mb-6 bg-gray-50 rounded-xl p-4 border border-gray-100">
        <h2 className="text-lg font-semibold mb-3">Kategori Hakkında</h2>
        <div className="prose prose-sm max-w-none text-gray-600 text-sm">
          {category.description ? (
            <p>{category.description}</p>
          ) : (
            <p>{category.name} kategorisinde birbirinden kaliteli ürünleri uygun fiyatlarla satın alabilirsiniz. 
            Ürünler %100 orijinal ve garantilidir. Hızlı teslimat ve güvenli alışveriş imkanı sunarız.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ params, query }) => {
  const slug = params?.slug as string;
  const page = Number(query.page) || 1;
  const pageSize = 12;
  
  try {
    // Kategori bilgilerini al
    const category = await prisma.category.findUnique({
      where: { slug },
      include: {
        parent: {
          select: {
            name: true,
            slug: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });
    
    if (!category) {
      return {
        notFound: true,
      };
    }

    // Kategoride bulunan tüm markaları getir (filtre için)
    const categoryIds = [category.id, ...category.children.map(c => c.id)];
    const brandsInCategory = await prisma.brand.findMany({
      where: {
        products: {
          some: {
            categoryId: {
              in: categoryIds,
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
      },
    });
    
    return {
      props: {
        category: JSON.parse(JSON.stringify(category)),
        products: [], // Ürünleri client-side yükleyeceğiz
        totalProducts: 0,
        page,
        pageSize,
        brandsInCategory: JSON.parse(JSON.stringify(brandsInCategory)),
      },
    };
  } catch (error) {
    console.error('Error loading category page:', error);
    return {
      notFound: true,
    };
  }
};

CategoryPage.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>;
};

export default CategoryPage; 