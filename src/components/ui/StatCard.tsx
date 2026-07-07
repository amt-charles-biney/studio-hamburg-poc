import { useEffect, useRef, useState } from 'react'
import { animate, motion, useInView } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export function AnimatedNumber({
  value,
  decimals = 0,
  suffix = '',
  prefix = '',
}: {
  value: number
  decimals?: number
  suffix?: string
  prefix?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true })
  const [display, setDisplay] = useState(0)

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setDisplay(v),
    })
    return () => controls.stop()
  }, [inView, value])

  return (
    <span ref={ref} className="tabular">
      {prefix}
      {display.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  )
}

export function StatCard({
  icon: Icon,
  label,
  value,
  decimals = 0,
  suffix,
  hint,
  tone = 'brand',
  delay = 0,
}: {
  icon: LucideIcon
  label: string
  value: number
  decimals?: number
  suffix?: string
  hint?: string
  tone?: 'brand' | 'emerald' | 'amber' | 'rose' | 'violet' | 'sky'
  delay?: number
}) {
  const tones: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    violet: 'bg-violet-50 text-violet-600',
    sky: 'bg-sky-50 text-sky-600',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="card card-hover p-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium text-ink-500">{label}</span>
        <span className={cn('flex h-8 w-8 items-center justify-center rounded-lg', tones[tone])}>
          <Icon size={16} />
        </span>
      </div>
      <div className="mt-3 text-2xl font-bold text-ink-900">
        <AnimatedNumber value={value} decimals={decimals} suffix={suffix} />
      </div>
      {hint && <p className="mt-1 text-xs text-ink-400">{hint}</p>}
    </motion.div>
  )
}
