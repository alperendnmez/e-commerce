import { Card, CardContent } from '@/components/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi
} from '@/components/ui/carousel'
import Autoplay from 'embla-carousel-autoplay'
import React, { useEffect, useState } from 'react'
import { Button } from './ui/button'
import Link from 'next/link'
import axios from 'axios'
import { Loader2 } from 'lucide-react'

// Kategori arayüzü
interface Category {
  id: number
  name: string
  slug: string
  description: string | null
  bannerUrl: string | null
  imageUrl: string | null
  mobileBannerUrl: string | null
  isFeatured: boolean
  showInSlider?: boolean
}

export default function MainCarousel() {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [count, setCount] = React.useState(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Öne çıkan kategorileri getir
  useEffect(() => {
    const fetchFeaturedCategories = async () => {
      try {
        setLoading(true)
        const response = await axios.get('/api/categories?showInSlider=true')
        console.log('Slider için kategoriler:', response.data)
        
        // En fazla 3 kategori göster
        const sliderCategories = response.data.slice(0, 3)
        setCategories(sliderCategories)
        setError(null)
      } catch (err) {
        console.error('Slider için kategoriler yüklenirken hata:', err)
        setError('Kategoriler yüklenirken bir hata oluştu')
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedCategories()
  }, [])

  useEffect(() => {
    if (!api) {
      return
    }

    setCount(api.scrollSnapList().length)
    setCurrent(api.selectedScrollSnap() + 1)

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1)
    })
  }, [api])

  // Yükleme durumunda loading göster
  if (loading) {
    return (
      <div className="w-full max-w-[1440px] mx-auto px-6">
        <div className="flex justify-center items-center h-[500px] w-full">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      </div>
    )
  }

  // Eğer hata varsa veya kategori yoksa gösterme
  if (error || categories.length === 0) {
    return null
  }

  return (
    <div className="w-full max-w-[1440px] mx-auto px-6 my-5">
      <div className='relative w-full'>
        <Carousel
          setApi={setApi}
          opts={{
            align: 'start',
            loop: true,
            containScroll: 'trimSnaps'
          }}
          plugins={[Autoplay({ delay: 5000 })]}
          className='w-full overflow-hidden h-[450px] sm:h-[480px] md:h-[500px]'
        >
          <CarouselContent className="w-full m-0 h-full">
            {categories.map((category) => (
              <CarouselItem key={category.id} className="w-full p-0 h-full">
                <div className="relative w-full h-full overflow-hidden rounded-md shadow-md">
                  <img 
                    src={category.bannerUrl || category.imageUrl || 'https://via.placeholder.com/1920x800?text=Kategori+Banner'} 
                    alt={category.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-l from-black/70 via-black/40 to-transparent z-10">
                    <div className="grid h-full grid-cols-5 items-start">
                      <div className="col-span-3"></div>
                      <div className='col-span-2 flex flex-col gap-4 px-4 md:px-8 lg:px-12 pt-12 md:pt-16 lg:pt-20'>
                        <div className='flex flex-col gap-3'>
                          <h3 className='text-2xl md:text-3xl lg:text-4xl font-bold text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]'>
                            {category.name}
                          </h3>
                          {category.description && (
                            <p className='text-white/90 text-sm md:text-base lg:text-lg drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)] line-clamp-3 max-w-md'>
                              {category.description}
                            </p>
                          )}
                        </div>
                        <Link href={`/kategoriler/${category.slug}`} className="w-max">
                          <Button variant='link' className='hover:no-underline p-0'>
                            <span className='border-b border-b-primary text-sm md:text-base uppercase text-secondary-foreground'>
                              Keşfet
                            </span>
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious variant='ghost' className='left-2 sm:left-5 opacity-80 hover:opacity-100 transition-opacity' />
          <CarouselNext variant='ghost' className='right-2 sm:right-5 opacity-80 hover:opacity-100 transition-opacity' />
        </Carousel>
        <div className='absolute left-1/2 bottom-4 opacity-80 flex -translate-x-1/2 items-center justify-center py-1 text-sm text-white'>
          {Array.from({ length: count }).map((_, index) => (
            <div
              key={index}
              className={`mx-1 h-1.5 rounded-full ${
                current === index + 1 ? 'w-6 bg-primary' : 'w-3 bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
