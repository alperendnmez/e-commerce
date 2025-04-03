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
  User2,
  Ticket,
  Gift,
  FileText,
  BadgePercent,
  BarChart3,
  Users,
  Bell,
  AlertCircle,
  ChevronDown,
  MapPin,
  RotateCcw,
  Star,
  BookOpen,
  BookText,
  Tag
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
import { useState } from 'react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Button } from '@/components/ui/button'

// Ana menü öğeleri
const mainItems = [
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
];

// Kampanyalar ve promosyonlar alt menüsü
const promotionItems = [
  {
    title: 'Kuponlar',
    url: '/dashboard/coupons',
    icon: Ticket
  },
  {
    title: 'Hediye Kartları',
    url: '/dashboard/gift-cards',
    icon: Gift
  },
  {
    title: 'Hediye Kartı İşlemleri',
    url: '/dashboard/gift-cards/transactions',
    icon: FileText
  },
  {
    title: 'Kampanyalar',
    url: '/dashboard/campaigns',
    icon: BadgePercent
  }
];

// Müşteriler ve İçerik alt menüsü
const customersItems = [
  {
    title: 'Müşteriler',
    url: '/dashboard/customers',
    icon: Users
  },
  {
    title: 'Adresler',
    url: '/dashboard/customers/addresses',
    icon: MapPin
  },
  {
    title: 'İade Talepleri',
    url: '/dashboard/customers/returns',
    icon: RotateCcw
  },
  {
    title: 'Ürün Değerlendirmeleri',
    url: '/dashboard/customers/reviews',
    icon: Star
  }
];

// Diğer menü öğeleri
const otherItems = [
  {
    title: 'Raporlar',
    url: '/dashboard/reports',
    icon: BarChart3
  },
  {
    title: 'Bildirimler',
    url: '/dashboard/notifications',
    icon: Bell
  },
  {
    title: 'Sistem Günlükleri',
    url: '/dashboard/admin/system-logs',
    icon: AlertCircle
  }
];

// Blog yönetimi alt menüsü
const blogItems = [
  {
    title: 'Tüm Yazılar',
    url: '/dashboard/blog',
    icon: BookOpen
  },
  {
    title: 'Yeni Yazı',
    url: '/dashboard/blog/new',
    icon: FileText
  },
  {
    title: 'Kategoriler',
    url: '/dashboard/blog/categories',
    icon: Rows4
  },
  {
    title: 'Etiketler',
    url: '/dashboard/blog/tags',
    icon: Tag
  }
];

export function DashboardSidebar() {
  const { data: session, status } = useSession();
  const isAdmin = session?.user?.role === 'ADMIN';
  const [isPromotionOpen, setIsPromotionOpen] = useState(false);
  const [isCustomersOpen, setIsCustomersOpen] = useState(false);
  const [isBlogOpen, setIsBlogOpen] = useState(false);

  // Admin kontrolü
  const filteredOtherItems = isAdmin 
    ? otherItems 
    : otherItems.filter(item => !item.url.includes('/admin/'));

  return (
    <Sidebar collapsible={'icon'}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className='text-black font-extrabold text-xl'>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {/* Ana menü öğeleri */}
              {mainItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              
              {/* Kampanyalar ve Promosyonlar açılır menüsü */}
              <Collapsible 
                open={isPromotionOpen} 
                onOpenChange={setIsPromotionOpen}
                className="w-full"
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between items-center flex py-2 px-3 h-9">
                    <div className="flex items-center">
                      <BadgePercent className="h-4 w-4 mr-2" />
                      <span>Kampanyalar ve Promosyonlar</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isPromotionOpen ? 'transform rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6">
                  {promotionItems.map(item => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </CollapsibleContent>
              </Collapsible>
              
              {/* Blog Yönetimi açılır menüsü */}
              <Collapsible 
                open={isBlogOpen} 
                onOpenChange={setIsBlogOpen}
                className="w-full"
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between items-center flex py-2 px-3 h-9">
                    <div className="flex items-center">
                      <BookOpen className="h-4 w-4 mr-2" />
                      <span>Blog</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isBlogOpen ? 'transform rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6">
                  {blogItems.map(item => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </CollapsibleContent>
              </Collapsible>
              
              {/* Müşteriler ve İçerik açılır menüsü */}
              <Collapsible 
                open={isCustomersOpen} 
                onOpenChange={setIsCustomersOpen}
                className="w-full"
              >
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between items-center flex py-2 px-3 h-9">
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      <span>Müşteriler ve İçerik</span>
                    </div>
                    <ChevronDown className={`h-4 w-4 transition-transform ${isCustomersOpen ? 'transform rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="pl-6">
                  {customersItems.map(item => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <Link href={item.url}>
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </CollapsibleContent>
              </Collapsible>
              
              {/* Diğer menü öğeleri */}
              {filteredOtherItems.map(item => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
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
