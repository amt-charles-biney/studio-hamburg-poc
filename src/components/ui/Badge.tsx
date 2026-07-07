import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'
import { useT } from '@/i18n'
import { bucketVisual, routingOutcomeMeta } from '@/lib/statusMeta'
import type { RoutingOutcome, StatusBucket } from '@/types'

export function Badge({
  children,
  className,
  dot,
}: {
  children: ReactNode
  className?: string
  dot?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium',
        className,
      )}
    >
      {dot && <span className={cn('h-1.5 w-1.5 rounded-full', dot)} />}
      {children}
    </span>
  )
}

export function StatusBadge({
  bucket,
  size = 'md',
  withIcon = true,
  className,
}: {
  bucket: StatusBucket
  size?: 'sm' | 'md'
  withIcon?: boolean
  className?: string
}) {
  const t = useT()
  const v = bucketVisual[bucket]
  const Icon = v.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full font-semibold',
        size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs',
        v.chip,
        className,
      )}
    >
      {withIcon ? (
        <Icon size={size === 'sm' ? 12 : 13} className="shrink-0" />
      ) : (
        <span className={cn('h-1.5 w-1.5 rounded-full', v.dot)} />
      )}
      {t(v.labelKey)}
    </span>
  )
}

export function RoutingBadge({ outcome, className }: { outcome: RoutingOutcome; className?: string }) {
  const t = useT()
  const meta = routingOutcomeMeta[outcome]
  return (
    <span className={cn('inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium', meta.className, className)}>
      {t(meta.labelKey)}
    </span>
  )
}
