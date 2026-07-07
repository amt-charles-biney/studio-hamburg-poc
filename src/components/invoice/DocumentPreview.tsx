import { FileText, Paperclip } from 'lucide-react'
import { motion } from 'framer-motion'
import { useI18n } from '@/i18n'
import type { Invoice } from '@/types'

export function DocumentPreview({ inv }: { inv: Invoice }) {
  const { t, formatCurrency, formatDate } = useI18n()
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_16rem]">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative mx-auto aspect-[1/1.28] w-full max-w-md overflow-hidden rounded-xl border border-ink-200 bg-white shadow-card"
      >
        <div className="absolute right-3 top-3 rounded-md bg-ink-100 px-2 py-0.5 text-[10px] font-semibold text-ink-400">
          {t('detail.doc.page', { n: 1 })}
        </div>
        <div className="grid-bg absolute inset-0 opacity-40" />
        <div className="relative flex h-full flex-col p-6">
          <div className="flex items-start justify-between">
            <div>
              <div className="h-2.5 w-24 rounded bg-ink-800" />
              <div className="mt-2 h-1.5 w-32 rounded bg-ink-200" />
              <div className="mt-1 h-1.5 w-20 rounded bg-ink-200" />
            </div>
            <FileText size={30} className="text-ink-200" />
          </div>
          <div className="mt-6 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
            {inv.creditorName}
          </div>
          <div className="mt-1 font-mono text-sm font-bold text-ink-800">{inv.systemInvoiceNumber}</div>
          <div className="mt-0.5 text-[11px] text-ink-400">{formatDate(inv.invoiceDate, 'long')}</div>

          <div className="mt-5 space-y-2">
            {inv.lineItems.map((l) => (
              <div key={l.id} className="flex items-center justify-between border-b border-dashed border-ink-100 pb-1.5">
                <div className="h-1.5 flex-1 rounded bg-ink-100" style={{ maxWidth: `${40 + (l.text.length % 40)}%` }} />
                <span className="ml-3 font-mono text-[11px] text-ink-500">{formatCurrency(l.amount, inv.currency)}</span>
              </div>
            ))}
          </div>

          <div className="mt-auto flex items-center justify-between border-t-2 border-ink-800 pt-2">
            <span className="text-[11px] font-bold uppercase text-ink-500">{t('detail.lines.total')}</span>
            <span className="font-mono text-sm font-bold text-ink-900">{formatCurrency(inv.totalAmount, inv.currency)}</span>
          </div>
        </div>
      </motion.div>

      <div>
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-400">{t('detail.section.attachments')}</p>
        <div className="space-y-2">
          {inv.attachments.map((a) => (
            <div key={a.id} className="flex items-center gap-2.5 rounded-xl border border-ink-200 bg-white px-3 py-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink-100 text-ink-500">
                {a.kind === 'supporting' ? <Paperclip size={15} /> : <FileText size={15} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-ink-700">{a.name}</div>
                <div className="text-[11px] text-ink-400">
                  {a.sizeKb} KB{a.pageCount ? ` · ${a.pageCount}p` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] italic text-ink-400">{t('detail.doc.mock')}</p>
      </div>
    </div>
  )
}
