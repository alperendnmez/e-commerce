import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Heart, Loader2 } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { useFavorites } from '@/hooks/useFavorites'
import { toast } from '@/components/ui/use-toast'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi
} from '@/components/ui/carousel'

// Ürün tipini tanımla
interface Product {
  id: number
  name: string
  description: string | null
  slug: string
  imageUrls: string[]
  price?: number
  brand: {
    name: string
    id: number
  } | null
  variants: {
    id: number
    price: number
    stock: number
  }[]
}

export default function BestSellers() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [api, setApi] = useState<CarouselApi>()
  const [current, setCurrent] = useState(0)
  const [count, setCount] = useState(0)
  const autoPlayIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const { addToCart, isLoading: cartLoading } = useCart()
  const { toggleFavorite, isFavorite, isLoading: favoriteLoading } = useFavorites()

  // En çok satan ürünleri getir
  useEffect(() => {
    const fetchBestSellers = async () => {
      try {
        setLoading(true)
        // En çok satan 10 ürünü getir
        const response = await axios.get('/api/products/bestsellers?limit=10')
        setProducts(response.data)
        setError(null)
      } catch (err) {
        console.error('Çok satan ürünler yüklenirken hata:', err)
        setError('Ürünler yüklenirken bir hata oluştu')
      } finally {
        setLoading(false)
      }
    }

    fetchBestSellers()
  }, [])

  // Carousel API'si değiştiğinde sayfa numaralarını güncelle ve otomatik kaydırma başlat
  useEffect(() => {
    if (!api) {
      return
    }

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap())

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap())
    })

    // Otomatik kaydırma işlemini başlat
    startAutoPlay()

    // Temizleme fonksiyonu
    return () => {
      stopAutoPlay()
    }
  }, [api])

  // Otomatik kaydırma başlatma fonksiyonu
  const startAutoPlay = () => {
    if (autoPlayIntervalRef.current) {
      clearInterval(autoPlayIntervalRef.current)
    }

    autoPlayIntervalRef.current = setInterval(() => {
      if (api) {
        const nextIndex = (current + 1) % count
        api.scrollTo(nextIndex)
      }
    }, 5000) // 5 saniyede bir otomatik kaydır
  }

  // Otomatik kaydırma durdurma fonksiyonu
  const stopAutoPlay = () => {
    if (autoPlayIntervalRef.current) {
      clearInterval(autoPlayIntervalRef.current)
      autoPlayIntervalRef.current = null
    }
  }

  // Kullanıcı etkileşimi durumunda otomatik kaydırmayı durdur ve yeniden başlat
  const handleUserInteraction = () => {
    stopAutoPlay()
    startAutoPlay()
  }

  // Sepete ürün ekleme fonksiyonu
  const handleAddToCart = async (product: Product) => {
    try {
      // Ürünün varyant ve fiyat bilgilerini kontrol et
      if (product.variants?.length > 0) {
        // Öncelikle tüm varyantların ID kontrolü - sadece geçerli sayısal ID'leri seç
        const validVariants = product.variants.filter(v => 
          v && typeof v.id === 'number' && v.id > 0 && v.stock > 0
        )
        
        if (validVariants.length === 0) {
          toast({
            title: "Ürün stokta yok",
            description: "Bu ürün şu anda stokta bulunmamaktadır.",
            variant: "destructive",
          })
          return
        }
        
        // İlk geçerli varyantı seç
        const selectedVariant = validVariants[0]
        if (selectedVariant) {
          await addToCart(product, 1, selectedVariant.id)
          return
        }
      } else if (product.price) {
        // Varyant yoksa, direkt ürünü ekle
        await addToCart(product, 1)
        return
      }
      
      toast({
        title: "Ürün eklenemedi",
        description: "Bu ürün için geçerli bir fiyat veya stok bilgisi bulunamadı.",
        variant: "destructive",
      })
    } catch (error) {
      console.error('Sepete eklerken hata:', error)
      toast({
        title: "Hata",
        description: "Ürün sepete eklenirken bir hata oluştu.",
        variant: "destructive",
      })
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || products.length === 0) {
    return null // Hata varsa veya ürün yoksa bileşeni gösterme
  }

  return (
    <div className="w-full py-8 bg-white">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Çok Satanlar</h2>
        </div>
        
        <div className="relative w-full">
          <Carousel
            setApi={setApi}
            opts={{
              align: 'start',
              loop: true,
              containScroll: 'trimSnaps',
              dragFree: true,
              slidesToScroll: 1
            }}
            className="w-full overflow-hidden"
            onMouseEnter={stopAutoPlay}
            onMouseLeave={startAutoPlay}
            onTouchStart={stopAutoPlay}
            onTouchEnd={startAutoPlay}
          >
            <CarouselContent className="m-0">
              {products.map((product) => (
                <CarouselItem key={product.id} className="md:basis-1/4 sm:basis-1/2 basis-full">
                  <div className="h-full p-1">
                    <div className="group bg-white border border-gray-100 rounded-lg overflow-hidden hover:shadow-md transition-all duration-300 h-full">
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
                                e.preventDefault()
                                e.stopPropagation()
                                toggleFavorite(product.id)
                                handleUserInteraction()
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
                                  e.preventDefault()
                                  e.stopPropagation()
                                  await handleAddToCart(product)
                                  handleUserInteraction()
                                } catch (err) {
                                  console.error("Error in cart button onClick handler:", err)
                                  toast({
                                    title: "Hata",
                                    description: "İşlem sırasında bir hata oluştu.",
                                    variant: "destructive",
                                  })
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
                              e.preventDefault()
                              e.stopPropagation()
                              handleAddToCart(product)
                              handleUserInteraction()
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
                  </div>
                </CarouselItem>
              ))}
            </CarouselContent>
            <CarouselPrevious 
              variant="ghost" 
              className="left-0 sm:left-2 opacity-70 hover:opacity-100 transition-opacity absolute z-10 bg-white/30 hover:bg-white/50 text-gray-800 h-10 w-10 rounded-full" 
              onClick={handleUserInteraction}
            />
            <CarouselNext 
              variant="ghost" 
              className="right-0 sm:right-2 opacity-70 hover:opacity-100 transition-opacity absolute z-10 bg-white/30 hover:bg-white/50 text-gray-800 h-10 w-10 rounded-full" 
              onClick={handleUserInteraction}
            />
          </Carousel>
          
          {/* Sayfa göstergeleri */}
          <div className="flex justify-center mt-4">
            {Array.from({ length: count }).map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  api?.scrollTo(index)
                  handleUserInteraction()
                }}
                className={`mx-1 h-1.5 rounded-full transition-all duration-200 ${
                  current === index ? 'w-6 bg-primary' : 'w-3 bg-gray-300 hover:bg-gray-400'
                }`}
                aria-label={`Sayfa ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
} 