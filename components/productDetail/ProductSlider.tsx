import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel'
import Image from 'next/image'
import { ProductDetails } from '@/lib/types'

function ProductSlider({ productDetail }: { productDetail: ProductDetails }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  const handleThumbnailClick = (index: number) => {
    setCurrentImageIndex(index)
  }

  const images = Object.values(productDetail.images)

  return (
    <div className='flex items-start'>
      <div className='flex flex-col'>
        {images.map((image, index) => (
          <div
            key={index}
            className={`mb-3 cursor-pointer  ${index === currentImageIndex ? 'border border-gray-500 p-2 transition duration-700 ease-in-out' : ''}`}
            onClick={() => handleThumbnailClick(index)}
          >
            <div className="relative w-[129px] h-[156px]">
              <Image 
                src={image} 
                alt={`Ürün Görsel ${index + 1}`} 
                fill
                sizes="129px"
                style={{ objectFit: 'cover' }}
                className="rounded-sm"
                priority={index === 0}
              />
            </div>
          </div>
        ))}
      </div>
      <div className='ml-5'>
        <Carousel className=''>
          <CarouselContent>
            {images.map((image, index) => (
              <CarouselItem
                key={index}
                className={index === currentImageIndex ? '' : 'hidden'}
              >
                <div>
                  <Card className='border-none shadow-none'>
                    <CardContent className='p-0'>
                      <div className="relative w-full h-[600px]">
                        <Image 
                          src={image} 
                          alt={`${productDetail.title} - Görsel ${index + 1}`} 
                          fill
                          sizes="(max-width: 768px) 100vw, 600px"
                          style={{ objectFit: 'contain' }}
                          priority={index === 0}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>
    </div>
  )
}

export default ProductSlider
