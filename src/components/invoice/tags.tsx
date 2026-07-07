import { AlarmClock, Building2, Clock3 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useI18n } from '@/i18n'
import { useStore } from '@/store/useStore'
import type { Company, Invoice } from '@/types'
import type { SlaInfo } from '@/engine/sla'

export function CompanyTag({ companyNumber, className }: { companyNumber: string; className?: string }) {
  const company = useStore((s) => s.companies.find((c) => c.companyNumber === companyNumber)) as Company | undefined
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs text-ink-500', className)}>
      <span className="flex h-5 items-center rounded-md bg-ink-100 px-1.5 font-mono text-[11px] font-semibold text-ink-600">
        {companyNumber}
      </span>
      <span className="hidden truncate sm:inline">{company?.name ?? '—'}</span>
      {company && (
        <span
          className={cn(
            'rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide',
            company.sourceSystem === 'NAF' ? 'bg-sky-100 text-sky-700' : 'bg-teal-100 text-teal-700',
          )}
        >
          {company.sourceSystem}
        </span>
      )}
    </span>
  )
}

export function SlaBadge({ sla, className }: { sla: SlaInfo; className?: string }) {
  const { t } = useI18n()
  if (!sla.active || (!sla.overdue && !sla.dueSoon)) return null
  const days = Math.floor(sla.daysWaiting)
  if (sla.overdue) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-600 ring-1 ring-rose-200 animate-pulse-ring',
          className,
        )}
      >
        <AlarmClock size={12} />
        {t('sla.badge.overdue')} · {t('inbox.sla.waitingDays', { n: days })}
      </span>
    )
  }
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-600 ring-1 ring-amber-200',
        className,
      )}
    >
      <Clock3 size={12} />
      {t('sla.badge.dueSoon')}
    </span>
  )
}

export function CompanyName({ companyNumber }: { companyNumber: string }) {
  const company = useStore((s) => s.companies.find((c) => c.companyNumber === companyNumber))
  return <>{company?.name ?? companyNumber}</>
}

export function MoneyText({ inv, className }: { inv: Pick<Invoice, 'totalAmount' | 'currency'>; className?: string }) {
  const { formatCurrency } = useI18n()
  return <span className={cn('tabular', className)}>{formatCurrency(inv.totalAmount, inv.currency)}</span>
}

export function BuildingGlyph() {
  return <Building2 size={14} className="text-ink-400" />
}
