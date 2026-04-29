'use client'

import { cn } from '@/lib/utils'

interface ToggleSwitchProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: string
  description?: string
  disabled?: boolean
  size?: 'sm' | 'md'
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
}: ToggleSwitchProps) {
  const trackSize = size === 'sm'
    ? 'w-8 h-4'
    : 'w-10 h-[22px]'
  const thumbSize = size === 'sm'
    ? 'w-3 h-3 top-0.5 left-0.5'
    : 'w-[18px] h-[18px] top-[2px] left-[2px]'
  const thumbTranslate = size === 'sm'
    ? 'peer-checked:translate-x-4'
    : 'peer-checked:translate-x-[18px]'

  return (
    <label className={cn("flex items-center gap-3 cursor-pointer", disabled && "opacity-50 cursor-not-allowed")}>
      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && <div className="text-[13px] font-medium text-foreground">{label}</div>}
          {description && <div className="text-[11px] text-muted-foreground mt-0.5">{description}</div>}
        </div>
      )}
      <div className="relative shrink-0">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={e => onChange(e.target.checked)}
          disabled={disabled}
        />
        {/* Track */}
        <div className={cn(
          "rounded-full transition-all duration-200",
          trackSize,
          checked
            ? "bg-primary"
            : "bg-muted-foreground/25 dark:bg-muted"
        )} />
        {/* Thumb */}
        <div className={cn(
          "absolute rounded-full bg-white shadow-sm transition-transform duration-200",
          thumbSize,
          thumbTranslate,
          checked ? thumbTranslate : "translate-x-0"
        )} />
      </div>
    </label>
  )
}
