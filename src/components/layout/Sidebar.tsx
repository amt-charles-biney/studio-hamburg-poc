import { NavLink, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { useI18n } from '@/i18n'
import { useStore } from '@/store/useStore'
import { Tooltip } from '@/components/ui/primitives'
import { navItems } from './nav'

function BrandMark({ collapsed }: { collapsed?: boolean }) {
  return (
    <div className={cn('flex items-center gap-3', collapsed ? 'justify-center' : 'px-1.5')}>
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
      {!collapsed && (
        <div className="min-w-0 leading-tight">
          <div className="truncate text-lg font-bold tracking-tight text-white">InvoiceFlow</div>
          <div className="truncate text-[11px] font-medium text-brand-200/80">Studio Hamburg</div>
        </div>
      )}
    </div>
  )
}

export function Sidebar({ onNavigate, collapsed = false }: { onNavigate?: () => void; collapsed?: boolean }) {
  const { t } = useI18n()
  const location = useLocation()
  const pendingCount = useStore((s) =>
    s.invoices.filter((i) => s.isPendingForViewer(i, s.currentUserId)).length,
  )

  const groups = Array.from(new Set(navItems.map((n) => n.groupKey)))

  return (
    <div className="flex h-full flex-col bg-sidebar-gradient">
      <div className={cn('pb-4 pt-5', collapsed ? 'px-3' : 'px-4')}>
        <BrandMark collapsed={collapsed} />
      </div>

      <nav
        className={cn(
          'flex-1 py-2 no-scrollbar',
          collapsed ? 'space-y-2 overflow-visible px-3' : 'space-y-6 overflow-y-auto px-3',
        )}
      >
        {groups.map((groupKey, gi) => (
          <div key={groupKey}>
            {collapsed ? (
              gi > 0 && <div className="mx-2 mb-2 h-px bg-white/10" />
            ) : (
              <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-brand-200/50">
                {t(groupKey)}
              </div>
            )}
            <div className="space-y-1">
              {navItems
                .filter((n) => n.groupKey === groupKey)
                .map((item) => {
                  const active = location.pathname.startsWith(item.to)
                  const Icon = item.icon
                  const badge = item.to === '/inbox' && pendingCount > 0 ? pendingCount : undefined
                  const link = (
                    <NavLink
                      to={item.to}
                      onClick={onNavigate}
                      className={cn(
                        'group relative flex items-center rounded-xl text-sm font-medium transition-colors',
                        collapsed ? 'h-11 w-11 justify-center' : 'gap-3 px-3 py-2.5',
                        active ? 'text-white' : 'text-brand-100/70 hover:text-white',
                      )}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-active"
                          className="absolute inset-0 rounded-xl bg-white/10 ring-1 ring-inset ring-white/10"
                          transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                        />
                      )}
                      <Icon size={18} className="relative z-10 shrink-0" />
                      {!collapsed && <span className="relative z-10 flex-1">{t(item.labelKey)}</span>}
                      {badge !== undefined &&
                        (collapsed ? (
                          <span className="absolute -right-1 -top-1 z-10 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-400 px-1 text-[10px] font-bold text-amber-950 ring-2 ring-brand-950">
                            {badge}
                          </span>
                        ) : (
                          <span className="relative z-10 flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-400 px-1.5 text-[11px] font-bold text-amber-950">
                            {badge}
                          </span>
                        ))}
                    </NavLink>
                  )
                  return collapsed ? (
                    <Tooltip key={item.to} label={t(item.labelKey)} side="right">
                      {link}
                    </Tooltip>
                  ) : (
                    <div key={item.to}>{link}</div>
                  )
                })}
            </div>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="border-t border-white/10 px-4 py-4">
          <p className="text-[11px] leading-relaxed text-brand-200/50">{t('app.footer')}</p>
        </div>
      )}
    </div>
  )
}
