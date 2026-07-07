import { motion } from 'framer-motion'
import {
  AlarmClock,
  Check,
  Clock3,
  FileInput,
  MinusCircle,
  MoveRight,
  Paperclip,
  Route,
  Send,
  ShieldCheck,
  Stamp,
  TrendingUp,
  Undo2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useI18n } from '@/i18n'
import { useStore } from '@/store/useStore'
import { Avatar } from '@/components/ui/Avatar'
import { Tooltip } from '@/components/ui/primitives'
import type { HistoryEventType, Invoice } from '@/types'

const eventMeta: Record<HistoryEventType, { icon: LucideIcon; tone: string; ring: string }> = {
  CREATED: { icon: FileInput, tone: 'text-slate-500', ring: 'bg-slate-100' },
  VALIDATED: { icon: ShieldCheck, tone: 'text-sky-500', ring: 'bg-sky-100' },
  ROUTED: { icon: Route, tone: 'text-indigo-500', ring: 'bg-indigo-100' },
  BOOKED: { icon: Stamp, tone: 'text-sky-600', ring: 'bg-sky-100' },
  APPROVED: { icon: Check, tone: 'text-emerald-600', ring: 'bg-emerald-100' },
  ESCALATED: { icon: TrendingUp, tone: 'text-amber-600', ring: 'bg-amber-100' },
  DECLINED: { icon: X, tone: 'text-rose-600', ring: 'bg-rose-100' },
  DELEGATED: { icon: MoveRight, tone: 'text-sky-600', ring: 'bg-sky-100' },
  REMIND_LATER: { icon: Clock3, tone: 'text-amber-500', ring: 'bg-amber-100' },
  CLOSED_NO_ACTION: { icon: MinusCircle, tone: 'text-slate-500', ring: 'bg-slate-100' },
  ADD_ATTACHMENT: { icon: Paperclip, tone: 'text-violet-500', ring: 'bg-violet-100' },
  RETRACTED: { icon: Undo2, tone: 'text-orange-500', ring: 'bg-orange-100' },
  SLA_FLAGGED: { icon: AlarmClock, tone: 'text-rose-500', ring: 'bg-rose-100' },
  EXPORTED: { icon: Send, tone: 'text-violet-600', ring: 'bg-violet-100' },
}

export function ApprovalTimeline({ inv }: { inv: Invoice }) {
  const { t, formatCurrency, formatDateTime, formatRelative } = useI18n()
  const getUser = useStore((s) => s.getUser)
  const config = useStore((s) => s.config)
  const groups = useStore((s) => s.groups)

  if (!inv.approvalHistory.length) {
    return <p className="py-6 text-center text-sm text-ink-400">{t('detail.history.empty')}</p>
  }

  let runningApprovals = 0

  return (
    <ol className="relative space-y-4">
      {inv.approvalHistory.map((ev, i) => {
        const meta = eventMeta[ev.action]
        const Icon = meta.icon
        const actor = ev.userId ? getUser(ev.userId) : null
        const notLast = i < inv.approvalHistory.length - 1

        if (ev.action === 'APPROVED') runningApprovals += 1

        // Escalation reason text
        let reasonText: string | null = null
        if (ev.action === 'ESCALATED' && ev.meta?.reasonKey) {
          if (ev.meta.reasonKey === 'event.escalated.fourEyes') {
            reasonText = t(ev.meta.reasonKey, { done: runningApprovals, min: config.fourEyesMin })
          } else {
            const fromLimit = ev.meta.fromStep !== undefined ? inv.chain[ev.meta.fromStep]?.spendLimit ?? 0 : 0
            reasonText = t(ev.meta.reasonKey, {
              amount: formatCurrency(inv.totalAmount, inv.currency),
              limit: formatCurrency(fromLimit, inv.currency),
            })
          }
        }

        const delegateTarget = ev.meta?.delegatedToUserId
          ? getUser(ev.meta.delegatedToUserId)?.name
          : ev.meta?.delegatedToGroupId
            ? groups.find((g) => g.id === ev.meta?.delegatedToGroupId)?.name
            : null

        return (
          <motion.li
            key={ev.id}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
            className="relative flex gap-3"
          >
            {notLast && <span className="absolute left-[15px] top-8 h-[calc(100%+4px)] w-px bg-ink-100" />}
            <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', meta.ring)}>
              <Icon size={15} className={meta.tone} />
            </span>
            <div className="min-w-0 flex-1 pb-0.5">
              <div className="flex flex-wrap items-baseline gap-x-1.5">
                <span className="text-sm font-medium text-ink-800">{t(`event.${ev.action}`)}</span>
                {actor ? (
                  <span className="inline-flex items-center gap-1 text-sm text-ink-600">
                    <Avatar user={actor} size="xs" />
                    <span className="font-semibold">{actor.name}</span>
                    {!actor.active && (
                      <Tooltip label={t('detail.departedTip')}>
                        <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                          {t('detail.departed')}
                        </span>
                      </Tooltip>
                    )}
                  </span>
                ) : (
                  <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-semibold text-ink-500">
                    {t('detail.history.system')}
                  </span>
                )}
                {delegateTarget && <span className="text-sm text-sky-600">{t('event.delegated.to', { target: delegateTarget })}</span>}
                {ev.limitAtTime !== undefined && ev.limitAtTime > 0 && (
                  <span className="rounded bg-ink-100 px-1.5 py-0.5 text-[10px] font-medium text-ink-500 tabular">
                    {t('detail.history.limitAtTime', { amount: formatCurrency(ev.limitAtTime, inv.currency) })}
                  </span>
                )}
              </div>

              <Tooltip label={formatDateTime(ev.timestamp)}>
                <time className="text-xs text-ink-400">{formatRelative(ev.timestamp)}</time>
              </Tooltip>

              {reasonText && <p className="mt-1 text-xs font-medium text-amber-600">{reasonText}</p>}

              {ev.comment && (
                <div className="mt-1.5 rounded-lg rounded-tl-sm bg-ink-50 px-3 py-1.5 text-[13px] text-ink-600">
                  “{ev.comment}”
                </div>
              )}
              {ev.meta?.attachmentName && (
                <p className="mt-1 inline-flex items-center gap-1 text-xs text-violet-600">
                  <Paperclip size={11} /> {ev.meta.attachmentName}
                </p>
              )}
            </div>
          </motion.li>
        )
      })}
    </ol>
  )
}
