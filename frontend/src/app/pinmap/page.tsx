'use client'

import { Search } from 'lucide-react'

const PIN_DATA = [
  { pin: '110001', zone: 'Delhi Central', city: 'New Delhi', dl: 92, xb: 78, ee: 85, rec: 'Delhivery', recColor: 'bg-green-50 text-green-700' },
  { pin: '400001', zone: 'Mumbai CST', city: 'Maharashtra', dl: 95, xb: 91, ee: 74, rec: 'Delhivery', recColor: 'bg-green-50 text-green-700' },
  { pin: '302001', zone: 'Jaipur', city: 'Rajasthan', dl: 72, xb: 88, ee: 65, rec: 'XpressBees', recColor: 'bg-indigo-50 text-indigo-700' },
  { pin: '462001', zone: 'Bhopal', city: 'Madhya Pradesh', dl: 68, xb: 55, ee: 71, rec: 'Ecom Express', recColor: 'bg-amber-50 text-amber-700' },
  { pin: '226001', zone: 'Lucknow', city: 'Uttar Pradesh', dl: 84, xb: 79, ee: 58, rec: 'Delhivery', recColor: 'bg-green-50 text-green-700' },
]

const MY_PINS = [
  {pin:'395003',name:'Surat (Origin)',shipments:186,best:'Delhivery',rel:94},
  {pin:'110001',name:'Delhi NCR',shipments:108,best:'Delhivery',rel:92},
  {pin:'400001',name:'Mumbai',shipments:70,best:'Delhivery',rel:95},
  {pin:'560001',name:'Bangalore',shipments:48,best:'XpressBees',rel:88},
  {pin:'302001',name:'Jaipur',shipments:32,best:'XpressBees',rel:88},
]

const RelBar = ({ val }: { val: number }) => {
  const color = val >= 85 ? '#22c55e' : val >= 70 ? '#f59e0b' : '#ef4444'
  const textColor = val >= 85 ? '#15803d' : val >= 70 ? '#b45309' : '#b91c1c'
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden shrink-0">
        <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: color }} />
      </div>
      <span className="text-[11px] font-medium" style={{ color: textColor }}>{val}%</span>
    </div>
  )
}

export default function PinMapPage() {
  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
            <span>Dashboard</span>
            <span className="text-slate-300">/</span>
            <span>PIN Reliability</span>
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">PIN Reliability Map</h1>
          <p className="text-[12px] text-slate-500 mt-1.5">Crowdsourced delivery success rates by PIN code and courier. Avoid failed deliveries before booking.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="col-span-1 lg:col-span-3 bg-white border border-slate-200 rounded-[18px] overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h2 className="text-[13px] font-semibold text-slate-900">Courier reliability by PIN zone</h2>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                placeholder="Search PIN code..." 
                className="w-[160px] pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[12px] outline-none focus:border-indigo-500 focus:bg-white transition-colors"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr>
                  <th className="text-[11px] font-medium text-slate-500 py-3 px-4 border-b border-slate-200">PIN / Zone</th>
                  <th className="text-[11px] font-medium text-slate-500 py-3 px-4 border-b border-slate-200">Delhivery</th>
                  <th className="text-[11px] font-medium text-slate-500 py-3 px-4 border-b border-slate-200">XpressBees</th>
                  <th className="text-[11px] font-medium text-slate-500 py-3 px-4 border-b border-slate-200">Ecom Ex.</th>
                  <th className="text-[11px] font-medium text-slate-500 py-3 px-4 border-b border-slate-200">Recommended</th>
                </tr>
              </thead>
              <tbody>
                {PIN_DATA.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 border-b border-slate-100 last:border-0">
                      <div className="text-[12.5px] font-medium text-slate-900">{row.pin} · {row.zone}</div>
                      <div className="text-[10px] text-slate-500">{row.city}</div>
                    </td>
                    <td className="py-3 px-4 border-b border-slate-100 last:border-0">
                      <RelBar val={row.dl} />
                    </td>
                    <td className="py-3 px-4 border-b border-slate-100 last:border-0">
                      <RelBar val={row.xb} />
                    </td>
                    <td className="py-3 px-4 border-b border-slate-100 last:border-0">
                      <RelBar val={row.ee} />
                    </td>
                    <td className="py-3 px-4 border-b border-slate-100 last:border-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${row.recColor}`}>
                        {row.rec}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="col-span-1 bg-white border border-slate-200 rounded-[18px] p-4 shadow-sm">
          <h2 className="text-[13px] font-semibold text-slate-900 mb-3">Your most-used PINs</h2>
          <div className="flex flex-col">
            {MY_PINS.map((p, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-slate-100 last:border-0">
                <div className="w-[38px] h-[38px] rounded-xl bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600 shrink-0 text-center leading-tight">
                  {p.pin.slice(0,3)}<br/>{p.pin.slice(3)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[12.5px] font-medium text-slate-900 truncate">{p.name}</div>
                  <div className="text-[10.5px] text-slate-500 truncate">{p.shipments} shipments · Best: {p.best}</div>
                </div>
                <div className={`text-[13px] font-bold ${p.rel >= 85 ? 'text-green-600' : 'text-amber-600'}`}>
                  {p.rel}%
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
