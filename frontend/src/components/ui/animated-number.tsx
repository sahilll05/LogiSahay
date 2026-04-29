'use client'

import { useEffect, useRef, useState } from 'react'

interface AnimatedNumberProps {
  value: number
  duration?: number
  prefix?: string
  suffix?: string
  formatFn?: (n: number) => string
  className?: string
}

export function AnimatedNumber({
  value,
  duration = 700,
  prefix = '',
  suffix = '',
  formatFn,
  className,
}: AnimatedNumberProps) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startRef = useRef<number | null>(null)
  const startValueRef = useRef(0)

  useEffect(() => {
    startValueRef.current = display
    startRef.current = null

    const animate = (ts: number) => {
      if (startRef.current === null) startRef.current = ts
      const elapsed = ts - startRef.current
      const progress = Math.min(elapsed / duration, 1)
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = startValueRef.current + (value - startValueRef.current) * eased
      setDisplay(current)
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      } else {
        setDisplay(value)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, duration])

  const formatted = formatFn
    ? formatFn(display)
    : Math.round(display).toLocaleString('en-IN')

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  )
}
