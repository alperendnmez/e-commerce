import React from 'react'
import { Star, Truck, Package } from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import Image from 'next/image'
import { ProductDetails } from '@/lib/types'
import ProductQuantityInput from './ProductQuantityInput'
import ProductShare from './ProductShare'

function ProductDescription({
  productDetail
}: {
  productDetail: ProductDetails
}) {
  const [progress, setProgress] = React.useState(13)
  React.useEffect(() => {
    const timer = setTimeout(() => setProgress(66), 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div>
      <div className='mb-5 text-3xl font-semibold text-gray-900'>
        {productDetail.title}
      </div>

      <div className='mb-5 flex items-center gap-1'>
        <Star size={15} />
        <Star size={15} />
        <Star size={15} />
        <Star size={15} />
        <Star size={15} />
        <div className='pl-2 leading-none'>
          {productDetail.rating}
          <span className='text-gray-900/40'>
            {' '}
            ({productDetail.totalRating}){' '}
          </span>
        </div>
      </div>
      <div className='mb-5 flex items-center justify-between border-b pb-8'>
        <span className='text-2xl font-normal text-red-600'>
          {productDetail.priceRange}
        </span>
      </div>
      <div className='mb-5 '>
        <h1 className='text-md tracking-wide text-gray-400'>
          {productDetail.description}
        </h1>
      </div>
      <div className='mb-5'>
        <p className='mb-2'>
          Only{' '}
          <span className='text-red-500'>{productDetail.stockCount} items</span>{' '}
          left in stock!
        </p>
        <Progress value={progress} className='w-[100%]' />
      </div>
      <ProductQuantityInput />
      <div className='mb-5 flex justify-center bg-zinc-100 p-14'>
        <Image
          src={'/fakeImages/productDetail/payments_logo.png'}
          alt={'payments_logo'}
          width={400}
          height={28}
        />
      </div>

      <div className='mb-5'>
        <div className='mb-3 flex'>
          <Truck className='mr-3' />
          <p className='text-base text-muted-foreground'>
            Free worldwide shipping on all orders over {productDetail.shipping}{' '}
          </p>
        </div>
        <div className='flex'>
          <Package className='mr-3' />
          <p className='text-base text-muted-foreground'>
            Delivers in: {productDetail.delivers} Shipping & Return
          </p>
        </div>
      </div>

      <div className='leading-10'>
        <div>
          <span className='text-base text-muted-foreground'> SKU:</span>{' '}
          {productDetail.sku}
        </div>
        <div>
          <span className='text-base text-muted-foreground'> Category: </span>{' '}
          {productDetail.category}
        </div>
        <div>
          <span className='text-base text-muted-foreground'> Tags: </span>{' '}
          {productDetail.tags}
        </div>
        <ProductShare />
      </div>
    </div>
  )
}

export default ProductDescription
