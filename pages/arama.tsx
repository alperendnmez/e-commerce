import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import MainLayout from '@/components/layouts/MainLayout';
import { Package, Bookmark, User, Search, ChevronRight } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import axios from '@/lib/axios';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsContent, TabsTrigger } from '@/components/ui/tabs';

// Arama sonuç tipi
interface SearchResult {
  id: number;
  name: string;
  slug: string;
  type: 'product' | 'category' | 'brand';
  url: string;
  imageUrl: string | null;
  price?: number;
  category?: string;
  brand?: string;
}

// Arama sonuçları tipi
interface SearchResults {
  products: SearchResult[];
  categories: SearchResult[];
  brands: SearchResult[];
  counts: {
    total: number;
    products: number;
    categories: number;
    brands: number;
  }
}

export default function SearchPage() {
  const router = useRouter();
  const { q } = router.query;
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // URL'deki sorgu parametresi değiştiğinde aramayı yap
  useEffect(() => {
    if (typeof q === 'string' && q.trim()) {
      setSearchTerm(q);
      performSearch(q);
    }
  }, [q]);

  // Arama işlemini gerçekleştir
  const performSearch = async (term: string) => {
    if (!term || term.trim().length < 2) return;

    setLoading(true);
    setError(null);

    try {
      const response = await axios.get(`/api/search?q=${encodeURIComponent(term.trim())}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error("Arama hatası:", error);
      setError("Arama yapılırken bir hata oluştu. Lütfen daha sonra tekrar deneyin.");
    } finally {
      setLoading(false);
    }
  };

  // Yeni arama formunu gönder
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (searchTerm.trim().length >= 2) {
      router.push(`/arama?q=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  return (
    <div className="container py-8 px-4 md:px-6">
      {/* Başlık ve arama formu */}
      <div className="space-y-4 mb-8">
        <div className="flex items-center space-x-2 text-muted-foreground text-sm">
          <Link href="/" className="hover:text-primary">Ana Sayfa</Link>
          <ChevronRight className="h-4 w-4" />
          <span>Arama</span>
          {q && (
            <>
              <ChevronRight className="h-4 w-4" />
              <span className="truncate max-w-[200px]">{q}</span>
            </>
          )}
        </div>

        <h1 className="text-3xl font-bold tracking-tight">Arama Sonuçları</h1>
        <form onSubmit={handleSubmit} className="flex gap-2 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Ürünler, kategoriler, markalar..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Button type="submit">Ara</Button>
        </form>
      </div>

      {/* Yükleniyor durumu */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          <span className="ml-3 text-lg">Aranıyor...</span>
        </div>
      )}

      {/* Hata mesajı */}
      {!loading && error && (
        <div className="bg-destructive/10 border border-destructive text-destructive p-4 rounded-md my-4">
          <p>{error}</p>
        </div>
      )}

      {/* Sonuç bulunamadı */}
      {!loading && !error && searchResults && searchResults.counts.total === 0 && (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-muted mb-4">
            <Search className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-2xl font-semibold mb-2">Sonuç bulunamadı</h2>
          <p className="text-muted-foreground max-w-md mx-auto mb-4">
            "{q}" için arama sonucu bulunamadı. Lütfen farklı anahtar kelimeler kullanarak tekrar deneyin.
          </p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <Button variant="outline" onClick={() => router.back()}>
              Geri Dön
            </Button>
            <Button asChild>
              <Link href="/">Ana Sayfaya Git</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Arama sonuçları */}
      {!loading && !error && searchResults && searchResults.counts.total > 0 && (
        <div className="space-y-8">
          {/* Özet bilgi */}
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              <span className="font-medium text-foreground">{searchResults.counts.total}</span> sonuç bulundu
            </p>
            <div className="flex gap-2">
              <Badge variant="outline" className="text-xs">
                Ürünler: {searchResults.counts.products}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Kategoriler: {searchResults.counts.categories}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Markalar: {searchResults.counts.brands}
              </Badge>
            </div>
          </div>

          <Tabs defaultValue={searchResults.products.length > 0 ? "products" : (searchResults.categories.length > 0 ? "categories" : "brands")}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="products" disabled={searchResults.products.length === 0}>
                <Package className="h-4 w-4 mr-2" />
                Ürünler ({searchResults.counts.products})
              </TabsTrigger>
              <TabsTrigger value="categories" disabled={searchResults.categories.length === 0}>
                <Bookmark className="h-4 w-4 mr-2" />
                Kategoriler ({searchResults.counts.categories})
              </TabsTrigger>
              <TabsTrigger value="brands" disabled={searchResults.counts.brands === 0}>
                <User className="h-4 w-4 mr-2" />
                Markalar ({searchResults.counts.brands})
              </TabsTrigger>
            </TabsList>

            {/* Ürün sonuçları */}
            <TabsContent value="products" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {searchResults.products.map(product => (
                  <Link key={`product-${product.id}`} href={product.url}>
                    <div className="group border border-border rounded-lg overflow-hidden hover:border-primary transition-colors">
                      <div className="aspect-square bg-muted-foreground/5 relative overflow-hidden">
                        {product.imageUrl ? (
                          <img 
                            src={product.imageUrl} 
                            alt={product.name} 
                            className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-12 h-12 text-muted-foreground/20" />
                          </div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
                        <div className="flex items-center text-xs text-muted-foreground mt-1 mb-2">
                          {product.brand && (
                            <>
                              <span>{product.brand}</span>
                              {product.category && <span className="mx-1">•</span>}
                            </>
                          )}
                          {product.category && <span>{product.category}</span>}
                        </div>
                        {product.price && (
                          <p className="text-primary font-semibold">
                            {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(product.price)}
                          </p>
                        )}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </TabsContent>

            {/* Kategori sonuçları */}
            <TabsContent value="categories" className="mt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {searchResults.categories.map(category => (
                  <Link key={`category-${category.id}`} href={category.url}>
                    <div className="border border-border rounded-lg overflow-hidden hover:border-primary transition-colors p-4 flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full bg-muted-foreground/10 flex items-center justify-center overflow-hidden mb-3">
                        {category.imageUrl ? (
                          <img 
                            src={category.imageUrl} 
                            alt={category.name} 
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <Bookmark className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <h3 className="font-medium">{category.name}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </TabsContent>

            {/* Marka sonuçları */}
            <TabsContent value="brands" className="mt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {searchResults.brands.map(brand => (
                  <Link key={`brand-${brand.id}`} href={brand.url}>
                    <div className="border border-border rounded-lg overflow-hidden hover:border-primary transition-colors p-4 flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full bg-muted-foreground/10 flex items-center justify-center overflow-hidden mb-3">
                        {brand.imageUrl ? (
                          <img 
                            src={brand.imageUrl} 
                            alt={brand.name} 
                            className="object-cover w-full h-full"
                          />
                        ) : (
                          <User className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <h3 className="font-medium">{brand.name}</h3>
                    </div>
                  </Link>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}

SearchPage.getLayout = (page: React.ReactElement) => {
  return <MainLayout>{page}</MainLayout>;
}; 