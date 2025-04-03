import React, { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import { zodResolver } from '@hookform/resolvers/zod'
import { Search, ShoppingBag, UserRound, User, Package, Bookmark, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { signOut, useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/router'
import axios from '@/lib/axios'
import debounce from 'lodash/debounce'

// Arama sonuç tipleri
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

const formSchema = z.object({
  searchInput: z.string().min(2, {
    message: 'Arama en az 2 karakter olmalıdır.'
  })
})

export default function NavControls() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResults | null>(null)
  
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      searchInput: ''
    }
  })
  const [cartItemCount, setCartItemCount] = useState(0);

  useEffect(() => {
    // localStorage'dan sepeti kontrol et ve öğe sayısını güncelle
    const updateCartCount = () => {
      const storedCart = localStorage.getItem('cart');
      if (storedCart) {
        try {
          const parsedCart = JSON.parse(storedCart);
          setCartItemCount(parsedCart.length);
        } catch (error) {
          console.error("Sepet verisi yüklenemedi:", error);
        }
      }
    };

    // Sayfa yüklendiğinde sepet sayısını kontrol et
    updateCartCount();

    // localStorage değişikliklerini dinle (aynı sekmedeki değişiklikler için)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'cart') {
        updateCartCount();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Custom event dinleyici (sepet güncellemelerinde tetiklenir)
    const handleCartUpdate = () => updateCartCount();
    window.addEventListener('cartUpdated', handleCartUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, []);

  // Debounce ile arama fonksiyonu
  const debouncedSearch = debounce(async (searchTerm: string) => {
    if (searchTerm.length < 2) {
      setSearchResults(null);
      return;
    }

    setLoading(true);
    try {
      const response = await axios.get(`/api/search?q=${encodeURIComponent(searchTerm)}`);
      setSearchResults(response.data);
    } catch (error) {
      console.error('Arama hatası:', error);
    } finally {
      setLoading(false);
    }
  }, 300);

  // Arama input değiştiğinde çalışacak fonksiyon
  const handleSearchChange = (value: string) => {
    form.setValue('searchInput', value);
    debouncedSearch(value);
  };

  function onSubmit(values: z.infer<typeof formSchema>) {
    // Doğrudan arama sayfasına yönlendirme
    if (values.searchInput.trim().length >= 2) {
      router.push(`/arama?q=${encodeURIComponent(values.searchInput)}`);
    }
  }

  return (
    <div className='flex w-max flex-1 items-center justify-end gap-4'>
      <Sheet>
        <SheetTrigger asChild>
          <Search
            size={20}
            strokeWidth={1.25}
            className='hover:text-primary cursor-pointer'
            absoluteStrokeWidth
          />
        </SheetTrigger>
        <SheetContent side='top'>
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className='mx-auto max-w-3xl space-y-4 py-8'
            >
              <FormField
                control={form.control}
                name='searchInput'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className='text-2xl font-light'>
                      Ne aramıştınız?
                    </FormLabel>
                    <FormControl className=''>
                      <div className='flex items-center gap-2 border-b border-primary'>
                        <Input
                          placeholder='Ürünler, kategoriler, markalar...'
                          {...field}
                          className='border-0 pl-0 shadow-none focus-visible:ring-0'
                          onChange={(e) => handleSearchChange(e.target.value)}
                        />
                        <button type='submit'>
                          <Search
                            size={20}
                            strokeWidth={1.25}
                            className='hover:text-primary'
                            absoluteStrokeWidth
                          />
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Arama sonuçları */}
              {loading && (
                <div className="text-center py-4">
                  <div className="animate-spin h-5 w-5 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                  <p className="text-sm text-muted-foreground mt-2">Aranıyor...</p>
                </div>
              )}

              {!loading && searchResults && searchResults.counts.total > 0 && (
                <div className="space-y-6">
                  {/* Ürün sonuçları */}
                  {searchResults.products.length > 0 && (
                    <div>
                      <h3 className="font-medium text-lg flex items-center mb-2">
                        <Package className="w-4 h-4 mr-2" />
                        Ürünler
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {searchResults.products.map(product => (
                          <Link key={`product-${product.id}`} href={product.url}>
                            <div className="p-3 rounded-lg border border-border hover:bg-muted flex items-center gap-3">
                              <div className="w-12 h-12 rounded-md bg-muted-foreground/10 flex items-center justify-center overflow-hidden">
                                {product.imageUrl ? (
                                  <img 
                                    src={product.imageUrl} 
                                    alt={product.name} 
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  <Package className="w-6 h-6 text-muted-foreground" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{product.name}</p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {product.brand && <span>{product.brand} - </span>}
                                  {product.category}
                                </p>
                                {product.price && (
                                  <p className="text-sm font-medium text-primary mt-1">
                                    {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(product.price)}
                                  </p>
                                )}
                              </div>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Kategori sonuçları */}
                  {searchResults.categories.length > 0 && (
                    <div>
                      <h3 className="font-medium text-lg flex items-center mb-2">
                        <Bookmark className="w-4 h-4 mr-2" />
                        Kategoriler
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {searchResults.categories.map(category => (
                          <Link key={`category-${category.id}`} href={category.url}>
                            <div className="p-2 rounded-lg border border-border hover:bg-muted flex items-center gap-2">
                              <div className="w-8 h-8 rounded-md bg-muted-foreground/10 flex items-center justify-center overflow-hidden">
                                {category.imageUrl ? (
                                  <img 
                                    src={category.imageUrl} 
                                    alt={category.name} 
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  <Bookmark className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <span className="text-sm font-medium">{category.name}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Marka sonuçları */}
                  {searchResults.brands.length > 0 && (
                    <div>
                      <h3 className="font-medium text-lg flex items-center mb-2">
                        <User className="w-4 h-4 mr-2" />
                        Markalar
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {searchResults.brands.map(brand => (
                          <Link key={`brand-${brand.id}`} href={brand.url}>
                            <div className="p-2 rounded-lg border border-border hover:bg-muted flex items-center gap-2">
                              <div className="w-8 h-8 rounded-md bg-muted-foreground/10 flex items-center justify-center overflow-hidden">
                                {brand.imageUrl ? (
                                  <img 
                                    src={brand.imageUrl} 
                                    alt={brand.name} 
                                    className="object-cover w-full h-full"
                                  />
                                ) : (
                                  <User className="w-4 h-4 text-muted-foreground" />
                                )}
                              </div>
                              <span className="text-sm font-medium">{brand.name}</span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Tümünü göster butonu */}
                  <div className="pt-2 text-center">
                    <Button 
                      onClick={() => router.push(`/arama?q=${encodeURIComponent(form.getValues().searchInput)}`)}
                      variant="outline"
                    >
                      Tüm arama sonuçlarını göster
                    </Button>
                  </div>
                </div>
              )}

              {!loading && searchResults && searchResults.counts.total === 0 && (
                <div className="py-8 text-center">
                  <p className="text-lg font-medium">Sonuç bulunamadı</p>
                  <p className="text-muted-foreground">Farklı anahtar kelimeler ile tekrar deneyin.</p>
                </div>
              )}
            </form>
          </Form>
        </SheetContent>
      </Sheet>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <UserRound
            size={20}
            strokeWidth={1.25}
            className='hover:text-primary'
            absoluteStrokeWidth
          />
        </DropdownMenuTrigger>
        <DropdownMenuContent side='top'>
          {status === 'authenticated' ? (
            <>
              <Link href='/profile'>
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Hesabım</span>
                </DropdownMenuItem>
              </Link>
              <DropdownMenuItem onClick={() => signOut()}>
                <span>Çıkış Yap</span>
              </DropdownMenuItem>
            </>
          ) : (
            <Link href='/giris-yap'>
              <DropdownMenuItem>
                <span>Giriş Yap</span>
              </DropdownMenuItem>
            </Link>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <Link href='/cart' className='relative'>
        <ShoppingBag
          size={20}
          strokeWidth={1.25}
          className='hover:text-primary'
          absoluteStrokeWidth
        />
        {cartItemCount > 0 && (
          <span className='absolute -right-2 -top-3 flex items-center justify-center'>
            <Badge className='rounded-full px-1 py-0 font-thin'>{cartItemCount}</Badge>
          </span>
        )}
      </Link>

      <Link href='/blog' className='relative'>
        <BookOpen
          size={20}
          strokeWidth={1.25}
          className='hover:text-primary'
          absoluteStrokeWidth
        />
      </Link>
    </div>
  )
}
