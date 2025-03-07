import { Card, CardContent } from '@/components/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi
} from '@/components/ui/carousel'
import { carouselImages } from '@/fakedata/mainSliderImages'
import Autoplay from 'embla-carousel-autoplay'
import React, { useEffect } from 'react'
import { Button } from './ui/button'

export default function MainCarousel() {
  const [api, setApi] = React.useState<CarouselApi>()
  const [current, setCurrent] = React.useState(0)
  const [count, setCount] = React.useState(0)

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

  return (
    <>
      <div className='relative'>
        <Carousel
          setApi={setApi}
          opts={{
            align: 'start',
            loop: true
          }}
          plugins={[Autoplay({ delay: 5000 })]}
          className='w-full overflow-hidden '
        >
          <CarouselContent>
            {carouselImages.map((image, index) => (
              <CarouselItem key={index}>
                <div className=''>
                  <Card className='p-0'>
                    <CardContent
                      className='grid aspect-auto h-[44rem] grid-cols-2 items-center justify-center p-0'
                      style={{
                        backgroundImage: `url(${image.src})`,
                        backgroundPosition: 'bottom',
                        backgroundSize: 'cover'
                      }}
                    >
                      <div className='col-start-2 mr-20 flex flex-col justify-center gap-5'>
                        <div className='flex flex-col gap-1'>
                          <h3 className='mb-3 text-6xl font-bold text-background drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]'>
                            {image.title}
                          </h3>
                          <p className='pl-1 text-xl font-medium  text-background drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]'>
                            {image.description}
                          </p>
                        </div>
                        <Button variant='default' className='w-max px-24 py-6 '>
                          <span className='text-lg uppercase drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]'>
                            İncele
                          </span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious variant='ghost' className='left-5' />
          <CarouselNext variant='ghost' className='right-5' />
        </Carousel>
        <div className='absolute left-1/2 bottom-2 opacity-50 flex -translate-x-1/2 items-center justify-center py-2 text-sm text-muted-foreground'>
          {/* {current} / {count} */}
          {Array.from({ length: count }).map((_, index) => (
            <div
              key={index}
              className={`mx-1 h-2 w-4  ${
                current === index + 1 ? 'h-4 w-8 bg-primary' : 'bg-foreground/50'
              }`}
            />
          ))}
        </div>
      </div>
    </>
  )
}
