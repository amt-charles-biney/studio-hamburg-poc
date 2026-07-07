import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, Copy, Paperclip } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useI18n } from '@/i18n'
import { useStore } from '@/store/useStore'
import { bucketVisual } from '@/lib/statusMeta'
import { makeInvoiceView } from '@/lib/invoiceView'
import { Avatar } from '@/components/ui/Avatar'
import { StatusBadge } from '@/components/ui/Badge'
import { CompanyTag, SlaBadge } from './tags'
import type { Invoice } from '@/types'

export function InvoiceListItem({ inv, index = 0 }: { inv: Invoice; index?: number }) {
  const { t, formatCurrency, formatRelative } = useI18n()
  const navigate = useNavigate()
  const currentUserId = useStore((s) => s.currentUserId)
  const config = useStore((s) => s.config)
  const isPendingForViewer = useStore((s) => s.isPendingForViewer)
  const getUser = useStore((s) => s.getUser)

  const view = makeInvoiceView(inv, isPendingForViewer(inv, currentUserId), config)
  const visual = bucketVisual[view.bucket]
  const actor = view.actorId ? getUser(view.actorId) : null

  return (
    <motion.button
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.035, 0.4) }}
      onClick={() => navigate(`/invoice/${inv.id}`)}
      className="group relative flex w-full items-center gap-4 overflow-hidden rounded-2xl border border-ink-200/70 bg-white px-4 py-3.5 text-left shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:border-ink-300/70 hover:shadow-card focus-ring"
    >
      <span className={cn('absolute inset-y-0 left-0 w-1', visual.solid)} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-ink-900">{inv.creditorName}</span>
          {view.nearDuplicate && (
            <span className="inline-flex items-center gap-1 rounded bg-orange-50 px-1.5 py-0.5 text-[10px] font-semibold text-orange-600">
              <Copy size={10} /> {t('intake.duplicate.near')}
            </span>
          )}
          {inv.attachments.some((a) => a.kind === 'supporting') && (
            <Paperclip size={12} className="text-violet-400" />
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-400">
          <span className="font-mono text-[11px] text-ink-500">{inv.systemInvoiceNumber}</span>
          <span className="text-ink-300">·</span>
          <CompanyTag companyNumber={inv.companyNumber} />
        </div>
      </div>

      <div className="hidden shrink-0 flex-col items-end gap-1 sm:flex">
        <span className="text-sm font-semibold text-ink-900 tabular">
          {formatCurrency(inv.totalAmount, inv.currency)}
        </span>
        <span className="text-[11px] text-ink-400">{formatRelative(inv.updatedAt)}</span>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusBadge bucket={view.bucket} size="sm" />
        <div className="flex items-center gap-1.5">
          <SlaBadge sla={view.sla} />
          {actor && <Avatar user={actor} size="xs" />}
        </div>
      </div>

      <ChevronRight size={18} className="hidden shrink-0 text-ink-300 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-500 md:block" />
    </motion.button>
  )
}
