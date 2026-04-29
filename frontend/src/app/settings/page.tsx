'use client'

import { useState } from 'react'

const COURIERS = [
  { name: 'Delhivery', desc: 'Connected · API v2', connected: true },
  { name: 'XpressBees', desc: 'Connected · Webhook active', connected: true },
  { name: 'Ecom Express', desc: 'Connected · Polling', connected: true },
  { name: 'Shadowfax', desc: 'Not connected', connected: false },
  { name: 'Blue Dart', desc: 'Not connected', connected: false },
]

const SETTING_TABS = [
  'Business Profile',
  'Courier Config',
  'NDR Rules',
  'Notifications',
  'Billing',
  'API Access'
]

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState('Business Profile')

  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-1">
            <span>Dashboard</span>
            <span className="text-slate-300">/</span>
            <span>Settings</span>
          </div>
          <h1 className="text-[26px] font-bold tracking-tight text-slate-900 leading-none">Settings</h1>
        </div>
        <div>
          <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[12px] font-medium transition-colors shadow-sm">
            Save Changes
          </button>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left Nav */}
        <div className="w-full md:w-[180px] shrink-0 flex flex-col gap-1">
          {SETTING_TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-3 py-2.5 rounded-lg text-[12.5px] transition-colors ${activeTab === tab
                  ? 'bg-indigo-50 text-indigo-600 font-medium'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Right Content */}
        <div className="flex-1 w-full flex flex-col gap-4">
          {activeTab === 'Business Profile' ? (
            <>
              <div className="bg-white border border-slate-200 rounded-[18px] p-5 shadow-sm">
                <h2 className="text-[14px] font-semibold text-slate-900 mb-4">Business details</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-slate-500">Business Name</label>
                    <input type="text" defaultValue="Karunakar Textiles" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[12.5px] outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-slate-500">GSTIN</label>
                    <input type="text" defaultValue="24AABCK1234F1Z5" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[12.5px] outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-slate-500">Primary City</label>
                    <input type="text" defaultValue="Surat, Gujarat" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[12.5px] outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-medium text-slate-500">WhatsApp Number</label>
                    <input type="text" defaultValue="+91 98765 43210" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[12.5px] outline-none focus:border-indigo-500 transition-colors" />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-medium text-slate-500">Business Address</label>
                  <textarea rows={2} defaultValue="Shop 42, Ring Road Textile Market, Surat - 395002, Gujarat" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[12.5px] outline-none focus:border-indigo-500 transition-colors resize-none" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-[18px] p-5 shadow-sm">
                <h2 className="text-[14px] font-semibold text-slate-900 mb-2">Preferences</h2>
                <div className="flex flex-col">
                  {[
                    { label: 'Routing preference', desc: 'Auto-select courier on lowest landed cost', checked: true },
                    { label: 'Hindi language UI', desc: 'Switch dashboard to Hindi', checked: false },
                    { label: 'Weekly savings report via WhatsApp', desc: 'Get your weekly summary every Monday', checked: true },
                    { label: 'Auto-whitelist trusted PINs', desc: 'Skip reliability check for verified PIN codes', checked: false },
                  ].map((p, i) => (
                    <div key={i} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                      <div>
                        <div className="text-[12.5px] font-medium text-slate-900">{p.label}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{p.desc}</div>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked={p.checked} />
                        <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : activeTab === 'Courier Config' ? (
            <div className="bg-white border border-slate-200 rounded-[18px] p-5 shadow-sm">
              <h2 className="text-[14px] font-semibold text-slate-900 mb-2">Connected couriers</h2>
              <div className="flex flex-col">
                {COURIERS.map((c, i) => (
                  <div key={i} className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
                    <div className="w-[34px] h-[34px] rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-600 shrink-0">
                      {c.name.slice(0, 3).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-[12.5px] font-medium text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-500">{c.desc}</div>
                    </div>
                    {c.connected ? (
                      <span className="px-2.5 py-1 bg-green-50 text-green-700 text-[10px] font-semibold rounded-full">Connected</span>
                    ) : (
                      <button className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-md text-[11px] font-medium transition-colors">
                        Connect
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[18px] p-10 shadow-sm flex flex-col items-center justify-center text-center">
              <h3 className="text-[15px] font-semibold text-slate-900">{activeTab}</h3>
              <p className="text-[12px] text-slate-500 mt-1 max-w-[250px]">
                This section is currently under development.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
