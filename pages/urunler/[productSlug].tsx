import MainLayout from '@/components/layouts/MainLayout'
import ProductDescription from '@/components/productDetail/ProductDescription'
import ProductSlider from '@/components/productDetail/ProductSlider'
import Head from 'next/head'
import React, { ReactElement } from 'react'
import { productDetails } from '@/fakedata/productDetail'
import ProductTabs from '@/components/productDetail/ProductTabs'
import RelatedProducts from '@/components/productDetail/RelatedProducts'
import { relatedproducts } from '@/fakedata/relatedProducts'

function ProductDetail() {
  return (
    <>
      <Head>
        <title>detail title</title>
      </Head>
      <main className='relative m-auto xl:w-[95%] 2xl:w-[75%]'>
        <div className='mb-10 grid w-full grid-cols-1 justify-items-center gap-10 py-10 md:grid-cols-2'>
          <div className=''>
            <ProductSlider productDetail={productDetails} />
          </div>
          <div className='w-[80%]'>
            <ProductDescription productDetail={productDetails} />
          </div>
        </div>
        <div>
          <ProductTabs />
        </div>
        <div>
          <RelatedProducts relatedData={relatedproducts} />
        </div>
      </main>
    </>
  )
}
ProductDetail.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>
}

export default ProductDetail
