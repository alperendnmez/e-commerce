import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Instagram } from 'lucide-react'
import Link from 'next/link'

export default function Footer() {
  return (
    <section className='flex flex-col bg-foreground text-muted-foreground'>
      <div className='grid grid-cols-1 px-4 pb-10 pt-20 max-lg:gap-10 sm:grid-cols-2 lg:grid-cols-10'>
        <div className='col-span-1 col-start-auto flex flex-col gap-8 px-0 lg:col-span-2 lg:col-end-3 lg:px-4'>
          <Link
            href='/'
            className='flex flex-1 items-center text-3xl font-bold text-background'
          >
            Furnico
          </Link>
          <p className='font-medium'>
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Qui impedit
            autem animi pariatur
          </p>
          <p className='font-medium'>+90 555 5555</p>
          <div className='mt-2 flex gap-3'>
            <Link
              href='/'
              className='rounded-full border border-muted-foreground p-[10px]'
            >
              <Instagram strokeWidth={1.5} size={15} absoluteStrokeWidth />
            </Link>
            <Link
              href='/'
              className='rounded-full border border-muted-foreground p-[10px]'
            >
              <Instagram strokeWidth={1.5} size={15} absoluteStrokeWidth />
            </Link>
            <Link
              href='/'
              className='rounded-full border border-muted-foreground p-[10px]'
            >
              <Instagram strokeWidth={1.5} size={15} absoluteStrokeWidth />
            </Link>
            <Link
              href='/'
              className='rounded-full border border-muted-foreground p-[10px]'
            >
              <Instagram strokeWidth={1.5} size={15} absoluteStrokeWidth />
            </Link>
          </div>
        </div>
        <div className='col-span-1 col-start-auto flex flex-col gap-8 font-medium lg:col-span-2 lg:col-start-4'>
          <h3 className='uppercase text-background'>Hakkımızda</h3>
          <ul className='space-y-1'>
            <li>Gizlilik Politikası</li>
            <li>Kullanım Koşulları</li>
            <li>Neden Furnico</li>
            <li>Haber Bülteni</li>
          </ul>
        </div>
        <div className='col-span-1 col-start-auto flex flex-col gap-8 font-medium lg:col-span-2 lg:col-start-6'>
          <h3 className='uppercase text-background'>Alışveriş</h3>
          <ul className='space-y-1'>
            <li>Hediye Kartları</li>
            <li>İade Politikası</li>
            <li>Mobilya Montajı</li>
            <li>Kargo Seçenekleri</li>
          </ul>
        </div>
        <div className='col-span-1 col-start-auto flex flex-col gap-8 px-0 lg:col-span-2 lg:col-start-9 lg:px-4'>
          <h3 className='flex items-center text-xl font-bold text-background'>
            Haber Bültenimiz
          </h3>
          <p className='text-xs font-medium'>
            En son haberleri almak için bültenimize abone olun!
          </p>
          <Input placeholder='Email...' />
        </div>
      </div>
      <Separator />
      <div className='py-5 text-center'>
        Copyright © 2024. Tüm Hakları Saklıdır
      </div>
    </section>
  )
}
