import { Card, CardContent } from '@/components/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious
} from '@/components/ui/carousel'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { Eye, Heart } from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { CarouselData } from '@/lib/types'

export default function SecondaryCarousel({
  carouselData
}: {
  carouselData: CarouselData
}) {
  return (
    <>
      <div className='my-10 w-full max-w-[1440px] px-6'>
        <div className='my-10 grid w-full grid-cols-2'>
          <h3 className='text-3xl font-medium'>{carouselData.title}</h3>
          <div className='flex justify-end'>
            <Button
              variant='link'
              className='p-0 text-foreground hover:no-underline'
            >
              <span className='border-b border-b-primary '>Hepsini İncele</span>
            </Button>
          </div>
        </div>
        <Carousel
          opts={{
            align: 'start'
          }}
          className=''
        >
          <CarouselContent className='-ml-8'>
            {carouselData.products.map((product, index) => (
              <CarouselItem
                key={index}
                className='pl-8 md:basis-1/2 lg:basis-1/4'
              >
                <div className=''>
                  <Card className='rounded-none !border-none !shadow-none'>
                    <CardContent
                      className='flex h-[25rem] flex-col justify-between p-0'
                      style={{
                        backgroundImage: `url(${product.img.src})`,
                        backgroundPosition: 'center',
                        backgroundSize: 'cover'
                      }}
                    >
                      <div className='flex justify-between'>
                        <div className='flex flex-col gap-1 pl-3 pt-3'>
                          {product.isHot && (
                            <Badge
                              variant={'outline'}
                              className='w-max bg-background text-sm font-light'
                            >
                              Yeni
                            </Badge>
                          )}
                          {product.discountPrecent && (
                            <Badge
                              variant={'outline'}
                              className='w-max bg-background text-sm font-medium text-destructive'
                            >
                              <span>{product.discountPrecent}%</span>
                            </Badge>
                          )}
                        </div>
                        <div className='flex flex-col gap-2 pr-3 pt-3'>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Heart
                                  size={21}
                                  strokeWidth={1.5}
                                  className='cursor-pointer hover:text-primary'
                                />
                              </TooltipTrigger>
                              <TooltipContent side='left' className=''>
                                <p>İstek listesine ekle</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Eye
                                  size={22}
                                  strokeWidth={1.5}
                                  className='cursor-pointer hover:text-primary'
                                />
                              </TooltipTrigger>
                              <TooltipContent side='left' className=''>
                                <p>Detay</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </div>
                      </div>
                      <Button className='mx-3 mb-3 bg-background py-6 text-foreground  !shadow-none hover:text-primary-foreground'>
                        Sepete Ekle
                      </Button>
                    </CardContent>
                  </Card>
                  <div className='flex flex-col gap-1 py-2'>
                    <p className='font-semibold text-foreground'>
                      {product.title}
                    </p>
                    {product.discountedPrice && product.discountPrecent ? (
                      <div className='flex gap-2 text-lg'>
                        <p className='text-lg text-muted-foreground/70 line-through'>
                          {product.price} ₺
                        </p>
                        <p className='text-lg text-muted-foreground'>
                          {product.discountedPrice} ₺
                        </p>
                      </div>
                    ) : (
                      <p className='text-lg text-muted-foreground'>
                        {product.price} ₺
                      </p>
                    )}
                  </div>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious variant={'ghost'} className='left-1' />
          <CarouselNext variant={'ghost'} className='right-1' />
        </Carousel>
      </div>
    </>
  )
}
