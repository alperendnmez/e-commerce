import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ProductDetails } from '@/lib/types'
import { Table, TableBody, TableCell, TableRow } from '@/components/ui/table'

interface ProductTabsProps {
  productDetail: ProductDetails
}

function ProductTabs({ productDetail }: ProductTabsProps) {
  return (
    <Tabs defaultValue='description' className="w-full">
      <TabsList className='h-14 w-full border-b bg-background overflow-x-auto flex flex-nowrap'>
        <TabsTrigger
          value='description'
          className='text-lg font-medium tracking-wider text-muted-foreground whitespace-nowrap'
        >
          Ürün Açıklaması
        </TabsTrigger>
        <TabsTrigger
          value='information'
          className='text-lg font-medium tracking-wider text-muted-foreground whitespace-nowrap'
        >
          Teknik Özellikler
        </TabsTrigger>
        <TabsTrigger
          value='shipping'
          className='text-lg font-medium tracking-wider text-muted-foreground whitespace-nowrap'
        >
          Kargo ve Teslimat
        </TabsTrigger>
        <TabsTrigger
          value='reviews'
          className='text-lg font-medium tracking-wider text-muted-foreground whitespace-nowrap'
        >
          Yorumlar
        </TabsTrigger>
      </TabsList>
      
      <TabsContent value='description' className="py-6">
        <div className="prose max-w-none">
          {productDetail.description || 'Bu ürün için henüz detaylı açıklama eklenmemiştir.'}
        </div>
      </TabsContent>
      
      <TabsContent value='information' className="py-6">
        <Table>
          <TableBody>
            <TableRow>
              <TableCell className="font-medium w-1/3">SKU</TableCell>
              <TableCell>{productDetail.sku}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Kategori</TableCell>
              <TableCell>{productDetail.category}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Stok Durumu</TableCell>
              <TableCell>{parseInt(productDetail.stockCount) > 0 ? 'Stokta var' : 'Stokta yok'}</TableCell>
            </TableRow>
            <TableRow>
              <TableCell className="font-medium">Etiketler</TableCell>
              <TableCell>{productDetail.tags}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </TabsContent>
      
      <TabsContent value='shipping' className="py-6">
        <div className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Kargo Bilgisi</h3>
            <p>{productDetail.shipping}</p>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">Teslimat Süresi</h3>
            <p>{productDetail.delivers}</p>
          </div>
          <div>
            <h3 className="text-lg font-medium mb-2">İade Koşulları</h3>
            <p>Satın aldığınız ürünü, teslim tarihinden itibaren 14 gün içerisinde iade edebilirsiniz. İade etmek istediğiniz ürünün kullanılmamış, etiketlerinin sökülmemiş ve orijinal ambalajında olması gerekmektedir.</p>
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value='reviews' className="py-6">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <p className="text-lg text-gray-500 mb-4">Bu ürün için henüz yorum yapılmamış.</p>
          <p className="text-md text-gray-400">İlk yorumu siz yapın!</p>
          
          {/* Giriş yapmış kullanıcılar için yorum formu buraya eklenebilir */}
        </div>
      </TabsContent>
    </Tabs>
  )
}

export default ProductTabs
