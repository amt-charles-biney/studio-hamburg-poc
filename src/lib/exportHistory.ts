import type { Invoice, User } from '@/types'

function actorName(userId: string | null, users: User[]): string {
  if (!userId) return 'SYSTEM'
  const u = users.find((x) => x.id === userId)
  if (!u) return userId
  return u.active ? u.name : `${u.name} (departed)`
}

function csvCell(value: string | number | undefined): string {
  const s = value === undefined ? '' : String(value)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/** Full approval-history export: actions, actors, timestamps and limit-at-time. */
export function buildHistoryExport(inv: Invoice, users: User[], format: 'csv' | 'txt'): string {
  if (format === 'csv') {
    const header = ['timestamp', 'action', 'actor', 'limit_at_time', 'comment']
    const rows = inv.approvalHistory.map((ev) =>
      [ev.timestamp, ev.action, actorName(ev.userId, users), ev.limitAtTime ?? '', ev.comment ?? '']
        .map(csvCell)
        .join(','),
    )
    return [`# Invoice ${inv.systemInvoiceNumber} — approval history`, header.join(','), ...rows].join('\n')
  }

  const lines = [
    `Invoice ${inv.systemInvoiceNumber} (${inv.creditorName})`,
    `Status: ${inv.status} · Total: ${inv.totalAmount} ${inv.currency}`,
    '─'.repeat(52),
  ]
  for (const ev of inv.approvalHistory) {
    const parts = [`[${ev.timestamp}]`, ev.action, '·', actorName(ev.userId, users)]
    if (ev.limitAtTime) parts.push(`(limit ${ev.limitAtTime} ${inv.currency})`)
    lines.push(parts.join(' '))
    if (ev.comment) lines.push(`    “${ev.comment}”`)
  }
  return lines.join('\n')
}

export function downloadHistory(inv: Invoice, users: User[], format: 'csv' | 'txt'): void {
  const content = buildHistoryExport(inv, users, format)
  const blob = new Blob([content], { type: format === 'csv' ? 'text/csv' : 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${inv.systemInvoiceNumber}-history.${format}`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
