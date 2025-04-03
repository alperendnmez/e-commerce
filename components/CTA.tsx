import { useEffect, useState } from 'react'
import axios from 'axios'
import Link from 'next/link'
import { Card, CardContent } from './ui/card'
import { Button } from './ui/button'

interface Brand {
  id: number
  name: string
  slug: string
  description: string | null
  logoUrl: string | null
  bannerUrl: string | null
  isFeatured: boolean
}

export default function CTA() {
  const [featuredBrands, setFeaturedBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchFeaturedBrands = async () => {
      try {
        setLoading(true)
        const response = await axios.get('/api/brands?isFeatured=true')
        
        if (response.data && response.data.length > 0) {
          // Öne çıkan tüm markaları göster
          setFeaturedBrands(response.data)
        }
      } catch (error) {
        console.error('Öne çıkan markalar yüklenirken hata:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchFeaturedBrands()
  }, [])

  // Eğer öne çıkan marka yoksa, hiçbir şey gösterme
  if (featuredBrands.length === 0 && !loading) {
    return null
  }

  // Marka sayısına göre grid sınıfını belirle
  const brandCount = featuredBrands.length;
  
  // Marka sayısına göre grid yapısını belirle
  let gridClass = '';
  let containerHeight = '';
  
  if (brandCount === 1) {
    // Tek marka varsa tam genişlik ve sabit yükseklik
    gridClass = 'grid-cols-1';
    containerHeight = 'h-[14rem] xl:h-[16rem]';
  } else if (brandCount === 2) {
    // İki marka varsa yan yana, sabit yükseklik
    gridClass = 'grid-cols-2';
    containerHeight = 'h-[14rem] xl:h-[16rem]';
  } else if (brandCount === 3) {
    // Üç marka varsa ilk satırda 2, ikinci satırda 1 marka
    gridClass = 'grid-cols-2';
    containerHeight = 'h-[28rem] xl:h-[32rem]';
  } else {
    // Dört veya daha fazla marka varsa 2x2 grid
    gridClass = 'grid-cols-2';
    containerHeight = 'h-[28rem] xl:h-[32rem]';
  }

  return (
    <>
      <div className={`my-5 w-full max-w-[1440px] px-6`}>
        <div className={`grid ${gridClass} ${containerHeight} w-full gap-7`}>
          {featuredBrands.slice(0, 4).map((brand) => (
            <Card key={brand.id} className='rounded-none p-0 !shadow-none !border-none'>
              <CardContent
                className='grid min-h-full grid-cols-2 items-center justify-center p-0 overflow-hidden'
                style={{
                  backgroundImage: `url(${brand.bannerUrl})`,
                  backgroundPosition: 'bottom',
                  backgroundSize: 'cover',
                  width: '100%',
                  height: '100%'
                }}
              >
                <div className='col-start-2 flex flex-col gap-2'>
                  <div className='flex flex-col gap-1'>
                    <h3 className='text-2xl font-bold text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]'>
                      {brand.name}
                    </h3>
                  </div>
                  <Link href={`/markalar/${brand.slug}`}>
                    <Button variant='link' className='hover:no-underline'>
                      <span className='border-b border-b-primary text-base uppercase text-secondary-foreground'>
                        Hemen İncele
                      </span>
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  )
}
