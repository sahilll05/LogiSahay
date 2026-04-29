'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

type Theme = 'light' | 'dark'

interface ThemeContextValue {
  theme: Theme
  toggleTheme: () => void
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light')
  const [mounted, setMounted] = useState(false)

  // On mount, read from localStorage or system preference
  useEffect(() => {
    const stored = localStorage.getItem('logisahay-theme') as Theme | null
    if (stored === 'dark' || stored === 'light') {
      applyTheme(stored)
      setThemeState(stored)
    } else {
      // Respect OS preference if no stored preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      const resolved: Theme = prefersDark ? 'dark' : 'light'
      applyTheme(resolved)
      setThemeState(resolved)
    }
    setMounted(true)
  }, [])

  const applyTheme = (t: Theme) => {
    const root = document.documentElement
    if (t === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }

  const setTheme = useCallback((t: Theme) => {
    applyTheme(t)
    setThemeState(t)
    localStorage.setItem('logisahay-theme', t)
  }, [])

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === 'light' ? 'dark' : 'light'
      applyTheme(next)
      localStorage.setItem('logisahay-theme', next)
      return next
    })
  }, [])

  // Prevent flash of wrong theme — render nothing until mounted
  if (!mounted) {
    return <>{children}</>
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
