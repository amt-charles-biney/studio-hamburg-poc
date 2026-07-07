import type { AppConfig, Company, Invoice, RoutingRule } from '@/types'
import { detectDuplicates, validateInvoice } from './validation'
import { resolveRouting } from './routing'
import { resolveChain, startApproval } from './approval'
import { uid } from './util'

export interface IntakeContext {
  companies: Company[]
  rules: RoutingRule[]
  config: AppConfig
  existing: Invoice[]
}

/**
 * Runs an invoice through the full intake pipeline in place:
 *   incomplete-pair check -> validation -> duplicate check -> routing -> chain start.
 * Leaves the invoice in the correct status (INCOMPLETE / ERROR / DUPLICATE /
 * MANUAL / IN_REVIEW) with an authentic opening history. Near-duplicates are
 * flagged but still routed.
 */
export function initializeInvoice(inv: Invoice, ctx: IntakeContext): Invoice {
  const { companies, rules, config, existing } = ctx
  const created = inv.createdAt

  inv.approvalHistory.push({ id: uid('ev'), userId: null, action: 'CREATED', timestamp: created })

  // 1. Incomplete pdf/index pair -> held open, not errored.
  if (inv.intakeState !== 'complete') {
    inv.status = 'INCOMPLETE'
    inv.chain = []
    return inv
  }

  // 2. Required-field + company validation.
  const issues = validateInvoice(inv, companies, config)
  inv.validationIssues = issues
  if (issues.some((i) => i.severity === 'error')) {
    inv.status = 'ERROR'
    inv.chain = []
    return inv
  }
  inv.approvalHistory.push({ id: uid('ev'), userId: null, action: 'VALIDATED', timestamp: created })

  // 3. Duplicate detection (metadata only).
  const dup = detectDuplicates(inv, existing)
  if (dup.hardDuplicateOf) {
    inv.status = 'DUPLICATE'
    inv.duplicateOf = dup.hardDuplicateOf
    inv.chain = []
    return inv
  }
  inv.nearDuplicateOf = dup.nearDuplicateOf.length ? dup.nearDuplicateOf : undefined

  // 4. Routing.
  const { result, rule } = resolveRouting(inv, rules)
  inv.routing = result
  if (!rule) {
    // Manuell, or no rule found -> manual/admin queue, flagged (never dropped).
    inv.status = 'MANUAL'
    inv.chain = []
    inv.approvalHistory.push({ id: uid('ev'), userId: null, action: 'ROUTED', timestamp: created })
    return inv
  }

  // 5. Resolve the chain and enter review (waiting on the booker).
  inv.chain = resolveChain(inv, rule, config)
  inv.approvalHistory.push({ id: uid('ev'), userId: null, action: 'ROUTED', timestamp: created })
  startApproval(inv, created)
  return inv
}
