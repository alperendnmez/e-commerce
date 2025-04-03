import React from 'react'
import { MainLayoutProps } from '@/lib/types'
import { CustomerSidebar } from './CustomerSidebar'
import { SidebarProvider } from '../ui/sidebar'
import MainLayout from './MainLayout'

function CustomerLayout({ children }: MainLayoutProps) {
  return (
    <MainLayout>
      <div className="container mx-auto py-8 px-4">
        <SidebarProvider>
          <div className="flex flex-col md:flex-row gap-6">
            <CustomerSidebar />
            <main className='w-full bg-white rounded-lg border p-6'>
              {children}
            </main>
          </div>
        </SidebarProvider>
      </div>
    </MainLayout>
  )
}

export default CustomerLayout 