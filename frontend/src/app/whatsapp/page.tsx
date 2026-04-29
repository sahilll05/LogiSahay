'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'
import {
  MessageSquare, CheckCircle2, AlertCircle, Copy, Play, RefreshCw,
  Wifi, WifiOff, Shield, ChevronRight,
  Smartphone, ArrowRight, Zap, Clock, TrendingUp, X, Send,
} from 'lucide-react'
import { ToggleSwitch } from '@/components/ui/toggle-switch'

interface WaStats {
  used: number; limit: number; resets_in_days: number
  mode: 'simulation' | 'live'; phone_number: string; business_id: string
}
interface WaLog {
  id: string; to: string; content: string; msg_type: string
  direction: 'outbound' | 'inbound'; simulated: boolean; created_at: string
}

const SMS_STEPS = [
  { step: '1', text: 'Courier sends you a tracking SMS', icon: Smartphone },
  { step: '2', text: 'Forward the SMS to your LogiSahay WhatsApp number', icon: ArrowRight },
  { step: '3', text: 'Bot automatically extracts the tracking ID', icon: Zap },
  { step: '4', text: 'Shipment appears on your dashboard instantly', icon: CheckCircle2 },
]

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}
function maskPhone(phone: string): string {
  if (phone.length < 6) return phone
  return phone.slice(0, -4).replace(/\d/g, '*') + phone.slice(-4)
}

// ── Message Detail Modal ──────────────────────────────────────────────────────
function MessageModal({ log, onClose }: { log: WaLog; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            Message Detail
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">To</div>
              <div className="text-sm font-mono text-slate-800">{log.to}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Direction</div>
              <div className="text-sm font-medium text-slate-800 capitalize">{log.direction}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Type</div>
              <div className="text-sm font-medium text-slate-800">{log.msg_type}</div>
            </div>
            <div className="bg-slate-50 rounded-lg p-3">
              <div className="text-xs text-slate-500 mb-1">Mode</div>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${log.simulated ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${log.simulated ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                {log.simulated ? 'Simulated' : 'Live'}
              </span>
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-1">Timestamp</div>
            <div className="text-sm text-slate-800">{new Date(log.created_at).toLocaleString('en-IN')}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-xs text-slate-500 mb-2">Message Content</div>
            <pre className="text-sm text-slate-800 font-sans whitespace-pre-wrap break-words">{log.content}</pre>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function WhatsAppPage() {
  const [stats, setStats] = useState<WaStats | null>(null)
  const [logs, setLogs] = useState<WaLog[]>([])
  const [rtoGuard, setRtoGuard] = useState(true)
  const [smsForward, setSmsForward] = useState(true)
  const [loadingStats, setLoadingStats] = useState(true)
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [logsAutoRefresh, setLogsAutoRefresh] = useState(true)
  const [selectedLog, setSelectedLog] = useState<WaLog | null>(null)

  // Settings state (from backend)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState<'rto' | 'sms' | null>(null)
  const [savingsThisMonth, setSavingsThisMonth] = useState(0)
  const [ndrPrevented, setNdrPrevented] = useState(0)
  const [recoveryRate, setRecoveryRate] = useState(74)

  // Manual send state
  const [testPhone, setTestPhone] = useState('919876543210')
  const [customMessage, setCustomMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sendResult, setSendResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      const data = await api.getWhatsAppStats()
      setStats({
        used: data.used, limit: data.limit, resets_in_days: data.resets_in_days,
        mode: data.mode,
        phone_number: (data as WaStats).phone_number ?? '+91 98765 43210 (demo)',
        business_id: (data as WaStats).business_id ?? 'demo-business-id',
      })
    } catch {
      setStats({ used: 47, limit: 1000, resets_in_days: 12, mode: 'simulation', phone_number: '+91 98765 43210 (demo)', business_id: 'demo-business-id' })
    } finally { setLoadingStats(false) }
  }, [])

  const fetchLogs = useCallback(async () => {
    try {
      const data = await api.getWhatsAppLogs(10)
      setLogs(data.logs || [])
    } catch { setLogs([]) }
    finally { setLoadingLogs(false) }
  }, [])

  const fetchSettings = useCallback(async () => {
    try {
      const data = await api.getWhatsAppSettings()
      setRtoGuard(data.rto_guard_enabled ?? true)
      setSmsForward(data.sms_forward_enabled ?? true)
      setSavingsThisMonth(data.savings_this_month ?? 0)
      setNdrPrevented(data.ndr_prevented ?? 0)
      setRecoveryRate(data.recovery_rate ?? 74)
    } catch {
      // silent — keep defaults
    } finally {
      setSettingsLoading(false)
    }
  }, [])

  const handleToggle = useCallback(async (key: 'rto' | 'sms', value: boolean) => {
    // Optimistic update
    if (key === 'rto') setRtoGuard(value)
    else setSmsForward(value)
    setSettingsSaving(key)

    try {
      await api.updateWhatsAppSettings({
        rto_guard_enabled: key === 'rto' ? value : rtoGuard,
        sms_forward_enabled: key === 'sms' ? value : smsForward,
      })
    } catch {
      // Rollback on failure
      if (key === 'rto') setRtoGuard(v => !v)
      else setSmsForward(v => !v)
    } finally {
      setSettingsSaving(null)
    }
  }, [rtoGuard, smsForward])

  useEffect(() => { fetchStats(); fetchLogs(); fetchSettings() }, [fetchStats, fetchLogs, fetchSettings])
  useEffect(() => {
    if (!logsAutoRefresh) return
    const id = setInterval(fetchLogs, 5000)
    return () => clearInterval(id)
  }, [logsAutoRefresh, fetchLogs])

  const sendMessage = async () => {
    if (!customMessage.trim() || !testPhone.trim()) return
    setSending(true); setSendResult(null)
    try {
      const res = await api.testWhatsAppSend(testPhone.trim(), customMessage.trim())
      setSendResult({ ok: true, msg: res.status === 'simulated' ? 'Simulated ✓' : 'Sent ✓' })
      setCustomMessage('')
      setTimeout(fetchLogs, 800)
    } catch {
      setSendResult({ ok: false, msg: 'Failed to send' })
    } finally {
      setSending(false)
      setTimeout(() => setSendResult(null), 3000)
    }
  }

  const usagePct = stats ? Math.min((stats.used / stats.limit) * 100, 100) : 0
  const isSimulation = stats?.mode !== 'live'

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-3 duration-500 pb-10">
      {selectedLog && <MessageModal log={selectedLog} onClose={() => setSelectedLog(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight font-heading">WhatsApp Companion</h1>
          <p className="text-[13px] text-muted-foreground mt-0.5">Your logistics assistant, delivered via WhatsApp</p>
        </div>
        {stats && (
          <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${isSimulation ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
            <span className={`w-2 h-2 rounded-full ${isSimulation ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'}`} />
            {isSimulation ? 'Simulation Mode' : 'Live — Meta API'}
          </span>
        )}
      </div>

      {/* Simulation Banner */}
      {isSimulation && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-800">Running in Simulation Mode</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Messages are logged to Supabase and printed to console. Set{' '}
              <code className="bg-amber-100 px-1 rounded font-mono">WHATSAPP_ACCESS_TOKEN</code> in{' '}
              <code className="bg-amber-100 px-1 rounded font-mono">.env</code> to go live.
            </p>
          </div>
          <a href="/settings" className="text-xs font-medium text-amber-700 hover:text-amber-900 underline underline-offset-2 whitespace-nowrap">Configure →</a>
        </div>
      )}

      {/* Connection Status */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[13px] font-semibold text-foreground flex items-center gap-2 font-heading">
            <MessageSquare className="w-4 h-4 text-primary" /> Connection Status
          </h2>
          <button onClick={fetchStats} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors" title="Refresh">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
        {loadingStats ? (
          <div className="grid grid-cols-3 gap-4">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <div className="text-[10.5px] font-medium text-muted-foreground mb-1">Phone Number</div>
              <div className="text-[13px] font-semibold text-foreground">{stats?.phone_number || '—'}</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <div className="text-[10.5px] font-medium text-muted-foreground mb-1">API Mode</div>
              <div className="flex items-center gap-1.5">
                {isSimulation ? <WifiOff className="w-4 h-4 text-amber-500" /> : <Wifi className="w-4 h-4 text-emerald-500" />}
                <span className="text-[13px] font-semibold capitalize text-foreground">{stats?.mode}</span>
              </div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 border border-border">
              <div className="text-[10.5px] font-medium text-muted-foreground mb-1">Verify Token</div>
              <div className="text-[12px] font-mono text-foreground truncate">LOGISAHAY_VERIFY_2026</div>
            </div>
          </div>
        )}
      </div>

      {/* Manual Send Panel */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <h2 className="text-[13px] font-semibold text-foreground mb-4 flex items-center gap-2 font-heading">
          <Send className="w-4 h-4 text-primary" /> Send a Test Message
        </h2>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Recipient Phone (with country code, no +)</label>
            <input
              type="text"
              value={testPhone}
              onChange={e => setTestPhone(e.target.value)}
              placeholder="919876543210"
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 block mb-1">Message</label>
            <textarea
              value={customMessage}
              onChange={e => setCustomMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) sendMessage() }}
              placeholder="Type your message… (Ctrl+Enter to send)"
              rows={3}
              className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={sendMessage}
              disabled={sending || !customMessage.trim() || !testPhone.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {sending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {sending ? 'Sending…' : 'Send'}
            </button>
            {sendResult && (
              <span className={`text-sm font-medium ${sendResult.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                {sendResult.msg}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Quick Command Suggestions */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
        <h2 className="text-[13px] font-semibold text-foreground mb-3 flex items-center gap-2 font-heading">
          <Zap className="w-4 h-4 text-primary" /> Quick Command Suggestions
        </h2>
        <p className="text-[11px] text-muted-foreground mb-4">Click any suggestion to load it into the message box above.</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: '📦 Rate Check', cmd: 'rate check: 395003 to 110001, 0.5kg' },
            { label: '📍 Track Shipment', cmd: 'track TRK908124' },
            { label: '🛡️ RTO Guard ON', cmd: '#RTOGuard ON' },
            { label: '🏭 Godown Search', cmd: 'godown near Surat, under 8k' },
            { label: '👋 Help', cmd: 'help' },
          ].map(({ label, cmd }) => (
            <button
              key={cmd}
              onClick={() => setCustomMessage(cmd)}
              className="text-xs px-3 py-1.5 rounded-full border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 transition-all"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SMS Forwarding */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-indigo-600" /> SMS Auto-Forwarding
          </h2>
          <div className="space-y-3">
            {SMS_STEPS.map(({ step, text, icon: Icon }) => (
              <div key={step} className="flex items-start gap-3">
                <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{step}</div>
                <p className="text-sm text-slate-700 flex-1">{text}</p>
                <Icon className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
            <p className="text-xs text-indigo-700"><strong>Tip:</strong> Works with Delhivery, Shiprocket, DTDC, Bluedart, Ekart, and more.</p>
          </div>
        </div>

        {/* RTO Guard Settings */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm">
          <h2 className="text-[13px] font-semibold text-foreground mb-4 flex items-center gap-2 font-heading">
            <Shield className="w-4 h-4 text-primary" /> RTO Guard Settings
          </h2>
          <div className="space-y-3">
            {/* Toggle rows */}
            <div className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg">
              <div>
                <div className="text-[13px] font-medium text-foreground">Auto NDR Follow-up</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Send WhatsApp when delivery fails</div>
              </div>
              <ToggleSwitch
                checked={rtoGuard}
                onChange={(v) => handleToggle('rto', v)}
                disabled={settingsLoading || settingsSaving === 'rto'}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg">
              <div>
                <div className="text-[13px] font-medium text-foreground">SMS Auto-Detection</div>
                <div className="text-[11px] text-muted-foreground mt-0.5">Extract tracking IDs from forwarded SMS</div>
              </div>
              <ToggleSwitch
                checked={smsForward}
                onChange={(v) => handleToggle('sms', v)}
                disabled={settingsLoading || settingsSaving === 'sms'}
              />
            </div>

            {/* Savings card — from backend */}
            {settingsLoading ? (
              <div className="h-14 bg-muted/40 rounded-lg animate-pulse" />
            ) : (
              <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <span className="text-[13px] font-semibold text-emerald-800 dark:text-emerald-300">
                    {savingsThisMonth > 0
                      ? `₹${savingsThisMonth.toLocaleString('en-IN')} saved this month`
                      : 'RTO Guard active'}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
                  RTO Guard prevented {ndrPrevented} returns across {recoveryRate}% recovery rate
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Monthly Usage */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-indigo-600" /> Monthly Usage
        </h2>
        {loadingStats ? (
          <div className="h-12 bg-slate-100 rounded-lg animate-pulse" />
        ) : (
          <>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-600"><span className="font-semibold text-slate-900">{stats?.used}</span> / {stats?.limit} messages</span>
              <span className="text-xs text-slate-500">Resets in {stats?.resets_in_days} days</span>
            </div>
            <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ${usagePct > 80 ? 'bg-red-500' : usagePct > 60 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                style={{ width: `${usagePct}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-400">{usagePct.toFixed(1)}% used</span>
              <span className="text-xs text-slate-400">{stats ? stats.limit - stats.used : 0} remaining</span>
            </div>
          </>
        )}
      </div>

      {/* Live Message Log */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-600" /> Live Message Log
            <span className="text-xs font-normal text-slate-400">(last 10 · click to expand)</span>
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLogsAutoRefresh(v => !v)}
              className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border transition-colors ${logsAutoRefresh ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
            >
              <RefreshCw className={`w-3 h-3 ${logsAutoRefresh ? 'animate-spin' : ''}`} />
              {logsAutoRefresh ? 'Live' : 'Paused'}
            </button>
            <button onClick={fetchLogs} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors" title="Refresh now">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {loadingLogs ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-slate-100 rounded-lg animate-pulse" />)}</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-slate-400">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No messages yet. Type a message above and send it.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {logs.map(log => (
              <button
                key={log.id}
                onClick={() => setSelectedLog(log)}
                className="w-full text-left flex gap-3 p-3 bg-slate-50 border border-slate-100 rounded-lg hover:border-indigo-200 hover:bg-indigo-50/30 transition-all group cursor-pointer"
              >
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${log.simulated ? 'bg-amber-400' : 'bg-emerald-500'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono text-slate-500">{maskPhone(log.to)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${log.simulated ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {log.simulated ? 'sim' : 'live'}
                    </span>
                    <span className="text-[10px] text-slate-400 ml-auto">{timeAgo(log.created_at)}</span>
                  </div>
                  <pre className="text-xs text-slate-700 font-sans whitespace-pre-wrap break-words line-clamp-2">{log.content}</pre>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-400 shrink-0 mt-1 transition-colors" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
