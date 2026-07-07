import { cn } from '@/lib/cn'
import type { User } from '@/types'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

const sizeMap = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
}

export function Avatar({
  user,
  size = 'md',
  ring = false,
  className,
}: {
  user: Pick<User, 'name' | 'avatarColor' | 'active'>
  size?: keyof typeof sizeMap
  ring?: boolean
  className?: string
}) {
  const departed = !user.active
  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white',
        'bg-gradient-to-br shadow-soft',
        departed ? 'from-slate-300 to-slate-400 grayscale' : user.avatarColor,
        ring && 'ring-2 ring-white',
        sizeMap[size],
        className,
      )}
      title={user.name}
    >
      {initials(user.name)}
      {departed && (
        <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-400" />
      )}
    </span>
  )
}
