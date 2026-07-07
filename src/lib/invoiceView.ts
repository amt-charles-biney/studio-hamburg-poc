import type { AppConfig, Group, Invoice, StatusBucket } from '@/types'
import { slaInfo, type SlaInfo } from '@/engine/sla'
import { statusBucketFor } from '@/engine/status'
import { currentStep, effectiveActorId } from '@/engine/approval'

export interface InvoiceView {
  bucket: StatusBucket
  sla: SlaInfo
  pendingForViewer: boolean
  actorId: string | null // effective current actor (null for groups / no actor)
  isStalled: boolean // closed without action — no active actor while in review
  nearDuplicate: boolean
}

export function makeInvoiceView(inv: Invoice, pendingForViewer: boolean, config: AppConfig): InvoiceView {
  const step = currentStep(inv)
  const isStalled = inv.status === 'IN_REVIEW' && step?.state === 'closed_no_action'
  return {
    bucket: statusBucketFor(inv, pendingForViewer),
    sla: slaInfo(inv, config),
    pendingForViewer,
    actorId: inv.status === 'IN_REVIEW' && step?.state === 'current' ? effectiveActorId(step) : null,
    isStalled,
    nearDuplicate: !!inv.nearDuplicateOf?.length,
  }
}

/** Whether a user is part of an invoice's chain or history (for inbox tabs). */
export function isUserInvolved(inv: Invoice, userId: string, groups: Group[]): boolean {
  if (inv.chain.some((s) => s.userId === userId || s.delegatedToUserId === userId)) return true
  if (
    inv.chain.some(
      (s) => s.delegatedToGroupId && groups.find((g) => g.id === s.delegatedToGroupId)?.memberUserIds.includes(userId),
    )
  )
    return true
  return inv.approvalHistory.some((e) => e.userId === userId)
}

/** Case-insensitive keyword match across the fields a reviewer would search. */
export function matchesQuery(inv: Invoice, q: string): boolean {
  if (!q.trim()) return true
  const hay = [
    inv.systemInvoiceNumber,
    inv.opInfoNumber,
    inv.creditorName,
    inv.project ?? '',
    inv.costCenter,
    inv.costCarrier ?? '',
    inv.companyNumber,
  ]
    .join(' ')
    .toLowerCase()
  return q
    .toLowerCase()
    .split(/\s+/)
    .every((term) => hay.includes(term))
}
