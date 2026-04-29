'use client'

import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { AnimatedNumber } from '@/components/ui/animated-number'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface MetricCardProps {
  title: string
  value: number | string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  description?: string
  className?: string
  /** Tailwind color classes for icon bg and text, e.g. "bg-blue-100 text-blue-600" */
  accentColor?: string
  prefix?: string
  suffix?: string
  formatFn?: (n: number) => string
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  description,
  className,
  accentColor = 'bg-primary/10 text-primary',
  prefix = '',
  suffix = '',
  formatFn,
}: MetricCardProps) {
  const isNumeric = typeof value === 'number'

  // Extract accent color for the bottom bar — map bg to border
  const accentBorder = accentColor
    .split(' ')
    .find(c => c.startsWith('bg-'))
    ?.replace('bg-', 'border-') ?? 'border-primary/30'

  return (
    <div className={cn(
      "relative group bg-card border border-border rounded-xl p-5 overflow-hidden",
      "animate-lift transition-all duration-200",
      className
    )}>
      {/* Subtle top-right glow */}
      <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl bg-primary/8 pointer-events-none" />

      {/* Header row */}
      <div className="flex items-start justify-between mb-3">
        <p className="text-[12px] font-medium text-muted-foreground leading-tight">{title}</p>
        <div className={cn(
          "flex items-center justify-center w-8 h-8 rounded-lg shrink-0",
          accentColor
        )}>
          <Icon className="w-4 h-4" strokeWidth={1.8} />
        </div>
      </div>

      {/* Value */}
      <div className="text-[26px] font-bold tracking-tight text-foreground font-heading leading-none mb-2 animate-count-up">
        {isNumeric ? (
          <AnimatedNumber
            value={value as number}
            prefix={prefix}
            suffix={suffix}
            formatFn={formatFn}
          />
        ) : (
          <span>{value}</span>
        )}
      </div>

      {/* Trend / description */}
      {(trend || description) && (
        <div className="flex items-center gap-1.5 text-[12px]">
          {trend && (
            <span className={cn(
              "inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full font-semibold text-[10.5px]",
              trend.isPositive
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
            )}>
              {trend.isPositive
                ? <TrendingUp className="w-2.5 h-2.5" />
                : <TrendingDown className="w-2.5 h-2.5" />
              }
              {trend.isPositive ? '+' : '-'}{Math.abs(trend.value)}%
            </span>
          )}
          <span className="text-muted-foreground text-[11px]">
            {description ?? 'vs last month'}
          </span>
        </div>
      )}

      {/* Bottom accent bar */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 h-[2px] rounded-b-xl opacity-0 group-hover:opacity-100 transition-all duration-300",
        accentBorder.replace('border-', 'bg-')
      )} />
    </div>
  )
}
