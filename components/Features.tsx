import { features } from '@/fakedata/features'
import { Button } from './ui/button'
import { Card, CardContent } from './ui/card'

export default function Features() {
  return (
    <>
      <div className='my-5 grid h-56 w-full max-w-[1440px] grid-cols-2 gap-7 px-6 xl:h-64 '>
        {features.map((feature, index) => (
          <Card key={index} className='rounded-none p-0 !shadow-none !border-none'>
            <CardContent
              className='grid min-h-full grid-cols-2 items-center justify-center p-0'
              style={{
                backgroundImage: `url(${feature.src})`,
                backgroundPosition: 'bottom',
                backgroundSize: 'cover'
              }}
            >
              <div className='col-start-2 flex flex-col gap-2'>
                <div className='flex flex-col gap-1'>
                  <h3 className='text-2xl font-bold text-white drop-shadow-[0_1.2px_1.2px_rgba(0,0,0,0.8)]'>
                    {feature.title}
                  </h3>
                </div>
                <Button variant='link' className='hover:no-underline'>
                  <span className='border-b border-b-primary text-base uppercase text-secondary-foreground'>
                    Hemen İncele
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </>
  )
}
