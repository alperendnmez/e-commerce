import img from '../public/fakeImages/cta.jpg'
import { Button } from './ui/button'

export default function CTA() {
  return (
    <section
      className='w-full max-lg:!bg-none'
      style={{
        backgroundImage: `url(${img.src})`,
        backgroundPosition: 'center center',
        backgroundSize: 'cover'
      }}
    >
      <div className='mx-auto flex max-w-[1440px] flex-col justify-start gap-10 pb-36 pl-10 pt-56 xl:pl-28'>
        <h3 className='text-4xl font-semibold'>Puff Takımı</h3>
        <div className='max-w-xs text-sm font-medium leading-loose text-muted-foreground xl:max-w-sm'>
          Lorem ipsum dolor sit amet consectetur adipisicing elit. Iusto
          temporibus quos rem. Sequi ullam iusto illum perspiciatis adipisci
          consequatur nulla nesciunt nihil ad aliquam, ratione dolores, iure qui
          corporis eius.
        </div>
        <Button
          variant={'outline'}
          className='w-max border-foreground px-6 py-6 text-base font-normal hover:border-primary hover:bg-primary hover:text-background'
        >
          Alışverişe Başla
        </Button>
      </div>
    </section>
  )
}
