'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  AlertCircle,
  CheckCircle2,
  MessageCircle,
  ShieldCheck,
  Truck,
  ArrowRight,
  RefreshCw,
  MessageSquare,
  RotateCcw,
  XCircle,
  Loader2,
  Smartphone,
  Zap,
  UserCheck,
  PackageCheck,
} from 'lucide-react'
import { api, NDRCase, NDRAction } from '@/lib/api'

// ─── "How It Works" stepper data ──────────────────────────────────────────────
const HOW_IT_WORKS = [
  {
    icon: XCircle,
    color: 'bg-red-100 text-red-600',
    label: 'Delivery Fails',
    desc: 'Courier marks attempt as failed',
  },
  {
    icon: Smartphone,
    color: 'bg-amber-100 text-amber-600',
    label: 'SMS Forwarded',
    desc: 'Tracking SMS auto-detected by bot',
  },
  {
    icon: MessageSquare,
    color: 'bg-indigo-100 text-indigo-600',
    label: 'Bot Sends WA',
    desc: 'Customer receives slot options',
  },
  {
    icon: UserCheck,
    color: 'bg-blue-100 text-blue-600',
    label: 'Customer Replies',
    desc: 'Picks preferred re-delivery slot',
  },
  {
    icon: PackageCheck,
    color: 'bg-emerald-100 text-emerald-600',
    label: 'Delivery Saved',
    desc: '74% avg. recovery rate',
  },
]

// ─── Tab type ──────────────────────────────────────────────────────────────────
type TabFilter = 'open' | 'resolved' | 'rto'

// ─── Action state per case ─────────────────────────────────────────────────────
type ActionState = 'idle' | 'loading' | 'success' | 'error'

interface CaseActionState {
  resend: ActionState
  reattempt: ActionState
  rto: ActionState
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

const STATUS_BADGE: Record<string, string> = {
  open: 'bg-red-50 text-red-600',
  resolved: 'bg-emerald-50 text-emerald-700',
  rto: 'bg-slate-100 text-slate-600',
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function NdrPage() {
  const [tab, setTab] = useState<TabFilter>('open')
  const [cases, setCases] = useState<NDRCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [counts, setCounts] = useState({ open: 0, resolved: 0, rto: 0 })
  const [actionStates, setActionStates] = useState<Record<string, CaseActionState>>({})
  // tracks cases that should fade out (after RTO initiated)
  const [fadingOut, setFadingOut] = useState<Set<string>>(new Set())
  // WhatsApp simulation mode (from health endpoint or local state)
  const [waMode, setWaMode] = useState<'simulation' | 'live'>('simulation')
  // animated stepper step
  const [activeStep, setActiveStep] = useState(0)

  // ── Stepper auto-advance ──────────────────────────────────────────────────
  useEffect(() => {
    const t = setInterval(() => {
      setActiveStep((s) => (s + 1) % HOW_IT_WORKS.length)
    }, 2200)
    return () => clearInterval(t)
  }, [])

  // ── Fetch WA mode ─────────────────────────────────────────────────────────
  useEffect(() => {
    api.health().then((h) => setWaMode(h.whatsapp_mode)).catch(() => {})
  }, [])

  // ── Fetch cases ───────────────────────────────────────────────────────────
  const fetchCases = useCallback(
    async (filter: TabFilter) => {
      setLoading(true)
      setError(null)
      try {
        const res = await api.getNDRCases(filter)
        setCases(res.cases)
        // update counts for tab badges (approximate from this response)
        setCounts((prev) => ({ ...prev, [filter]: res.count }))
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load cases')
      } finally {
        setLoading(false)
      }
    },
    []
  )

  useEffect(() => {
    fetchCases(tab)
  }, [tab, fetchCases])

  // Fetch counts for other tabs in background
  useEffect(() => {
    const tabs: TabFilter[] = ['open', 'resolved', 'rto']
    tabs.forEach((t) =>
      api
        .getNDRCases(t)
        .then((r) => setCounts((prev) => ({ ...prev, [t]: r.count })))
        .catch(() => {})
    )
  }, [])

  // ── Action helper ─────────────────────────────────────────────────────────
  const setActionState = (
    caseId: string,
    key: keyof CaseActionState,
    state: ActionState
  ) => {
    setActionStates((prev) => {
      const existing: CaseActionState = prev[caseId] ?? { resend: 'idle', reattempt: 'idle', rto: 'idle' }
      return { ...prev, [caseId]: { ...existing, [key]: state } }
    })
  }

  const handleAction = async (
    caseId: string,
    action: NDRAction,
    key: keyof CaseActionState
  ) => {
    setActionState(caseId, key, 'loading')
    try {
      await api.actionNDRCase(caseId, action)
      setActionState(caseId, key, 'success')

      if (action === 'initiate_rto') {
        // Fade out then remove from list
        setFadingOut((prev) => new Set(prev).add(caseId))
        setTimeout(() => {
          setCases((prev) => prev.filter((c) => c.id !== caseId))
          setCounts((prev) => ({ ...prev, open: Math.max(0, prev.open - 1), rto: prev.rto + 1 }))
          setFadingOut((prev) => {
            const next = new Set(prev)
            next.delete(caseId)
            return next
          })
        }, 500)
      } else if (action === 'reattempt') {
        // Optimistically update attempt count display only
        setCases((prev) =>
          prev.map((c) =>
            c.id === caseId ? { ...c, attempt: c.attempt + 1, updated_at: new Date().toISOString() } : c
          )
        )
      }

      // Reset to idle after 2.5s
      setTimeout(() => setActionState(caseId, key, 'idle'), 2500)
    } catch {
      setActionState(caseId, key, 'error')
      setTimeout(() => setActionState(caseId, key, 'idle'), 2000)
    }
  }

  // ── Stats from cases / counts ─────────────────────────────────────────────
  const statsCards = [
    {
      icon: AlertCircle,
      iconClass: 'bg-red-50 text-red-600',
      value: counts.open,
      label: 'Open NDR cases',
    },
    {
      icon: CheckCircle2,
      iconClass: 'bg-emerald-50 text-emerald-600',
      value: counts.resolved,
      label: 'Resolved this month',
    },
    {
      icon: MessageCircle,
      iconClass: 'bg-indigo-50 text-indigo-600',
      value: '74%',
      label: 'WA response rate',
    },
    {
      icon: ShieldCheck,
      iconClass: 'bg-amber-50 text-amber-600',
      value: '₹4,200',
      label: 'RTO losses prevented',
    },
  ]

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground font-heading leading-none">
            NDR Automation
          </h1>
          <p className="text-[12px] text-muted-foreground mt-1.5">
            Auto-resolve failed deliveries via WhatsApp. Reduce RTO losses.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-0.5 bg-muted p-0.5 rounded-lg">
          {(['open', 'resolved', 'rto'] as TabFilter[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative px-3.5 py-1.5 text-[12px] font-medium rounded-md transition-all duration-150 ${
                tab === t
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
              <span className={`ml-1 text-[10px] font-bold px-1 py-0.5 rounded-full ${
                t === 'open' ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/50 dark:text-rose-300'
                : t === 'resolved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                : 'bg-muted text-muted-foreground'
              }`}>{counts[t]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Stats cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-2">
        {statsCards.map(({ icon: Icon, iconClass, value, label }) => (
          <div
            key={label}
            className="bg-card border border-border rounded-xl p-4 flex items-center gap-3.5 shadow-sm animate-lift"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${iconClass}`}>
              <Icon className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="text-[22px] font-bold text-foreground tracking-tight leading-none font-heading">
                {value}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main layout ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* ── Case list (2/3 width) ────────────────────────────────────────── */}
        <div className="col-span-1 lg:col-span-2 space-y-3">

          {/* Loading */}
          {loading && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-white border border-slate-200 rounded-xl animate-pulse shadow-sm" />
              ))}
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              <div className="flex-1 text-sm text-red-700">{error}</div>
              <button
                onClick={() => fetchCases(tab)}
                className="text-xs font-medium text-red-700 hover:text-red-900 underline underline-offset-2"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && cases.length === 0 && (
            <div className="bg-white border border-slate-200 rounded-xl p-10 text-center">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
              <p className="text-sm font-medium text-slate-700">No {tab} cases</p>
              <p className="text-xs text-slate-400 mt-1">All clear on this filter!</p>
            </div>
          )}

          {/* Case cards */}
          {!loading &&
            !error &&
            cases.map((ndr) => {
              const as = actionStates[ndr.id] ?? {
                resend: 'idle',
                reattempt: 'idle',
                rto: 'idle',
              }
              const isFading = fadingOut.has(ndr.id)

              return (
                <div
                  key={ndr.id}
                  className={`relative bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md transition-all duration-500 overflow-hidden ${
                    isFading ? 'opacity-0 scale-95 pointer-events-none' : 'opacity-100 scale-100'
                  }`}
                >
                  {/* Status-colored left border accent */}
                  <div className={`absolute left-0 top-0 bottom-0 w-[3px] rounded-l-xl ${
                    ndr.status === 'open' ? 'bg-rose-500'
                    : ndr.status === 'resolved' ? 'bg-emerald-500'
                    : 'bg-muted-foreground/30'
                  }`} />
                  {/* Card header */}
                  <div className="flex items-start gap-3 mb-3 pl-2">
                    <div className={`w-[32px] h-[32px] rounded-lg flex items-center justify-center shrink-0 ${
                      ndr.status === 'open' ? 'bg-rose-50 dark:bg-rose-950/30'
                      : ndr.status === 'resolved' ? 'bg-emerald-50 dark:bg-emerald-950/30'
                      : 'bg-muted'
                    }`}>
                      <Truck className={`w-4 h-4 ${
                        ndr.status === 'open' ? 'text-rose-600'
                        : ndr.status === 'resolved' ? 'text-emerald-600'
                        : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="text-[13px] font-semibold text-foreground">
                        {ndr.id} · {ndr.destination} · {ndr.pin}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        Attempt {ndr.attempt} · {timeAgo(ndr.updated_at)}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        STATUS_BADGE[ndr.status] ?? 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {ndr.status.charAt(0).toUpperCase() + ndr.status.slice(1)}
                    </span>
                  </div>

                  {/* Timeline */}
                  <div className="pl-3 ml-1.5 border-l-2 border-slate-100 flex flex-col gap-2.5 mb-4 relative">
                    <div className="flex items-center gap-2">
                      <div className="absolute left-[-5px] w-2 h-2 rounded-full bg-red-500" />
                      <div className="text-[11.5px] text-slate-600 flex-1">{ndr.reason}</div>
                      <div className="text-[10px] text-slate-400">{timeAgo(ndr.created_at)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className={`absolute left-[-5px] w-2 h-2 rounded-full ${
                          ndr.whatsapp_sent ? 'bg-indigo-600' : 'bg-slate-300'
                        }`}
                      />
                      <div
                        className={`text-[11.5px] flex-1 ${
                          ndr.whatsapp_sent ? 'text-slate-600' : 'text-slate-400'
                        }`}
                      >
                        {ndr.whatsapp_sent
                          ? 'WhatsApp message sent ✓'
                          : 'WhatsApp not yet sent'}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="absolute left-[-5px] w-2 h-2 rounded-full bg-slate-200" />
                      <div className="text-[11.5px] text-slate-400 flex-1">
                        Awaiting customer reply...
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    {/* Resend WhatsApp */}
                    <ActionButton
                      state={as.resend}
                      label="Resend WhatsApp"
                      successLabel="Sent ✓"
                      icon={<MessageSquare className="w-3 h-3" />}
                      variant="primary"
                      tooltip={
                        waMode === 'simulation'
                          ? 'Message will be logged (simulation mode)'
                          : undefined
                      }
                      onClick={() => handleAction(ndr.id, 'resend_whatsapp', 'resend')}
                    />

                    {/* Reattempt */}
                    <ActionButton
                      state={as.reattempt}
                      label="Reattempt"
                      successLabel="Scheduled ✓"
                      icon={<RotateCcw className="w-3 h-3" />}
                      variant="ghost"
                      onClick={() => handleAction(ndr.id, 'reattempt', 'reattempt')}
                    />

                    {/* Initiate RTO */}
                    <ActionButton
                      state={as.rto}
                      label="Initiate RTO"
                      successLabel="RTO Started"
                      icon={<ArrowRight className="w-3 h-3" />}
                      variant="ghost"
                      onClick={() => handleAction(ndr.id, 'initiate_rto', 'rto')}
                    />
                  </div>

                  {/* Simulation notice */}
                  {waMode === 'simulation' && (
                    <p className="text-[10px] text-amber-600 mt-2.5 flex items-center gap-1">
                      <Zap className="w-3 h-3" />
                      Simulation mode — WhatsApp messages are logged, not sent
                    </p>
                  )}
                </div>
              )
            })}
        </div>

        {/* ── Right column ────────────────────────────────────────────────── */}
        <div className="col-span-1 space-y-4">

          {/* "How It Works" animated stepper */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm sticky top-20">
            <div className="text-[13px] font-semibold text-slate-900 mb-4 flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-indigo-600" />
              How It Works
            </div>

            <div className="space-y-3">
              {HOW_IT_WORKS.map(({ icon: Icon, color, label, desc }, idx) => {
                const isPast = idx < activeStep
                const isCurrent = idx === activeStep
                return (
                  <div
                    key={label}
                    className={`flex items-start gap-3 transition-all duration-500 ${
                      isCurrent ? 'opacity-100' : isPast ? 'opacity-40' : 'opacity-30'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 ${
                        isCurrent ? color + ' scale-110 ring-2 ring-indigo-200' : color
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <div
                        className={`text-[12px] font-semibold transition-colors ${
                          isCurrent ? 'text-slate-900' : 'text-slate-600'
                        }`}
                      >
                        {label}
                      </div>
                      <div className="text-[11px] text-slate-500">{desc}</div>
                    </div>

                    {/* Connector */}
                    {idx < HOW_IT_WORKS.length - 1 && (
                      <div className="absolute ml-4 mt-8 w-px h-3 bg-slate-200" />
                    )}
                  </div>
                )
              })}
            </div>

            {/* Progress dots */}
            <div className="flex items-center justify-center gap-1.5 mt-5">
              {HOW_IT_WORKS.map((_, i) => (
                <div
                  key={i}
                  className={`rounded-full transition-all duration-300 ${
                    i === activeStep
                      ? 'w-4 h-1.5 bg-indigo-600'
                      : 'w-1.5 h-1.5 bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* WhatsApp message preview */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <div className="text-[13px] font-semibold text-slate-900 mb-1">
              WhatsApp Preview
            </div>
            <div className="text-[11px] text-slate-500 mb-3.5">
              Auto-sent to customer on delivery failure
            </div>

            <div className="bg-[#ECF4EA] border border-black/5 rounded-xl p-3 mb-5">
              <div className="text-[10px] text-black/50 font-medium mb-2">LogiSahay Bot</div>
              <div className="bg-white rounded-[10px] rounded-tr-none p-2.5 text-[11.5px] text-[#1A1714] shadow-sm inline-block max-w-[90%] leading-relaxed">
                नमस्ते! 🙏<br /><br />
                आपका पार्सल <strong>#SHP-8818</strong> आज deliver नहीं हो सका।<br /><br />
                क्या आप delivery कब चाहते हैं?<br /><br />
                1️⃣ कल सुबह (10am–2pm)<br />
                2️⃣ कल शाम (4pm–8pm)<br />
                3️⃣ परसों<br /><br />
                बस reply में number भेजें।
                <div className="text-[9px] text-black/40 text-right mt-1">10:32 AM ✓✓</div>
              </div>
            </div>

            <div className="h-[1px] bg-slate-100 my-4" />

            <div className="text-[13px] font-semibold text-slate-900 mb-2">
              Escalation rules
            </div>

            {[
              { label: 'Auto WhatsApp on 1st failure', defaultOn: true },
              { label: 'Auto RTO after 3 failures', defaultOn: true },
              { label: 'SMS fallback', defaultOn: false },
            ].map(({ label, defaultOn }) => (
              <div
                key={label}
                className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
              >
                <div className="text-[11.5px] font-medium text-slate-900">{label}</div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    defaultChecked={defaultOn}
                  />
                  <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600" />
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── ActionButton component ────────────────────────────────────────────────────
interface ActionButtonProps {
  state: ActionState
  label: string
  successLabel: string
  icon: React.ReactNode
  variant: 'primary' | 'ghost'
  onClick: () => void
  tooltip?: string
}

function ActionButton({
  state,
  label,
  successLabel,
  icon,
  variant,
  onClick,
  tooltip,
}: ActionButtonProps) {
  const base =
    'px-3 py-1.5 rounded-md text-[11px] font-medium flex items-center gap-1 transition-all duration-200 relative group'

  const styles = {
    primary: {
      idle: `${base} bg-indigo-600 hover:bg-indigo-700 text-white`,
      loading: `${base} bg-indigo-400 text-white cursor-not-allowed`,
      success: `${base} bg-emerald-600 text-white`,
      error: `${base} bg-red-500 text-white`,
    },
    ghost: {
      idle: `${base} bg-white border border-slate-200 hover:bg-slate-50 text-slate-600`,
      loading: `${base} bg-white border border-slate-200 text-slate-400 cursor-not-allowed`,
      success: `${base} bg-emerald-50 border border-emerald-200 text-emerald-700`,
      error: `${base} bg-red-50 border border-red-200 text-red-600`,
    },
  }

  const icons = {
    idle: icon,
    loading: <Loader2 className="w-3 h-3 animate-spin" />,
    success: <CheckCircle2 className="w-3 h-3" />,
    error: <AlertCircle className="w-3 h-3" />,
  }

  const labels = {
    idle: label,
    loading: '...',
    success: successLabel,
    error: 'Failed',
  }

  return (
    <button
      onClick={onClick}
      disabled={state === 'loading'}
      className={styles[variant][state]}
      title={tooltip}
    >
      {icons[state]}
      {labels[state]}
      {/* Tooltip */}
      {tooltip && state === 'idle' && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-800 text-white text-[10px] rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none">
          {tooltip}
        </span>
      )}
    </button>
  )
}
