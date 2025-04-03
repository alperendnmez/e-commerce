import type { ReactElement, ReactNode } from 'react'
import type { NextPage } from 'next'

export type NextPageWithLayout<P = {}, IP = P> = NextPage<P, IP> & {
  getLayout?: (page: ReactElement) => ReactNode
}

export type MainLayoutProps = {
  children: React.ReactNode
}

export interface Product {
  title: string
  price: string
  discountedPrice?: string
  discountPrecent?: string
  isHot: boolean
  img: {
    src: string
  }
  slug: string
  imageUrls: string[]
}

export interface CarouselData {
  title: string
  href: string
  products: Product[]
}
export interface ProductDetails {
  id?: number
  title: string
  priceRange: string
  description: string
  rating: string
  totalRating: string
  stockCount: string
  shipping: string
  delivers: string
  sku: string
  category: string
  tags: string
  images: {
    src1: string
    src2: string
    src3: string
    src4: string
  }
  variants?: any[]
  variantGroups?: {
    id: number
    name: string
    values: {
      id: number
      value: string
    }[]
  }[]
  originalData?: {
    id: number
    name: string
    description: string
    price: number
    stock: number
    sku: string
    categoryId: number
    brandId: number
    category?: {
      id: number
      name: string
      slug: string
    }
    brand?: {
      id: number
      name: string
      slug: string
    }
    [key: string]: any
  }
}
interface ProductRelation {
  title: string
  price: string
  discountedPrice?: string
  discountPrecent?: string
  isHot: boolean
  img: {
    src: string
  }
  slug: string
  id?: number
}

export interface RelatedData {
  title: string
  href: string
  relateds: ProductRelation[]
}
