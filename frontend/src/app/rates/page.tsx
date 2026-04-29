'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { Navigation, Compass, Star, TrendingDown, Download, RefreshCw, AlertCircle, CheckCircle2, Zap, Clock, Shield, Map } from 'lucide-react'
import { api, CourierRate, RateCompareResponse } from '@/lib/api'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── Lazy-load RouteMap (Leaflet requires browser APIs — no SSR) ───────────────
const RouteMap = dynamic(() => import('@/components/RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-[340px] bg-muted/10 rounded-2xl border border-border">
      <div className="flex items-center gap-2 text-[13px] text-muted-foreground">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Loading map…
      </div>
    </div>
  ),
})

// ─── Courier branding ──────────────────────────────────────────────────────────
const COURIER_META: Record<string, { abr: string; color: string }> = {
  Express:      { abr: 'EXP', color: '#4338CA' },
  Standard:     { abr: 'STD', color: '#15803D' },
  Economy:      { abr: 'ECO', color: '#B45309' },
  Delhivery:    { abr: 'DLV', color: '#4338CA' },
  XpressBees:   { abr: 'XB',  color: '#15803D' },
  'Ecom Express': { abr: 'EE', color: '#B45309' },
  Shadowfax:    { abr: 'SFX', color: '#7C3AED' },
  'Blue Dart':  { abr: 'BD',  color: '#1D4ED8' },
}

function getCourierMeta(name: string) {
  if (COURIER_META[name]) return COURIER_META[name]
  return { abr: name.slice(0, 3).toUpperCase(), color: '#6366F1' }
}

// ─── Skeleton loader ───────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 p-3.5 px-4 border-b border-slate-100 animate-pulse">
      <div className="w-9 h-9 rounded-lg bg-slate-100 shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-slate-100 rounded w-32" />
        <div className="h-2 bg-slate-100 rounded w-48" />
      </div>
      <div className="h-6 bg-slate-100 rounded w-16" />
      <div className="h-7 bg-slate-100 rounded w-16" />
    </div>
  )
}

// ─── PDF Generator ─────────────────────────────────────────────────────────────
function generateNegotiationPDF(result: RateCompareResponse, shipmentsPerMonth: number) {
  const doc = new jsPDF()
  const savings = result.market_analysis.potential_monthly_savings * (shipmentsPerMonth / 10)
  const formattedDate = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
  const yShift = 8
  
  // Header Branding
  doc.setFontSize(26)
  doc.setTextColor(30, 58, 138) // Blue-900
  doc.text('LogiSahay', 14, 24)
  
  doc.setFontSize(12)
  doc.setTextColor(100, 116, 139) // Slate-500
  doc.text('Logistics Intelligence for Indian Micro-Sellers', 14, 31)
  
  // Title
  doc.setFontSize(16)
  doc.setTextColor(15, 23, 42) // Slate-900
  doc.text('Courier Rate Negotiation Brief', 14, 46)

  // Meta Data box (Top Right)
  doc.setFontSize(10)
  doc.setTextColor(30, 41, 59)
  doc.text(`Generated: ${formattedDate}`, 120, 24)
  doc.text(`Route: ${result.query.pickup_pin} → ${result.query.delivery_pin}`, 120, 30)
  doc.text(`Weight: ${result.query.weight_kg} kg | ${result.query.is_cod ? 'COD' : 'Prepaid'}`, 120, 36)

  doc.setDrawColor(226, 232, 240) // Slate-200
  doc.line(14, 52, 196, 52)
  
  let currentY = 62

  // --- 1. Current Market Rates (Table) ---
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42)
  doc.text('Current Market Rates', 14, currentY)
  
  const tableData = result.all_rates.map((r, i) => [
    i + 1,
    r.courier_name,
    `Rs ${r.total_cost.toFixed(2)}`,
    `${r.estimated_days} days`,
    `${(r.reliability_score * 100).toFixed(0)}%`,
    r.cod_available ? 'Yes' : 'No'
  ])

  autoTable(doc, {
    startY: currentY + 4,
    head: [['#', 'Courier Service', 'Rate', 'ETA', 'Reliability', 'COD']],
    body: tableData,
    theme: 'grid',
    headStyles: { fillColor: [30, 58, 138], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { cellWidth: 10 } }
  })
  
  currentY = (doc as any).lastAutoTable.finalY + 14

  // --- 2. Market Analysis ---
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42)
  doc.text('Market Analysis', 14, currentY)
  currentY += yShift

  doc.setFontSize(11)
  doc.setTextColor(51, 65, 85) // Slate-700
  doc.text(`Cheapest Option:  Rs ${result.market_analysis.min_cost.toFixed(2)}`, 14, currentY)
  doc.text(`Market Average:   Rs ${result.market_analysis.market_avg.toFixed(2)}`, 14, currentY + yShift)
  doc.text(`Most Expensive:   Rs ${result.market_analysis.max_cost.toFixed(2)}`, 14, currentY + yShift * 2)
  currentY += (yShift * 3 + 6)
  
  doc.setDrawColor(226, 232, 240)
  doc.line(14, currentY, 196, currentY)
  currentY += 8

  // --- 3. Negotiation Leverage ---
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42)
  doc.text(`Negotiation Leverage (${shipmentsPerMonth} shipments/month)`, 14, currentY)
  currentY += yShift

  doc.setFontSize(11)
  doc.setTextColor(51, 65, 85)
  doc.text(`If you switch to the cheapest courier at your current volume:`, 14, currentY)
  
  doc.setTextColor(21, 128, 61) // Green-700
  doc.setFont("helvetica", "bold")
  doc.text(`> Monthly Savings: Rs ${savings.toFixed(0)}`, 18, currentY + yShift + 2)
  doc.text(`> Annual Savings:  Rs ${(savings * 12).toFixed(0)}`, 18, currentY + yShift * 2 + 2)
  doc.setFont("helvetica", "normal")
  currentY += (yShift * 3 + 12)

  // --- 4. Recommended Ask ---
  doc.setFontSize(13)
  doc.setTextColor(15, 23, 42)
  doc.text('Recommended Pitch', 14, currentY)
  currentY += 4

  // Info Block background
  doc.setFillColor(241, 245, 249) // Slate-100
  doc.roundedRect(14, currentY, 182, 34, 3, 3, 'F')
  
  doc.setFontSize(10)
  doc.setTextColor(71, 85, 105)
  doc.setFont("helvetica", "italic")
  const askPitch = `"Our current monthly volume is ${shipmentsPerMonth} shipments on this route. \nThe market rate for this weight/zone is Rs ${result.market_analysis.min_cost.toFixed(2)}. \nWe request a rate at or below Rs ${(result.market_analysis.min_cost * 0.95).toFixed(2)} (5% below market) \nfor a 6-month commitment. This is competitive with current market options."`
  doc.text(askPitch, 18, currentY + 8)
  currentY += 50

  // Footer
  doc.setFont("helvetica", "normal")
  doc.setFontSize(9)
  doc.setTextColor(148, 163, 184)
  doc.text('Generated by LogiSahay — https://logisahay.com', 105, 285, { align: 'center' })

  // Save the actual PDF
  doc.save(`Negotiation-Brief-${result.query.pickup_pin}-${result.query.delivery_pin}.pdf`)
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function RatesPage() {
  const [pickupPin, setPickupPin] = useState('395003')
  const [deliveryPin, setDeliveryPin] = useState('110001')
  const [weightGrams, setWeightGrams] = useState('500')
  const [isCod, setIsCod] = useState(false)
  const [shipmentsPerMonth, setShipmentsPerMonth] = useState(50)

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RateCompareResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)
  const [showMap, setShowMap] = useState(false)

  const handleCompare = useCallback(async () => {
    if (pickupPin.length !== 6 || deliveryPin.length !== 6) {
      setError('Please enter valid 6-digit PIN codes')
      return
    }
    const weightKg = parseFloat(weightGrams) / 1000
    if (isNaN(weightKg) || weightKg <= 0) {
      setError('Please enter a valid weight')
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setHasSearched(true)
    setShowMap(false)

    try {
      const data = await api.compareRates({
        pickup_pin: pickupPin,
        delivery_pin: deliveryPin,
        weight_kg: weightKg,
        is_cod: isCod,
      })
      setResult(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to fetch rates. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [pickupPin, deliveryPin, weightGrams, isCod])

  const monthlySavings = result
    ? Math.round(result.market_analysis.potential_monthly_savings * (shipmentsPerMonth / 10))
    : 0

  const annualSavings = monthlySavings * 12

  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mb-1">
            <span>Dashboard</span>
            <span className="text-muted-foreground/40">/</span>
            <span>Rate Comparator</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading leading-none">Rate Comparator</h1>
          <p className="text-[12px] text-muted-foreground mt-1.5">
            Live courier rates. Compare, calculate, and negotiate with confidence.
          </p>
        </div>
        {result && (
          <button
            onClick={() => generateNegotiationPDF(result, shipmentsPerMonth)}
            className="flex items-center gap-1.5 px-4 py-2 bg-foreground hover:opacity-90 text-background rounded-xl text-[12px] font-semibold transition-all duration-200 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Export Brief
          </button>
        )}
      </div>

      {/* ── Input Form ── */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-sm">
        <div className="text-[12px] font-semibold text-muted-foreground uppercase tracking-wider mb-3.5">Shipment Details</div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">From Pincode</label>
            <input
              type="text"
              value={pickupPin}
              onChange={e => setPickupPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="395003 (Surat)"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[13px] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">To Pincode</label>
            <input
              type="text"
              value={deliveryPin}
              onChange={e => setDeliveryPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="110001 (Delhi)"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[13px] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">Weight (grams)</label>
            <input
              type="number"
              value={weightGrams}
              onChange={e => setWeightGrams(e.target.value)}
              placeholder="500"
              min="1"
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[13px] text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/15 transition-all"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-medium text-muted-foreground">Payment Type</label>
            <select
              value={isCod ? 'cod' : 'prepaid'}
              onChange={e => setIsCod(e.target.value === 'cod')}
              className="w-full px-3 py-2 bg-background border border-border rounded-lg text-[13px] text-foreground outline-none focus:border-primary transition-all cursor-pointer"
            >
              <option value="prepaid">Prepaid</option>
              <option value="cod">COD (+2%)</option>
            </select>
          </div>

          <button
            onClick={handleCompare}
            disabled={loading}
            className="h-[38px] px-4 bg-primary hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground rounded-lg text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-all duration-200 shadow-sm shadow-primary/20"
          >
            {loading ? (
              <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Comparing...</>
            ) : (
              <><Compass className="w-3.5 h-3.5" /> Compare</>
            )}
          </button>
        </div>

        {/* Inline error */}
        {error && (
          <div className="mt-3 flex items-center gap-2 text-[12px] text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {error}
            <button onClick={handleCompare} className="ml-auto underline text-[11px]">Retry</button>
          </div>
        )}
      </div>

      {/* ── Loading skeleton ── */}
      {loading && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="flex items-center justify-between p-3.5 px-4 border-b border-slate-100 bg-slate-50/50">
            <div className="h-3 bg-slate-100 rounded animate-pulse w-40" />
            <div className="h-3 bg-slate-100 rounded animate-pulse w-24" />
          </div>
          {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
        </div>
      )}

      {/* ── Empty / pre-search state ── */}
      {!loading && !result && !hasSearched && (
        <div className="bg-card border border-dashed border-border rounded-xl p-10 text-center">
          <Navigation className="w-8 h-8 text-muted-foreground/25 mx-auto mb-3" />
          <p className="text-[13px] text-muted-foreground">Enter PIN codes above and click <strong className="text-foreground">Compare</strong> to see live rates</p>
          <p className="text-[11px] text-muted-foreground/60 mt-1">Rates are calculated from our deterministic zone engine — no external API required</p>
        </div>
      )}

      {/* ── Results ── */}
      {result && !loading && (
        <div className="flex flex-col gap-4">

          {/* Courier list */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between p-3.5 px-4 border-b border-border bg-muted/30">
              <div className="text-[13px] font-semibold text-foreground font-heading">
                {result.all_rates.length} options · {result.query.pickup_pin} → {result.query.delivery_pin} · {weightGrams}g {isCod ? 'COD' : 'Prepaid'}
              </div>
              <div className="flex items-center gap-2">
                {/* View Route Map button */}
                <button
                  onClick={() => setShowMap(prev => !prev)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11.5px] font-medium transition-all duration-200 border ${
                    showMap
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-200'
                      : 'bg-background hover:bg-indigo-50 text-indigo-600 border-indigo-200 hover:border-indigo-400'
                  }`}
                >
                  <Map className="w-3.5 h-3.5" />
                  {showMap ? 'Hide Map' : 'View Route Map'}
                </button>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Live from backend
                </div>
              </div>
            </div>

            {result.warning && (
              <div className="px-4 py-2 text-[11px] text-amber-700 bg-amber-50 border-b border-amber-100 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {result.warning}
              </div>
            )}

            <div className="flex flex-col">
              {result.all_rates
                .slice()
                .sort((a, b) => a.total_cost - b.total_cost)
                .map((rate, i) => {
                  const isBest = i === 0
                  const meta = getCourierMeta(rate.courier_name)
                  const relPct = Math.round(rate.reliability_score * 100)
                  const relColor = relPct >= 85 ? '#22c55e' : relPct >= 70 ? '#f59e0b' : '#ef4444'
                  const relTextColor = relPct >= 85 ? '#15803d' : relPct >= 70 ? '#b45309' : '#b91c1c'

                  return (
                    <div
                      key={`${rate.courier_name}-${rate.service_type}`}
                      className={`relative flex items-center gap-3 p-3.5 px-4 border-b border-slate-100 last:border-0 hover:bg-slate-50 cursor-pointer transition-colors group ${isBest ? 'bg-indigo-50/30 hover:bg-indigo-50/50' : ''}`}
                    >
                      {isBest && <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-600 rounded-r-sm" />}

                      {/* Avatar */}
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-bold border shrink-0"
                        style={{ color: meta.color, borderColor: `${meta.color}20`, backgroundColor: `${meta.color}10` }}
                      >
                        {meta.abr}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-slate-900 flex items-center gap-1.5">
                          {rate.courier_name}
                          <span className="text-[10px] text-slate-400 font-normal">({rate.service_type})</span>
                          {isBest && (
                            <span className="text-[10px] text-indigo-600 font-medium flex items-center gap-0.5">
                              <Star className="w-3 h-3 fill-indigo-600" /> Best value
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {rate.estimated_days} day{rate.estimated_days !== 1 ? 's' : ''}
                          </div>
                          {rate.cod_available && (
                            <div className="text-[10.5px] text-emerald-600 flex items-center gap-0.5">
                              <Shield className="w-3 h-3" /> COD
                            </div>
                          )}
                          <div className="flex items-center gap-1.5">
                            <div className="w-10 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${relPct}%`, backgroundColor: relColor }} />
                            </div>
                            <span className="text-[10.5px] font-medium" style={{ color: relTextColor }}>
                              {relPct}% reliable
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Price + Book */}
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="text-right">
                          <div className="text-[18px] font-bold text-slate-900 tracking-tight">
                            ₹{rate.total_cost.toFixed(0)}
                          </div>
                          {rate.base_cost !== rate.total_cost && (
                            <div className="text-[10px] text-slate-400 text-right">
                              base ₹{rate.base_cost.toFixed(0)}
                            </div>
                          )}
                        </div>
                        <button className="ml-1 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11.5px] font-medium transition-colors opacity-0 group-hover:opacity-100 duration-150">
                          Book →
                        </button>
                      </div>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* ── Route Map ── */}
          {showMap && (
            <RouteMap
              fromPin={result.query.pickup_pin}
              toPin={result.query.delivery_pin}
              bestCourier={result.recommended?.courier_name}
              bestCourierReliability={result.recommended?.reliability_score}
              onClose={() => setShowMap(false)}
            />
          )}

          {/* ── Two bottom cards ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Market Analysis Card */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <TrendingDown className="w-4 h-4 text-emerald-600" />
                <div className="text-[13px] font-semibold text-foreground font-heading">Market Rate Analysis</div>
              </div>
              <div className="text-[12px] text-muted-foreground mb-4">Your rate vs. what the market offers</div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-slate-600">Cheapest option</span>
                  <span className="text-[14px] font-bold text-emerald-600">₹{result.market_analysis.min_cost.toFixed(0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-slate-600">Market average</span>
                  <span className="text-[14px] font-semibold text-slate-900">₹{result.market_analysis.market_avg.toFixed(0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[12px] text-slate-600">Most expensive</span>
                  <span className="text-[14px] font-semibold text-slate-400">₹{result.market_analysis.max_cost.toFixed(0)}</span>
                </div>

                <div className="border-t border-slate-100 pt-3">
                  <div className="text-[11px] text-slate-500 mb-2">Savings calculator — shipments / month</div>
                  <input
                    type="range"
                    min={10}
                    max={500}
                    step={10}
                    value={shipmentsPerMonth}
                    onChange={e => setShipmentsPerMonth(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-0.5 mb-3">
                    <span>10</span><span>{shipmentsPerMonth} shipments</span><span>500</span>
                  </div>

                  {monthlySavings > 0 ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 text-center">
                      <div className="text-[11px] text-emerald-700 mb-0.5">Potential monthly savings</div>
                      <div className="text-[22px] font-bold text-emerald-700">₹{monthlySavings.toLocaleString('en-IN')}</div>
                      <div className="text-[10.5px] text-emerald-600 mt-0.5">₹{annualSavings.toLocaleString('en-IN')} / year by switching to cheapest option</div>
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 text-center">
                      <div className="text-[12px] text-slate-500">All couriers are priced identically for this route</div>
                    </div>
                  )}
                </div>

                {result && (
                  <button
                    onClick={() => generateNegotiationPDF(result, shipmentsPerMonth)}
                    className="w-full mt-1 flex items-center justify-center gap-1.5 py-2 px-3 border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-lg text-[11.5px] font-medium transition-all duration-200"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Negotiation Brief
                  </button>
                )}
              </div>
            </div>

            {/* Reliability Chart Card */}
            <div className="bg-card border border-border rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4 text-indigo-600" />
                <div className="text-[13px] font-semibold text-slate-900">Reliability Comparison</div>
              </div>
              <div className="text-[12px] text-slate-500 mb-4">
                Delivery success rate · {result.query.pickup_pin} → {result.query.delivery_pin}
              </div>

              <div className="flex flex-col space-y-3">
                {result.all_rates
                  .slice()
                  .sort((a, b) => b.reliability_score - a.reliability_score)
                  .map(rate => {
                    const pct = Math.round(rate.reliability_score * 100)
                    const color = pct >= 85 ? '#22c55e' : pct >= 70 ? '#f59e0b' : '#ef4444'
                    const textColor = pct >= 85 ? '#15803d' : pct >= 70 ? '#b45309' : '#b91c1c'
                    return (
                      <div key={`rel-${rate.courier_name}-${rate.service_type}`} className="flex items-center gap-2.5">
                        <div className="text-[11.5px] text-slate-600 w-24 shrink-0 truncate">{rate.courier_name}</div>
                        <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, backgroundColor: color }}
                          />
                        </div>
                        <div className="text-[11px] font-medium w-8 text-right" style={{ color: textColor }}>
                          {pct}%
                        </div>
                      </div>
                    )
                  })}
              </div>

              {/* Speed vs Cost scatter — simple visual */}
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="text-[11px] text-slate-500 mb-2">Speed vs. Cost</div>
                <div className="relative h-[80px] w-full bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                  {result.all_rates.map(rate => {
                    const meta = getCourierMeta(rate.courier_name)
                    const costs = result.all_rates.map(r => r.total_cost)
                    const days = result.all_rates.map(r => r.estimated_days)
                    const minCost = Math.min(...costs)
                    const maxCost = Math.max(...costs) || minCost + 1
                    const minDays = Math.min(...days)
                    const maxDays = Math.max(...days) || minDays + 1
                    const x = ((rate.total_cost - minCost) / (maxCost - minCost)) * 80 + 5
                    const y = ((rate.estimated_days - minDays) / (maxDays - minDays)) * 60 + 10
                    return (
                      <div
                        key={`dot-${rate.courier_name}`}
                        title={`${rate.courier_name}: ₹${rate.total_cost} | ${rate.estimated_days}d`}
                        className="absolute w-2 h-2 rounded-full border border-white shadow-sm"
                        style={{ backgroundColor: meta.color, left: `${x}%`, top: `${y}%` }}
                      />
                    )
                  })}
                  <div className="absolute bottom-1 left-1 text-[9px] text-slate-400">Cheaper →</div>
                  <div className="absolute top-1 right-1 text-[9px] text-slate-400">Slower</div>
                  <div className="absolute bottom-1 right-1 text-[9px] text-slate-400">Expensive</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
