import type { Invoice, RoutingResult, RoutingRule } from '@/types'

export interface RoutingResolution {
  result: RoutingResult
  rule: RoutingRule | null
}

/**
 * Determine which routing rule applies to an invoice.
 *  - RGA / RGP  -> project chain, matched by costCarrier + company
 *  - RGK        -> cost-centre chain, matched by costCenter + company (ignores carrier)
 *  - Manuell    -> no automatic routing, manual assignment
 * Falls back to the cost-centre rule, then to the admin group (flagged) — never silently dropped.
 */
export function resolveRouting(inv: Invoice, rules: RoutingRule[]): RoutingResolution {
  const forCompany = rules.filter((r) => r.companyNumber === inv.companyNumber)

  if (inv.routingType === 'Manuell') {
    return { result: { outcome: 'manual', reasonKey: 'routing.explain.manual' }, rule: null }
  }

  if (inv.routingType === 'RGA' || inv.routingType === 'RGP') {
    // Project-based: match cost carrier.
    if (inv.costCarrier) {
      const projectRule = forCompany.find(
        (r) => r.costCarrier === inv.costCarrier,
      )
      if (projectRule) {
        return {
          result: { outcome: 'project', matchedRuleId: projectRule.id, reasonKey: 'routing.explain.project' },
          rule: projectRule,
        }
      }
    }
    // Fall back to the cost-centre-level rule (null carrier) for this cost centre.
    const fallback = forCompany.find(
      (r) => r.costCenter === inv.costCenter && r.costCarrier === null,
    )
    if (fallback) {
      return {
        result: { outcome: 'fallback', matchedRuleId: fallback.id, reasonKey: 'routing.explain.fallback' },
        rule: fallback,
      }
    }
    return { result: { outcome: 'none', reasonKey: 'routing.explain.none' }, rule: null }
  }

  // RGK -> cost-centre routing, ignoring cost carrier.
  const ccRule =
    forCompany.find((r) => r.costCenter === inv.costCenter && r.costCarrier === null) ??
    forCompany.find((r) => r.costCenter === inv.costCenter)
  if (ccRule) {
    return {
      result: { outcome: 'costcenter', matchedRuleId: ccRule.id, reasonKey: 'routing.explain.costcenter' },
      rule: ccRule,
    }
  }
  return { result: { outcome: 'none', reasonKey: 'routing.explain.none' }, rule: null }
}

/** Params used by the UI to fill the routing-explanation i18n string. */
export function routingExplainParams(inv: Invoice): Record<string, string> {
  return {
    co: inv.companyNumber,
    cs: inv.costCenter || '—',
    cc: inv.costCarrier || '—',
  }
}
