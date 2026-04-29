'use client'

import { TrendingUp, Clock, CalendarDays } from 'lucide-react'

const PIPELINE = [
  {courier:'Delhivery', amount:'₹12,200', orders:38, eta:'Nov 27', progress:85, color:'#4338CA'},
  {courier:'XpressBees', amount:'₹9,400', orders:24, eta:'Nov 29', progress:60, color:'#15803D'},
  {courier:'Ecom Express', amount:'₹6,800', orders:18, eta:'Dec 2', progress:35, color:'#B45309'},
]

export default function CodPage() {
  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
            <span>Dashboard</span>
            <span className="text-slate-300">/</span>
            <span>COD Remittance</span>
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">COD Remittance</h1>
          <p className="text-[12px] text-slate-500 mt-1.5">Track cash-on-delivery collections across all couriers.</p>
        </div>
        <div>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[12px] font-medium transition-colors shadow-sm">
            Request 80% Advance
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
        <div className="bg-white border border-slate-200 rounded-[18px] p-4 relative overflow-hidden shadow-sm">
          <div className="text-[11px] text-slate-500 mb-2">Total COD Collected</div>
          <div className="text-[24px] font-bold text-slate-900 tracking-tight leading-none">₹1,24,800</div>
          <div className="text-[10.5px] text-slate-400 mt-1">186 COD orders · Nov 2026</div>
          <div className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-green-50 text-green-600 mt-2">
            <TrendingUp className="w-3 h-3" /> +18% vs Oct
          </div>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-[18px] p-4 relative overflow-hidden shadow-sm">
          <div className="text-[11px] text-slate-500 mb-2">Pending Remittance</div>
          <div className="text-[24px] font-bold text-slate-900 tracking-tight leading-none">₹28,400</div>
          <div className="text-[10.5px] text-slate-400 mt-1">Across 3 couriers</div>
          <div className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 mt-2">
            <Clock className="w-3 h-3" /> Avg 5.2 days
          </div>
        </div>
        
        <div className="bg-white border border-slate-200 rounded-[18px] p-4 relative overflow-hidden shadow-sm">
          <div className="text-[11px] text-slate-500 mb-2">Next Payout</div>
          <div className="text-[24px] font-bold text-slate-900 tracking-tight leading-none">₹12,200</div>
          <div className="text-[10.5px] text-slate-400 mt-1">Delhivery · Nov 27, 2026</div>
          <div className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 mt-2">
            <CalendarDays className="w-3 h-3" /> 2 days away
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-100">
            <h2 className="text-[13px] font-semibold text-slate-900">Remittance pipeline</h2>
          </div>
          <div className="flex flex-col">
            {PIPELINE.map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-3 px-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer">
                <div 
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-[9px] font-bold border shrink-0"
                  style={{ color: item.color, borderColor: `${item.color}30`, backgroundColor: `${item.color}15` }}
                >
                  {item.courier.slice(0,3).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-[12.5px] font-medium text-slate-900">{item.courier}</div>
                  <div className="text-[11px] text-slate-500">{item.orders} orders pending</div>
                </div>
                <div className="text-[15px] font-bold text-slate-900 tracking-tight">{item.amount}</div>
                <div className="w-24 text-right">
                  <div className="text-[11.5px] text-slate-600">Due {item.eta}</div>
                  <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden ml-auto mt-1">
                    <div className="h-full rounded-full" style={{ width: `${item.progress}%`, backgroundColor: item.color }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <h2 className="text-[13px] font-semibold text-slate-900 mb-4">Courier-wise breakdown</h2>
          
          <div className="space-y-0.5">
            {[
              { label: 'Delhivery (40%)', val: '₹49,920' },
              { label: 'XpressBees (24%)', val: '₹29,952' },
              { label: 'Ecom Express (16%)', val: '₹19,968' },
              { label: 'Shadowfax (12%)', val: '₹14,976' },
              { label: 'Others (8%)', val: '₹9,984' },
            ].map((r, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                <div className="text-[12px] text-slate-600">{r.label}</div>
                <div className="text-[14px] font-bold text-slate-900 tracking-tight">{r.val}</div>
              </div>
            ))}
            <div className="h-[1px] bg-slate-200 my-2" />
            <div className="flex items-center justify-between py-2">
              <div className="text-[12px] font-semibold text-slate-900">Total COD Nov</div>
              <div className="text-[18px] font-bold text-slate-900 tracking-tight">₹1,24,800</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
