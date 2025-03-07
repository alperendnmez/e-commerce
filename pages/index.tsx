import Features from '@/components/Features'
import MainCarousel from '@/components/MainCarousel'
import ProductCarousel from '@/components/ProductCarousel'
import MainLayout from '@/components/layouts/MainLayout'
import { NextPageWithLayout } from '@/lib/types'
import { Inter } from 'next/font/google'
import { ReactElement } from 'react'
import { bestsellers } from '@/fakedata/bestsellers'
import { featuredProducts } from '@/fakedata/featuredProducts'
import CTA from '@/components/CTA'
import { newArrive } from '@/fakedata/newarrive'

const inter = Inter({ subsets: ['latin'] })

const Home: NextPageWithLayout = () => {
  return (
    <>
      <main
        className={`flex flex-col items-center justify-between ${inter.className}`}
      >
        <MainCarousel />
        <Features />
        <ProductCarousel carouselData={bestsellers} />
        <CTA />
        <ProductCarousel carouselData={featuredProducts} />
        <ProductCarousel carouselData={newArrive} />
      </main>
    </>
  )
}

Home.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>
}

export default Home
