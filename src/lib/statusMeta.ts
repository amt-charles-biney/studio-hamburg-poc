import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Copy,
  FileWarning,
  Inbox,
  Send,
  UserCog,
  Users,
  XCircle,
  type LucideIcon,
} from 'lucide-react'
import type { InvoiceStatus, RoutingOutcome, StatusBucket } from '@/types'

export interface StatusVisual {
  labelKey: string
  chip: string // full chip classes (bg + text + ring)
  dot: string // dot bg color
  solid: string // solid accent bg (for bars / left borders)
  text: string // text/accent color
  soft: string // soft background tint
  icon: LucideIcon
}

export const bucketVisual: Record<StatusBucket, StatusVisual> = {
  pending_you: {
    labelKey: 'bucket.pending_you',
    chip: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
    dot: 'bg-amber-500',
    solid: 'bg-amber-500',
    text: 'text-amber-600',
    soft: 'bg-amber-50',
    icon: Clock3,
  },
  waiting_others: {
    labelKey: 'bucket.waiting_others',
    chip: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200',
    dot: 'bg-sky-500',
    solid: 'bg-sky-500',
    text: 'text-sky-600',
    soft: 'bg-sky-50',
    icon: Users,
  },
  approved: {
    labelKey: 'bucket.approved',
    chip: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    dot: 'bg-emerald-500',
    solid: 'bg-emerald-500',
    text: 'text-emerald-600',
    soft: 'bg-emerald-50',
    icon: CheckCircle2,
  },
  exported: {
    labelKey: 'bucket.exported',
    chip: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200',
    dot: 'bg-violet-500',
    solid: 'bg-violet-500',
    text: 'text-violet-600',
    soft: 'bg-violet-50',
    icon: Send,
  },
  rejected: {
    labelKey: 'bucket.rejected',
    chip: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
    dot: 'bg-rose-500',
    solid: 'bg-rose-500',
    text: 'text-rose-600',
    soft: 'bg-rose-50',
    icon: XCircle,
  },
  error: {
    labelKey: 'bucket.error',
    chip: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    dot: 'bg-red-500',
    solid: 'bg-red-500',
    text: 'text-red-600',
    soft: 'bg-red-50',
    icon: AlertTriangle,
  },
  manual: {
    labelKey: 'bucket.manual',
    chip: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
    dot: 'bg-slate-500',
    solid: 'bg-slate-500',
    text: 'text-slate-600',
    soft: 'bg-slate-50',
    icon: UserCog,
  },
  duplicate: {
    labelKey: 'bucket.duplicate',
    chip: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200',
    dot: 'bg-orange-500',
    solid: 'bg-orange-500',
    text: 'text-orange-600',
    soft: 'bg-orange-50',
    icon: Copy,
  },
  incomplete: {
    labelKey: 'bucket.incomplete',
    chip: 'bg-zinc-100 text-zinc-600 ring-1 ring-zinc-200',
    dot: 'bg-zinc-400',
    solid: 'bg-zinc-400',
    text: 'text-zinc-600',
    soft: 'bg-zinc-50',
    icon: FileWarning,
  },
  new: {
    labelKey: 'bucket.new',
    chip: 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
    dot: 'bg-indigo-500',
    solid: 'bg-indigo-500',
    text: 'text-indigo-600',
    soft: 'bg-indigo-50',
    icon: Inbox,
  },
}

/** Raw-status visual (used where the viewer-relative bucket isn't relevant). */
export const statusVisual: Record<InvoiceStatus, StatusVisual> = {
  NEW: bucketVisual.new,
  INCOMPLETE: bucketVisual.incomplete,
  IN_REVIEW: bucketVisual.waiting_others,
  APPROVED: bucketVisual.approved,
  EXPORTED: bucketVisual.exported,
  REJECTED: bucketVisual.rejected,
  ERROR: bucketVisual.error,
  MANUAL: bucketVisual.manual,
  DUPLICATE: bucketVisual.duplicate,
}

export const routingOutcomeMeta: Record<RoutingOutcome, { labelKey: string; className: string }> = {
  project: { labelKey: 'routing.projectTag', className: 'bg-violet-50 text-violet-700 ring-1 ring-violet-200' },
  costcenter: { labelKey: 'routing.fallbackTag', className: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200' },
  fallback: { labelKey: 'routing.fallbackTag', className: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200' },
  manual: { labelKey: 'routingType.Manuell', className: 'bg-slate-100 text-slate-600 ring-1 ring-slate-200' },
  none: { labelKey: 'routing.explain.none', className: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
}
