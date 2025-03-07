// pages/dashboard/kategoriler/index.tsx
import React, { ReactElement, useEffect, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import axios from '@/lib/axios'
import { toast } from '@/components/ui/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
import { Trash2, Edit, Plus } from 'lucide-react'
import { slugify } from '@/lib/slugify'
import DashboardLayout from '@/components/layouts/DashboardLayout'

// Shadcn Select bileşenini import ediyoruz
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import AddNewItemButton from '@/components/AddNewItemButton'

const CategorySchema = z.object({
  name: z.string().min(1, 'Kategori adı gerekli'),
  seoTitle: z.string().optional(),
  seoDescription: z.string().optional(),
  parentSlug: z.string().optional()
})

type Category = {
  id: number
  name: string
  slug: string
  description?: string
  parentId?: number
  seoTitle?: string
  seoDescription?: string
  children: Category[]
}

function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [currentCategory, setCurrentCategory] = useState<Category | null>(null)

  const fetchCategories = async () => {
    setLoading(true)
    try {
      const response = await axios.get('/api/categories')
      setCategories(response.data)
    } catch (err: any) {
      setError(err.response?.data?.error || 'Kategoriler alınırken hata oluştu')
      toast({
        title: 'Hata!',
        description: error || 'Kategoriler alınırken hata oluştu'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCategories()
  }, [])

  // Ekleme formu için react-hook-form
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors }
  } = useForm<z.infer<typeof CategorySchema>>({
    resolver: zodResolver(CategorySchema)
  })

  const onSubmit = async (data: z.infer<typeof CategorySchema>) => {
    try {
      const processedData = {
        ...data,
        slug: slugify(data.name)
      }
      await axios.post('/api/categories', processedData)
      toast({ title: 'Başarılı', description: 'Kategori başarıyla eklendi.' })
      reset()
      fetchCategories()
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        'Kategori eklenirken bilinmeyen bir hata oluştu.'
      toast({ title: 'Hata!', description: errorMessage })
    }
  }

  // Güncelleme formu için react-hook-form
  const {
    register: registerUpdate,
    handleSubmit: handleSubmitUpdate,
    reset: resetUpdate,
    getValues: getValuesUpdate,
    formState: { errors: errorsUpdate }
  } = useForm<z.infer<typeof CategorySchema>>({
    resolver: zodResolver(CategorySchema)
  })

  const onUpdateSubmit = async (data: z.infer<typeof CategorySchema>) => {
    if (!currentCategory) return

    try {
      const processedData = {
        ...data,
        slug: slugify(data.name)
      }
      await axios.put(`/api/categories/${currentCategory.slug}`, processedData)
      toast({
        title: 'Başarılı',
        description: 'Kategori başarıyla güncellendi.'
      })
      resetUpdate()
      setCurrentCategory(null)
      fetchCategories()
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        'Kategori güncellenirken bilinmeyen bir hata oluştu.'
      toast({ title: 'Hata!', description: errorMessage })
    }
  }

  const openUpdateDialog = (category: Category) => {
    setCurrentCategory(category)
    resetUpdate({
      name: category.name,
      seoTitle: category.seoTitle || '',
      seoDescription: category.seoDescription || '',
      parentSlug: category.parentId
        ? categories.find(cat => cat.id === category.parentId)?.slug || ''
        : ''
    })
  }

  // Silme fonksiyonu
  const handleDelete = async (slug: string) => {
    if (!confirm('Bu kategoriyi silmek istediğinizden emin misiniz?')) return

    try {
      await axios.delete(`/api/categories/${slug}`)
      toast({ title: 'Başarılı', description: 'Kategori başarıyla silindi.' })
      fetchCategories()
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        'Kategori silinirken bilinmeyen bir hata oluştu.'
      toast({ title: 'Hata!', description: errorMessage })
    }
  }

  return (
    <div className='w-full border p-5'>
      <div className='flex items-center justify-between'>
        <h1 className=' text-2xl font-bold'>Kategoriler</h1>
        <Dialog>
          <AddNewItemButton text='Yeni Kategori Ekle' />
          <DialogContent>
            <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
              <div>
                <label className='block text-sm font-medium'>
                  Kategori Adı
                </label>
                <Input {...register('name')} />
                {errors.name && (
                  <span className='text-sm text-red-500'>
                    {errors.name.message}
                  </span>
                )}
              </div>
              <div>
                <label className='block text-sm font-medium'>
                  Parent Kategori
                </label>
                <Select
                  onValueChange={value => {
                    reset({
                      ...getValues(),
                      parentSlug: value === 'none' ? undefined : value
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Bir kategori seçin' />
                  </SelectTrigger>
                  <SelectContent>
                    {/* "Yok" seçeneği için "none" gibi anlamlı bir değer kullanıyoruz */}
                    <SelectItem value='none'>Yok</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.slug} value={category.slug}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.parentSlug && (
                  <span className='text-sm text-red-500'>
                    {errors.parentSlug.message}
                  </span>
                )}
              </div>

              <div className='flex justify-end'>
                <Button type='submit'>Ekle</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Kategorileri Listeleme */}
      {loading ? (
        <div>Yükleniyor...</div>
      ) : error ? (
        <div className='text-red-500'>{error}</div>
      ) : (
        <Table className='mt-5'>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>İsim</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Parent Slug</TableHead>
              <TableHead className='flex justify-end'>İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map(category => (
              <TableRow key={category.id}>
                <TableCell>{category.id}</TableCell>
                <TableCell>{category.name}</TableCell>
                <TableCell>
                  <Link href={`/kategori/${category.slug}`}>
                    {category.slug}
                  </Link>
                </TableCell>
                <TableCell>
                  {category.parentId
                    ? categories.find(cat => cat.id === category.parentId)
                        ?.slug || '-'
                    : '-'}
                </TableCell>
                <TableCell className='flex justify-end space-x-2'>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={() => openUpdateDialog(category)}
                      >
                        <Edit className='h-4 w-4 text-sky-500' />
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <form
                        onSubmit={handleSubmitUpdate(onUpdateSubmit)}
                        className='space-y-4'
                      >
                        <div>
                          <label className='block text-sm font-medium'>
                            Kategori Adı
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
                            Parent Kategori
                          </label>
                          <Select
                            onValueChange={value => {
                              reset({
                                ...getValues(),
                                parentSlug: value === 'none' ? undefined : value
                              })
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder='Bir kategori seçin' />
                            </SelectTrigger>
                            <SelectContent>
                              {/* "Yok" seçeneği için "none" gibi anlamlı bir değer kullanıyoruz */}
                              <SelectItem value='none'>Yok</SelectItem>
                              {categories.map(category => (
                                <SelectItem
                                  key={category.slug}
                                  value={category.slug}
                                >
                                  {category.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.parentSlug && (
                            <span className='text-sm text-red-500'>
                              {errors.parentSlug.message}
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
                    variant={'outline'}
                    size='sm'
                    onClick={() => handleDelete(category.slug)}
                  >
                    <Trash2 className='h-4 w-4 text-red-500' />
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

CategoriesPage.getLayout = function getLayout(page: ReactElement) {
  return <DashboardLayout>{page}</DashboardLayout>
}

export default CategoriesPage
