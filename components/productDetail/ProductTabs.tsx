import React from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

function ProductTabs() {
  return (
    <Tabs defaultValue='description'>
      <TabsList className='h-14 w-full border-b bg-background'>
        <TabsTrigger
          value='description'
          className='text-xl font-normal tracking-wider text-muted-foreground'
        >
          Açıklama
        </TabsTrigger>
        <TabsTrigger
          value='information'
          className='text-xl font-normal tracking-wider text-muted-foreground'
        >
          Ek Bilgiler
        </TabsTrigger>
        <TabsTrigger
          value='reviews'
          className='text-xl font-normal tracking-wider text-muted-foreground'
        >
          Yorumlar
        </TabsTrigger>
      </TabsList>
      <TabsContent value='description'>
        Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
        veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea
        commodo consequat. Duis aute irure dolor in reprehenderit in voluptate
        velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint
        occaecat cupidatat non proident, sunt in culpa qui officia deserunt
        mollit anim id est laborum.
      </TabsContent>
      <TabsContent value='information'>Change your password here.</TabsContent>
      <TabsContent value='reviews'>
        1 review for Vintage Fashion Eyewear
      </TabsContent>
    </Tabs>
  )
}

export default ProductTabs
