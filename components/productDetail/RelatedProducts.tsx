import React, { useEffect, useState } from 'react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { RelatedData } from '@/lib/types'
import Link from 'next/link'
import axios from 'axios'
import { toast } from 'react-hot-toast'

interface RelatedProductsProps {
  relatedData?: RelatedData;
  productId?: number;
  categoryId?: number;
}

export default function RelatedProducts({ 
  relatedData: initialRelatedData,
  productId,
  categoryId
}: RelatedProductsProps) {
  const [relatedData, setRelatedData] = useState<RelatedData | undefined>(initialRelatedData);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Eğer bağımsız bir istekle ilgili ürünleri fetch etmemiz gerekiyorsa
    if ((productId || categoryId) && !initialRelatedData) {
      fetchRelatedProducts();
    }
  }, [productId, categoryId, initialRelatedData]);
  
  const fetchRelatedProducts = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (productId) params.append('productId', productId.toString());
      if (categoryId) params.append('categoryId', categoryId.toString());
      
      const response = await axios.get(`/api/products/related?${params.toString()}`);
      setRelatedData(response.data);
    } catch (error) {
      console.error('İlgili ürünler alınırken hata:', error);
    } finally {
      setLoading(false);
    }
  };
  
  // Favorilere ekle
  const addToFavorites = (productId: number | undefined) => {
    toast.success('Ürün favorilere eklendi');
  };
  
  if (loading) {
    return <div className="text-center py-10">Benzer ürünler yükleniyor...</div>;
  }
  
  if (!relatedData || !relatedData.relateds || relatedData.relateds.length === 0) {
    return null; // İlgili ürün yoksa bileşeni gösterme
  }

  return (
    <div className='my-10 w-full px-6'>
      <h3 className='text-2xl font-medium mb-6'>{relatedData.title}</h3>
      <Carousel
        opts={{
          align: 'start'
        }}
      >
        <CarouselContent className='-ml-4'>
          {relatedData.relateds.map((product) => (
            <CarouselItem
              key={product.id}
              className='pl-4 md:basis-1/2 lg:basis-1/4'
            >
              <div>
                <Card className='rounded-md shadow-sm border-gray-100'>
                  <Link href={`/urunler/${product.slug}`}>
                    <CardContent
                      className='flex h-[240px] flex-col justify-between p-0 relative'
                      style={{
                        backgroundImage: `url(${product.img?.src || '/default-image.jpg'})`,
                        backgroundPosition: 'center',
                        backgroundSize: 'cover'
                      }}
                    >
                      <div className='absolute top-2 right-2'>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="bg-white/80 rounded-full" onClick={(e) => {
                                e.preventDefault();
                                addToFavorites(product.id);
                              }}>
                                <Heart
                                  size={18}
                                  className='text-gray-700 hover:text-red-500'
                                />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side='left'>
                              <p>Favorilere Ekle</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      
                      {product.discountPrecent && (
                        <div className='absolute top-2 left-2'>
                          <Badge variant="destructive" className='rounded-md'>
                            {product.discountPrecent}% İndirim
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Link>
                  <div className='p-3'>
                    <Link href={`/urunler/${product.slug}`} className="hover:text-primary">
                      <h4 className='font-medium text-gray-800 line-clamp-1 mb-1'>
                        {product.title}
                      </h4>
                    </Link>
                    <div className='flex gap-2 items-center mb-2'>
                      {product.discountedPrice ? (
                        <>
                          <span className='text-sm text-gray-400 line-through'>
                            {product.price}
                          </span>
                          <span className='text-base font-medium text-red-600'>
                            {product.discountedPrice}
                          </span>
                        </>
                      ) : (
                        <span className='text-base font-medium text-gray-800'>
                          {product.price}
                        </span>
                      )}
                    </div>
                    <Link href={`/urunler/${product.slug}`}>
                      <Button variant="outline" className="w-full">
                        İncele
                      </Button>
                    </Link>
                  </div>
                </Card>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        <CarouselPrevious className='left-0 border border-gray-200' />
        <CarouselNext className='right-0 border border-gray-200' />
      </Carousel>
    </div>
  )
}
