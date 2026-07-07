import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, Mail } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useI18n } from '@/i18n'
import { useStore } from '@/store/useStore'
import type { AppNotification, Invoice } from '@/types'

function notifParams(n: AppNotification, inv: Invoice | undefined, formatCurrency: (a: number, c?: string) => string) {
  return {
    invoice: inv?.systemInvoiceNumber ?? '',
    creditor: inv?.creditorName ?? '',
    amount: inv ? formatCurrency(inv.totalAmount, inv.currency) : '',
    ...(n.params ?? {}),
  }
}

export function NotificationBell() {
  const { t, formatCurrency, formatRelative } = useI18n()
  const navigate = useNavigate()
  const currentUserId = useStore((s) => s.currentUserId)
  const notifications = useStore((s) => s.notifications)
  const invoices = useStore((s) => s.invoices)
  const markRead = useStore((s) => s.markNotificationRead)
  const markAllRead = useStore((s) => s.markAllNotificationsRead)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const mine = notifications.filter((n) => n.toUserId === currentUserId)
  const unread = mine.filter((n) => !n.read).length

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const openInvoice = (n: AppNotification) => {
    markRead(n.id)
    setOpen(false)
    if (n.invoiceId) navigate(`/invoice/${n.invoiceId}`)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-500 shadow-soft transition hover:border-ink-300 hover:text-ink-700 focus-ring"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-lift"
          >
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
              <p className="text-sm font-semibold text-ink-800">{t('notif.title')}</p>
              {unread > 0 && (
                <button
                  onClick={() => markAllRead(currentUserId)}
                  className="text-xs font-medium text-brand-600 hover:text-brand-700"
                >
                  {t('notif.markAllRead')}
                </button>
              )}
            </div>
            <div className="max-h-[26rem] overflow-y-auto">
              {mine.length === 0 ? (
                <p className="px-4 py-10 text-center text-sm text-ink-400">{t('notif.empty')}</p>
              ) : (
                mine.map((n) => {
                  const inv = invoices.find((i) => i.id === n.invoiceId)
                  const params = notifParams(n, inv, formatCurrency)
                  return (
                    <button
                      key={n.id}
                      onClick={() => openInvoice(n)}
                      className={cn(
                        'block w-full border-b border-ink-50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-ink-50',
                        !n.read && 'bg-brand-50/40',
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                        <div className={cn('min-w-0 flex-1', n.read && 'pl-4')}>
                          <p className="text-[13px] font-semibold text-ink-800">{t(n.titleKey, params)}</p>
                          {n.bodyKey && <p className="mt-0.5 text-xs text-ink-500">{t(n.bodyKey, params)}</p>}
                          {n.emailSubjectKey && (
                            <p className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-ink-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-500">
                              <Mail size={10} /> {t(n.emailSubjectKey, params)}
                            </p>
                          )}
                          <p className="mt-1 text-[11px] text-ink-400">{formatRelative(n.createdAt)}</p>
                        </div>
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
