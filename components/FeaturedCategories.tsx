import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import Image from 'next/image'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2 } from 'lucide-react'

// Kategori tipini tanımla
interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  bannerUrl: string | null
  imageUrl: string | null
  isFeatured: boolean
}

export default function FeaturedCategories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Öne çıkarılan kategorileri getir
  useEffect(() => {
    const fetchFeaturedCategories = async () => {
      try {
        setLoading(true)
        const response = await axios.get('/api/categories?isFeatured=true')
        console.log('API response for featured categories:', response.data)
        setCategories(response.data)
        setError(null)
      } catch (err) {
        console.error('Öne çıkarılan kategoriler yüklenirken hata:', err)
        setError('Kategoriler yüklenirken bir hata oluştu')
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedCategories()
  }, [])

  if (loading) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error || categories.length === 0) {
    return null // Hata varsa veya kategori yoksa bileşeni gösterme
  }

  return (
    <div className="w-full py-8 bg-gray-50">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-6 text-center">Popüler Kategoriler</h2>
        
        {categories.length === 0 ? (
          <div className="text-center text-gray-500">
            Öne çıkarılan kategori bulunamadı. Lütfen dashboard'da kategorileri öne çıkar olarak işaretleyin.
          </div>
        ) : (
          <div className="w-full">
            {/* Ana büyük kategori - Sayfayı yatayda tamamen kaplayan */}
            {categories.length > 0 && (
              <div className="w-full h-[400px] overflow-hidden mb-6 shadow-md rounded-none">
                <Link href={`/kategoriler/${categories[0].slug}`}>
                  <div className="relative w-full h-full">
                    {categories[0].bannerUrl ? (
                      <Image
                        src={categories[0].bannerUrl}
                        alt={categories[0].name}
                        fill
                        className="object-cover"
                      />
                    ) : categories[0].imageUrl ? (
                      <Image
                        src={categories[0].imageUrl}
                        alt={categories[0].name}
                        fill
                        className="object-cover"
                      />
                    ) : (
                      <div className="bg-gray-200 h-full w-full flex items-center justify-center">
                        <span className="text-gray-500">Görsel Yok</span>
                      </div>
                    )}
                    
                    <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent flex items-center">
                      <div className="p-12">
                        <h3 className="text-3xl font-bold text-white mb-3">{categories[0].name}</h3>
                        {categories[0].description && (
                          <p className="text-white/80 mb-5 max-w-xl text-lg">{categories[0].description}</p>
                        )}
                        <Button size="lg" className="bg-white text-primary hover:bg-white/90">
                          Keşfet
                        </Button>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            )}
            
            {/* Diğer kategoriler - 3'lü grid */}
            {categories.length > 1 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {categories.slice(1, 4).map((category) => (
                  <Card key={category.id} className="overflow-hidden border border-gray-200 shadow-sm rounded-none">
                    <Link href={`/kategoriler/${category.slug}`}>
                      <CardContent className="p-0 relative h-48">
                        {category.bannerUrl ? (
                          <Image
                            src={category.bannerUrl}
                            alt={category.name}
                            fill
                            className="object-cover"
                          />
                        ) : category.imageUrl ? (
                          <Image
                            src={category.imageUrl}
                            alt={category.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="bg-gray-200 h-full w-full flex items-center justify-center">
                            <span className="text-gray-500">Görsel Yok</span>
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent flex items-center">
                          <div className="p-6">
                            <h3 className="text-xl font-bold text-white mb-2">{category.name}</h3>
                            <Button variant="link" className="p-0 text-white hover:text-white/90">
                              <span className="border-b border-white">Keşfet</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            )}
            
            {/* Son satır - 4'lü grid */}
            {categories.length > 4 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                {categories.slice(4, 8).map((category) => (
                  <Card key={category.id} className="overflow-hidden border border-gray-200 shadow-sm rounded-none">
                    <Link href={`/kategoriler/${category.slug}`}>
                      <CardContent className="p-0 relative h-36">
                        {category.bannerUrl ? (
                          <Image
                            src={category.bannerUrl}
                            alt={category.name}
                            fill
                            className="object-cover"
                          />
                        ) : category.imageUrl ? (
                          <Image
                            src={category.imageUrl}
                            alt={category.name}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="bg-gray-200 h-full w-full flex items-center justify-center">
                            <span className="text-gray-500">Görsel Yok</span>
                          </div>
                        )}
                        
                        <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/40 to-transparent flex items-center">
                          <div className="p-4">
                            <h3 className="text-lg font-bold text-white mb-1">{category.name}</h3>
                            <Button variant="link" className="p-0 text-white hover:text-white/90 text-sm">
                              <span className="border-b border-white">Keşfet</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Link>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
} 