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
            <Image src={image} alt={''} width={129} height={156} />
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
                    <CardContent className='flex aspect-square items-center justify-center p-0'>
                      <Image src={image} alt={''} width={675} height={837} />
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className='left-5' />
          <CarouselNext className='right-5' />
        </Carousel>
      </div>
    </div>
  )
}

export default ProductSlider
