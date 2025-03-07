// app/(admin)/products/new/page.tsx

'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent
} from '@/components/ui/accordion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'

type VariantGroup = {
  name: string
  values: string[]
}

export default function NewProductPage() {
  const [step, setStep] = useState<number>(1)

  // Ürünün temel bilgileri
  const [productData, setProductData] = useState<{
    name: string
    description: string
    seoTitle: string
    seoDescription: string
    brandId: string
    categoryId: string
    published: boolean
  }>({
    name: '',
    description: '',
    seoTitle: '',
    seoDescription: '',
    brandId: '',
    categoryId: '',
    published: false
  })

  // Varyant grupları ve değerleri
  const [variantGroups, setVariantGroups] = useState<VariantGroup[]>([])

  // Oluşacak kombinasyonlar
  const combinations: string[][] = generateCombinations(variantGroups)

  // Her kombinasyon için özel fiyat, stok, görsel
  const [variantsData, setVariantsData] = useState<
    Record<string, { price: number; stock: number; images: string[] }>
  >({})

  function generateCombinations(groups: VariantGroup[]): string[][] {
    if (groups.length === 0) return []
    return cartesian(...groups.map(g => g.values))
  }

  // Kartezyen çarpımı fonksiyonu
  function cartesian(...arrays: string[][]): string[][] {
    return arrays.reduce<string[][]>(
      (acc, curr) => {
        const result: string[][] = []
        for (const a of acc) {
          for (const c of curr) {
            result.push([...a, c])
          }
        }
        return result
      },
      [[]]
    )
  }

  return (
    <div className='p-8'>
      {step === 1 && (
        <div className='space-y-4'>
          <h2 className='text-xl font-semibold'>Ürün Bilgileri</h2>
          <Input
            placeholder='Ürün Adı'
            value={productData.name}
            onChange={e =>
              setProductData({ ...productData, name: e.target.value })
            }
          />
          <Input
            placeholder='SEO Title'
            value={productData.seoTitle}
            onChange={e =>
              setProductData({ ...productData, seoTitle: e.target.value })
            }
          />
          <Input
            placeholder='SEO Description'
            value={productData.seoDescription}
            onChange={e =>
              setProductData({ ...productData, seoDescription: e.target.value })
            }
          />
          {/* Marka, Kategori dropdown vs. */}
          <Button onClick={() => setStep(2)}>Varyant Bilgilerine Geç</Button>
        </div>
      )}

      {step === 2 && (
        <div className='space-y-4'>
          <h2 className='text-xl font-semibold'>Varyant Grupları</h2>
          <VariantGroupsForm
            variantGroups={variantGroups}
            setVariantGroups={setVariantGroups}
          />
          <Button onClick={() => setStep(3)} className='mt-4'>
            Kombinasyon Oluştur
          </Button>
        </div>
      )}

      {step === 3 && (
        <div className='space-y-4'>
          <h2 className='text-xl font-semibold'>Varyant Kombinasyonları</h2>
          {combinations.length === 0 && (
            <p>Varyant grupları eklenmedi veya değer girilmedi.</p>
          )}
          {combinations.length > 0 && (
            <Table className='w-full'>
              <TableHeader>
                <TableRow>
                  {variantGroups.map((g, i) => (
                    <TableHead key={i}>{g.name}</TableHead>
                  ))}
                  <TableHead>Fiyat</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead>Görseller</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {combinations.map((combo: string[], i: number) => {
                  const comboKey = combo.join('-')
                  const data = variantsData[comboKey] || {
                    price: 0,
                    stock: 0,
                    images: []
                  }
                  return (
                    <TableRow key={i}>
                      {combo.map((val: string, j: number) => (
                        <TableCell key={j}>{val}</TableCell>
                      ))}
                      <TableCell>
                        <Input
                          type='number'
                          value={data.price}
                          onChange={e =>
                            setVariantsData({
                              ...variantsData,
                              [comboKey]: { ...data, price: +e.target.value }
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type='number'
                          value={data.stock}
                          onChange={e =>
                            setVariantsData({
                              ...variantsData,
                              [comboKey]: { ...data, stock: +e.target.value }
                            })
                          }
                        />
                      </TableCell>
                      <TableCell>
                        {/* Burada bir image uploader component kullanılabilir */}
                        <Button variant='secondary'>Resim Yükle</Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          <Button
            onClick={() => {
              /* Ürünü ve varyantları kaydet logic */
            }}
            className='mt-4'
          >
            Kaydet
          </Button>
        </div>
      )}
    </div>
  )
}

function VariantGroupsForm({
  variantGroups,
  setVariantGroups
}: {
  variantGroups: { name: string; values: string[] }[]
  setVariantGroups: React.Dispatch<
    React.SetStateAction<{ name: string; values: string[] }[]>
  >
}) {
  const [groupName, setGroupName] = useState<string>('')
  const [valueInput, setValueInput] = useState<string>('')

  function addGroup() {
    if (!groupName) return
    setVariantGroups([...variantGroups, { name: groupName, values: [] }])
    setGroupName('')
  }

  function addValueToGroup(index: number) {
    if (!valueInput) return
    const newGroups = [...variantGroups]
    newGroups[index].values.push(valueInput)
    setVariantGroups(newGroups)
    setValueInput('')
  }

  return (
    <div className='space-y-4'>
      <Input
        placeholder='Örn: Renk'
        value={groupName}
        onChange={e => setGroupName(e.target.value)}
      />
      <Button onClick={addGroup}>Grup Ekle</Button>

      {variantGroups.map(
        (group: { name: string; values: string[] }, i: number) => (
          <Accordion
            key={i}
            type='single'
            collapsible
            className='rounded border'
          >
            <AccordionItem value={group.name}>
              <AccordionTrigger>{group.name}</AccordionTrigger>
              <AccordionContent>
                <div className='space-y-2'>
                  <div className='flex items-center gap-2'>
                    <Input
                      placeholder='Değer ekle (Örn: Siyah)'
                      value={valueInput}
                      onChange={e => setValueInput(e.target.value)}
                    />
                    <Button onClick={() => addValueToGroup(i)}>Ekle</Button>
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    {group.values.map((val: string, j: number) => (
                      <span
                        key={j}
                        className='inline-block rounded bg-gray-100 px-2 py-1 text-sm'
                      >
                        {val}
                      </span>
                    ))}
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )
      )}
    </div>
  )
}
