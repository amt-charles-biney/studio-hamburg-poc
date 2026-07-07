import type { AppConfig, Company, Invoice, MandatoryField, ValidationIssue } from '@/types'

const FIELD_TO_INVOICE_KEY: Record<MandatoryField, keyof Invoice> = {
  systemInvoiceNumber: 'systemInvoiceNumber',
  creditorName: 'creditorName',
  invoiceDate: 'invoiceDate',
  costCenter: 'costCenter',
  project: 'project',
}

/** Company is derived from the first two digits of the invoice number. */
export function deriveCompanyNumber(systemInvoiceNumber: string): string | null {
  const match = systemInvoiceNumber.trim().match(/^(\d{2})/)
  return match ? match[1] : null
}

/**
 * Runs the configurable required-field + company checks.
 * Returns the list of issues; an empty list means the invoice is valid.
 */
export function validateInvoice(
  inv: Invoice,
  companies: Company[],
  config: AppConfig,
): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  // Required-field check (configurable).
  for (const field of config.mandatoryFields) {
    const key = FIELD_TO_INVOICE_KEY[field]
    const value = inv[key]
    const empty =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && value.trim() === '')
    if (empty) {
      issues.push({ field, code: 'missing_required', severity: 'error' })
    }
  }

  // Company resolution from the invoice-number prefix.
  const derived = deriveCompanyNumber(inv.systemInvoiceNumber)
  if (!derived) {
    if (inv.systemInvoiceNumber?.trim()) {
      issues.push({ field: 'systemInvoiceNumber', code: 'invalid_format', severity: 'error' })
    }
  } else {
    const company = companies.find((c) => c.companyNumber === derived)
    if (!company) {
      issues.push({ field: 'companyNumber', code: 'company_unknown', severity: 'error' })
    } else if (!company.active) {
      issues.push({ field: 'companyNumber', code: 'company_inactive', severity: 'error' })
    }
  }

  return issues
}

export interface DuplicateResult {
  hardDuplicateOf?: string // invoice id — same number + booking date + amount
  nearDuplicateOf: string[] // invoice ids — same company + project + amount, different number
}

/**
 * Duplicate detection on metadata only (no OCR).
 * - Hard duplicate: same invoice number + booking date + amount -> block.
 * - Near-duplicate: same company + project + amount, different invoice number -> flag.
 */
export function detectDuplicates(inv: Invoice, others: Invoice[]): DuplicateResult {
  const result: DuplicateResult = { nearDuplicateOf: [] }
  for (const other of others) {
    if (other.id === inv.id) continue
    if (other.status === 'DUPLICATE' || other.status === 'ERROR') continue

    const sameNumber = other.systemInvoiceNumber === inv.systemInvoiceNumber
    const sameBookingDate = other.bookingDate === inv.bookingDate
    const sameAmount = Math.abs(other.totalAmount - inv.totalAmount) < 0.005

    if (sameNumber && sameBookingDate && sameAmount) {
      result.hardDuplicateOf = other.id
      continue
    }

    const sameCompany = other.companyNumber === inv.companyNumber
    const sameProject = !!inv.project && other.project === inv.project
    const differentNumber = other.systemInvoiceNumber !== inv.systemInvoiceNumber
    if (sameCompany && sameProject && sameAmount && differentNumber) {
      result.nearDuplicateOf.push(other.id)
    }
  }
  return result
}
