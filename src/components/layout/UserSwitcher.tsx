import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useI18n } from '@/i18n'
import { useStore } from '@/store/useStore'
import { Avatar } from '@/components/ui/Avatar'

export function UserSwitcher() {
  const { t } = useI18n()
  const users = useStore((s) => s.users)
  const currentUserId = useStore((s) => s.currentUserId)
  const setCurrentUser = useStore((s) => s.setCurrentUser)
  const invoices = useStore((s) => s.invoices)
  const isPendingForViewer = useStore((s) => s.isPendingForViewer)
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = users.find((u) => u.id === currentUserId) ?? users[0]

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  const pendingCountFor = (userId: string) =>
    invoices.filter((i) => isPendingForViewer(i, userId)).length

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-ink-200 bg-white py-1.5 pl-1.5 pr-2.5 shadow-soft transition hover:border-ink-300 hover:shadow-card focus-ring"
      >
        <Avatar user={current} size="sm" />
        <div className="hidden text-left leading-tight sm:block">
          <div className="text-[13px] font-semibold text-ink-800">{current.name}</div>
          <div className="text-[11px] text-ink-400">{t(`user.role.${current.role}`)}</div>
        </div>
        <ChevronsUpDown size={15} className="text-ink-400" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-lift"
          >
            <div className="border-b border-ink-100 px-4 py-3">
              <p className="text-sm font-semibold text-ink-800">{t('user.switch')}</p>
              <p className="mt-0.5 text-xs text-ink-400">{t('user.switch.hint')}</p>
            </div>
            <div className="max-h-80 overflow-y-auto py-1.5">
              {users.map((u) => {
                const isActive = u.id === currentUserId
                const pending = pendingCountFor(u.id)
                return (
                  <button
                    key={u.id}
                    disabled={!u.active}
                    onClick={() => {
                      setCurrentUser(u.id)
                      setOpen(false)
                    }}
                    className={cn(
                      'flex w-full items-center gap-3 px-3 py-2 text-left transition-colors',
                      u.active ? 'hover:bg-ink-50' : 'opacity-60',
                      isActive && 'bg-brand-50/60',
                    )}
                  >
                    <Avatar user={u} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate text-[13px] font-semibold text-ink-800">{u.name}</span>
                        {!u.active && (
                          <span className="rounded bg-slate-100 px-1 text-[9px] font-bold uppercase text-slate-500">
                            {t('user.departed')}
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-ink-400">{u.title}</span>
                    </div>
                    {pending > 0 && u.active && (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[10px] font-bold text-amber-700">
                        {pending}
                      </span>
                    )}
                    {isActive && <Check size={16} className="text-brand-600" />}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
