import React, { useState, useEffect } from 'react'
import { useCompare } from '@/context/CompareContext'
import { Button } from '@/components/ui/button'
import { X, ArrowLeft } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { toast } from '@/components/ui/use-toast'
import { Badge } from '@/components/ui/badge'
import axios from 'axios'
import { CompareItem } from '@/types/compare'

const KarsilastirPage: React.FC = () => {
  const { compareItems, removeFromCompare, clearCompare } = useCompare()
  const [categories, setCategories] = useState<{[key: string]: any}>({})
  const [products, setProducts] = useState<CompareItem[]>(compareItems)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const categoryPromises = products.map(product => 
          axios.get(`/api/categories/slug/${product.categorySlug}`)
        )
        const categoryResponses = await Promise.all(categoryPromises)
        const categoryData = categoryResponses.reduce((acc, response, index) => {
          acc[products[index].categorySlug] = response.data
          return acc
        }, {} as {[key: string]: any})
        setCategories(categoryData)
      } catch (error) {
        console.error('Kategori bilgileri alınırken hata:', error)
      }
    }

    if (products.length > 0) {
      fetchCategories()
    }
  }, [products])

  const validateComparison = () => {
    const categoryGroups = products.reduce((acc: { [key: string]: any[] }, product) => {
      if (!acc[product.categorySlug]) {
        acc[product.categorySlug] = []
      }
      acc[product.categorySlug].push(product)
      return acc
    }, {})

    for (const [slug, categoryProducts] of Object.entries(categoryGroups)) {
      const category = categories[slug]
      if (category) {
        if (!category.allowProductComparison) {
          toast({
            variant: "destructive",
            title: "Karşılaştırma Yapılamaz",
            description: `${category.name} kategorisinde ürün karşılaştırma özelliği kapalıdır.`
          })
          return false
        }

        if (categoryProducts.length > (category.maxCompareProducts || 4)) {
          toast({
            variant: "destructive",
            title: "Maksimum Limit Aşıldı",
            description: `${category.name} kategorisinde en fazla ${category.maxCompareProducts || 4} ürün karşılaştırabilirsiniz.`
          })
          return false
        }
      }
    }

    return true
  }

  const getCompareAttributes = (categorySlug: string): string[] => {
    const category = categories[categorySlug]
    if (category?.compareAttributes) {
      try {
        return JSON.parse(category.compareAttributes)
      } catch (error) {
        console.error('Karşılaştırma özellikleri ayrıştırılamadı:', error)
      }
    }
    return []
  }

  useEffect(() => {
    if (Object.keys(categories).length > 0) {
      validateComparison()
    }
  }, [categories])

  if (compareItems.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Karşılaştırma Listesi</h1>
          <p className="text-gray-600 mb-6">Henüz karşılaştırma listenizde ürün bulunmuyor.</p>
          <Link href="/kategoriler">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kategorilere Dön
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Ürün Karşılaştırma</h1>
      
      {compareItems.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">Karşılaştırma listeniz boş.</p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/kategoriler">Ürünlere Göz At</Link>
          </Button>
        </div>
      ) : (
        <>
          {Object.entries(
            compareItems.reduce((acc: { [key: string]: any[] }, item) => {
              if (!acc[item.categorySlug]) {
                acc[item.categorySlug] = []
              }
              acc[item.categorySlug].push(item)
              return acc
            }, {})
          ).map(([categorySlug, categoryProducts]) => (
            <div key={categorySlug} className="mb-8">
              <h2 className="text-2xl font-semibold mb-4">
                {categories[categorySlug]?.name || 'Kategori'}
              </h2>
              
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border p-4 bg-gray-50">Özellik</th>
                      {categoryProducts.map((product) => (
                        <th key={product.id} className="border p-4 bg-gray-50">
                          <div className="space-y-2">
                            <div className="relative h-40 w-40 mx-auto">
                              {product.imageUrls?.[0] && (
                                <Image
                                  src={product.imageUrls[0]}
                                  alt={product.name}
                                  fill
                                  className="object-contain"
                                />
                              )}
                            </div>
                            <h3 className="font-medium">{product.name}</h3>
                            <p className="text-2xl font-bold">{product.price} ₺</p>
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => removeFromCompare(product)}
                            >
                              Kaldır
                            </Button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border p-4 font-medium bg-gray-50">Stok Durumu</td>
                      {categoryProducts.map((product) => (
                        <td key={product.id} className="border p-4 text-center">
                          {product.stock > 0 ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              Stokta
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              Tükendi
                            </Badge>
                          )}
                        </td>
                      ))}
                    </tr>
                    
                    {getCompareAttributes(categorySlug).map((attr, index) => (
                      <tr key={index}>
                        <td className="border p-4 font-medium bg-gray-50">{attr}</td>
                        {categoryProducts.map((product) => (
                          <td key={product.id} className="border p-4 text-center">
                            {product.attributes?.[attr] || '-'}
                          </td>
                        ))}
                      </tr>
                    ))}
                    
                    <tr>
                      <td className="border p-4 bg-gray-50"></td>
                      {categoryProducts.map((product) => (
                        <td key={product.id} className="border p-4 text-center">
                          <Button className="w-full" asChild>
                            <Link href={`/urunler/${product.slug}`}>
                              Ürüne Git
                            </Link>
                          </Button>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  )
}

export default KarsilastirPage