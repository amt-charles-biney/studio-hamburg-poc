import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Card({
  children,
  className,
  as: As = 'div',
}: {
  children: ReactNode
  className?: string
  as?: 'div' | 'section' | 'article'
}) {
  return <As className={cn('card', className)}>{children}</As>
}

export function SectionTitle({
  icon: Icon,
  children,
  action,
  className,
}: {
  icon?: LucideIcon
  children: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <h3 className="flex items-center gap-2 text-sm font-semibold text-ink-800">
        {Icon && <Icon size={16} className="text-ink-400" />}
        {children}
      </h3>
      {action}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  hint,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  hint?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex flex-col items-center justify-center rounded-2xl px-6 py-14 text-center', className)}
    >
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-ink-100 text-ink-400">
        <Icon size={26} />
      </div>
      <p className="text-sm font-semibold text-ink-700">{title}</p>
      {hint && <p className="mt-1 max-w-xs text-sm text-ink-400">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  )
}

type TooltipSide = 'top' | 'bottom' | 'left' | 'right'

const tooltipPos: Record<TooltipSide, string> = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2 translate-y-1 group-hover/tt:translate-y-0',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2 -translate-y-1 group-hover/tt:translate-y-0',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2 translate-x-1 group-hover/tt:translate-x-0',
  right: 'left-full top-1/2 ml-2 -translate-y-1/2 -translate-x-1 group-hover/tt:translate-x-0',
}

const tooltipArrow: Record<TooltipSide, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-ink-900',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-ink-900',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-ink-900',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-ink-900',
}

export function Tooltip({
  label,
  children,
  side = 'top',
}: {
  label: string
  children: ReactNode
  side?: TooltipSide
}) {
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          'pointer-events-none absolute z-50 whitespace-nowrap rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs font-medium text-white opacity-0 shadow-lift transition-all duration-150 group-hover/tt:opacity-100',
          tooltipPos[side],
        )}
      >
        {label}
        <span className={cn('absolute border-4 border-transparent', tooltipArrow[side])} />
      </span>
    </span>
  )
}

export function KeyValue({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={cn('min-w-0', className)}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{label}</dt>
      <dd className="mt-0.5 truncate text-sm font-medium text-ink-800 tabular">{children}</dd>
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block h-4 w-4 animate-spin rounded-full border-2 border-ink-300 border-t-brand-500',
        className,
      )}
    />
  )
}
