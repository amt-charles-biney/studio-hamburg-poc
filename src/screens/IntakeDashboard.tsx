import { useMemo, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronRight,
  Copy,
  FileText,
  FileWarning,
  Inbox,
  Plus,
  Route,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useI18n } from '@/i18n'
import { useStore } from '@/store/useStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { Tabs } from '@/components/ui/Tabs'
import { Input } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { EmptyState, Tooltip } from '@/components/ui/primitives'
import { InvoiceListItem } from '@/components/invoice/InvoiceListItem'
import { CompanyTag } from '@/components/invoice/tags'
import { matchesQuery } from '@/lib/invoiceView'
import { validationMessageKey } from '@/lib/validationText'
import { bucketVisual } from '@/lib/statusMeta'
import type { Invoice } from '@/types'

type TabKey = 'queue' | 'errors' | 'incomplete' | 'duplicates'

const HANDLED_STATUSES = ['ERROR', 'INCOMPLETE', 'DUPLICATE']

export function IntakeDashboard() {
  const { t } = useI18n()
  const invoices = useStore((s) => s.invoices)
  const simulateArrival = useStore((s) => s.simulateArrival)
  const completePair = useStore((s) => s.completePair)
  const clearNearDuplicate = useStore((s) => s.clearNearDuplicate)

  const [tab, setTab] = useState<TabKey>('queue')
  const [query, setQuery] = useState('')

  const { queue, errors, incomplete, duplicates, byId } = useMemo(() => {
    const queue = invoices.filter((i) => !HANDLED_STATUSES.includes(i.status))
    const errors = invoices.filter((i) => i.status === 'ERROR')
    const incomplete = invoices.filter((i) => i.status === 'INCOMPLETE')
    const duplicates = invoices.filter(
      (i) => i.status === 'DUPLICATE' || (i.nearDuplicateOf?.length ?? 0) > 0,
    )
    const byId = new Map(invoices.map((i) => [i.id, i]))
    return { queue, errors, incomplete, duplicates, byId }
  }, [invoices])

  const lists: Record<TabKey, Invoice[]> = { queue, errors, incomplete, duplicates }
  const base = lists[tab]
  const visible = base.filter((i) => matchesQuery(i, query))

  return (
    <div>
      <PageHeader
        title={t('intake.title')}
        subtitle={t('intake.subtitle')}
        actions={
          <Tooltip label={t('intake.simulate.hint')}>
            <Button variant="primary" icon={Plus} onClick={() => simulateArrival()}>
              {t('intake.simulate')}
            </Button>
          </Tooltip>
        }
      />

      {/* Pipeline metric strip */}
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric icon={Inbox} tone="sky" label={t('intake.tab.queue')} value={queue.length} />
        <Metric icon={AlertTriangle} tone="rose" label={t('intake.tab.errors')} value={errors.length} />
        <Metric icon={FileWarning} tone="amber" label={t('intake.tab.incomplete')} value={incomplete.length} />
        <Metric icon={Copy} tone="orange" label={t('intake.tab.duplicates')} value={duplicates.length} />
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Tabs
          items={[
            { key: 'queue', label: t('intake.tab.queue'), count: queue.length },
            { key: 'errors', label: t('intake.tab.errors'), count: errors.length, tone: errors.length ? 'danger' : 'default' },
            { key: 'incomplete', label: t('intake.tab.incomplete'), count: incomplete.length, tone: incomplete.length ? 'warn' : 'default' },
            { key: 'duplicates', label: t('intake.tab.duplicates'), count: duplicates.length, tone: duplicates.length ? 'warn' : 'default' },
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

      <motion.div key={tab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }}>
        {tab === 'queue' && (
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2 rounded-2xl border border-ink-100 bg-ink-50/60 px-4 py-3">
              <PipelinePill icon={FileText} label={t('intake.parsed')} />
              <ChevronRight size={15} className="shrink-0 text-ink-300" />
              <PipelinePill icon={ShieldCheck} label={t('intake.validated')} />
              <ChevronRight size={15} className="shrink-0 text-ink-300" />
              <PipelinePill icon={Route} label={t('intake.routed')} />
            </div>
            {visible.length === 0 ? (
              <EmptyState
                icon={base.length === 0 ? Inbox : Search}
                title={base.length === 0 ? t('common.empty') : t('common.noResults')}
                hint={base.length === 0 ? t('common.emptyHint') : undefined}
                className="card"
              />
            ) : (
              <div className="space-y-2.5">
                {visible.map((inv, i) => (
                  <InvoiceListItem key={inv.id} inv={inv} index={i} />
                ))}
              </div>
            )}
          </div>
        )}

        {tab === 'errors' && (
          <div className="space-y-2.5">
            {visible.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title={base.length === 0 ? t('intake.errorQueue.empty') : t('common.noResults')}
                className="card"
              />
            ) : (
              visible.map((inv, i) => <ErrorRow key={inv.id} inv={inv} index={i} />)
            )}
          </div>
        )}

        {tab === 'incomplete' && (
          <div className="space-y-2.5">
            {visible.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title={base.length === 0 ? t('common.empty') : t('common.noResults')}
                hint={base.length === 0 ? t('common.emptyHint') : undefined}
                className="card"
              />
            ) : (
              visible.map((inv, i) => (
                <IncompleteRow key={inv.id} inv={inv} index={i} onComplete={completePair} />
              ))
            )}
          </div>
        )}

        {tab === 'duplicates' && (
          <div className="space-y-2.5">
            {visible.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title={base.length === 0 ? t('common.empty') : t('common.noResults')}
                hint={base.length === 0 ? t('common.emptyHint') : undefined}
                className="card"
              />
            ) : (
              visible.map((inv, i) => {
                const hardRef = inv.duplicateOf ? byId.get(inv.duplicateOf)?.systemInvoiceNumber : undefined
                const nearRef = inv.nearDuplicateOf?.length
                  ? byId.get(inv.nearDuplicateOf[0])?.systemInvoiceNumber
                  : undefined
                return (
                  <DuplicateRow
                    key={inv.id}
                    inv={inv}
                    index={i}
                    hardRef={hardRef}
                    nearRef={nearRef}
                    onResolveKeep={clearNearDuplicate}
                  />
                )
              })
            )}
          </div>
        )}
      </motion.div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Metric card (mirrors ApprovalInbox's metric strip)
// ---------------------------------------------------------------------------

function Metric({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof Inbox
  label: string
  value: number
  tone: 'sky' | 'rose' | 'amber' | 'orange'
}) {
  const tones = {
    sky: 'bg-sky-50 text-sky-600',
    rose: 'bg-rose-50 text-rose-600',
    amber: 'bg-amber-50 text-amber-600',
    orange: 'bg-orange-50 text-orange-600',
  }
  return (
    <div className="card flex items-center gap-3 p-3.5">
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl', tones[tone])}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <div className="text-xl font-bold text-ink-900 tabular">{value}</div>
        <div className="truncate text-[11px] font-medium text-ink-400">{label}</div>
      </div>
    </div>
  )
}

function PipelinePill({ icon: Icon, label }: { icon: typeof FileText; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
      <Icon size={13} className="shrink-0" />
      {label}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Shared clickable row shell
// ---------------------------------------------------------------------------

function RowShell({
  accent,
  index,
  onClick,
  children,
}: {
  accent: string
  index: number
  onClick: () => void
  children: ReactNode
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.3) }}
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick()
        }
      }}
      className="group relative flex w-full cursor-pointer flex-col gap-3 overflow-hidden rounded-2xl border border-ink-200/70 bg-white px-4 py-3.5 text-left shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-300/70 hover:shadow-card focus-ring sm:flex-row sm:items-center sm:gap-4"
    >
      <span className={cn('absolute inset-y-0 left-0 w-1', accent)} />
      {children}
    </motion.div>
  )
}

function RowIdentity({ inv }: { inv: Invoice }) {
  return (
    <div className="min-w-0 flex-1">
      <span className="truncate text-sm font-semibold text-ink-900">{inv.creditorName}</span>
      <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-400">
        <span className="font-mono text-[11px] text-ink-500">{inv.systemInvoiceNumber}</span>
        <span className="text-ink-300">·</span>
        <CompanyTag companyNumber={inv.companyNumber} />
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Error queue row
// ---------------------------------------------------------------------------

function ErrorRow({ inv, index }: { inv: Invoice; index: number }) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const visual = bucketVisual.error
  return (
    <RowShell accent={visual.solid} index={index} onClick={() => navigate(`/invoice/${inv.id}`)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600">
        <AlertTriangle size={17} />
      </span>
      <RowIdentity inv={inv} />
      <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
        {inv.validationIssues.map((issue, k) => (
          <span
            key={k}
            className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700 ring-1 ring-red-200"
          >
            <AlertTriangle size={11} className="shrink-0" />
            {t(validationMessageKey(issue))}
          </span>
        ))}
      </div>
      <ChevronRight size={18} className="hidden shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-500 sm:block" />
    </RowShell>
  )
}

// ---------------------------------------------------------------------------
// Incomplete-pair row
// ---------------------------------------------------------------------------

function PairChip({ label, present }: { label: string; present: boolean }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
        present
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-rose-50 text-rose-700 ring-rose-200',
      )}
    >
      {present ? <Check size={11} className="shrink-0" /> : <X size={11} className="shrink-0" />}
      {label}
    </span>
  )
}

function IncompleteRow({
  inv,
  index,
  onComplete,
}: {
  inv: Invoice
  index: number
  onComplete: (id: string) => void
}) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const missingPdf = inv.intakeState === 'missing_pdf'
  const hasPdf = inv.attachments.some((a) => a.kind === 'source_pdf')
  const hasIndex = inv.attachments.some((a) => a.kind === 'index_file')
  return (
    <RowShell accent="bg-amber-400" index={index} onClick={() => navigate(`/invoice/${inv.id}`)}>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
        <FileWarning size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <RowIdentity inv={inv} />
        <p className="mt-1.5 text-[11px] italic text-ink-400">{t('intake.pair.waiting')}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <div className="flex items-center gap-1.5">
          <PairChip label={t('intake.pair.pdf')} present={hasPdf} />
          <PairChip label={t('intake.pair.index')} present={hasIndex} />
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-rose-200">
          {missingPdf ? t('intake.pair.missingPdf') : t('intake.pair.missingIndex')}
        </span>
        <Button
          variant="secondary"
          size="sm"
          onClick={(e) => {
            e.stopPropagation()
            onComplete(inv.id)
          }}
        >
          {missingPdf ? t('intake.pair.attachPdf') : t('intake.pair.attachIndex')}
        </Button>
      </div>
    </RowShell>
  )
}

// ---------------------------------------------------------------------------
// Duplicate row (hard + near)
// ---------------------------------------------------------------------------

function DuplicateRow({
  inv,
  index,
  hardRef,
  nearRef,
  onResolveKeep,
}: {
  inv: Invoice
  index: number
  hardRef?: string
  nearRef?: string
  onResolveKeep: (id: string) => void
}) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const isHard = inv.status === 'DUPLICATE'
  const accent = isHard ? 'bg-orange-500' : 'bg-amber-400'
  const iconWrap = isHard ? 'bg-orange-50 text-orange-600' : 'bg-amber-50 text-amber-600'
  const badge = isHard
    ? 'bg-orange-50 text-orange-700 ring-orange-200'
    : 'bg-amber-50 text-amber-700 ring-amber-200'
  const title = isHard ? t('intake.duplicate.hard') : t('intake.duplicate.near')
  const reason = isHard
    ? t('intake.duplicate.hardReason', { ref: hardRef ?? inv.systemInvoiceNumber })
    : t('intake.duplicate.nearReason', { ref: nearRef ?? inv.systemInvoiceNumber })
  return (
    <RowShell accent={accent} index={index} onClick={() => navigate(`/invoice/${inv.id}`)}>
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', iconWrap)}>
        <Copy size={17} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate text-sm font-semibold text-ink-900">{inv.creditorName}</span>
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1', badge)}>
            <Copy size={11} className="shrink-0" />
            {title}
          </span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-400">
          <span className="font-mono text-[11px] text-ink-500">{inv.systemInvoiceNumber}</span>
          <span className="text-ink-300">·</span>
          <CompanyTag companyNumber={inv.companyNumber} />
        </div>
        <p className="mt-1.5 text-[13px] leading-relaxed text-ink-600">{reason}</p>
      </div>
      {!isHard && (
        <div className="shrink-0 sm:self-center">
          <Button
            variant="secondary"
            size="sm"
            onClick={(e) => {
              e.stopPropagation()
              onResolveKeep(inv.id)
            }}
          >
            {t('intake.duplicate.resolveKeep')}
          </Button>
        </div>
      )}
    </RowShell>
  )
}
