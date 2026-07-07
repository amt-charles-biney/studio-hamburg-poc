// Dummy analytics time-series for the AP dashboard trend charts.
// KPIs / backlog / SLA / status-breakdown are computed live from the seeded
// invoices (accurate); these synthetic series add richer historical trends
// that a short-lived seed set can't provide on its own.

export interface ThroughputPoint {
  /** ISO date of the week start (Mondays), oldest -> newest. */
  weekStart: string
  /** short label, locale-agnostic, e.g. "12 May". */
  label: string
  received: number
  approved: number
  /** avg days to approval that week */
  cycleDays: number
}

// ~12 weeks ending the week of 2026-07-06. Numbers trend toward improvement
// (received climbing, cycle time falling) to tell a positive rollout story.
export const throughput: ThroughputPoint[] = [
  { weekStart: '2026-04-20', label: '20 Apr', received: 18, approved: 14, cycleDays: 5.8 },
  { weekStart: '2026-04-27', label: '27 Apr', received: 22, approved: 17, cycleDays: 5.5 },
  { weekStart: '2026-05-04', label: '4 May', received: 19, approved: 20, cycleDays: 5.1 },
  { weekStart: '2026-05-11', label: '11 May', received: 26, approved: 21, cycleDays: 4.9 },
  { weekStart: '2026-05-18', label: '18 May', received: 24, approved: 25, cycleDays: 4.4 },
  { weekStart: '2026-05-25', label: '25 May', received: 31, approved: 27, cycleDays: 4.1 },
  { weekStart: '2026-06-01', label: '1 Jun', received: 28, approved: 30, cycleDays: 3.8 },
  { weekStart: '2026-06-08', label: '8 Jun', received: 34, approved: 29, cycleDays: 3.6 },
  { weekStart: '2026-06-15', label: '15 Jun', received: 30, approved: 33, cycleDays: 3.2 },
  { weekStart: '2026-06-22', label: '22 Jun', received: 37, approved: 34, cycleDays: 3.0 },
  { weekStart: '2026-06-29', label: '29 Jun', received: 33, approved: 36, cycleDays: 2.7 },
  { weekStart: '2026-07-06', label: '6 Jul', received: 29, approved: 31, cycleDays: 2.5 },
]

export interface MonthlyPoint {
  month: string // 'YYYY-MM'
  label: string
  volume: number
  /** total approved spend that month, EUR */
  spend: number
}

export const monthly: MonthlyPoint[] = [
  { month: '2026-02', label: 'Feb', volume: 78, spend: 412000 },
  { month: '2026-03', label: 'Mar', volume: 91, spend: 503500 },
  { month: '2026-04', label: 'Apr', volume: 86, spend: 468200 },
  { month: '2026-05', label: 'May', volume: 104, spend: 611800 },
  { month: '2026-06', label: 'Jun', volume: 118, spend: 689400 },
  { month: '2026-07', label: 'Jul', volume: 41, spend: 227900 },
]

// Spend split by company (dummy), used for a share-of-spend donut/legend.
export interface CompanySpend {
  companyNumber: string
  spend: number
}
export const companySpend: CompanySpend[] = [
  { companyNumber: '54', spend: 1284000 },
  { companyNumber: '02', spend: 742000 },
  { companyNumber: '71', spend: 389000 },
  { companyNumber: '88', spend: 96000 },
]
