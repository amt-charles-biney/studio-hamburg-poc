import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  AlertTriangle,
  ArrowLeft,
  Ban,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Info,
  MinusCircle,
  Route,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useI18n } from '@/i18n'
import { useStore } from '@/store/useStore'
import { Card, KeyValue } from '@/components/ui/primitives'
import { Button } from '@/components/ui/Button'
import { StatusBadge } from '@/components/ui/Badge'
import { Tabs } from '@/components/ui/Tabs'
import { ApprovalChain } from '@/components/invoice/ApprovalChain'
import { ApprovalTimeline } from '@/components/invoice/ApprovalTimeline'
import { InvoiceActions } from '@/components/invoice/InvoiceActions'
import { DocumentPreview } from '@/components/invoice/DocumentPreview'
import { CompanyTag, SlaBadge } from '@/components/invoice/tags'
import { makeInvoiceView } from '@/lib/invoiceView'
import { validationMessageKey } from '@/lib/validationText'
import { routingExplainParams } from '@/engine/routing'
import { currentStep } from '@/engine/approval'
import { downloadHistory } from '@/lib/exportHistory'

type Tab = 'overview' | 'lines' | 'history' | 'document'

export function InvoiceDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t, formatCurrency, formatDate } = useI18n()
  const inv = useStore((s) => s.invoices.find((i) => i.id === id))
  const users = useStore((s) => s.users)
  const config = useStore((s) => s.config)
  const currentUserId = useStore((s) => s.currentUserId)
  const isPendingForViewer = useStore((s) => s.isPendingForViewer)
  const [tab, setTab] = useState<Tab>('overview')

  if (!inv) {
    return (
      <div className="py-20 text-center">
        <p className="text-sm text-ink-500">{t('common.noResults')}</p>
        <Button variant="secondary" icon={ArrowLeft} className="mt-4" onClick={() => navigate('/inbox')}>
          {t('detail.back')}
        </Button>
      </div>
    )
  }

  const view = makeInvoiceView(inv, isPendingForViewer(inv, currentUserId), config)
  const step = currentStep(inv)

  return (
    <div>
      <Link to="/inbox" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-ink-500 transition hover:text-ink-800">
        <ArrowLeft size={16} /> {t('detail.back')}
      </Link>

      {/* Header */}
      <Card className="mb-5 overflow-hidden">
        <div className="border-b border-ink-100 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge bucket={view.bucket} />
                <SlaBadge sla={view.sla} />
                {view.nearDuplicate && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-600 ring-1 ring-orange-200">
                    <Copy size={11} /> {t('intake.duplicate.near')}
                  </span>
                )}
              </div>
              <h1 className="mt-2.5 text-xl font-bold text-ink-900 sm:text-2xl">{inv.creditorName}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-500">
                <span className="font-mono text-[13px]">{inv.systemInvoiceNumber}</span>
                <span className="text-ink-300">·</span>
                <CompanyTag companyNumber={inv.companyNumber} />
              </div>
            </div>
            <div className="text-left sm:text-right">
              <div className="text-2xl font-bold text-ink-900 tabular sm:text-3xl">
                {formatCurrency(inv.totalAmount, inv.currency)}
              </div>
              <div className="text-xs text-ink-400">
                {t('detail.field.tax')} {inv.taxRate}%
              </div>
            </div>
          </div>
        </div>

        <ContextBanner inv={inv} />

        <div className="p-5">
          <InvoiceActions inv={inv} />
          {!isPendingForViewer(inv, currentUserId) &&
            inv.status !== 'APPROVED' &&
            !['IN_REVIEW'].includes(inv.status) && (
              <p className="text-sm text-ink-400">
                {inv.status === 'EXPORTED'
                  ? t('detail.exported.note')
                  : inv.status === 'REJECTED'
                    ? t('detail.rejectedNote')
                    : null}
              </p>
            )}
        </div>
      </Card>

      {/* Body */}
      <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
        <Card className="order-2 overflow-hidden lg:order-1">
          <div className="border-b border-ink-100 px-4 pt-3">
            <Tabs
              layoutId="detail-tabs"
              items={[
                { key: 'overview', label: t('detail.tab.overview') },
                { key: 'lines', label: t('detail.tab.lines'), count: inv.lineItems.length },
                { key: 'history', label: t('detail.tab.history'), count: inv.approvalHistory.length },
                { key: 'document', label: t('detail.tab.document') },
              ]}
              active={tab}
              onChange={(k) => setTab(k as Tab)}
            />
          </div>
          <div className="p-5">
            {tab === 'overview' && <OverviewTab inv={inv} />}
            {tab === 'lines' && <LinesTab inv={inv} />}
            {tab === 'history' && (
              <div>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-ink-800">{t('detail.history.title')}</h3>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary" icon={Download} onClick={() => downloadHistory(inv, users, 'csv')}>
                      CSV
                    </Button>
                    <Button size="sm" variant="ghost" icon={FileText} onClick={() => downloadHistory(inv, users, 'txt')}>
                      TXT
                    </Button>
                  </div>
                </div>
                <ApprovalTimeline inv={inv} />
              </div>
            )}
            {tab === 'document' && <DocumentPreview inv={inv} />}
          </div>
        </Card>

        {/* Rail: approval chain + routing */}
        <div className="order-1 space-y-5 lg:order-2">
          {inv.chain.length > 0 && (
            <Card className="p-4 lg:sticky lg:top-20">
              <ApprovalChain inv={inv} />
            </Card>
          )}
          {!['ERROR', 'INCOMPLETE', 'DUPLICATE'].includes(inv.status) && <RoutingCard inv={inv} />}
        </div>
      </div>
    </div>
  )
}

function ContextBanner({ inv }: { inv: import('@/types').Invoice }) {
  const { t } = useI18n()
  const getUser = useStore((s) => s.getUser)
  const step = currentStep(inv)
  const stalled = inv.status === 'IN_REVIEW' && step?.state === 'closed_no_action'

  const banners: { tone: string; icon: typeof Info; text: string }[] = []
  if (inv.status === 'APPROVED') banners.push({ tone: 'emerald', icon: CheckCircle2, text: t('detail.approvedNote') })
  if (inv.status === 'EXPORTED') banners.push({ tone: 'violet', icon: CheckCircle2, text: t('detail.exported.note') })
  if (inv.status === 'REJECTED') banners.push({ tone: 'rose', icon: Ban, text: t('detail.rejectedNote') })
  if (inv.status === 'MANUAL') banners.push({ tone: 'slate', icon: Info, text: t('detail.manualNote') })
  if (stalled) {
    const actor = inv.approvalHistory.filter((e) => e.action === 'CLOSED_NO_ACTION').slice(-1)[0]
    const name = actor?.userId ? getUser(actor.userId)?.name : ''
    banners.push({ tone: 'slate', icon: MinusCircle, text: `${t('event.CLOSED_NO_ACTION')} ${name}` })
  }
  if (inv.status === 'ERROR') {
    banners.push({
      tone: 'red',
      icon: AlertTriangle,
      text: inv.validationIssues.map((iss) => t(validationMessageKey(iss))).join(' · '),
    })
  }
  if (inv.status === 'DUPLICATE') banners.push({ tone: 'orange', icon: Copy, text: t('intake.duplicate.hard') })

  if (!banners.length) return null
  const toneMap: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    violet: 'bg-violet-50 text-violet-700 border-violet-100',
    rose: 'bg-rose-50 text-rose-700 border-rose-100',
    slate: 'bg-slate-50 text-slate-700 border-slate-100',
    red: 'bg-red-50 text-red-700 border-red-100',
    orange: 'bg-orange-50 text-orange-700 border-orange-100',
  }
  return (
    <div className="space-y-px">
      {banners.map((b, i) => {
        const Icon = b.icon
        return (
          <div key={i} className={cn('flex items-center gap-2.5 border-y px-5 py-2.5 text-sm font-medium', toneMap[b.tone])}>
            <Icon size={16} className="shrink-0" />
            <span>{b.text}</span>
          </div>
        )
      })}
    </div>
  )
}

function OverviewTab({ inv }: { inv: import('@/types').Invoice }) {
  const { t, formatDate } = useI18n()
  const company = useStore((s) => s.companies.find((c) => c.companyNumber === inv.companyNumber))
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-3">
      <KeyValue label={t('detail.field.system')}>{inv.systemInvoiceNumber}</KeyValue>
      <KeyValue label={t('detail.field.opinfo')}>{inv.opInfoNumber}</KeyValue>
      <KeyValue label={t('detail.field.source')}>{company?.sourceSystem ?? '—'}</KeyValue>
      <KeyValue label={t('detail.field.creditor')}>{inv.creditorName}</KeyValue>
      <KeyValue label={t('detail.field.company')}>{company?.name ?? inv.companyNumber}</KeyValue>
      <KeyValue label={t('detail.field.routingType')}>{t(`routingType.${inv.routingType}`)}</KeyValue>
      <KeyValue label={t('detail.field.invoiceDate')}>{formatDate(inv.invoiceDate)}</KeyValue>
      <KeyValue label={t('detail.field.bookingDate')}>{formatDate(inv.bookingDate)}</KeyValue>
      <KeyValue label={t('detail.field.bookingMonth')}>{inv.bookingMonth}</KeyValue>
      <KeyValue label={t('detail.field.costCenter')}>{inv.costCenter || '—'}</KeyValue>
      <KeyValue label={t('detail.field.costCarrier')}>{inv.costCarrier || '—'}</KeyValue>
      <KeyValue label={t('detail.field.project')}>{inv.project || '—'}</KeyValue>
    </dl>
  )
}

function LinesTab({ inv }: { inv: import('@/types').Invoice }) {
  const { t, formatCurrency } = useI18n()
  return (
    <div className="-mx-5 overflow-x-auto sm:mx-0">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-ink-100 text-left text-[11px] font-semibold uppercase tracking-wide text-ink-400">
            <th className="px-3 py-2 font-semibold">{t('detail.lines.drcr')}</th>
            <th className="px-3 py-2 font-semibold">{t('detail.lines.account')}</th>
            <th className="px-3 py-2 font-semibold">{t('detail.lines.text')}</th>
            <th className="px-3 py-2 font-semibold">{t('detail.lines.costCenter')}</th>
            <th className="px-3 py-2 font-semibold">{t('detail.lines.taxCode')}</th>
            <th className="px-3 py-2 text-right font-semibold">{t('detail.lines.amount')}</th>
          </tr>
        </thead>
        <tbody>
          {inv.lineItems.map((l) => (
            <tr key={l.id} className="border-b border-ink-50 last:border-0">
              <td className="px-3 py-2.5">
                <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-bold', l.drCr === 'debit' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700')}>
                  {l.drCr === 'debit' ? 'S' : 'H'}
                </span>
              </td>
              <td className="px-3 py-2.5 font-mono text-[13px] text-ink-600">{l.account}</td>
              <td className="px-3 py-2.5 text-ink-700">{l.text}</td>
              <td className="px-3 py-2.5 font-mono text-[13px] text-ink-500">{l.costCenter || '—'}</td>
              <td className="px-3 py-2.5 font-mono text-[13px] text-ink-500">{l.taxCode || '—'}</td>
              <td className="px-3 py-2.5 text-right font-mono text-ink-800">{formatCurrency(l.amount, inv.currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-ink-200">
            <td colSpan={5} className="px-3 py-2.5 text-right text-xs font-semibold uppercase text-ink-400">
              {t('detail.lines.total')}
            </td>
            <td className="px-3 py-2.5 text-right font-mono text-sm font-bold text-ink-900">
              {formatCurrency(inv.totalAmount, inv.currency)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function RoutingCard({ inv }: { inv: import('@/types').Invoice }) {
  const { t } = useI18n()
  const rule = useStore((s) => s.routingRules.find((r) => r.id === inv.routing.matchedRuleId))
  return (
    <Card className="p-4">
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink-800">
        <Route size={15} className="text-ink-400" /> {t('routing.explain.title')}
      </h3>
      <p className="text-[13px] leading-relaxed text-ink-600">{t(inv.routing.reasonKey, routingExplainParams(inv))}</p>
      {rule && (
        <div className="mt-3 rounded-xl bg-ink-50 px-3 py-2 text-xs text-ink-500">
          <span className="font-medium text-ink-700">{rule.label}</span>
        </div>
      )}
    </Card>
  )
}
