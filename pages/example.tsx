import React, { useState } from 'react'
import Image from 'next/image'

// Fake data to simulate backend
const fakeData = {
  product: {
    name: 'T-Shirt',
    description: 'Yüksek kaliteli t-shirt.',
    variants: [
      {
        group: 'Renk',
        values: [
          { id: 1, value: 'Siyah' },
          { id: 2, value: 'Beyaz' }
        ]
      },
      {
        group: 'Beden',
        values: [
          { id: 3, value: 'Small' },
          { id: 4, value: 'Medium' },
          { id: 5, value: 'Large' }
        ]
      }
    ],
    combinations: [
      {
        id: 1,
        variantValues: [1, 3], // Siyah + Small
        stock: 10,
        price: 100,
        imageUrls: ['https://picsum.photos/id/237/200/300']
      },
      {
        id: 2,
        variantValues: [1, 4], // Siyah + Medium
        stock: 15,
        price: 110,
        imageUrls: ['https://picsum.photos/id/238/200/300']
      },
      {
        id: 3,
        variantValues: [2, 5], // Beyaz + Large
        stock: 5,
        price: 120,
        imageUrls: ['https://picsum.photos/id/239/200/300']
      }
    ]
  }
}

const ExamplePage = () => {
  const [selectedColor, setSelectedColor] = useState<number | null>(null)
  const [selectedSize, setSelectedSize] = useState<number | null>(null)
  const [currentCombination, setCurrentCombination] = useState<any | null>(null)

  // Handle combination change based on selected values
  const handleCombinationChange = () => {
    if (selectedColor && selectedSize) {
      const combination = fakeData.product.combinations.find(
        combo =>
          combo.variantValues.includes(selectedColor) &&
          combo.variantValues.includes(selectedSize)
      )
      setCurrentCombination(combination || null)
    }
  }

  return (
    <div className='p-5'>
      <h1 className='mb-4 text-2xl font-bold'>{fakeData.product.name}</h1>
      <p className='mb-4 text-gray-700'>{fakeData.product.description}</p>

      <div className='mb-4'>
        <label className='block text-sm font-medium'>Renk</label>
        <select
          className='w-full rounded border p-2'
          onChange={e => {
            setSelectedColor(Number(e.target.value))
            setCurrentCombination(null) // Reset current combination
          }}
          value={selectedColor || ''}
        >
          <option value=''>Renk Seçin</option>
          {fakeData.product.variants
            .find(v => v.group === 'Renk')
            ?.values.map(color => (
              <option key={color.id} value={color.id}>
                {color.value}
              </option>
            ))}
        </select>
      </div>

      <div className='mb-4'>
        <label className='block text-sm font-medium'>Beden</label>
        <select
          className='w-full rounded border p-2'
          onChange={e => {
            setSelectedSize(Number(e.target.value))
            setCurrentCombination(null) // Reset current combination
          }}
          value={selectedSize || ''}
        >
          <option value=''>Beden Seçin</option>
          {fakeData.product.variants
            .find(v => v.group === 'Beden')
            ?.values.map(size => (
              <option key={size.id} value={size.id}>
                {size.value}
              </option>
            ))}
        </select>
      </div>

      <button
        className='rounded bg-blue-500 px-4 py-2 text-white'
        onClick={handleCombinationChange}
        disabled={!selectedColor || !selectedSize}
      >
        Kombinasyonu Kontrol Et
      </button>

      {currentCombination ? (
        <div className='mt-5 rounded border p-4'>
          <h2 className='mb-2 text-lg font-bold'>Seçilen Kombinasyon</h2>
          <p>Stok: {currentCombination.stock}</p>
          <p>Fiyat: {currentCombination.price} TL</p>
          <div className='mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2'>
            {currentCombination.imageUrls.map((url: string, idx: number) => (
              <Image
                key={idx}
                src={url}
                alt={`Combination Image ${idx}`}
                width={200}
                height={300}
                className='h-40 w-40 rounded object-cover shadow'
              />
            ))}
          </div>
        </div>
      ) : (
        selectedColor &&
        selectedSize && (
          <p className='mt-5 text-red-500'>Bu kombinasyon mevcut değil.</p>
        )
      )}
    </div>
  )
}

export default ExamplePage
