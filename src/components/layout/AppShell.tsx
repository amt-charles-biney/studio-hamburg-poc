import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { cn } from '@/lib/cn'
import { Sidebar } from './Sidebar'
import { TopBar } from './TopBar'
import { LanguageToggle } from './LanguageToggle'
import { ToastHost } from './ToastHost'

export function AppShell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  // Always close the mobile drawer on navigation.
  useEffect(() => {
    setDrawerOpen(false)
  }, [location.pathname])

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar — width animates on collapse/expand */}
      <aside
        className={cn(
          'sticky top-0 hidden h-screen shrink-0 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] lg:block',
          collapsed ? 'lg:w-[76px]' : 'lg:w-[264px]',
        )}
      >
        <Sidebar collapsed={collapsed} />
      </aside>

      {/*
        Mobile drawer — always mounted, animated open/closed via `motion` and made
        `pointer-events-none` when closed. Deliberately NOT using AnimatePresence:
        its exit lifecycle can get stuck under React StrictMode, leaving an invisible
        full-screen overlay that blocks all interaction.
      */}
      <div className={cn('fixed inset-0 z-[60] overflow-hidden lg:hidden', !drawerOpen && 'pointer-events-none')}>
        <motion.div
          className="absolute inset-0 bg-ink-950/40 backdrop-blur-sm"
          initial={false}
          animate={{ opacity: drawerOpen ? 1 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ pointerEvents: drawerOpen ? 'auto' : 'none' }}
          onClick={() => setDrawerOpen(false)}
          aria-hidden={!drawerOpen}
        />
        <motion.aside
          className="absolute left-0 top-0 h-full w-72 shadow-lift"
          initial={false}
          animate={{ x: drawerOpen ? '0%' : '-100%' }}
          transition={{ type: 'spring', stiffness: 320, damping: 34 }}
        >
          <Sidebar onNavigate={() => setDrawerOpen(false)} navLayoutId="nav-active-drawer" />
        </motion.aside>
      </div>

      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        <TopBar
          onMenu={() => setDrawerOpen(true)}
          collapsed={collapsed}
          onToggleCollapse={() => setCollapsed((c) => !c)}
        />
        <main className="flex-1">
          <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              <Outlet />
            </motion.div>
          </div>
        </main>
      </div>

      <LanguageToggle />
      <ToastHost />
    </div>
  )
}
