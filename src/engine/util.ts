let counter = 1000

/** Monotonic id generator (app-runtime only — fine to use Date/random here). */
export function uid(prefix = 'id'): string {
  counter += 1
  return `${prefix}_${counter.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}

export function nowIso(): string {
  return new Date().toISOString()
}

/** ISO string N days ago (used by seed data + SLA math). */
export function daysAgoIso(days: number, fromMs = Date.now()): string {
  return new Date(fromMs - days * 24 * 60 * 60 * 1000).toISOString()
}

export function hoursAgoIso(hours: number, fromMs = Date.now()): string {
  return new Date(fromMs - hours * 60 * 60 * 1000).toISOString()
}

export function addDaysIso(iso: string, days: number): string {
  return new Date(new Date(iso).getTime() + days * 24 * 60 * 60 * 1000).toISOString()
}

export function daysBetween(aIso: string, bIso: string): number {
  const a = new Date(aIso).getTime()
  const b = new Date(bIso).getTime()
  return Math.abs(b - a) / (24 * 60 * 60 * 1000)
}

/** Deep clone for immutable-ish store updates. */
export function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value)) as T
}
