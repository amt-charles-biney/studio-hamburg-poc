import type { ValidationIssue } from '@/types'

/** Maps a validation issue to its i18n message key. */
export function validationMessageKey(issue: ValidationIssue): string {
  switch (issue.code) {
    case 'missing_required':
      return `validation.missing.${issue.field}`
    case 'invalid_format':
      return `validation.invalid.${issue.field}`
    case 'company_unknown':
      return 'validation.company_unknown'
    case 'company_inactive':
      return 'validation.company_inactive'
    case 'amount_mismatch':
      return 'validation.amount_mismatch'
    default:
      return 'validation.ok'
  }
}
