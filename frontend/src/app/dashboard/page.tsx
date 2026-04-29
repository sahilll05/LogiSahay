'use client'

import { useState, useEffect } from 'react'
import { api, DashboardMetrics } from '@/lib/api'
import { MetricCard } from '@/components/MetricCard'
import { OverviewChart } from '@/components/OverviewChart'
import { ShipmentTable } from '@/components/ShipmentTable'
import { AnimatedNumber } from '@/components/ui/animated-number'
import {
  Package,
  Truck,
  IndianRupee,
  AlertCircle,
  Navigation,
  MapPin,
  Home,
  MessageSquare,
  TrendingUp,
  ShieldAlert,
  Loader2,
  ChevronRight,
  Zap,
  Wifi,
  WifiOff,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

const QUICK_ACTIONS = [
  {
    label: 'Rate Check',
    sub: 'Compare couriers',
    href: '/rates',
    icon: Navigation,
    accent: 'text-primary bg-primary/10 dark:bg-primary/15',
    hover: 'hover:border-primary/30 hover:bg-primary/5',
  },
  {
    label: 'Track Parcel',
    sub: 'Live status',
    href: '/shipments',
    icon: MapPin,
    accent: 'text-blue-600 bg-blue-100 dark:bg-blue-950/40',
    hover: 'hover:border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/20',
  },
  {
    label: 'Resolve NDR',
    sub: 'Reduce RTO',
    href: '/ndr',
    icon: ShieldAlert,
    accent: 'text-amber-600 bg-amber-100 dark:bg-amber-950/40',
    hover: 'hover:border-amber-200 hover:bg-amber-50 dark:hover:bg-amber-950/20',
  },
  {
    label: 'Find Godown',
    sub: 'Rent warehouse',
    href: '/godown',
    icon: Home,
    accent: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-950/40',
    hover: 'hover:border-emerald-200 hover:bg-emerald-50 dark:hover:bg-emerald-950/20',
  },
]

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
  const [loading, setLoading] = useState(true)
  const [waMode, setWaMode] = useState<'simulation' | 'live'>('simulation')

  useEffect(() => {
    Promise.all([api.getDashboardMetrics(), api.health()])
      .then(([m, h]) => { setMetrics(m); setWaMode(h.whatsapp_mode) })
      .catch(err => console.error('Dashboard fetch failed:', err))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary/60" />
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="flex h-[50vh] items-center justify-center text-sm text-muted-foreground">
        Failed to load dashboard data.
      </div>
    )
  }

  const savingsPct = Math.min((metrics.savings_this_month / metrics.savings_goal) * 100, 100)

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-3 duration-500 pb-10">

      {/* ── Greeting + status strip ── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <p className="text-[13px] text-muted-foreground mb-0.5">{getGreeting()}, Karunakar 👋</p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading">Dashboard</h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with your logistics today.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Data source badge */}
          <span className="text-[10px] font-semibold px-2 py-1 bg-muted text-muted-foreground rounded-md tracking-wider uppercase">
            {metrics.source === 'demo' ? 'Demo Data' : 'Live Data'}
          </span>

          {/* WhatsApp mode chip */}
          <Link
            href="/whatsapp"
            className={cn(
              "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border transition-colors",
              waMode === 'simulation'
                ? 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:border-amber-800 dark:text-amber-300'
                : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-300'
            )}
          >
            {waMode === 'simulation'
              ? <WifiOff className="w-3 h-3" />
              : <Wifi className="w-3 h-3" />
            }
            WA: {waMode === 'simulation' ? 'Simulation' : 'Live'}
          </Link>
        </div>
      </div>

      {/* ── Primary Metrics ── */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Shipments"
          value={metrics.total_shipments}
          icon={Package}
          trend={{ value: 12.5, isPositive: true }}
          accentColor="bg-primary/10 text-primary"
        />
        <MetricCard
          title="Delivered This Month"
          value={metrics.delivered_this_month}
          icon={Truck}
          trend={{ value: 8.2, isPositive: true }}
          accentColor="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400"
        />
        <MetricCard
          title="Active NDR Cases"
          value={metrics.ndr_open}
          icon={AlertCircle}
          trend={{ value: 2.1, isPositive: false }}
          accentColor="bg-amber-100 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400"
        />
        <MetricCard
          title="Monthly Revenue"
          value={metrics.revenue_this_month}
          icon={IndianRupee}
          trend={{ value: 18.4, isPositive: true }}
          accentColor="bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400"
          prefix="₹"
          formatFn={(n) => Math.round(n).toLocaleString('en-IN')}
        />
      </div>

      {/* ── Middle: Quick Actions + Savings ── */}
      <div className="grid gap-5 md:grid-cols-2">

        {/* Quick Actions */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h2 className="text-[13px] font-semibold text-foreground mb-3.5 flex items-center gap-2 font-heading">
            <Zap className="w-3.5 h-3.5 text-primary" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-2.5">
            {QUICK_ACTIONS.map(({ label, sub, href, icon: Icon, accent, hover }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "group flex items-center gap-3 p-3 rounded-xl border border-border transition-all duration-200",
                  hover
                )}
              >
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105", accent)}>
                  <Icon className="w-4 h-4" strokeWidth={1.8} />
                </div>
                <div className="min-w-0">
                  <div className="text-[12.5px] font-semibold text-foreground leading-tight">{label}</div>
                  <div className="text-[10.5px] text-muted-foreground mt-0.5">{sub}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Savings + Needs Attention */}
        <div className="flex flex-col gap-3">

          {/* Savings tracker */}
          <div className="relative overflow-hidden bg-primary rounded-xl p-4 text-white shadow-lg shadow-primary/20">
            <div className="absolute -top-4 -right-4 w-24 h-24 rounded-full bg-white/8 blur-2xl pointer-events-none" />
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-3.5 h-3.5 text-white/70" />
              <span className="text-[11px] text-white/70 font-medium">This Month&apos;s Savings</span>
            </div>
            <div className="flex items-baseline gap-2 mb-3">
              <span className="text-[28px] font-bold tracking-tight font-heading">
                ₹<AnimatedNumber
                  value={metrics.savings_this_month}
                  formatFn={(n) => Math.round(n).toLocaleString('en-IN')}
                />
              </span>
              <span className="text-[11px] text-white/50">/ ₹{metrics.savings_goal.toLocaleString('en-IN')} goal</span>
            </div>
            <div className="h-1.5 w-full bg-white/15 rounded-full overflow-hidden mb-1.5">
              <div
                className="h-full rounded-full bg-white/90 transition-all duration-1000"
                style={{ width: `${savingsPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-white/50">
              <span>{savingsPct.toFixed(1)}% of goal</span>
              <span>₹{metrics.rto_losses_prevented_inr.toLocaleString('en-IN')} from RTO</span>
            </div>
          </div>

          {/* Needs Attention */}
          <div className="flex-1 bg-card border border-border rounded-xl p-4">
            <h2 className="text-[12px] font-semibold text-foreground mb-2.5 flex items-center gap-2 font-heading">
              <AlertCircle className={cn(
                "w-3.5 h-3.5",
                metrics.attention_needed.length > 0 ? "text-rose-500 pulse-dot" : "text-muted-foreground"
              )} />
              Needs Attention
              {metrics.attention_needed.length > 0 && (
                <span className="ml-auto text-[9.5px] font-bold bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300 px-1.5 py-0.5 rounded-full">
                  {metrics.attention_needed.length}
                </span>
              )}
            </h2>
            <div className="space-y-1.5">
              {metrics.attention_needed.length > 0 ? (
                metrics.attention_needed.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2.5 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-100 dark:border-rose-900/40">
                    <div>
                      <div className="text-[11.5px] font-semibold text-rose-900 dark:text-rose-200">{item.issue}</div>
                      <div className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">{item.shipment}</div>
                    </div>
                    <Link
                      href="/ndr"
                      className="w-6 h-6 rounded-full bg-white dark:bg-rose-900/40 flex items-center justify-center text-rose-500 hover:bg-rose-500 hover:text-white transition-colors border border-rose-200 dark:border-rose-800"
                    >
                      <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-4 text-center">
                  <MessageSquare className="w-6 h-6 text-muted-foreground/30 mb-1.5" />
                  <p className="text-[11px] text-muted-foreground">All clear — no alerts right now.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Chart + Table ── */}
      <div className="grid gap-5 grid-cols-1 lg:grid-cols-3">
        <OverviewChart />
        <div className="lg:col-span-2">
          <ShipmentTable />
        </div>
      </div>
    </div>
  )
}
