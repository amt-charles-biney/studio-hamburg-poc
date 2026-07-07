import { useEffect, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export function Modal({
  open,
  onClose,
  title,
  description,
  icon: Icon,
  iconClass,
  children,
  footer,
  size = 'md',
}: {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  icon?: LucideIcon
  iconClass?: string
  children?: ReactNode
  footer?: ReactNode
  size?: 'sm' | 'md' | 'lg'
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  const maxW = size === 'sm' ? 'max-w-sm' : size === 'lg' ? 'max-w-2xl' : 'max-w-md'

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className={cn(
              'relative w-full rounded-t-3xl bg-white shadow-lift sm:rounded-3xl',
              'max-h-[92vh] overflow-hidden flex flex-col',
              maxW,
            )}
          >
            {(title || Icon) && (
              <div className="flex items-start gap-3 border-b border-ink-100 px-5 py-4">
                {Icon && (
                  <span className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', iconClass ?? 'bg-brand-50 text-brand-600')}>
                    <Icon size={19} />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  {title && <h2 className="text-base font-semibold text-ink-900">{title}</h2>}
                  {description && <p className="mt-0.5 text-sm text-ink-500">{description}</p>}
                </div>
                <button
                  onClick={onClose}
                  className="-mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 focus-ring"
                >
                  <X size={18} />
                </button>
              </div>
            )}
            {children && <div className="overflow-y-auto px-5 py-4">{children}</div>}
            {footer && <div className="flex items-center justify-end gap-2 border-t border-ink-100 px-5 py-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
