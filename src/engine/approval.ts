import type { AppConfig, ApprovalEvent, ApprovalStep, Attachment, HistoryEventType, Invoice, RoutingRule } from '@/types'
import { uid } from './util'

export const BOOKER_ROLE = 'Booker'
export const ORDERER_ROLE = 'Orderer'

function pushEvent(inv: Invoice, ev: Omit<ApprovalEvent, 'id'>): void {
  inv.approvalHistory.push({ id: uid('ev'), ...ev })
}

// ----------------------------------------------------------------------------
// Chain construction
// ----------------------------------------------------------------------------

/**
 * Build the ordered approval chain from a routing rule.
 * chain[0] is always the booker (informational — not counted toward four-eyes).
 * An optional manual orderer is inserted as the first *approver*, ahead of the
 * routing-table picks. Approvers are capped at config.maxApprovers.
 */
export function resolveChain(inv: Invoice, rule: RoutingRule, config: AppConfig): ApprovalStep[] {
  const steps: ApprovalStep[] = []

  steps.push({
    index: 0,
    role: BOOKER_ROLE,
    userId: rule.booker,
    spendLimit: 0,
    isBooker: true,
    state: 'upcoming',
  })

  const approverSlots: { role: string; userId: string; spendLimit: number }[] = []
  if (inv.manualOrdererUserId) {
    approverSlots.push({ role: ORDERER_ROLE, userId: inv.manualOrdererUserId, spendLimit: 0 })
  }
  for (const a of rule.approvers) {
    approverSlots.push({ role: a.role, userId: a.userId, spendLimit: a.spendLimit })
  }

  approverSlots.slice(0, config.maxApprovers).forEach((slot, i) => {
    steps.push({
      index: i + 1,
      role: slot.role,
      userId: slot.userId,
      spendLimit: slot.spendLimit,
      isBooker: false,
      state: 'upcoming',
    })
  })

  return steps
}

/** Put a freshly-resolved invoice into review, waiting on the booker. */
export function startApproval(inv: Invoice, ts: string): void {
  inv.status = 'IN_REVIEW'
  inv.currentApprovalStep = 0
  if (inv.chain[0]) inv.chain[0].state = 'current'
  inv.lastActionAt = ts
}

// ----------------------------------------------------------------------------
// Actor / progress helpers
// ----------------------------------------------------------------------------

export function effectiveActorId(step: ApprovalStep | undefined): string | null {
  if (!step) return null
  if (step.delegatedToGroupId) return null // any group member — resolved by store/selectors
  return step.delegatedToUserId ?? step.userId
}

export function currentStep(inv: Invoice): ApprovalStep | undefined {
  return inv.chain[inv.currentApprovalStep]
}

export function currentActorId(inv: Invoice): string | null {
  const step = currentStep(inv)
  if (!step || step.state !== 'current') return null
  return effectiveActorId(step)
}

export function isPendingForUser(inv: Invoice, userId: string): boolean {
  if (inv.status !== 'IN_REVIEW') return false
  const step = currentStep(inv)
  if (!step || step.state !== 'current') return false
  return effectiveActorId(step) === userId
}

export interface FourEyesProgress {
  count: number
  min: number
  someoneCovers: boolean
}

export function fourEyesProgress(inv: Invoice, config: AppConfig): FourEyesProgress {
  const approved = inv.chain.filter((s) => !s.isBooker && s.state === 'approved')
  return {
    count: approved.length,
    min: config.fourEyesMin,
    someoneCovers: approved.some((s) => s.spendLimit >= inv.totalAmount),
  }
}

// ----------------------------------------------------------------------------
// Action results
// ----------------------------------------------------------------------------

export type ActionKind =
  | 'booked'
  | 'approved'
  | 'escalated'
  | 'closed'
  | 'declined'
  | 'delegated'
  | 'reminded'
  | 'attached'
  | 'closed_no_action'
  | 'retracted'
  | 'exported'
  | 'noop'

export interface ActionResult {
  kind: ActionKind
  escalatedToUserId?: string | null
}

// ----------------------------------------------------------------------------
// Actions (mutate a draft invoice; the store clones before calling)
// ----------------------------------------------------------------------------

export function applyBook(inv: Invoice, userId: string, ts: string, comment?: string): ActionResult {
  const booker = inv.chain[0]
  if (!booker || !booker.isBooker) return { kind: 'noop' }
  booker.state = 'approved'
  booker.actedAt = ts
  pushEvent(inv, { userId, action: 'BOOKED', timestamp: ts, comment })
  const nextIndex = 1
  if (inv.chain[nextIndex]) {
    inv.currentApprovalStep = nextIndex
    inv.chain[nextIndex].state = 'current'
    inv.lastActionAt = ts
  }
  inv.remindAt = undefined
  return { kind: 'booked' }
}

export function applyApprove(
  inv: Invoice,
  userId: string,
  ts: string,
  config: AppConfig,
  comment?: string,
): ActionResult {
  const step = currentStep(inv)
  if (!step || step.isBooker) return { kind: 'noop' }

  const thisCovers = step.spendLimit >= inv.totalAmount
  step.state = 'approved'
  step.actedAt = ts
  inv.remindAt = undefined
  pushEvent(inv, { userId, action: 'APPROVED', timestamp: ts, comment, limitAtTime: step.spendLimit })

  const progress = fourEyesProgress(inv, config)
  const fourEyesMet = progress.count >= config.fourEyesMin

  // Chain can close only when both: someone with authority approved AND four-eyes met.
  if (progress.someoneCovers && fourEyesMet) {
    return closeChain(inv)
  }

  const nextIndex = inv.currentApprovalStep + 1
  const next = inv.chain[nextIndex]
  if (next) {
    inv.currentApprovalStep = nextIndex
    next.state = 'current'
    inv.lastActionAt = ts
    pushEvent(inv, {
      userId: null,
      action: 'ESCALATED',
      timestamp: ts,
      meta: {
        fromStep: step.index,
        toStep: nextIndex,
        reasonKey: thisCovers ? 'event.escalated.fourEyes' : 'event.escalated.reason',
      },
    })
    return { kind: 'escalated', escalatedToUserId: effectiveActorId(next) }
  }

  // Ran out of approvers — top authority; close as best effort.
  return closeChain(inv)
}

function closeChain(inv: Invoice): ActionResult {
  inv.status = 'APPROVED'
  // Any steps never reached are marked skipped for a clean timeline.
  inv.chain.forEach((s) => {
    if (s.state === 'upcoming') s.state = 'skipped'
  })
  return { kind: 'closed' }
}

export function applyDecline(inv: Invoice, userId: string, ts: string, comment?: string): ActionResult {
  const step = currentStep(inv)
  if (!step) return { kind: 'noop' }
  step.state = 'declined'
  step.actedAt = ts
  inv.status = 'REJECTED'
  inv.remindAt = undefined
  pushEvent(inv, { userId, action: 'DECLINED', timestamp: ts, comment })
  return { kind: 'declined' }
}

export function applyDelegate(
  inv: Invoice,
  userId: string,
  ts: string,
  target: { userId?: string; groupId?: string },
  comment: string,
): ActionResult {
  const step = currentStep(inv)
  if (!step) return { kind: 'noop' }
  step.delegatedToUserId = target.userId
  step.delegatedToGroupId = target.groupId
  step.state = 'current' // still awaiting action, by the new actor
  inv.lastActionAt = ts // reset the SLA clock for the new owner
  inv.remindAt = undefined
  pushEvent(inv, {
    userId,
    action: 'DELEGATED',
    timestamp: ts,
    comment,
    meta: { delegatedToUserId: target.userId, delegatedToGroupId: target.groupId },
  })
  return { kind: 'delegated' }
}

export function applyRemind(inv: Invoice, userId: string, ts: string, remindAt: string): ActionResult {
  inv.remindAt = remindAt
  pushEvent(inv, { userId, action: 'REMIND_LATER', timestamp: ts, meta: { remindAt } })
  return { kind: 'reminded' }
}

export function applyAddPage(inv: Invoice, userId: string, ts: string, attachment: Attachment): ActionResult {
  inv.attachments.push(attachment)
  pushEvent(inv, { userId, action: 'ADD_ATTACHMENT', timestamp: ts, meta: { attachmentName: attachment.name } })
  return { kind: 'attached' }
}

export function applyCloseNoAction(inv: Invoice, userId: string, ts: string, comment?: string): ActionResult {
  const step = currentStep(inv)
  if (!step) return { kind: 'noop' }
  step.state = 'closed_no_action'
  step.actedAt = ts
  inv.remindAt = undefined
  pushEvent(inv, { userId, action: 'CLOSED_NO_ACTION', timestamp: ts, comment })
  return { kind: 'closed_no_action' }
}

export interface RetractInfo {
  allowed: boolean
  locked: boolean
  stepIndex?: number
}

/** Retraction is allowed until the *next* approver has acted (or it's exported). */
export function canRetract(inv: Invoice, userId: string): RetractInfo {
  if (inv.status === 'EXPORTED') return { allowed: false, locked: true }
  // Find the highest-index approver step this user approved.
  let candidate: ApprovalStep | undefined
  for (const s of inv.chain) {
    if (s.isBooker) continue
    if (s.state === 'approved' && effectiveActorId(s) === userId) candidate = s
  }
  if (!candidate) return { allowed: false, locked: false }

  const terminalStates = ['approved', 'declined', 'closed_no_action']
  const laterActed = inv.chain.some(
    (s) => s.index > candidate!.index && s.actedAt !== undefined && terminalStates.includes(s.state),
  )
  if (laterActed) return { allowed: false, locked: true, stepIndex: candidate.index }
  return { allowed: true, locked: false, stepIndex: candidate.index }
}

export function applyRetract(inv: Invoice, userId: string, ts: string): ActionResult {
  const info = canRetract(inv, userId)
  if (!info.allowed || info.stepIndex === undefined) return { kind: 'noop' }
  const idx = info.stepIndex
  const step = inv.chain[idx]
  step.state = 'current'
  step.actedAt = undefined
  // Reset any steps that were opened after this one.
  inv.chain.forEach((s) => {
    if (s.index > idx && (s.state === 'current' || s.state === 'skipped')) {
      s.state = 'upcoming'
      s.actedAt = undefined
    }
  })
  inv.currentApprovalStep = idx
  if (inv.status === 'APPROVED') inv.status = 'IN_REVIEW'
  inv.lastActionAt = ts
  pushEvent(inv, { userId, action: 'RETRACTED', timestamp: ts })
  return { kind: 'retracted' }
}

export function applyExport(inv: Invoice, userId: string | null, ts: string): ActionResult {
  if (inv.status !== 'APPROVED') return { kind: 'noop' }
  inv.status = 'EXPORTED'
  inv.exportedAt = ts
  pushEvent(inv, { userId, action: 'EXPORTED', timestamp: ts })
  return { kind: 'exported' }
}

// ----------------------------------------------------------------------------
// Scripted replay (used by the seed loader to build authentic histories)
// ----------------------------------------------------------------------------

export type ScriptedActionType =
  | 'book'
  | 'approve'
  | 'decline'
  | 'delegate'
  | 'remind'
  | 'add_page'
  | 'close_no_action'
  | 'export'

export interface ScriptedAction {
  type: ScriptedActionType
  by: string // userId
  daysAgo: number
  comment?: string
  targetUserId?: string
  targetGroupId?: string
  attachment?: Attachment
}
