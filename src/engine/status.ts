import type { Invoice, StatusBucket } from '@/types'

/**
 * Maps an invoice's raw status to a viewer-relative bucket used for the
 * clear, labelled status chips (replacing the legacy icon-only states).
 * `pendingForViewer` is computed by the store (it accounts for group delegation).
 */
export function statusBucketFor(inv: Invoice, pendingForViewer: boolean): StatusBucket {
  switch (inv.status) {
    case 'APPROVED':
      return 'approved'
    case 'EXPORTED':
      return 'exported'
    case 'REJECTED':
      return 'rejected'
    case 'ERROR':
      return 'error'
    case 'MANUAL':
      return 'manual'
    case 'DUPLICATE':
      return 'duplicate'
    case 'INCOMPLETE':
      return 'incomplete'
    case 'NEW':
      return 'new'
    case 'IN_REVIEW':
    default:
      return pendingForViewer ? 'pending_you' : 'waiting_others'
  }
}
