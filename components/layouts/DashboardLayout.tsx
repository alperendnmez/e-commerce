import React from 'react'

import { MainLayoutProps } from '@/lib/types'
import { DashboardSidebar } from './Sidebar'
import { SidebarProvider, SidebarTrigger } from '../ui/sidebar'

function DashboardLayout({ children }: MainLayoutProps) {
  return (
    <>
      <SidebarProvider>
        <DashboardSidebar />
        <main className='w-full '>
          <div className='w-full border-b px-5 py-3'>
            <SidebarTrigger className='' />
          </div>
          <section className='p-5'>{children}</section>
        </main>
      </SidebarProvider>
    </>
  )
}

export default DashboardLayout
