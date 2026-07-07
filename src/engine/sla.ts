import type { AppConfig, Invoice } from '@/types'
import { daysBetween } from './util'

export interface SlaInfo {
  active: boolean // clock is running (in review, awaiting an actor)
  daysWaiting: number
  threshold: number
  overdue: boolean
  dueSoon: boolean // within a day of the threshold
}

/**
 * Time an invoice has sat with the current approver, vs. the SLA threshold.
 * Drives the "sitting past N days" auto-flag and dashboard SLA-risk view.
 */
export function slaInfo(inv: Invoice, config: AppConfig, now: number = Date.now()): SlaInfo {
  const threshold = inv.slaDaysThreshold ?? config.slaDaysThreshold
  const hasCurrentActor =
    inv.status === 'IN_REVIEW' &&
    !!inv.chain[inv.currentApprovalStep] &&
    inv.chain[inv.currentApprovalStep].state === 'current'
  const active = hasCurrentActor && !!inv.lastActionAt
  const nowIso = new Date(now).toISOString()
  const start = inv.lastActionAt ?? inv.createdAt
  const daysWaiting = active ? daysBetween(start, nowIso) : 0
  const overdue = active && daysWaiting > threshold
  const dueSoon = active && !overdue && daysWaiting >= threshold - 1
  return { active, daysWaiting, threshold, overdue, dueSoon }
}
