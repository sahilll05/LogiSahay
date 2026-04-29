'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import {
  Home,
  Search,
  ChevronDown,
  LayoutDashboard,
  Truck,
  Navigation,
  TrendingUp,
  CreditCard,
  BarChart2,
  Target,
  Settings,
  MessageSquare,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react'

const navGroups = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
      { name: 'Shipments', href: '/shipments', icon: Truck, badge: '24', badgeVariant: 'indigo' as const },
    ]
  },
  {
    label: 'Logistics Tools',
    items: [
      { name: 'Rate Comparator', href: '/rates', icon: Navigation },
      { name: 'Godown Finder', href: '/godown', icon: Home },
      { name: 'NDR Automation', href: '/ndr', icon: TrendingUp, badge: '5', badgeVariant: 'rose' as const },
      { name: 'WhatsApp Bot', href: '/whatsapp', icon: MessageSquare, badge: 'SIM', badgeVariant: 'amber' as const },
      { name: 'COD Remittance', href: '/cod', icon: CreditCard, badge: '₹12k', badgeVariant: 'emerald' as const },
    ]
  },
  {
    label: 'Insights',
    items: [
      { name: 'Analytics', href: '/analytics', icon: BarChart2 },
      { name: 'PIN Reliability', href: '/pinmap', icon: Target },
    ]
  },
  {
    label: 'Account',
    items: [
      { name: 'Settings', href: '/settings', icon: Settings },
    ]
  }
]

const badgeStyles = {
  indigo: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300',
  rose:   'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
  amber:  'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
  emerald:'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
}

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, setSidebarOpen } = useStore()

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed top-0 left-0 z-50 h-screen w-[230px] flex-col border-r border-sidebar-border bg-sidebar transition-transform duration-300 ease-in-out lg:static lg:flex lg:translate-x-0",
        sidebarOpen ? "flex translate-x-0" : "-translate-x-full"
      )}>

        {/* ── Business Profile + Search ── */}
        <div className="flex flex-col px-3 pt-4 pb-3 border-b border-sidebar-border">

          {/* Business card */}
          <div className="group flex items-center gap-2.5 p-2 mb-3 rounded-xl border border-sidebar-border bg-background/60 cursor-pointer hover:bg-sidebar-accent transition-all duration-200">
            <div className="w-[32px] h-[32px] rounded-lg bg-primary/10 flex items-center justify-center shrink-0 ring-1 ring-primary/20">
              <span className="text-[11px] font-bold text-primary">KT</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-semibold text-sidebar-foreground leading-tight truncate font-heading">
                Karunakar Textiles
              </div>
              <div className="text-[11px] text-muted-foreground truncate">
                Pro · Surat
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground shrink-0 mr-0.5 transition-transform duration-200 group-hover:rotate-180" />
          </div>

          {/* Search */}
          <div className="flex items-center gap-2 px-2.5 py-1.5 bg-background/40 border border-sidebar-border rounded-lg text-muted-foreground focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10 transition-all duration-200">
            <Search className="w-3.5 h-3.5 shrink-0" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent border-none outline-none text-[12px] w-full placeholder:text-muted-foreground/60 text-sidebar-foreground"
            />
            <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-[9px] font-medium bg-sidebar-accent border border-sidebar-border rounded text-muted-foreground">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* ── Navigation ── */}
        <div className="flex-1 overflow-y-auto py-3 px-2 scrollbar-hide">
          <nav className="space-y-5">
            {navGroups.map((group, idx) => (
              <div key={idx}>
                {/* Section label */}
                <div className="px-2.5 mb-1 text-[10px] font-semibold tracking-[0.12em] text-muted-foreground/70 uppercase select-none">
                  {group.label}
                </div>

                <div className="space-y-0.5">
                  {group.items.map((item) => {
                    const isActive = pathname === item.href || (pathname === '/' && item.href === '/dashboard')
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={cn(
                          "relative flex items-center justify-between px-2.5 py-[7px] rounded-lg text-[13px] transition-all duration-150 group/item",
                          isActive
                            ? "bg-primary/8 text-primary font-medium dark:bg-primary/12"
                            : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                        )}
                        onClick={() => setSidebarOpen(false)}
                      >
                        {/* Active left-border pill */}
                        {isActive && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full bg-primary slide-in-left" />
                        )}

                        <div className="flex items-center gap-2.5">
                          <item.icon
                            className={cn(
                              "w-[15px] h-[15px] shrink-0 transition-all duration-150",
                              isActive
                                ? "text-primary"
                                : "text-muted-foreground/70 group-hover/item:text-sidebar-foreground group-hover/item:scale-105"
                            )}
                            strokeWidth={isActive ? 2.2 : 1.8}
                          />
                          <span className={cn(
                            "transition-transform duration-150",
                            !isActive && "group-hover/item:translate-x-0.5"
                          )}>
                            {item.name}
                          </span>
                        </div>

                        {item.badge && (
                          <span className={cn(
                            "text-[9.5px] font-semibold px-1.5 py-0.5 rounded-full",
                            item.badgeVariant ? badgeStyles[item.badgeVariant] : badgeStyles.indigo
                          )}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

      </aside>
    </>
  )
}
