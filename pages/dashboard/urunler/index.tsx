import React, { ReactElement, useEffect, useState } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/use-toast'
import axios from '@/lib/axios'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import DashboardLayout from '@/components/layouts/DashboardLayout'
import { Edit, Plus, Trash2 } from 'lucide-react'
import Link from 'next/link'

type Product = {
  id: number
  name: string
  slug: string
  published: boolean
  createdAt: string
}

function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/products')
      setProducts(response.data)
    } catch (err: any) {
      toast({
        title: 'Hata!',
        description: 'Ürünler alınırken hata oluştu.'
      })
    } finally {
      setLoading(false)
    }
  }

  const togglePublish = async (id: number, currentStatus: boolean) => {
    try {
      await axios.put(`/api/products/${id}`, { published: !currentStatus })
      toast({
        title: 'Başarılı!',
        description: `Ürün ${!currentStatus ? 'yayına alındı' : 'yayından kaldırıldı'}.`
      })
      fetchProducts() // Listeyi yeniden yükle
    } catch (err: any) {
      toast({
        title: 'Hata!',
        description: 'Yayın durumu değiştirilirken hata oluştu.'
      })
    }
  }

  const deleteProduct = async (id: number) => {
    if (!confirm('Bu ürünü silmek istediğinizden emin misiniz?')) return

    try {
      await axios.delete(`/api/products/${id}`)
      toast({ title: 'Başarılı!', description: 'Ürün silindi.' })
      fetchProducts() // Listeyi yeniden yükle
    } catch (err: any) {
      toast({
        title: 'Hata!',
        description: 'Ürün silinirken hata oluştu.'
      })
    }
  }

  useEffect(() => {
    fetchProducts()
  }, [])

  return (
    <div className='border p-5'>
      <div className='flex items-center justify-between'>
        <h1 className='mb-4 text-2xl font-bold'>Ürünler</h1>
        <Button asChild>
          <Link href='/dashboard/urunler/yeni-urun-ekle'>
            <Plus className='mr-2' /> Yeni Ürün Ekle
          </Link>
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>ID</TableHead>
            <TableHead>İsim</TableHead>
            <TableHead>Eklenme Tarihi</TableHead>
            <TableHead>Yayında mı?</TableHead>
            <TableHead>İşlemler</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map(product => (
            <TableRow key={product.id}>
              <TableCell>{product.id}</TableCell>
              <TableCell>{product.name}</TableCell>
              <TableCell>
                {new Date(product.createdAt).toLocaleDateString('tr-TR')}
              </TableCell>
              <TableCell>
                <Switch
                  checked={product.published}
                  onCheckedChange={() =>
                    togglePublish(product.id, product.published)
                  }
                />
              </TableCell>
              <TableCell>
                <div className='flex space-x-2'>
                  <Button variant='outline' size='sm' asChild>
                    <Link href={`/dashboard/urunler/${product.slug}`}>
                      <Edit className='h-4 w-4 text-sky-500' />
                    </Link>
                  </Button>
                  <Button
                    variant='destructive'
                    size='sm'
                    onClick={() => deleteProduct(product.id)}
                  >
                    <Trash2 className='h-4 w-4 text-red-500' />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

ProductsPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>
}

export default ProductsPage
