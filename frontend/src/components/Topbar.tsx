'use client'

import { usePathname } from 'next/navigation'
import { Bell, Menu, Sun, Moon, User, ChevronRight } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { useTheme } from '@/components/ThemeProvider'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

// Human-readable route labels
const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  shipments: 'Shipments',
  rates:     'Rate Comparator',
  godown:    'Godown Finder',
  ndr:       'NDR Automation',
  whatsapp:  'WhatsApp Bot',
  cod:       'COD Remittance',
  analytics: 'Analytics',
  pinmap:    'PIN Reliability',
  settings:  'Settings',
}

function Breadcrumb() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  if (segments.length === 0) {
    return <span className="text-sm font-semibold text-foreground font-heading">Dashboard</span>
  }

  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="text-muted-foreground/60 hidden sm:inline">LogiSahay</span>
      {segments.map((seg, i) => {
        const label = ROUTE_LABELS[seg] ?? seg.charAt(0).toUpperCase() + seg.slice(1)
        const isLast = i === segments.length - 1
        return (
          <span key={seg} className="flex items-center gap-1.5">
            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 hidden sm:block" />
            <span className={cn(
              isLast
                ? "font-semibold text-foreground font-heading"
                : "text-muted-foreground/70"
            )}>
              {label}
            </span>
          </span>
        )
      })}
    </div>
  )
}

export function Topbar() {
  const { toggleSidebar } = useStore()
  const { theme, toggleTheme } = useTheme()

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border/60 bg-background/80 backdrop-blur-md px-4 md:px-5">

      {/* Mobile menu toggle */}
      <button
        onClick={toggleSidebar}
        className="lg:hidden p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle sidebar</span>
      </button>

      {/* Breadcrumb */}
      <div className="flex-1 min-w-0">
        <Breadcrumb />
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-1">

        {/* Dark mode toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-all duration-200"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark'
            ? <Sun className="h-4 w-4 transition-transform duration-300 rotate-0 hover:rotate-12" />
            : <Moon className="h-4 w-4 transition-transform duration-300" />
          }
        </button>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-rose-500 ring-2 ring-background" />
          <span className="sr-only">Notifications</span>
        </button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger className="ml-1 flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors outline-none cursor-pointer focus-visible:bg-muted">
            <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center text-primary ring-1 ring-primary/20 shrink-0">
              <User className="h-4 w-4" />
            </div>
            <div className="hidden md:block text-left">
              <div className="text-[12px] font-semibold text-foreground leading-tight">Vendor</div>
              <div className="text-[10px] text-muted-foreground leading-tight">Pro Plan</div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              My Account
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-sm">Profile</DropdownMenuItem>
            <DropdownMenuItem className="text-sm">Settings</DropdownMenuItem>
            <DropdownMenuItem className="text-sm">Support</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-sm text-rose-500 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30">
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
