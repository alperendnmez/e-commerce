import React, { useEffect, useState } from 'react'
import axios from '@/lib/axios'
import { toast } from '@/components/ui/use-toast'

const Kategoriler: React.FC = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

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

  if (loading) return <div>Yükleniyor...</div>
  if (error) return <div className='text-red-500'>{error}</div>

  return (
    <div>
      <h1 className='mb-4 text-2xl font-bold'>Kategoriler</h1>
      <ul>
        {categories.map((category: any) => (
          <li key={category.id}>
            <span>{category.name}</span>
            {/* Diğer kategori bilgileri */}
          </li>
        ))}
      </ul>
    </div>
  )
}

export default Kategoriler
