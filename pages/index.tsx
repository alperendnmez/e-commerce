import MainCarousel from '@/components/MainCarousel'
import FeaturedCategories from '@/components/FeaturedCategories'
import NewArrivals from '@/components/NewArrivals'
import BestSellers from '@/components/BestSellers'
import AllProducts from '@/components/AllProducts'
import MainLayout from '@/components/layouts/MainLayout'
import { NextPageWithLayout } from '@/lib/types'
import { Inter } from 'next/font/google'
import { ReactElement } from 'react'
import CTA from '@/components/CTA'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

const Home: NextPageWithLayout = () => {
  return (
    <>
      <main
        className={`flex flex-col items-center justify-between ${inter.className}`}
      >
        <Toaster />
        <MainCarousel />
        <CTA />
        <BestSellers />
        <FeaturedCategories />
        <NewArrivals />
        <AllProducts />
      </main>
    </>
  )
}

Home.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>
}

export default Home
