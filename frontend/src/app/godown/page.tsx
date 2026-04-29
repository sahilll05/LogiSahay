'use client'

import { useState } from 'react'
import { MapPin, Search, Filter } from 'lucide-react'

const GODOWNS = [
  {name:'Bhiwandi Central Warehouse',loc:'Bhiwandi, Thane · 2.4km',sqft:'600 sqft',price:'8',chips:['GST Reg','24x7 Security','CCTV'],rating:4.5,avail:'Available',color:'#4338CA'},
  {name:'Surat Textile Godown A4',loc:'Ring Road, Surat · 0.8km',sqft:'400 sqft',price:'6',chips:['Water','Fire Safety','24x7'],rating:4.8,avail:'Available',color:'#15803D'},
  {name:'Andheri Storage Hub',loc:'Andheri East, Mumbai · 3.1km',sqft:'1,000 sqft',price:'10',chips:['Loading Dock','GST','CCTV'],rating:4.2,avail:'1 unit left',color:'#B45309'},
  {name:'Aslali Cold & Dry Store',loc:'Aslali, Ahmedabad · 1.7km',sqft:'800 sqft',price:'7',chips:['Dry','Secure','24x7'],rating:4.6,avail:'Available',color:'#b91c1c'},
  {name:'Lal Darwaja Market Store',loc:'Old City, Ahmedabad · 0.5km',sqft:'350 sqft',price:'9',chips:['Ground Floor','GST'],rating:4.0,avail:'Available',color:'#4338CA'},
]

export default function GodownPage() {
  const [selectedIdx, setSelectedIdx] = useState<number | null>(0)

  return (
    <div className="flex flex-col gap-5 h-[calc(100vh-2rem)] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
            <span>Dashboard</span>
            <span className="text-slate-300">/</span>
            <span>Godown Finder</span>
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">Godown Finder</h1>
          <p className="text-[12px] text-slate-500 mt-1.5">Browse verified micro-warehouses near your market. Transparent pricing, instant booking.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by area, PIN..." 
              className="w-[200px] pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[12px] outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <button className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg text-[12px] font-medium flex items-center gap-1.5 shadow-sm transition-colors">
            <Filter className="w-3.5 h-3.5" />
            Filters
          </button>
        </div>
      </div>

      <div className="flex gap-4 min-h-0 flex-1">
        {/* Left List */}
        <div className="w-[320px] shrink-0 overflow-y-auto scrollbar-hide flex flex-col gap-3 pr-1 pb-4">
          {GODOWNS.map((g, i) => (
            <div 
              key={i} 
              onClick={() => setSelectedIdx(i)}
              className={`bg-white border rounded-[14px] p-3.5 cursor-pointer transition-all ${
                selectedIdx === i 
                  ? 'border-indigo-500 ring-2 ring-indigo-50 shadow-sm' 
                  : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'
              }`}
            >
              <div className="w-full h-20 rounded-lg mb-2.5 overflow-hidden relative flex items-center justify-center bg-slate-100">
                <div 
                  className="absolute inset-0 flex items-center justify-center opacity-20"
                  style={{ background: `linear-gradient(135deg, ${g.color}, transparent)` }}
                />
                <svg width="32" height="32" viewBox="0 0 16 16" fill="none" className="relative z-10" style={{ stroke: g.color }}>
                  <path d="M8 1.5L1 6v9h5v-4h4v4h5V6z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                
                <div className={`absolute top-2 right-2 text-[9px] font-medium px-2 py-0.5 rounded-full ${
                  g.avail === 'Available' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                }`}>
                  {g.avail}
                </div>
              </div>
              
              <div className="text-[13px] font-semibold text-slate-900 mb-0.5">{g.name}</div>
              <div className="text-[11px] text-slate-500 flex items-center gap-1 mb-2">
                <MapPin className="w-3 h-3" /> {g.loc}
              </div>
              
              <div className="flex flex-wrap gap-1 mb-2.5">
                {g.chips.map(c => (
                  <span key={c} className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">{c}</span>
                ))}
                <span className="bg-slate-100 text-slate-600 text-[10px] px-2 py-0.5 rounded-full">{g.sqft}</span>
              </div>
              
              <div className="flex items-center justify-between pt-1">
                <div>
                  <div className="text-[16px] font-bold text-slate-900 leading-none">
                    ₹{g.price}<span className="text-[10px] font-normal text-slate-500">/sqft/mo</span>
                  </div>
                  <div className="text-[10px] text-amber-500 mt-1 flex items-center gap-0.5">
                    {'★'.repeat(Math.floor(g.rating))} <span className="text-slate-500">{g.rating}</span>
                  </div>
                </div>
                <button className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-[11px] font-medium transition-colors">
                  Book Now
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Right Map */}
        <div className="flex-1 bg-white border border-slate-200 rounded-[18px] overflow-hidden relative shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-[#E8EFF7] via-[#D4E4F0] to-[#C8DDE9]">
            {/* Grid pattern */}
            <svg className="absolute inset-0 w-full h-full opacity-30">
              <defs>
                <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,80,0.07)" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)"/>
              <path d="M50,300 Q200,180 400,200 Q550,220 700,280" fill="none" stroke="rgba(100,140,200,0.35)" strokeWidth="6"/>
              <path d="M0,250 Q150,240 300,200 Q450,160 600,180 Q700,190 800,210" fill="none" stroke="rgba(100,140,200,0.25)" strokeWidth="4"/>
              
              <rect x="160" y="120" width="80" height="50" rx="4" fill="rgba(200,210,230,0.5)" stroke="rgba(150,170,200,0.4)" strokeWidth="1"/>
              <rect x="280" y="90" width="60" height="40" rx="4" fill="rgba(200,210,230,0.5)" stroke="rgba(150,170,200,0.4)" strokeWidth="1"/>
              <rect x="100" y="200" width="100" height="60" rx="4" fill="rgba(200,210,230,0.5)" stroke="rgba(150,170,200,0.4)" strokeWidth="1"/>
            </svg>

            {/* Map Markers */}
            {[
              {left:'28%', top:'38%', g: GODOWNS[0], i:0},
              {left:'45%', top:'25%', g: GODOWNS[1], i:1},
              {left:'62%', top:'42%', g: GODOWNS[2], i:2},
              {left:'52%', top:'60%', g: GODOWNS[3], i:3},
              {left:'35%', top:'62%', g: GODOWNS[4], i:4},
            ].map(({left, top, g, i}) => (
              <div 
                key={i}
                className="absolute flex flex-col items-center cursor-pointer transition-transform hover:scale-110"
                style={{ left, top, transform: `translate(-50%, -100%) ${selectedIdx === i ? 'scale(1.15)' : 'scale(1)'}` }}
                onClick={() => setSelectedIdx(i)}
              >
                <div 
                  className="w-8 h-8 rounded-full rounded-br-none flex items-center justify-center shadow-md relative z-10"
                  style={{ background: g.color, transform: 'rotate(-45deg)' }}
                >
                  <span className="text-white text-[10px] font-bold" style={{ transform: 'rotate(45deg)' }}>G</span>
                </div>
                <div className="bg-white border border-slate-200 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-slate-900 shadow-sm mt-1 whitespace-nowrap z-20">
                  ₹{g.price}/sqft
                </div>
              </div>
            ))}

            {/* Map Controls */}
            <div className="absolute bottom-4 right-4 flex flex-col gap-1.5">
              <button className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-50 shadow-sm transition-colors text-[16px] leading-none">
                +
              </button>
              <button className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-50 shadow-sm transition-colors text-[16px] leading-none">
                −
              </button>
              <button className="w-8 h-8 bg-white border border-slate-200 rounded-lg flex items-center justify-center text-slate-600 hover:bg-slate-50 shadow-sm transition-colors mt-1">
                <MapPin className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
