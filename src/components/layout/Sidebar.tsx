import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { useI18n } from '@/i18n'
import { useStore } from '@/store/useStore'
import { navItems } from './nav'

// Shared easing so the label collapse stays in lock-step with the aside width.
const ease = 'transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]'

function BrandMark({ collapsed }: { collapsed: boolean }) {
  return (
    <div className="flex items-center px-4">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-gradient shadow-glow">
        <svg width="30" height="30" viewBox="8 6 16 19" fill="none">
          <path
            d="M10 8.5h9a3 3 0 0 1 3 3V23l-2.2-1.4L17.6 23l-2.2-1.4L13.2 23 11 21.6V11.5"
            fill="#fff"
            fillOpacity="0.96"
          />
          <path d="M13 13.5h6M13 16.5h6M13 19.5h3.5" stroke="#6366f1" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </div>
      <div
        className={cn(
          'min-w-0 flex-1 overflow-hidden whitespace-nowrap leading-tight',
          ease,
          collapsed ? 'ml-0 max-w-0 opacity-0' : 'ml-3 max-w-[160px] opacity-100',
        )}
      >
        <div className="truncate text-lg font-bold tracking-tight text-white">InvoiceFlow</div>
        <div className="truncate text-[11px] font-medium text-brand-200/80">Studio Hamburg</div>
      </div>
    </div>
  )
}

export function Sidebar({
  onNavigate,
  collapsed = false,
  navLayoutId = 'nav-active',
}: {
  onNavigate?: () => void
  collapsed?: boolean
  navLayoutId?: string
}) {
  const { t } = useI18n()
  const location = useLocation()
  const pendingCount = useStore((s) =>
    s.invoices.filter((i) => s.isPendingForViewer(i, s.currentUserId)).length,
  )

  const groups = Array.from(new Set(navItems.map((n) => n.groupKey)))

  return (
    <div className="flex h-full flex-col bg-sidebar-gradient">
      <div className="pb-4 pt-5">
        <BrandMark collapsed={collapsed} />
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto overflow-x-hidden px-4 py-2 no-scrollbar">
        {groups.map((groupKey) => (
          <div key={groupKey}>
            <div
              className={cn(
                'overflow-hidden whitespace-nowrap px-2 text-[10px] font-bold uppercase tracking-widest text-brand-200/50',
                ease,
                collapsed ? 'mb-0 max-h-0 opacity-0' : 'mb-2 max-h-4 opacity-100',
              )}
            >
              {t(groupKey)}
            </div>
            <div className="space-y-1">
              {navItems
                .filter((n) => n.groupKey === groupKey)
                .map((item) => {
                  const active = location.pathname.startsWith(item.to)
                  const Icon = item.icon
                  const badge = item.to === '/inbox' && pendingCount > 0 ? pendingCount : undefined
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onNavigate}
                      title={collapsed ? t(item.labelKey) : undefined}
                      className={cn(
                        'group relative flex items-center rounded-xl text-sm font-medium transition-colors',
                        active ? 'text-white' : 'text-brand-100/70 hover:text-white',
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId={navLayoutId}
                          className="absolute inset-0 rounded-xl bg-white/10 ring-1 ring-inset ring-white/10"
                          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        />
                      )}
                      <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center">
                        <Icon size={18} />
                        {/* Collapsed-state badge dot on the icon */}
                        {badge !== undefined && (
                          <span
                            className={cn(
                              'absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-400 ring-2 ring-brand-950 transition-opacity duration-200',
                              collapsed ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                        )}
                      </span>
                      <span
                        className={cn(
                          'relative z-10 min-w-0 flex-1 overflow-hidden whitespace-nowrap',
                          ease,
                          collapsed ? 'ml-0 max-w-0 opacity-0' : 'ml-3 max-w-[170px] opacity-100',
                        )}
                      >
                        {t(item.labelKey)}
                      </span>
                      {/* Expanded-state numeric badge */}
                      {badge !== undefined && (
                        <span
                          className={cn(
                            'relative z-10 flex h-5 items-center justify-center overflow-hidden rounded-full bg-amber-400 font-bold text-amber-950',
                            ease,
                            collapsed
                              ? 'mr-0 max-w-0 px-0 text-[0px] opacity-0'
                              : 'mr-3 min-w-5 px-1.5 text-[11px] opacity-100',
                          )}
                        >
                          {badge}
                        </span>
                      )}
                    </NavLink>
                  )
                })}
            </div>
          </div>
        ))}
      </nav>

      <div
        className={cn(
          'overflow-hidden border-t border-white/10 px-4',
          ease,
          collapsed ? 'max-h-0 py-0 opacity-0' : 'max-h-24 py-4 opacity-100',
        )}
      >
        <p className="text-[11px] leading-relaxed text-brand-200/50">{t('app.footer')}</p>
      </div>
    </div>
  )
}
