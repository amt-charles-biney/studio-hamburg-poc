import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HelpCircle, Menu, PanelLeftClose, PanelLeftOpen, RotateCcw, Sparkles } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useI18n } from '@/i18n'
import { useStore } from '@/store/useStore'
import { Tooltip } from '@/components/ui/primitives'
import { Modal } from '@/components/ui/Modal'
import { GlobalSearch } from './GlobalSearch'
import { NotificationBell } from './NotificationBell'
import { UserSwitcher } from './UserSwitcher'

const iconBtn =
  'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-ink-200 bg-white text-ink-500 shadow-soft transition hover:border-ink-300 hover:text-ink-700 focus-ring'

function UtilityButton({
  label,
  onClick,
  children,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <Tooltip label={label} side="bottom">
      <button onClick={onClick} aria-label={label} className={iconBtn}>
        {children}
      </button>
    </Tooltip>
  )
}

export function TopBar({
  onMenu,
  collapsed,
  onToggleCollapse,
}: {
  onMenu: () => void
  collapsed: boolean
  onToggleCollapse: () => void
}) {
  const { t } = useI18n()
  const navigate = useNavigate()
  const simulateArrival = useStore((s) => s.simulateArrival)
  const resetDemo = useStore((s) => s.resetDemo)
  const [helpOpen, setHelpOpen] = useState(false)

  const tips = ['help.tip.users', 'help.tip.escalate', 'help.tip.intake', 'help.tip.lang']

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center gap-2 border-b border-ink-200/70 bg-ink-100/70 px-3 backdrop-blur-xl sm:gap-3 sm:px-6">
        {/* Mobile: open drawer */}
        <button onClick={onMenu} aria-label="Menu" className={cn(iconBtn, 'lg:hidden')}>
          <Menu size={19} />
        </button>

        {/* Desktop: collapse / expand the sidebar */}
        <Tooltip label={collapsed ? t('topbar.expand') : t('topbar.collapse')} side="bottom">
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? t('topbar.expand') : t('topbar.collapse')}
            className={cn(iconBtn, 'hidden lg:flex')}
          >
            {collapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
          </button>
        </Tooltip>

        {/* Search — left, next to the toggle */}
        <GlobalSearch className="min-w-0 max-w-md flex-1" />

        <div className="flex-1" />

        {/* Right — utilities + notifications + user */}
        <div className="hidden items-center gap-2 md:flex">
          <UtilityButton
            label={t('intake.simulate')}
            onClick={() => {
              simulateArrival()
              navigate('/intake')
            }}
          >
            <Sparkles size={18} />
          </UtilityButton>
          <UtilityButton label={t('demo.reset')} onClick={resetDemo}>
            <RotateCcw size={17} />
          </UtilityButton>
          <UtilityButton label={t('topbar.help')} onClick={() => setHelpOpen(true)}>
            <HelpCircle size={18} />
          </UtilityButton>
          <div className="mx-1 h-6 w-px bg-ink-200" />
        </div>

        <NotificationBell />
        <UserSwitcher />
      </header>

      <Modal
        open={helpOpen}
        onClose={() => setHelpOpen(false)}
        title={t('help.title')}
        icon={HelpCircle}
        iconClass="bg-brand-50 text-brand-600"
      >
        <p className="text-sm leading-relaxed text-ink-600">{t('help.intro')}</p>
        <ul className="mt-4 space-y-2.5">
          {tips.map((tip, i) => (
            <li key={tip} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                {i + 1}
              </span>
              <span className="text-sm text-ink-700">{t(tip)}</span>
            </li>
          ))}
        </ul>
      </Modal>
    </>
  )
}
