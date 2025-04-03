import { Card, CardContent } from '@/components/ui/card'
import { Eye, Heart, ImageIcon, ShoppingCart, Loader2 } from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { CarouselData } from '@/lib/types'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import axios from 'axios'
import Image from 'next/image'
import { useCart } from '@/hooks/useCart'
import { useFavorites } from '@/hooks/useFavorites'
import { toast } from '@/components/ui/use-toast'
import { Toaster } from '@/components/ui/toaster'
import { logProductStructure, logError } from '@/utils/debug'
import { v4 as uuidv4 } from 'uuid'

// API'den dönen ürün tipi için arayüz
interface ApiProduct {
  id: number;
  name: string;
  slug: string;
  published: boolean;
  createdAt: string;
  imageUrls: string[];
  price?: number;
  brand?: {
    id: number;
    name: string;
  } | null;
  variants?: { 
    id: number;
    price: number;
    stock: number;
  }[];
  description?: string | null;
}

export default function ProductGrid({
  carouselData
}: {
  carouselData: CarouselData
}) {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  const [loading, setLoading] = useState(true);
  
  // useCart hook'unu kullan
  const { addToCart, isLoading: cartLoading } = useCart();
  
  // useFavorites hook'unu kullan
  const { toggleFavorite, isFavorite, isLoading: favoriteLoading } = useFavorites();

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const response = await axios.get('/api/products');
        // API yanıtının doğru formatta olduğunu kontrol et
        if (response.data && response.data.products && Array.isArray(response.data.products)) {
          // Varyant ID'lerini işle
          const processedProducts = response.data.products.map((product: ApiProduct) => {
            // Varyantları filtrele - null/undefined ID'leri temizle
            const validVariants = product.variants?.filter(v => v.id !== null && v.id !== undefined) || [];
            return {
              ...product,
              variants: validVariants
            };
          });
          setProducts(processedProducts);
        } else if (response.data && Array.isArray(response.data)) {
          // API doğrudan dizi döndürüyorsa
          const processedProducts = response.data.map((product: ApiProduct) => {
            // Varyantları filtrele - null/undefined ID'leri temizle
            const validVariants = product.variants?.filter(v => v.id !== null && v.id !== undefined) || [];
            return {
              ...product,
              variants: validVariants
            };
          });
          setProducts(processedProducts);
        } else {
          console.error('API yanıtı beklenen formatta değil:', response.data);
          setProducts([]);
        }
      } catch (error) {
        console.error('Ürünler yüklenirken hata oluştu:', error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);
  
  // Sepete ürün ekleme fonksiyonu
  const handleAddToCart = async (product: ApiProduct) => {
    try {
      logProductStructure(product, 'ProductCarousel-handleAddToCart');
      
      // Stok kontrolü yap
      if (!product.variants?.length && !product.price) {
        toast({
          title: "Uyarı",
          description: "Ürünün fiyat bilgisi bulunamadı.",
          variant: "destructive",
        });
        return;
      }

      // Varyantı olan ürünler için stok kontrolü
      if (product.variants && product.variants.length > 0) {
        // Geçerli varyantları filtrele
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
            description: "Bu ürün stokta bulunmamaktadır.",
            variant: "destructive",
          });
          return;
        }
        
        // API'ye göndermek üzere varyantları hazırla - ID'leri kesin olarak number tipinde olduğundan emin ol
        const processedVariants = validVariants.map(v => ({
          id: Number(v.id),
          price: Number(v.price),
          stock: Number(v.stock)
        }));
        
        // İlk varyantın ID'sini logla
        if (processedVariants.length > 0) {
          console.log("İlk varyant ID (işlenmiş):", processedVariants[0].id, "Tipi:", typeof processedVariants[0].id);
        }

        // localStorage'da sessionId kontrolü yap
        let sessionId = localStorage.getItem('cartSessionId');
        if (!sessionId) {
          console.log("Cart için sessionId bulunamadı, yenisi oluşturuluyor");
          sessionId = uuidv4();
          localStorage.setItem('cartSessionId', sessionId);
        }
        
        console.log("Sepete eklerken kullanılan sessionId:", sessionId ? sessionId.substring(0, 8) + "..." : "null");
        
        // Direkt API nesnesi şeklinde ürünü ekle
        try {
          console.log("Ürünü sepete eklerken kullanılacak sessionId:", sessionId?.slice(0, 8) + "...");
          const result = await addToCart(
            {
              id: product.id,
              name: product.name,
              imageUrls: product.imageUrls,
              variants: processedVariants
            }, 
            1,  // miktar
            processedVariants[0]?.id, // ilk varyant ID'sini seç
            sessionId // özel session ID
          );
          console.log("Sonuç:", result);
        } catch (error) {
          logError("ProductCarousel-addToCart", error);
          toast({
            title: "Hata",
            description: "Ürün sepete eklenirken bir hata oluştu.",
            variant: "destructive",
          });
        }
      } else if (product.price) {
        console.log("Varyantı olmayan ürün sepete ekleniyor:", product.id, product.price);
        
        try {
          // localStorage'da sessionId kontrolü yap
          let sessionId = localStorage.getItem('cartSessionId');
          if (!sessionId) {
            console.log("Cart için sessionId bulunamadı, yenisi oluşturuluyor");
            sessionId = uuidv4();
            localStorage.setItem('cartSessionId', sessionId);
          }
        
          console.log("Sepete eklerken kullanılan sessionId:", sessionId ? sessionId.substring(0, 8) + "..." : "null");
          
          const result = await addToCart(
            {
              id: product.id,
              name: product.name,
              imageUrls: product.imageUrls,
              price: Number(product.price)
            },
            1,  // miktar
            undefined, // varyant yok
            sessionId // özel session ID
          );
          console.log("Sonuç:", result);
        } catch (error) {
          logError("ProductCarousel-addToCart-noVariant", error);
          toast({
            title: "Hata",
            description: "Ürün sepete eklenirken bir hata oluştu.",
            variant: "destructive",
          });
        }
      }
    } catch (error) {
      logError("ProductCarousel-handleAddToCart", error);
      toast({
        title: "Hata",
        description: error instanceof Error ? error.message : "Beklenmeyen bir hata oluştu",
        variant: "destructive",
      });
    }
  };
  
  // Favorilere ekleme fonksiyonu 
  const handleToggleFavorite = (productId: number) => {
    toggleFavorite(productId);
  };

  return (
    <div className='my-10 w-full max-w-[1440px] px-6'>
      <Toaster />
      <div className='my-6 grid w-full grid-cols-2'>
        <h3 className='text-2xl font-medium'>{carouselData.title}</h3>
        <div className='flex justify-end'>
          <Button
            variant='link'
            className='p-0 text-foreground hover:no-underline'
          >
            <span className='border-b border-b-primary'>Tümünü Gör</span>
          </Button>
        </div>
      </div>
      
          {loading ? (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-sm text-gray-600">Ürünler yükleniyor...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white text-center py-10 border rounded-xl shadow-sm">
          <div className="max-w-sm mx-auto">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <ShoppingCart className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold mb-2">Ürün Bulunamadı</h3>
            <p className="text-sm text-gray-500 mb-4">Bu kategoride henüz ürün bulunmamaktadır.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 mb-6">
          {products.slice(0, 5).map((product) => (
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
                          console.error("Error in icon Button onClick handler:", err);
                          toast({
                            title: "Hata",
                            description: "İşlem sırasında bir hata oluştu.",
                            variant: "destructive",
                          });
                        }
                      }}
                      disabled={cartLoading || (!product.variants?.length && !product.price)}
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
                    {product.variants && product.variants.length > 0 ? (
                      <span className="font-bold text-sm text-gray-900">
                        {product.variants[0]?.price?.toLocaleString('tr-TR')} TL
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
                      (!product.variants || product.variants.filter(v => v.id !== null && v.id !== undefined).length === 0) && !product.price}
                    onClick={async (e) => {
                      try {
                        e.preventDefault();
                        e.stopPropagation();
                        await handleAddToCart(product);
                      } catch (err) {
                        console.error("Error in Button onClick handler:", err);
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
                    ) : (!product.variants || product.variants.filter(v => v.id !== null && v.id !== undefined).length === 0) && !product.price ? (
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
      )}
    </div>
  )
}
