import { motion } from 'framer-motion'
import { Languages } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useI18n } from '@/i18n'
import type { Language } from '@/types'

const langs: { key: Language; label: string }[] = [
  { key: 'en', label: 'EN' },
  { key: 'de', label: 'DE' },
]

export function LanguageToggle() {
  const { lang, setLang } = useI18n()
  return (
    <div className="fixed bottom-5 right-5 z-[90]">
      <div className="flex items-center gap-1 rounded-2xl border border-ink-200/80 bg-white/80 p-1 shadow-lift backdrop-blur-xl">
        <span className="pl-2 pr-0.5 text-ink-400">
          <Languages size={15} />
        </span>
        {langs.map((l) => {
          const active = l.key === lang
          return (
            <button
              key={l.key}
              onClick={() => setLang(l.key)}
              aria-pressed={active}
              className={cn(
                'relative rounded-xl px-3 py-1.5 text-xs font-bold transition-colors focus-ring',
                active ? 'text-white' : 'text-ink-500 hover:text-ink-800',
              )}
            >
              {active && (
                <motion.span
                  layoutId="lang-active"
                  className="absolute inset-0 rounded-xl bg-brand-gradient shadow-glow"
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10">{l.label}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
