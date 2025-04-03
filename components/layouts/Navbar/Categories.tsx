import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle
} from '@/components/ui/navigation-menu'
import React, { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import axios from '@/lib/axios'

// Define category type
type Category = {
  id: number
  name: string
  slug: string
  description?: string
  parentId?: number
  children: Category[]
  isActive: boolean
  showInHeader: boolean
  showInSidebar: boolean
}

export default function Categories() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openCategoryId, setOpenCategoryId] = useState<number | null>(null)

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setLoading(true)
        const response = await axios.get('/api/public/categories')
        setCategories(response.data.categoryTree)
        setLoading(false)
      } catch (err) {
        console.error('Error fetching categories:', err)
        setError('Kategoriler yüklenirken bir hata oluştu')
        setLoading(false)
      }
    }

    fetchCategories()
  }, [])

  if (loading) {
    return <div className="flex justify-center">Kategoriler yükleniyor...</div>
  }

  if (error) {
    return <div className="text-red-500">{error}</div>
  }

  return (
    <div className='mx-auto'>
      <ul className="flex space-x-1 py-2">
        {categories.filter(category => category.showInHeader || category.showInSidebar).map(category => (
          <li 
            key={category.id} 
            className="relative" 
            onMouseEnter={() => setOpenCategoryId(category.id)} 
            onMouseLeave={() => setOpenCategoryId(null)}
          >
            <Link 
              href={`/kategoriler/${category.slug}`} 
              className={cn(
                "px-4 py-2 text-xs uppercase tracking-wider font-medium rounded-md hover:bg-accent transition-colors inline-block",
                openCategoryId === category.id ? "bg-accent text-accent-foreground" : ""
              )}
            >
              {category.name}
            </Link>
            
            {category.children.length > 0 && openCategoryId === category.id && (
              <div className="absolute left-0 top-full pt-1 w-max z-50">
                <div className="bg-background shadow-lg rounded-md border overflow-hidden p-4">
                  <div className='grid w-[400px] gap-3 md:w-[500px] md:grid-cols-2 lg:w-[600px]'>
                    {category.children.map(subCategory => (
                      <div key={subCategory.id} className="block">
                        <Link 
                          href={`/kategoriler/${subCategory.slug}`} 
                          className="block font-medium text-sm hover:text-primary py-2"
                        >
                          {subCategory.name}
                        </Link>
                        {subCategory.children.length > 0 && (
                          <ul className='py-1 pl-3'>
                            {subCategory.children.map(childCategory => (
                              <li key={childCategory.id}>
                                <Link 
                                  href={`/kategoriler/${childCategory.slug}`} 
                                  className="text-sm hover:underline hover:text-primary"
                                >
                                  {childCategory.name}
                                </Link>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

const ListItem = React.forwardRef<
  React.ElementRef<'a'>,
  React.ComponentPropsWithoutRef<'a'>
>(({ className, title, children, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            'block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground',
            className
          )}
          {...props}
        >
          <div className='text-sm font-medium leading-none'>{title}</div>
          <p className='line-clamp-2 text-sm leading-snug text-muted-foreground'>
            {children}
          </p>
        </a>
      </NavigationMenuLink>
    </li>
  )
})

ListItem.displayName = 'ListItem'
