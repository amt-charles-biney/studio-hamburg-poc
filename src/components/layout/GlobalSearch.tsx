import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CornerDownLeft, Search, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useI18n } from '@/i18n'
import { useStore } from '@/store/useStore'
import { StatusBadge } from '@/components/ui/Badge'
import { makeInvoiceView, matchesQuery } from '@/lib/invoiceView'

export function GlobalSearch({ className }: { className?: string }) {
  const { t, formatCurrency } = useI18n()
  const navigate = useNavigate()
  const invoices = useStore((s) => s.invoices)
  const config = useStore((s) => s.config)
  const currentUserId = useStore((s) => s.currentUserId)
  const isPendingForViewer = useStore((s) => s.isPendingForViewer)

  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    if (!query.trim()) return []
    return invoices
      .filter((i) => matchesQuery(i, query))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
      .slice(0, 7)
  }, [invoices, query])

  useEffect(() => setActive(0), [query])

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const go = (id: string) => {
    navigate(`/invoice/${id}`)
    setQuery('')
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setQuery('')
      setOpen(false)
      ;(e.target as HTMLInputElement).blur()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter' && results[active]) {
      go(results[active].id)
    }
  }

  const showDropdown = open && query.trim().length > 0

  return (
    <div ref={ref} className={cn('relative', className)}>
      <div className="relative">
        <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t('common.searchPlaceholder')}
          className="h-10 w-full rounded-xl border border-ink-200 bg-white/80 pl-9 pr-8 text-sm text-ink-900 shadow-soft outline-none transition-all placeholder:text-ink-400 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-2.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-md text-ink-400 transition hover:bg-ink-100 hover:text-ink-700"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.14 }}
            className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-lift"
          >
            <div className="border-b border-ink-100 px-3.5 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
              {t('search.jumpTo')}
            </div>
            {results.length === 0 ? (
              <p className="px-3.5 py-6 text-center text-sm text-ink-400">{t('common.noResults')}</p>
            ) : (
              <ul className="max-h-[22rem] overflow-y-auto py-1">
                {results.map((inv, i) => {
                  const view = makeInvoiceView(inv, isPendingForViewer(inv, currentUserId), config)
                  return (
                    <li key={inv.id}>
                      <button
                        onMouseEnter={() => setActive(i)}
                        onClick={() => go(inv.id)}
                        className={cn(
                          'flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors',
                          i === active ? 'bg-brand-50' : 'hover:bg-ink-50',
                        )}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-semibold text-ink-800">{inv.creditorName}</div>
                          <div className="flex items-center gap-1.5 text-[11px] text-ink-400">
                            <span className="font-mono text-ink-500">{inv.systemInvoiceNumber}</span>
                            <span>·</span>
                            <span className="tabular">{formatCurrency(inv.totalAmount, inv.currency)}</span>
                          </div>
                        </div>
                        <StatusBadge bucket={view.bucket} size="sm" withIcon={false} />
                        {i === active && <CornerDownLeft size={14} className="shrink-0 text-ink-300" />}
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
