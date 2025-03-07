// pages/dashboard/markalar/index.tsx
import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import axios from 'axios' // Axios yerine özel axios instance kullanmanız önerilir
import { toast } from '@/components/ui/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Trash2, Edit } from 'lucide-react'
import { slugify } from '@/lib/slugify'

const BrandSchema = z.object({
  name: z.string().min(1, 'Marka adı gerekli'),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional()
})

type Brand = {
  id: number
  name: string
  slug: string
  seoTitle?: string
  seoDescription?: string
  products?: any[] // products alanını opsiyonel yapıyoruz
}

const Markalar: React.FC = () => {
  const [brands, setBrands] = useState<Brand[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const fetchBrands = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/brands')
      setBrands(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Markalar alınırken hata oluştu')
      toast({
        title: 'Hata!',
        description: error || 'Markalar alınırken hata oluştu'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBrands()
  }, [])

  // Form handling
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm<z.infer<typeof BrandSchema>>({
    resolver: zodResolver(BrandSchema)
  })

  const onSubmit = async (data: z.infer<typeof BrandSchema>) => {
    try {
      // Slug'ı otomatik olarak oluştur
      const processedData = {
        ...data,
        slug: slugify(data.name)
      }
      await axios.post('/api/brands', processedData)
      toast({ title: 'Başarılı', description: 'Marka eklendi' })
      reset()
      fetchBrands()
    } catch (err: any) {
      toast({
        title: 'Hata!',
        description: err.response?.data?.error || 'Marka eklenirken hata oluştu'
      })
    }
  }

  // Silme fonksiyonu
  const handleDelete = async (slug: string) => {
    if (!confirm('Bu markayı silmek istediğinizden emin misiniz?')) return

    try {
      await axios.delete(`/api/brands/${slug}`)
      toast({ title: 'Başarılı', description: 'Marka silindi' })
      fetchBrands()
    } catch (err: any) {
      toast({
        title: 'Hata!',
        description: err.response?.data?.error || 'Marka silinirken hata oluştu'
      })
    }
  }

  // Güncelleme işlemi için form
  const {
    register: registerUpdate,
    handleSubmit: handleSubmitUpdate,
    reset: resetUpdate,
    formState: { errors: errorsUpdate }
  } = useForm<z.infer<typeof BrandSchema>>({
    resolver: zodResolver(BrandSchema)
  })

  const [currentBrand, setCurrentBrand] = useState<Brand | null>(null)

  const onUpdateSubmit = async (data: z.infer<typeof BrandSchema>) => {
    if (!currentBrand) return

    try {
      const processedData = {
        ...data,
        slug: slugify(data.name)
      }
      await axios.put(`/api/brands/${currentBrand.slug}`, processedData)
      toast({ title: 'Başarılı', description: 'Marka güncellendi' })
      resetUpdate()
      setCurrentBrand(null)
      fetchBrands()
    } catch (err: any) {
      toast({
        title: 'Hata!',
        description:
          err.response?.data?.error || 'Marka güncellenirken hata oluştu'
      })
    }
  }

  const openUpdateDialog = (brand: Brand) => {
    setCurrentBrand(brand)
    resetUpdate({
      name: brand.name,
      // slug alanını resetlemiyoruz çünkü otomatik olarak oluşturulacak
      seoTitle: brand.seoTitle || '',
      seoDescription: brand.seoDescription || ''
    })
  }

  return (
    <div>
      <h1 className='mb-4 text-2xl font-bold'>Markalar</h1>
      <Dialog>
        <DialogTrigger asChild>
          <Button className='mb-4'>Yeni Marka Ekle</Button>
        </DialogTrigger>
        <DialogContent>
          <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
            <div>
              <label className='block text-sm font-medium'>Marka Adı</label>
              <Input {...register('name')} />
              {errors.name && (
                <span className='text-sm text-red-500'>
                  {errors.name.message}
                </span>
              )}
            </div>
            <div>
              <label className='block text-sm font-medium'>SEO Başlık</label>
              <Input {...register('seoTitle')} />
              {errors.seoTitle && (
                <span className='text-sm text-red-500'>
                  {errors.seoTitle.message}
                </span>
              )}
            </div>
            <div>
              <label className='block text-sm font-medium'>SEO Açıklama</label>
              <Input {...register('seoDescription')} />
              {errors.seoDescription && (
                <span className='text-sm text-red-500'>
                  {errors.seoDescription.message}
                </span>
              )}
            </div>
            <div className='flex justify-end'>
              <Button type='submit'>Ekle</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Markaları Listeleme */}
      {loading ? (
        <div>Yükleniyor...</div>
      ) : error ? (
        <div className='text-red-500'>{error}</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>İsim</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>SEO Başlık</TableHead>
              <TableHead>SEO Açıklama</TableHead>
              <TableHead>Ürün Sayısı</TableHead>
              <TableHead>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {brands.map(brand => (
              <TableRow key={brand.id}>
                <TableCell>{brand.id}</TableCell>
                <TableCell>{brand.name}</TableCell>
                <TableCell>
                  <Link
                    href={`/marka/${brand.slug}`}
                    target='_blank'
                    className='text-blue-500 underline'
                  >
                    {brand.slug}
                  </Link>
                </TableCell>
                <TableCell>{brand.seoTitle || '-'}</TableCell>
                <TableCell>{brand.seoDescription || '-'}</TableCell>
                <TableCell>{brand.products?.length || 0}</TableCell>{' '}
                {/* Check if products is defined */}
                <TableCell className='flex space-x-2'>
                  {/* Güncelleme ve Silme İşlemleri için Butonlar */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => openUpdateDialog(brand)}
                      >
                        <Edit className='h-4 w-4' />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form
                        onSubmit={handleSubmitUpdate(onUpdateSubmit)}
                        className='space-y-4'
                      >
                        <div>
                          <label className='block text-sm font-medium'>
                            Marka Adı
                          </label>
                          <Input {...registerUpdate('name')} />
                          {errorsUpdate.name && (
                            <span className='text-sm text-red-500'>
                              {errorsUpdate.name.message}
                            </span>
                          )}
                        </div>
                        <div>
                          <label className='block text-sm font-medium'>
                            SEO Başlık
                          </label>
                          <Input {...registerUpdate('seoTitle')} />
                          {errorsUpdate.seoTitle && (
                            <span className='text-sm text-red-500'>
                              {errorsUpdate.seoTitle.message}
                            </span>
                          )}
                        </div>
                        <div>
                          <label className='block text-sm font-medium'>
                            SEO Açıklama
                          </label>
                          <Input {...registerUpdate('seoDescription')} />
                          {errorsUpdate.seoDescription && (
                            <span className='text-sm text-red-500'>
                              {errorsUpdate.seoDescription.message}
                            </span>
                          )}
                        </div>
                        <div className='flex justify-end'>
                          <Button type='submit'>Güncelle</Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant='destructive'
                    size='sm'
                    onClick={() => handleDelete(brand.slug)}
                  >
                    <Trash2 className='h-4 w-4' />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  )
}

export default Markalar
