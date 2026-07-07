import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { AlarmClock, CheckCheck, Clock3, Inbox, Search, Users } from 'lucide-react'
import { useI18n } from '@/i18n'
import { useStore } from '@/store/useStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { Input } from '@/components/ui/Field'
import { EmptyState } from '@/components/ui/primitives'
import { InvoiceListItem } from '@/components/invoice/InvoiceListItem'
import { isUserInvolved, makeInvoiceView, matchesQuery } from '@/lib/invoiceView'
import { slaInfo } from '@/engine/sla'

type TabKey = 'pending' | 'waiting' | 'done'

export function ApprovalInbox() {
  const { t } = useI18n()
  const invoices = useStore((s) => s.invoices)
  const currentUser = useStore((s) => s.currentUser())
  const currentUserId = currentUser.id
  const groups = useStore((s) => s.groups)
  const config = useStore((s) => s.config)
  const isPendingForViewer = useStore((s) => s.isPendingForViewer)

  const [tab, setTab] = useState<TabKey>('pending')
  const [query, setQuery] = useState('')

  const { pending, waiting, done, overdueCount } = useMemo(() => {
    const involved = invoices.filter((i) => isUserInvolved(i, currentUserId, groups))
    const pending = invoices
      .filter((i) => isPendingForViewer(i, currentUserId))
      .sort((a, b) => {
        const sa = slaInfo(a, config).daysWaiting
        const sb = slaInfo(b, config).daysWaiting
        return sb - sa
      })
    const waiting = involved.filter((i) => i.status === 'IN_REVIEW' && !isPendingForViewer(i, currentUserId))
    const done = involved.filter((i) => ['APPROVED', 'EXPORTED', 'REJECTED'].includes(i.status))
    const overdueCount = pending.filter((i) => slaInfo(i, config).overdue).length
    return { pending, waiting, done, overdueCount }
  }, [invoices, currentUserId, groups, config, isPendingForViewer])

  const lists: Record<TabKey, typeof pending> = { pending, waiting, done }
  const visible = lists[tab].filter((i) => matchesQuery(i, query))

  return (
    <div>
      <PageHeader title={t('inbox.title')} subtitle={t('inbox.subtitle', { name: currentUser.name })} />

      {/* metric strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric icon={Clock3} tone="amber" label={t('bucket.pending_you')} value={pending.length} />
        <Metric icon={AlarmClock} tone="rose" label={t('inbox.sla.risk')} value={overdueCount} />
        <Metric icon={Users} tone="sky" label={t('bucket.waiting_others')} value={waiting.length} />
        <Metric icon={CheckCheck} tone="emerald" label={t('inbox.filter.completed')} value={done.length} />
      </div>

      {overdueCount > 0 && tab === 'pending' && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
        >
          <AlarmClock size={18} className="shrink-0" />
          <span>
            <strong>{t('inbox.count.overdue', { n: overdueCount })}</strong> · {t('inbox.sla.threshold', { n: config.slaDaysThreshold })}
          </span>
        </motion.div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          items={[
            { key: 'pending', label: t('inbox.tab.pendingYou'), count: pending.length, tone: overdueCount > 0 ? 'warn' : 'default' },
            { key: 'waiting', label: t('inbox.tab.waiting'), count: waiting.length },
            { key: 'done', label: t('inbox.tab.done'), count: done.length },
          ]}
          active={tab}
          onChange={(k) => setTab(k as TabKey)}
        />
        <div className="relative w-full sm:w-64">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('common.filterList')}
            className="pl-9"
          />
        </div>
      </div>

      <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-2.5">
        {visible.length === 0 ? (
          <EmptyState
            icon={tab === 'pending' ? Inbox : Search}
            title={tab === 'pending' ? t('inbox.empty.pending') : t('common.noResults')}
            hint={tab === 'pending' ? t('inbox.empty.pendingHint') : undefined}
            className="card"
          />
        ) : (
          visible.map((inv, i) => <InvoiceListItem key={inv.id} inv={inv} index={i} />)
        )}
      </motion.div>
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Clock3
  label: string
  value: number
  tone: 'amber' | 'rose' | 'sky' | 'emerald'
}) {
  const tones = {
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
    sky: 'bg-sky-50 text-sky-600',
    emerald: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <div className="card flex items-center gap-3 p-3.5">
      <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tones[tone]}`}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <div className="text-xl font-bold text-ink-900 tabular">{value}</div>
        <div className="truncate text-[11px] font-medium text-ink-400">{label}</div>
      </div>
    </div>
  )
}
