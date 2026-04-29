/**
 * LogiSahay API Client
 * All backend communication goes through here.
 * Base URL is set via NEXT_PUBLIC_API_URL env var.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CourierRate {
  courier_name: string
  base_cost: number
  total_cost: number
  estimated_days: number
  reliability_score: number
  cod_available: boolean
  service_type: string
  raw_response: null
}

export interface PinCoords {
  city: string
  state: string
  lat: number
  lng: number
}

export interface MarketAnalysis {
  min_cost: number
  max_cost: number
  market_avg: number
  potential_monthly_savings: number
}

export interface RateCompareResponse {
  success: boolean
  user_id: string
  query: {
    pickup_pin: string
    delivery_pin: string
    weight_kg: number
    is_cod: boolean
  }
  all_rates: CourierRate[]
  recommended: CourierRate
  market_analysis: MarketAnalysis
  warning?: string
}

export interface DashboardMetrics {
  success: boolean
  source: 'live' | 'demo'
  total_shipments: number
  active_shipments: number
  delivered_this_month: number
  revenue_this_month: number
  savings_this_month: number
  savings_goal: number
  ndr_open: number
  ndr_resolved: number
  rto_losses_prevented_inr: number
  whatsapp_response_rate: number
  active_shipment_list: Array<{ tracking_id: string; destination: string; status: string }>
  attention_needed: Array<{ id: string; issue: string; shipment: string }>
}

export interface WaLog {
  id: string
  to: string
  content: string
  msg_type: string
  direction: 'outbound' | 'inbound'
  simulated: boolean
  created_at: string
}

export interface WaSettings {
  success: boolean
  rto_guard_enabled: boolean
  sms_forward_enabled: boolean
  savings_this_month: number
  ndr_prevented: number
  recovery_rate: number
}

export interface NDRCase {
  id: string
  tracking_id: string
  destination: string
  pin: string
  reason: string
  attempt: number
  status: 'open' | 'resolved' | 'rto'
  whatsapp_sent: boolean
  created_at: string
  updated_at: string
}

export interface NDRCasesResponse {
  success: boolean
  source: 'live' | 'demo'
  cases: NDRCase[]
  count: number
}

export interface Shipment {
  id: string
  tracking_id: string
  courier_name: string
  pickup_pin: string
  delivery_pin: string
  status: string
  total_cost: number
  created_at: string
}

export interface HealthResponse {
  status: string
  redis: string
  supabase: string
  whatsapp_mode: 'simulation' | 'live'
  app_env: string
}

export type NDRAction = 'resend_whatsapp' | 'reattempt' | 'initiate_rto'

// ─── Helper ────────────────────────────────────────────────────────────────────

import { supabase } from './supabase'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  const normalizedBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL
  
  // Get current session token
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const res = await fetch(`${normalizedBase}${normalizedPath}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }))
    throw new Error(err.detail ?? `API error ${res.status}`)
  }
  return res.json()
}

// ─── API Methods ───────────────────────────────────────────────────────────────

export const api = {
  /** Check backend health */
  health(): Promise<HealthResponse> {
    return apiFetch('/health')
  },

  /** Compare courier rates — no auth required */
  compareRates(params: {
    pickup_pin: string
    delivery_pin: string
    weight_kg: number
    is_cod: boolean
  }): Promise<RateCompareResponse> {
    return apiFetch('/shipments/rates/compare', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  },

  /** Dashboard metrics — real Supabase or demo seed */
  getDashboardMetrics(): Promise<DashboardMetrics> {
    return apiFetch('/api/dashboard/metrics')
  },

  /** Paginated shipments list */
  getShipments(page = 1, status = ''): Promise<{ success: boolean; shipments: Shipment[]; page: number }> {
    const params = new URLSearchParams({ page: String(page) })
    if (status) params.set('status', status)
    return apiFetch(`/api/dashboard/shipments?${params}`)
  },

  /** NDR cases filtered by status */
  getNDRCases(filter: 'open' | 'resolved' | 'rto' = 'open'): Promise<NDRCasesResponse> {
    return apiFetch(`/api/ndr/cases?filter=${filter}`)
  },

  /** Trigger an action on an NDR case */
  actionNDRCase(caseId: string, action: NDRAction, note = ''): Promise<{
    success: boolean
    case_id: string
    action: string
    new_status: string
    timestamp: string
    whatsapp?: { status: string }
  }> {
    return apiFetch(`/api/ndr/cases/${caseId}/action`, {
      method: 'POST',
      body: JSON.stringify({ action, note }),
    })
  },

  /** WhatsApp stats */
  getWhatsAppStats(): Promise<{
    used: number
    limit: number
    resets_in_days: number
    mode: 'simulation' | 'live'
  }> {
    return apiFetch('/api/whatsapp/stats')
  },

  /** Send a test WhatsApp message (simulation-safe) */
  testWhatsAppSend(to: string, message: string): Promise<{ status: string; message: string }> {
    return apiFetch('/api/whatsapp/test-send', {
      method: 'POST',
      body: JSON.stringify({ to, message }),
    })
  },

  /** Get coordinates for a PIN code from the backend dataset */
  getPinCoords(pincode: string): Promise<PinCoords> {
    return apiFetch(`/shipments/geocoding/${pincode}`)
  },

  /** WhatsApp logs */
  getWhatsAppLogs(limit = 10): Promise<{ success: boolean; logs: WaLog[] }> {
    return apiFetch(`/api/whatsapp/logs?limit=${limit}`)
  },

  /** WhatsApp settings */
  getWhatsAppSettings(): Promise<WaSettings> {
    return apiFetch('/api/whatsapp/settings')
  },

  /** Update WhatsApp settings */
  updateWhatsAppSettings(settings: { rto_guard_enabled: boolean; sms_forward_enabled: boolean }): Promise<WaSettings> {
    return apiFetch('/api/whatsapp/settings', {
      method: 'POST',
      body: JSON.stringify(settings),
    })
  },
}

