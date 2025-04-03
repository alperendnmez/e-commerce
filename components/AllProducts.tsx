import { useState, useEffect, useRef, useCallback } from 'react'
import axios from 'axios'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { ShoppingCart, Heart, Loader2 } from 'lucide-react'
import { useCart } from '@/hooks/useCart'
import { useFavorites } from '@/hooks/useFavorites'
import { toast } from '@/components/ui/use-toast'

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

export default function AllProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const observer = useRef<IntersectionObserver | null>(null)
  const { addToCart, isLoading: cartLoading } = useCart()
  const { toggleFavorite, isFavorite, isLoading: favoriteLoading } = useFavorites()

  // Sayfa sonu gözlemleme referansı - sonsuz kaydırma için
  const lastProductElementRef = useCallback((node: HTMLDivElement | null) => {
    if (loading) return
    if (observer.current) observer.current.disconnect()
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        setPage(prevPage => prevPage + 1)
      }
    }, { threshold: 0.5 }) // Görünürlük eşiği %50'ye düşürüldü (daha erken yüklemeye başla)
    
    if (node) observer.current.observe(node)
  }, [loading, hasMore])

  // Component unmount olduğunda observer'ı temizle
  useEffect(() => {
    return () => {
      if (observer.current) {
        observer.current.disconnect()
      }
    }
  }, [])

  // Ürünleri getir
  const fetchProducts = useCallback(async (pageNumber: number) => {
    try {
      if (pageNumber === 1) {
        setInitialLoading(true)
      }
      setLoading(true)
      
      const params = new URLSearchParams({
        page: pageNumber.toString(),
        limit: '8', // Her sayfada 8 ürün
        published: 'true',
        sortField: 'createdAt',
        sortOrder: 'desc'
      })
      
      const response = await axios.get(`/api/products?${params.toString()}`)
      
      if (response.data && Array.isArray(response.data)) {
        if (response.data.length === 0) {
          // Daha fazla ürün yok
          setHasMore(false)
        } else {
          if (pageNumber === 1) {
            // İlk sayfa ise, ürünleri tamamen değiştir
            setProducts(response.data)
          } else {
            // Yeni ürünleri ekle, ancak tekrarları önle
            setProducts(prevProducts => {
              const existingIds = new Set(prevProducts.map(p => p.id))
              const newProducts = response.data.filter((p: Product) => !existingIds.has(p.id))
              
              if (newProducts.length === 0) {
                setHasMore(false)
              }
              
              return [...prevProducts, ...newProducts]
            })
          }
        }
      } else {
        setHasMore(false)
      }
      
      setError(null)
    } catch (err) {
      console.error('Ürünler yüklenirken hata:', err)
      setError('Ürünler yüklenirken bir hata oluştu')
    } finally {
      setLoading(false)
      setInitialLoading(false)
    }
  }, [])

  // Sayfa değiştiğinde ürünleri getir
  useEffect(() => {
    // Hızlı ardışık istekleri önlemek için küçük bir gecikme ekle
    const timer = setTimeout(() => {
      fetchProducts(page)
    }, 300)
    
    return () => clearTimeout(timer)
  }, [page, fetchProducts])

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

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error && products.length === 0) {
    return (
      <div className="text-center py-8 text-red-500">
        <p>{error}</p>
      </div>
    )
  }

  return (
    <div className="w-full py-8 bg-white">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Tüm Ürünler</h2>
          <p className="text-sm text-gray-500 mt-1">
            {hasMore 
              ? "Daha fazla ürün görmek için aşağı kaydırın" 
              : "Tüm ürünler görüntüleniyor"}
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {products.map((product, index) => {
            // Son ürün elemanına ref ekle
            const isLastItem = products.length === index + 1
            
            return (
              <div 
                key={`${product.id}-${index}`} 
                ref={isLastItem ? lastProductElementRef : null}
                className="h-full"
              >
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
                        disabled={cartLoading || 
                          (product.variants?.filter(v => v.id !== null && v.id !== undefined).length === 0 && !product.price)}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleAddToCart(product)
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
            )
          })}
        </div>
        
        {/* Yükleme durumu */}
        {loading && !initialLoading && (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
        
        {/* Daha fazla ürün yoksa */}
        {!hasMore && !loading && products.length > 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>Tüm ürünler görüntülendi</p>
          </div>
        )}
      </div>
    </div>
  )
} 