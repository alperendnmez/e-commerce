import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { User, Package, Heart, MapPin, CreditCard, Star, Settings, LogOut, Ticket, LucideIcon } from 'lucide-react';

interface SidebarProps extends React.HTMLAttributes<HTMLDivElement> {
  isCollapsed?: boolean;
}

interface SidebarItem {
  title: string;
  icon: LucideIcon;
  href: string;
  active: boolean;
}

export function CustomerSidebar({ className, isCollapsed = false }: SidebarProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  if (!session) {
    return null;
  }

  const sidebarItems: SidebarItem[] = [
    {
      title: 'Hesap Bilgilerim',
      icon: User,
      href: '/profile',
      active: router.pathname === '/profile'
    },
    {
      title: 'Siparişlerim',
      icon: Package,
      href: '/profile/orders',
      active: router.pathname === '/profile/orders' || router.pathname.startsWith('/profile/orders/')
    },
    {
      title: 'Favorilerim',
      icon: Heart,
      href: '/profile/favorites',
      active: router.pathname === '/profile/favorites'
    },
    {
      title: 'Adreslerim',
      icon: MapPin,
      href: '/profile/addresses',
      active: router.pathname === '/profile/addresses'
    },
    {
      title: 'Kuponlarım',
      icon: Ticket,
      href: '/profile/coupons',
      active: router.pathname === '/profile/coupons'
    },
    {
      title: 'İade Taleplerim',
      icon: CreditCard,
      href: '/profile/returns',
      active: router.pathname === '/profile/returns'
    },
    {
      title: 'Ürün Değerlendirmelerim',
      icon: Star,
      href: '/profile/reviews',
      active: router.pathname === '/profile/reviews'
    },
    {
      title: 'Hesap Ayarları',
      icon: Settings,
      href: '/profile/settings',
      active: router.pathname === '/profile/settings'
    }
  ];

  return (
    <aside className={cn(
      "pb-12 group/sidebar",
      isCollapsed && "collapsed",
      className
    )}
    data-collapsed={isCollapsed}
    >
      <div className="h-full py-4 space-y-4 flex flex-col">
        <div className="px-4 py-2">
          <div className="flex items-center gap-2 group-[[data-collapsed=true]]:justify-center">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              {session.user?.firstName?.charAt(0) || session.user?.email?.charAt(0) || 'U'}
            </div>
            <div className="group-[[data-collapsed=true]]:hidden">
              <p className="font-medium">{session.user?.firstName} {session.user?.lastName}</p>
              <p className="text-xs text-muted-foreground">{session.user?.email}</p>
            </div>
          </div>
        </div>
        <ScrollArea className="flex-1">
          <div className="px-3">
            <nav className="grid gap-1 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
              {sidebarItems.map((item, index) => (
                <Link
                  key={index}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground",
                    item.active ? "bg-accent text-accent-foreground" : "transparent",
                    isCollapsed && "justify-center"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  <span className={cn(isCollapsed && "hidden")}>{item.title}</span>
                </Link>
              ))}
            </nav>
          </div>
        </ScrollArea>
        <div className="px-3">
          <Button 
            variant="outline" 
            className={cn(
              "w-full", 
              isCollapsed ? "justify-center px-0" : "justify-start"
            )} 
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
            <span className={cn(isCollapsed && "hidden")}>Çıkış Yap</span>
          </Button>
        </div>
      </div>
    </aside>
  );
} 