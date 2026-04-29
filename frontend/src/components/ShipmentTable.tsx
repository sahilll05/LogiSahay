'use client'

import { useState, useEffect } from 'react'
import { api, Shipment } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { MoreHorizontal, ArrowUpRight, Loader2, Package } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const COURIER_COLORS: Record<string, string> = {
  Delhivery:      '#4338CA',
  XpressBees:     '#15803D',
  'Ecom Express': '#B45309',
  Shadowfax:      '#7C3AED',
  'Blue Dart':    '#1D4ED8',
  Express:        '#4338CA',
  Standard:       '#15803D',
  Economy:        '#B45309',
}

function getCourierColor(name: string) {
  return COURIER_COLORS[name] ?? '#6366F1'
}

function CourierBadge({ name }: { name: string }) {
  const color = getCourierColor(name)
  const abr = name.slice(0, 2).toUpperCase()
  return (
    <span
      className="inline-flex items-center justify-center w-6 h-6 rounded-md text-[9px] font-bold mr-1.5 shrink-0"
      style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}30` }}
    >
      {abr}
    </span>
  )
}

const STATUS_CONFIG: Record<string, { label: string; classes: string; dot?: string }> = {
  'delivered':       { label: 'Delivered',      classes: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' },
  'in transit':      { label: 'In Transit',     classes: 'bg-blue-100 text-blue-800 dark:bg-blue-950/50 dark:text-blue-300',     dot: 'bg-blue-500' },
  'pending pickup':  { label: 'Pending Pickup', classes: 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' },
  'cancelled':       { label: 'Cancelled',      classes: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300' },
  'failed':          { label: 'Failed',         classes: 'bg-rose-100 text-rose-800 dark:bg-rose-950/50 dark:text-rose-300' },
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status.toLowerCase()] ?? { label: status, classes: 'bg-muted text-muted-foreground' }
  return (
    <Badge variant="secondary" className={cn("text-[10px] font-semibold px-2 py-0.5 gap-1", cfg.classes)}>
      {cfg.dot && <span className={cn("w-1.5 h-1.5 rounded-full pulse-dot shrink-0", cfg.dot)} />}
      {cfg.label}
    </Badge>
  )
}

function ShimmerRow() {
  return (
    <tr>
      {[40, 80, 60, 50, 40, 60].map((w, i) => (
        <td key={i} className="px-4 py-3">
          <div className={`h-3 rounded shimmer`} style={{ width: `${w}%` }} />
        </td>
      ))}
      <td className="px-4 py-3"><div className="h-3 w-3 rounded shimmer ml-auto" /></td>
    </tr>
  )
}

export function ShipmentTable() {
  const [shipments, setShipments] = useState<Shipment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.getShipments(1)
      .then(res => setShipments(res.shipments))
      .catch(err => console.error('Failed to load shipments:', err))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
        <div>
          <h3 className="text-[13px] font-semibold text-foreground font-heading">Recent Shipments</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">Most recent dispatches</p>
        </div>
        <Link
          href="/shipments"
          className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
        >
          View All
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/20 sticky top-0">
              {['Tracking No.', 'Courier', 'Destination', 'Date', 'Amount', 'Status', ''].map((h, i) => (
                <th
                  key={i}
                  className={cn(
                    "px-4 py-2.5 text-[10.5px] font-semibold text-muted-foreground tracking-wider uppercase text-left",
                    i === 6 && "text-right"
                  )}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => <ShimmerRow key={i} />)
            ) : shipments.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-14 text-center">
                  <Package className="w-8 h-8 text-muted-foreground/25 mx-auto mb-2" />
                  <p className="text-[12px] text-muted-foreground">No shipments found.</p>
                </td>
              </tr>
            ) : (
              shipments.map(shipment => (
                <tr
                  key={shipment.id}
                  className="group hover:bg-muted/30 transition-colors duration-100"
                >
                  <td className="px-4 py-3 font-mono text-[12px] font-semibold text-foreground">
                    {shipment.tracking_id}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center">
                      <CourierBadge name={shipment.courier_name} />
                      <span className="text-[12px] text-foreground">{shipment.courier_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground">{shipment.delivery_pin}</td>
                  <td className="px-4 py-3 text-[12px] text-muted-foreground" suppressHydrationWarning>
                    {new Date(shipment.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  <td className="px-4 py-3 text-[12px] font-semibold text-foreground">
                    ₹{shipment.total_cost.toLocaleString('en-IN')}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={shipment.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger className="p-1 rounded-md text-muted-foreground/40 hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 outline-none">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem className="text-[12px]">View details</DropdownMenuItem>
                        <DropdownMenuItem className="text-[12px]">Track shipment</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
