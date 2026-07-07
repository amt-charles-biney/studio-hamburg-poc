import { Inbox, LayoutDashboard, GitBranch, Layers, type LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  labelKey: string
  icon: LucideIcon
  groupKey: string
}

// Ordered by use: overview first, then daily approver work, then intake monitoring,
// then the admin config that's touched least often.
export const navItems: NavItem[] = [
  { to: '/dashboard', labelKey: 'nav.dashboard', icon: LayoutDashboard, groupKey: 'nav.group.work' },
  { to: '/inbox', labelKey: 'nav.inbox', icon: Inbox, groupKey: 'nav.group.work' },
  { to: '/intake', labelKey: 'nav.intake', icon: Layers, groupKey: 'nav.group.work' },
  { to: '/routing', labelKey: 'nav.routing', icon: GitBranch, groupKey: 'nav.group.admin' },
]
