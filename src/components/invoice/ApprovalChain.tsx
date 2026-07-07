import { motion } from 'framer-motion'
import { ArrowDown, Check, Minus, MoveRight, X } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useI18n } from '@/i18n'
import { useStore } from '@/store/useStore'
import { Avatar } from '@/components/ui/Avatar'
import { fourEyesProgress } from '@/engine/approval'
import type { ApprovalStep, Invoice } from '@/types'

function StepIcon({ step }: { step: ApprovalStep }) {
  const base = 'flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold shrink-0'
  switch (step.state) {
    case 'approved':
      return <span className={cn(base, 'bg-emerald-500 text-white')}><Check size={17} /></span>
    case 'declined':
      return <span className={cn(base, 'bg-rose-500 text-white')}><X size={17} /></span>
    case 'delegated':
      return <span className={cn(base, 'bg-sky-500 text-white')}><MoveRight size={16} /></span>
    case 'closed_no_action':
      return <span className={cn(base, 'bg-slate-400 text-white')}><Minus size={17} /></span>
    case 'current':
      return (
        <span className={cn(base, 'bg-amber-400 text-white ring-4 ring-amber-100')}>
          <motion.span
            className="h-2.5 w-2.5 rounded-full bg-white"
            animate={{ scale: [1, 0.6, 1] }}
            transition={{ repeat: Infinity, duration: 1.6 }}
          />
        </span>
      )
    case 'skipped':
      return <span className={cn(base, 'bg-ink-100 text-ink-300')}><Minus size={16} /></span>
    default:
      return <span className={cn(base, 'bg-ink-100 text-ink-400')}>{step.index}</span>
  }
}

export function ApprovalChain({ inv }: { inv: Invoice }) {
  const { t, formatCurrency } = useI18n()
  const getUser = useStore((s) => s.getUser)
  const currentUserId = useStore((s) => s.currentUserId)
  const config = useStore((s) => s.config)
  const groups = useStore((s) => s.groups)

  if (!inv.chain.length) return null
  const progress = fourEyesProgress(inv, config)

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-ink-400">
          {t('detail.section.chain')}
        </span>
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold',
            progress.count >= progress.min
              ? 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200'
              : 'bg-ink-100 text-ink-500',
          )}
        >
          <span className="flex gap-0.5">
            {Array.from({ length: Math.max(progress.min, progress.count) }).map((_, i) => (
              <span
                key={i}
                className={cn('h-1.5 w-1.5 rounded-full', i < progress.count ? 'bg-emerald-500' : 'bg-ink-300')}
              />
            ))}
          </span>
          {t('detail.chain.fourEyes', { done: progress.count, min: progress.min })}
        </span>
      </div>

      <ol className="relative space-y-1">
        {inv.chain.map((step, i) => {
          const baseUser = getUser(step.userId)
          const delegateUser = step.delegatedToUserId ? getUser(step.delegatedToUserId) : undefined
          const group = step.delegatedToGroupId ? groups.find((g) => g.id === step.delegatedToGroupId) : undefined
          const actor = delegateUser ?? baseUser
          const isCurrent = step.state === 'current'
          const isViewer = actor?.id === currentUserId
          const covers = !step.isBooker && step.spendLimit >= inv.totalAmount
          const notLast = i < inv.chain.length - 1

          return (
            <li key={step.index} className="relative flex gap-3">
              {notLast && (
                <span
                  className={cn(
                    'absolute left-[17px] top-9 h-[calc(100%-4px)] w-0.5',
                    step.state === 'approved' ? 'bg-emerald-200' : 'bg-ink-100',
                  )}
                />
              )}
              <StepIcon step={step} />
              <div
                className={cn(
                  'mb-1 flex-1 rounded-xl border px-3 py-2 transition',
                  isCurrent ? 'border-amber-200 bg-amber-50/60' : 'border-transparent',
                )}
              >
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {actor && <Avatar user={actor} size="xs" />}
                  <span className="text-sm font-semibold text-ink-800">
                    {group ? group.name : (actor?.name ?? '—')}
                  </span>
                  {actor && !actor.active && (
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                      {t('detail.departed')}
                    </span>
                  )}
                  {isViewer && (
                    <span className="rounded bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">
                      {t('detail.chain.you')}
                    </span>
                  )}
                  {isCurrent && (
                    <span className="rounded-full bg-amber-400 px-2 py-0.5 text-[10px] font-bold text-white">
                      {t('detail.chain.current')}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12px] text-ink-500">
                  <span>{step.isBooker ? t('detail.chain.booker') : step.role}</span>
                  {!step.isBooker && (
                    <>
                      <span className="text-ink-300">·</span>
                      <span className="tabular">{t('detail.chain.limit', { amount: formatCurrency(step.spendLimit, inv.currency) })}</span>
                    </>
                  )}
                </div>

                {delegateUser && baseUser && delegateUser.id !== baseUser.id && (
                  <p className="mt-1 text-[11px] text-sky-600">
                    {t('event.delegated.to', { target: delegateUser.name })} · {baseUser.name}
                  </p>
                )}

                {isCurrent && !step.isBooker && (
                  <p className={cn('mt-1 flex items-center gap-1 text-[11px] font-medium', covers ? 'text-emerald-600' : 'text-amber-600')}>
                    {covers ? (
                      <Check size={12} />
                    ) : (
                      <ArrowDown size={12} />
                    )}
                    {covers ? t('detail.chain.willClose') : t('detail.chain.willEscalate')}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
