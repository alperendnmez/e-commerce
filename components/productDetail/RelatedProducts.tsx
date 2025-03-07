import React from 'react'
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
import { Button } from '../ui/button'
import { Badge } from '../ui/badge'
import { RelatedData } from '@/lib/types'

export default function RelatedProducts({
  relatedData
}: {
  relatedData: RelatedData
}) {
  return (
    <>
      <div className='my-10 grid w-full grid-cols-2'>
        <h3 className='text-3xl font-medium'>{relatedData.title}</h3>
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
          {relatedData.relateds.map((related, index) => (
            <CarouselItem
              key={index}
              className='pl-8 md:basis-1/2 lg:basis-1/4'
            >
              <div className=''>
                <Card className='rounded-none !border-none !shadow-none'>
                  <CardContent
                    className='flex h-[25rem] flex-col justify-between p-0'
                    style={{
                      backgroundImage: `url(${related.img.src})`,
                      backgroundPosition: 'center',
                      backgroundSize: 'cover'
                    }}
                  >
                    <div className='flex justify-between'>
                      <div className='flex flex-col gap-1 pl-3 pt-3'>
                        {related.isHot && (
                          <Badge
                            variant={'outline'}
                            className='w-max bg-background text-sm font-light'
                          >
                            Yeni
                          </Badge>
                        )}
                        {related.discountPrecent && (
                          <Badge
                            variant={'outline'}
                            className='w-max bg-background text-sm font-medium text-destructive'
                          >
                            <span>{related.discountPrecent}%</span>
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
                    {related.title}
                  </p>
                  {related.discountedPrice && related.discountPrecent ? (
                    <div className='flex gap-2 text-lg'>
                      <p className='text-lg text-muted-foreground/70 line-through'>
                        {related.price} ₺
                      </p>
                      <p className='text-lg text-muted-foreground'>
                        {related.discountedPrice} ₺
                      </p>
                    </div>
                  ) : (
                    <p className='text-lg text-muted-foreground'>
                      {related.price} ₺
                    </p>
                  )}
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious variant={'ghost'} className='-left-8' />
        <CarouselNext variant={'ghost'} className='-right-8' />
      </Carousel>
    </>
  )
}
