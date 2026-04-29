'use client'

import { useState } from 'react'
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'
import { cn } from '@/lib/utils'

const DATA_6M = [
  { name: 'Nov', total: 1200 },
  { name: 'Dec', total: 2100 },
  { name: 'Jan', total: 1800 },
  { name: 'Feb', total: 2400 },
  { name: 'Mar', total: 2800 },
  { name: 'Apr', total: 3200 },
]

const DATA_1Y = [
  { name: 'May', total: 900 },
  { name: 'Jun', total: 1100 },
  { name: 'Jul', total: 1350 },
  { name: 'Aug', total: 1600 },
  { name: 'Sep', total: 1200 },
  { name: 'Oct', total: 1500 },
  { name: 'Nov', total: 1200 },
  { name: 'Dec', total: 2100 },
  { name: 'Jan', total: 1800 },
  { name: 'Feb', total: 2400 },
  { name: 'Mar', total: 2800 },
  { name: 'Apr', total: 3200 },
]

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover border border-border rounded-xl shadow-lg px-3.5 py-2.5 text-sm">
      <p className="text-[11px] font-semibold text-muted-foreground mb-1">{label}</p>
      <p className="text-[15px] font-bold text-foreground font-heading">
        ₹{Number(payload[0].value).toLocaleString('en-IN')}
      </p>
    </div>
  )
}

export function OverviewChart() {
  const [range, setRange] = useState<'6M' | '1Y'>('6M')
  const data = range === '6M' ? DATA_6M : DATA_1Y

  const total = data.reduce((s, d) => s + d.total, 0)

  return (
    <div className="col-span-1 bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-4 pb-0">
        <div>
          <h3 className="text-[13px] font-semibold text-foreground font-heading">Revenue Overview</h3>
          <p className="text-[24px] font-bold tracking-tight text-foreground font-heading mt-0.5">
            ₹{total.toLocaleString('en-IN')}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Total for selected period</p>
        </div>

        {/* Range tabs */}
        <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5 mt-0.5">
          {(['6M', '1Y'] as const).map(r => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "px-3 py-1 text-[11px] font-semibold rounded-md transition-all duration-150",
                range === r
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pb-4 pt-4">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={data} barSize={range === '1Y' ? 16 : 28}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="currentColor"
              className="text-border/60"
            />
            <XAxis
              dataKey="name"
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'hsl(var(--muted-foreground) / 0.7)', fontWeight: 500 }}
            />
            <YAxis
              fontSize={10}
              tickLine={false}
              axisLine={false}
              tickFormatter={v => `₹${(v / 1000).toFixed(0)}k`}
              tick={{ fill: 'hsl(var(--muted-foreground) / 0.7)' }}
              width={40}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: 'currentColor', className: 'text-muted/40' }}
            />
            <Bar
              dataKey="total"
              fill="var(--primary)"
              radius={[5, 5, 2, 2]}
              animationDuration={800}
              animationBegin={100}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
