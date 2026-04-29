/**
 * Auth token management.
 * In APP_ENV=development, auto-sets a mock JWT for seamless demo testing.
 * Swap out get_current_user_optional → get_current_user on backend post-hackathon.
 */

const TOKEN_KEY = 'logisahay_token'
const isDev = process.env.NEXT_PUBLIC_APP_ENV === 'development'

// Mock JWT for dev — matches the backend's dev-mode mock
const DEV_MOCK_TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkZW1vX3VzZXIiLCJwaG9uZSI6Iis5MTk5OTk5OTk5OTkiLCJpYXQiOjE3NDU3MDAwMDB9.demo_signature'

export const auth = {
  getToken(): string | null {
    if (typeof window === 'undefined') return null
    const stored = localStorage.getItem(TOKEN_KEY)
    if (stored) return stored
    // Auto-seed dev token so all demo flows work without login
    if (isDev) {
      localStorage.setItem(TOKEN_KEY, DEV_MOCK_TOKEN)
      return DEV_MOCK_TOKEN
    }
    return null
  },

  setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOKEN_KEY, token)
    }
  },

  clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(TOKEN_KEY)
    }
  },

  isAuthenticated(): boolean {
    return Boolean(this.getToken())
  },

  /** Returns Authorization header value or empty string */
  getAuthHeader(): string {
    const token = this.getToken()
    return token ? `Bearer ${token}` : ''
  },
}
