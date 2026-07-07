import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'

export interface TabItem {
  key: string
  label: string
  count?: number
  tone?: 'default' | 'danger' | 'warn'
}

export function Tabs({
  items,
  active,
  onChange,
  layoutId = 'tab-underline',
  className,
}: {
  items: TabItem[]
  active: string
  onChange: (key: string) => void
  layoutId?: string
  className?: string
}) {
  return (
    <div className={cn('flex items-center gap-1 overflow-x-auto no-scrollbar', className)}>
      {items.map((item) => {
        const isActive = item.key === active
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={cn(
              'relative flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-ring',
              isActive ? 'text-brand-700' : 'text-ink-500 hover:text-ink-800',
            )}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg bg-brand-50"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10">{item.label}</span>
            {item.count !== undefined && (
              <span
                className={cn(
                  'relative z-10 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular',
                  isActive
                    ? 'bg-brand-100 text-brand-700'
                    : item.tone === 'danger'
                      ? 'bg-rose-100 text-rose-600'
                      : item.tone === 'warn'
                        ? 'bg-amber-100 text-amber-600'
                        : 'bg-ink-100 text-ink-500',
                )}
              >
                {item.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

export function Segmented({
  items,
  active,
  onChange,
  layoutId = 'segmented',
}: {
  items: { key: string; label: string }[]
  active: string
  onChange: (key: string) => void
  layoutId?: string
}) {
  return (
    <div className="inline-flex items-center gap-0.5 rounded-xl bg-ink-100 p-1">
      {items.map((item) => {
        const isActive = item.key === active
        return (
          <button
            key={item.key}
            onClick={() => onChange(item.key)}
            className={cn(
              'relative rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors focus-ring',
              isActive ? 'text-ink-900' : 'text-ink-500 hover:text-ink-700',
            )}
          >
            {isActive && (
              <motion.span
                layoutId={layoutId}
                className="absolute inset-0 rounded-lg bg-white shadow-soft"
                transition={{ type: 'spring', stiffness: 400, damping: 32 }}
              />
            )}
            <span className="relative z-10">{item.label}</span>
          </button>
        )
      })}
    </div>
  )
}
