import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Package, FolderTree, Briefcase, ShoppingCart, Ticket, Gift, BadgePercent, BarChart3, Users, Bell, AlertCircle, FileText, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface SidebarNavProps {
  className?: string;
}

export const SidebarNav = ({ className }: SidebarNavProps) => {
  const pathname = usePathname();

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: <LayoutDashboard className="h-4 w-4" />,
      items: [],
    },
    {
      title: "Ürünler",
      href: "/dashboard/urunler",
      icon: <Package className="h-4 w-4" />,
      items: [],
    },
    {
      title: "Kategoriler",
      href: "/dashboard/kategoriler",
      icon: <FolderTree className="h-4 w-4" />,
      items: [],
    },
    {
      title: "Markalar",
      href: "/dashboard/markalar",
      icon: <Briefcase className="h-4 w-4" />,
      items: [],
    },
    {
      title: "Blog",
      href: "/dashboard/blog",
      icon: <BookOpen className="h-4 w-4" />,
      items: [],
    },
    {
      title: "Siparişler",
      href: "/dashboard/siparisler",
      icon: <ShoppingCart className="h-4 w-4" />,
      items: [],
    },
    {
      title: "Kuponlar",
      href: "/dashboard/coupons",
      icon: <Ticket className="h-4 w-4" />,
      items: [],
    },
    {
      title: "Hediye Kartları",
      href: "/dashboard/gift-cards",
      icon: <Gift className="h-4 w-4" />,
      items: [],
    },
    {
      title: "Hediye Kartı İşlemleri",
      href: "/dashboard/gift-cards/transactions",
      icon: <FileText className="h-4 w-4" />,
      items: [],
    },
    {
      title: "Kampanyalar",
      href: "/dashboard/campaigns",
      icon: <BadgePercent className="h-4 w-4" />,
      items: [],
    },
    {
      title: "Raporlar",
      href: "/dashboard/reports",
      icon: <BarChart3 className="h-4 w-4" />,
      items: [],
    },
    {
      title: "Kullanıcılar",
      href: "/dashboard/users",
      icon: <Users className="h-4 w-4" />,
      items: [],
    },
    {
      title: "Bildirimler",
      href: "/dashboard/notifications",
      icon: <Bell className="h-4 w-4" />,
      items: [],
    },
    {
      title: "Sistem Günlükleri",
      href: "/dashboard/admin/system-logs",
      icon: <AlertCircle className="h-4 w-4" />,
      items: [],
    },
  ];

  return (
    <nav className={cn("grid items-start gap-2", className)}>
      {navItems.map((item, index) => (
        <Link
          key={index}
          href={item.href}
        >
          <Button
            variant={pathname === item.href ? "secondary" : "ghost"}
            className="w-full justify-start"
          >
            {item.icon}
            <span className="ml-2">{item.title}</span>
          </Button>
        </Link>
      ))}
    </nav>
  );
}; 