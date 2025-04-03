import MainLayout from '@/components/layouts/MainLayout'
import ProductDescription from '@/components/productDetail/ProductDescription'
import ProductSlider from '@/components/productDetail/ProductSlider'
import Head from 'next/head'
import React, { ReactElement } from 'react'
import ProductTabs from '@/components/productDetail/ProductTabs'
import RelatedProducts from '@/components/productDetail/RelatedProducts'
import { GetServerSideProps } from 'next'
import { ProductDetails } from '@/lib/types'
import { Toaster } from '@/components/ui/toaster'

interface ProductDetailProps {
  productDetail: ProductDetails;
}

function ProductDetail({ productDetail }: ProductDetailProps) {
  // SEO için başlık ve açıklama
  const pageTitle = `${productDetail.title} - E-Ticaret`
  const pageDescription = productDetail.description.length > 160 
    ? productDetail.description.slice(0, 157) + '...' 
    : productDetail.description

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={productDetail.images.src1} />
        <meta property="og:type" content="product" />
        <meta name="keywords" content={`${productDetail.title}, ${productDetail.category}, e-ticaret, online alışveriş`} />
      </Head>
      <Toaster />
      <main className='relative mx-auto max-w-7xl px-4 py-8'>
        <div className='mb-10 grid w-full grid-cols-1 gap-10 md:grid-cols-2'>
          <div className='w-full'>
            <ProductSlider productDetail={productDetail} />
          </div>
          <div className='w-full'>
            <ProductDescription productDetail={productDetail} />
          </div>
        </div>
        <div className="my-10">
          <ProductTabs productDetail={productDetail} />
        </div>
        <div className="mt-16">
          <RelatedProducts productId={productDetail.id} />
        </div>
      </main>
    </>
  )
}

ProductDetail.getLayout = function getLayout(page: ReactElement) {
  return <MainLayout>{page}</MainLayout>
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { productSlug } = context.params || {};
  
  if (!productSlug) {
    return {
      notFound: true,
    };
  }

  try {
    // API'den ürün detaylarını getir - slug klasörü içindeki endpoint'i kullan
    const apiUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/products/slug/${productSlug}`;
    const response = await fetch(apiUrl);
    
    if (!response.ok) {
      return {
        notFound: true,
      };
    }

    const productData = await response.json();

    // ProductDetails formatına dönüştür
    const productDetail: ProductDetails = {
      id: productData.id,
      title: productData.name,
      priceRange: productData.price ? `${productData.price.toFixed(2)} TL` : 'Fiyat bilgisi yok',
      description: productData.description || '',
      rating: '4.5',  // Varsayılan değer
      totalRating: '120',  // Varsayılan değer
      stockCount: productData.stock?.toString() || '0',
      shipping: 'Ücretsiz Kargo',  // Varsayılan değer
      delivers: '1-3 iş günü',  // Varsayılan değer
      sku: productData.sku || '',
      category: productData.category?.name || '',
      tags: productData.tags || '',
      images: {
        src1: productData.images?.[0] || '/placeholder.jpg',
        src2: productData.images?.[1] || '/placeholder.jpg',
        src3: productData.images?.[2] || '/placeholder.jpg',
        src4: productData.images?.[3] || '/placeholder.jpg',
      },
      variants: productData.variants || [],
      variantGroups: productData.variantGroups || [],
      originalData: productData,  // Orijinal veriyi ekle
    };

    return {
      props: {
        productDetail,
      },
    };
  } catch (error) {
    console.error('Ürün detayı alınırken hata:', error);
    return {
      notFound: true,
    };
  }
};

export default ProductDetail
