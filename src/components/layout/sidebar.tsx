"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Package, ArrowRightLeft, LayoutDashboard, Settings, Loader2 } from "lucide-react"
import { useQuery } from "@tanstack/react-query"

const navItems = [
  { title: "Dashboard", href: "/", icon: LayoutDashboard },
  { title: "Produk", href: "/products", icon: Package },
  { title: "Mutasi Stok", href: "/movements", icon: ArrowRightLeft },
  { title: "Pengaturan", href: "/settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  // Query data logo aktif secara dinamis
  const { data: logoUrl, isLoading } = useQuery<string | null>({
    queryKey: ["app-logo"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/settings/logo");
        if (!res.ok) return null;
        const json = await res.json();
        return json.logoUrl || null;
      } catch {
        return null;
      }
    }
  });

  return (
    <div className="flex h-screen w-64 flex-col bg-gradient-to-b from-[#0F2E2D] to-[#0B132B] text-white shadow-2xl border-r border-white/5">
      <div className="flex h-14 items-center border-b border-white/10 px-6">
        <div className="flex items-center gap-2 font-bold tracking-tight text-white w-full">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
              <span className="text-sm font-medium text-slate-300">Loading...</span>
            </div>
          ) : logoUrl ? (
            <img 
              src={logoUrl} 
              alt="App Logo" 
              className="h-10 max-w-[200px] object-contain object-left" 
            />
          ) : (
            <>
              <Package className="h-5 w-5 text-teal-400" />
              <span className="bg-gradient-to-r from-teal-200 to-white bg-clip-text text-transparent">Inventory Sys</span>
            </>
          )}
        </div>
      </div>
      <nav className="flex-1 space-y-2.5 p-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 py-2.5 transition-all duration-300 text-sm font-semibold rounded-xl",
                isActive
                  ? "pl-4 bg-white/10 text-white backdrop-blur-md border-l-4 border-teal-400 shadow-[0_0_15px_rgba(255,255,255,0.05)]"
                  : "pl-3 text-slate-300 hover:text-white hover:bg-white/5 hover:translate-x-1"
              )}
            >
              <item.icon className={cn(
                "h-4.5 w-4.5 transition-transform duration-300",
                isActive 
                  ? "text-teal-400 scale-110" 
                  : "text-slate-400 group-hover:text-white group-hover:scale-105"
              )} />
              {item.title}
            </Link>
          );
        })}
      </nav>
    </div>
  )
}
