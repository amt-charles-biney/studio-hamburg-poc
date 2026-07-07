import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, CheckCircle2, Info, X, XCircle, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useI18n } from '@/i18n'
import { useStore, type Toast } from '@/store/useStore'

const toneMeta: Record<Toast['kind'], { icon: LucideIcon; ring: string; iconColor: string }> = {
  success: { icon: CheckCircle2, ring: 'ring-emerald-200', iconColor: 'text-emerald-500' },
  info: { icon: Info, ring: 'ring-sky-200', iconColor: 'text-sky-500' },
  warn: { icon: AlertTriangle, ring: 'ring-amber-200', iconColor: 'text-amber-500' },
  error: { icon: XCircle, ring: 'ring-rose-200', iconColor: 'text-rose-500' },
}

function ToastCard({ toast }: { toast: Toast }) {
  const { t } = useI18n()
  const dismiss = useStore((s) => s.dismissToast)
  const meta = toneMeta[toast.kind]
  const Icon = meta.icon

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), 3800)
    return () => clearTimeout(timer)
  }, [toast.id, dismiss])

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={cn('flex items-center gap-3 rounded-2xl bg-white px-4 py-3 shadow-lift ring-1', meta.ring)}
    >
      <Icon size={18} className={cn('shrink-0', meta.iconColor)} />
      <span className="text-sm font-medium text-ink-800">{t(toast.messageKey, toast.params)}</span>
      <button onClick={() => dismiss(toast.id)} className="ml-2 text-ink-300 transition hover:text-ink-600">
        <X size={15} />
      </button>
    </motion.div>
  )
}

export function ToastHost() {
  const toasts = useStore((s) => s.toasts)
  return (
    <div className="pointer-events-none fixed bottom-5 left-1/2 z-[120] flex w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 flex-col items-center gap-2 sm:left-5 sm:translate-x-0 sm:items-start">
      <AnimatePresence>
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto w-full">
            <ToastCard toast={toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  )
}
