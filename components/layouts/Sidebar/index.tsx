import {
  Calendar,
  ChevronUp,
  Gem,
  Home,
  Inbox,
  LayoutPanelLeft,
  Package,
  PackageOpen,
  Rows4,
  Search,
  Settings,
  User2
} from 'lucide-react'
import { signOut, useSession } from 'next-auth/react'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem
} from '@/components/ui/sidebar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'

const items = [
  {
    title: 'Dashboard',
    url: '/dashboard',
    icon: LayoutPanelLeft
  },
  {
    title: 'Kategoriler',
    url: '/dashboard/kategoriler',
    icon: Rows4
  },
  {
    title: 'Ürünler',
    url: '/dashboard/urunler',
    icon: Package
  },
  {
    title: 'Siparişler',
    url: '/dashboard/siparisler',
    icon: PackageOpen
  },
  {
    title: 'Markalar',
    url: '/dashboard/markalar',
    icon: Gem
  }
]

export function DashboardSidebar() {
  const { data: session, status } = useSession()

  return (
    <Sidebar collapsible={'icon'}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className='text-black font-extrabold text-xl'>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton>
              <User2 />
              {status === 'authenticated' ? session.user.name : 'Misafir'}
              <ChevronUp className='ml-auto' />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            side='top'
            className='w-[--radix-popper-anchor-width]'
          >
            {status === 'authenticated' ? (
              <>
                <DropdownMenuItem>
                  <span>Profil</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => signOut()}>
                  <span>Çıkış Yap</span>
                </DropdownMenuItem>
              </>
            ) : (
              <DropdownMenuItem>
                <span>Giriş Yap</span>
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
