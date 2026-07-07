import { create } from 'zustand'
import type {
  AppConfig,
  AppNotification,
  Attachment,
  Company,
  Group,
  Invoice,
  NotificationType,
  RoutingRule,
  User,
} from '@/types'
import {
  applyAddPage,
  applyApprove,
  applyBook,
  applyCloseNoAction,
  applyDecline,
  applyDelegate,
  applyExport,
  applyRemind,
  applyRetract,
  canRetract,
  currentStep,
  effectiveActorId,
  resolveChain,
  startApproval,
  type ActionResult,
} from '@/engine/approval'
import { initializeInvoice } from '@/engine/intake'
import { clone, nowIso, uid } from '@/engine/util'
import {
  buildInvoices,
  companies as seedCompanies,
  defaultConfig,
  defaultUserId,
  groups as seedGroups,
  routingRules as seedRules,
  users as seedUsers,
} from '@/data/seed'

export interface Toast {
  id: string
  messageKey: string
  params?: Record<string, string | number>
  kind: 'success' | 'info' | 'warn' | 'error'
}

interface StoreState {
  invoices: Invoice[]
  companies: Company[]
  users: User[]
  groups: Group[]
  routingRules: RoutingRule[]
  config: AppConfig
  currentUserId: string
  notifications: AppNotification[]
  toasts: Toast[]

  // identity
  setCurrentUser: (userId: string) => void
  getUser: (userId: string | null | undefined) => User | undefined
  currentUser: () => User

  // pending logic (accounts for group delegation)
  isPendingForViewer: (inv: Invoice, userId: string) => boolean

  // approver actions
  book: (invoiceId: string, comment?: string) => void
  approve: (invoiceId: string, comment?: string) => void
  decline: (invoiceId: string, comment?: string) => void
  delegate: (invoiceId: string, target: { userId?: string; groupId?: string }, comment: string) => void
  remind: (invoiceId: string, remindAt: string) => void
  addPage: (invoiceId: string, fileName: string) => void
  closeNoAction: (invoiceId: string, comment?: string) => void
  retract: (invoiceId: string) => void
  exportInvoice: (invoiceId: string) => void

  // intake actions
  simulateArrival: () => void
  completePair: (invoiceId: string) => void
  clearNearDuplicate: (invoiceId: string) => void
  assignManualToRule: (invoiceId: string, ruleId: string) => void

  // routing admin
  upsertRule: (rule: RoutingRule) => void
  deleteRule: (ruleId: string) => void

  // notifications & toasts
  markNotificationRead: (id: string) => void
  markAllNotificationsRead: (userId: string) => void
  dismissToast: (id: string) => void

  resetDemo: () => void
}

function bookerOf(inv: Invoice): string | null {
  return inv.chain[0]?.userId ?? null
}

let arrivalSeq = 0
const arrivalTemplates: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'chain' | 'approvalHistory' | 'validationIssues' | 'routing' | 'currentApprovalStep'>[] = [
  {
    systemInvoiceNumber: '54-2026-04600',
    opInfoNumber: 'NEW-7781',
    companyNumber: '54',
    creditorName: 'Studioausstattung Nord GmbH',
    invoiceDate: '2026-07-06',
    bookingDate: '2026-07-07',
    bookingMonth: '2026-07',
    costCenter: '5400',
    project: 'Studio Operations',
    routingType: 'RGK',
    totalAmount: 3850,
    currency: 'EUR',
    taxRate: 19,
    lineItems: [
      { id: uid('li'), drCr: 'debit', account: '6120', amount: 3235.29, text: 'Studio fittings', costCenter: '5400', costType: '6120', taxCode: 'VS19' },
    ],
    attachments: [
      { id: uid('att'), name: '54-2026-04600.pdf', kind: 'source_pdf', sizeKb: 210, pageCount: 2 },
      { id: uid('att'), name: '54-2026-04600.idx', kind: 'index_file', sizeKb: 4 },
    ],
    intakeState: 'complete',
  },
  {
    systemInvoiceNumber: '02-2026-01220',
    opInfoNumber: 'NEW-2214',
    companyNumber: '02',
    creditorName: 'Maskenbild Atelier',
    invoiceDate: '2026-07-05',
    bookingDate: '2026-07-07',
    bookingMonth: '2026-07',
    costCenter: '0210',
    costCarrier: 'P-2201',
    project: 'Notruf Hafenkante',
    routingType: 'RGP',
    totalAmount: 9200,
    currency: 'EUR',
    taxRate: 19,
    lineItems: [
      { id: uid('li'), drCr: 'debit', account: '6110', amount: 7731.09, text: 'Make-up & hair — block shoot', costCenter: '0210', costCarrier: 'P-2201', costType: '6110', taxCode: 'VS19' },
    ],
    attachments: [
      { id: uid('att'), name: '02-2026-01220.pdf', kind: 'source_pdf', sizeKb: 190, pageCount: 2 },
      { id: uid('att'), name: '02-2026-01220.idx', kind: 'index_file', sizeKb: 4 },
    ],
    intakeState: 'complete',
  },
  {
    systemInvoiceNumber: '71-2026-00810',
    opInfoNumber: 'NEW-5540',
    companyNumber: '71',
    creditorName: 'IT Systemhaus Hanse',
    invoiceDate: '2026-07-04',
    bookingDate: '2026-07-07',
    bookingMonth: '2026-07',
    costCenter: '7100',
    project: 'MCI Operations',
    routingType: 'RGK',
    totalAmount: 14500,
    currency: 'EUR',
    taxRate: 19,
    lineItems: [
      { id: uid('li'), drCr: 'debit', account: '6805', amount: 12184.87, text: 'Editing workstations — refresh', costCenter: '7100', costType: '6805', taxCode: 'VS19' },
    ],
    attachments: [
      { id: uid('att'), name: '71-2026-00810.pdf', kind: 'source_pdf', sizeKb: 260, pageCount: 4 },
      { id: uid('att'), name: '71-2026-00810.idx', kind: 'index_file', sizeKb: 4 },
    ],
    intakeState: 'complete',
  },
]

function freshState() {
  const config = clone(defaultConfig)
  const companies = clone(seedCompanies)
  const users = clone(seedUsers)
  const groups = clone(seedGroups)
  const routingRules = clone(seedRules)
  const invoices = buildInvoices(routingRules, companies, config)
  return { config, companies, users, groups, routingRules, invoices }
}

export const useStore = create<StoreState>((set, get) => ({
  ...freshState(),
  currentUserId: defaultUserId,
  notifications: [],
  toasts: [],

  setCurrentUser: (userId) => {
    set({ currentUserId: userId })
    const u = get().getUser(userId)
    pushToast(set, get, 'toast.userSwitched', { name: u?.name ?? '' }, 'info')
  },

  getUser: (userId) => get().users.find((u) => u.id === userId) ?? undefined,

  currentUser: () => {
    const { users, currentUserId } = get()
    return users.find((u) => u.id === currentUserId) ?? users[0]
  },

  isPendingForViewer: (inv, userId) => {
    if (inv.status !== 'IN_REVIEW') return false
    const step = currentStep(inv)
    if (!step || step.state !== 'current') return false
    if (step.delegatedToGroupId) {
      const group = get().groups.find((g) => g.id === step.delegatedToGroupId)
      return !!group?.memberUserIds.includes(userId)
    }
    return effectiveActorId(step) === userId
  },

  book: (invoiceId, comment) => {
    const actor = get().currentUserId
    const res = mutate(set, get, invoiceId, (inv) => applyBook(inv, actor, nowIso(), comment))
    if (!res) return
    if (res.kind === 'booked') {
      const inv = get().invoices.find((i) => i.id === invoiceId)
      const next = inv ? effectiveActorId(currentStep(inv)) : null
      pushToast(set, get, 'toast.released', {}, 'success')
      if (inv && next) notifyUser(set, get, next, 'assigned', inv)
    }
  },

  approve: (invoiceId, comment) => {
    const actor = get().currentUserId
    const res = mutate(set, get, invoiceId, (inv) => applyApprove(inv, actor, nowIso(), get().config, comment))
    if (!res) return
    const inv = get().invoices.find((i) => i.id === invoiceId)
    if (!inv) return
    if (res.kind === 'escalated' && res.escalatedToUserId) {
      const name = get().getUser(res.escalatedToUserId)?.name ?? ''
      pushToast(set, get, 'toast.escalated', { name }, 'info')
      notifyUser(set, get, res.escalatedToUserId, 'assigned', inv)
    } else if (res.kind === 'closed') {
      pushToast(set, get, 'toast.chainClosed', {}, 'success')
      const booker = bookerOf(inv)
      if (booker) notifyUser(set, get, booker, 'approved', inv)
    }
  },

  decline: (invoiceId, comment) => {
    const actor = get().currentUserId
    const res = mutate(set, get, invoiceId, (inv) => applyDecline(inv, actor, nowIso(), comment))
    if (!res || res.kind !== 'declined') return
    const inv = get().invoices.find((i) => i.id === invoiceId)
    pushToast(set, get, 'toast.declined', {}, 'warn')
    if (inv) {
      const booker = bookerOf(inv)
      if (booker) notifyUser(set, get, booker, 'declined', inv)
    }
  },

  delegate: (invoiceId, target, comment) => {
    const actor = get().currentUserId
    const res = mutate(set, get, invoiceId, (inv) => applyDelegate(inv, actor, nowIso(), target, comment))
    if (!res || res.kind !== 'delegated') return
    const inv = get().invoices.find((i) => i.id === invoiceId)
    if (!inv) return
    const fromName = get().getUser(actor)?.name ?? ''
    if (target.userId) {
      const name = get().getUser(target.userId)?.name ?? ''
      pushToast(set, get, 'toast.delegated', { target: name }, 'info')
      notifyUser(set, get, target.userId, 'delegated', inv, { from: fromName })
    } else if (target.groupId) {
      const group = get().groups.find((g) => g.id === target.groupId)
      pushToast(set, get, 'toast.delegated', { target: group?.name ?? '' }, 'info')
      group?.memberUserIds.forEach((m) => notifyUser(set, get, m, 'delegated', inv, { from: fromName }))
    }
  },

  remind: (invoiceId, remindAt) => {
    const actor = get().currentUserId
    const res = mutate(set, get, invoiceId, (inv) => applyRemind(inv, actor, nowIso(), remindAt))
    if (res?.kind === 'reminded') pushToast(set, get, 'toast.reminded', {}, 'info')
  },

  addPage: (invoiceId, fileName) => {
    const actor = get().currentUserId
    const attachment: Attachment = {
      id: uid('att'),
      name: fileName,
      kind: 'supporting',
      sizeKb: 120 + Math.floor(Math.random() * 400),
      pageCount: 1,
      addedByUserId: actor,
      addedAt: nowIso(),
    }
    const res = mutate(set, get, invoiceId, (inv) => applyAddPage(inv, actor, nowIso(), attachment))
    if (res?.kind === 'attached') pushToast(set, get, 'toast.attached', {}, 'success')
  },

  closeNoAction: (invoiceId, comment) => {
    const actor = get().currentUserId
    const res = mutate(set, get, invoiceId, (inv) => applyCloseNoAction(inv, actor, nowIso(), comment))
    if (res?.kind === 'closed_no_action') pushToast(set, get, 'toast.closed', {}, 'warn')
  },

  retract: (invoiceId) => {
    const actor = get().currentUserId
    const res = mutate(set, get, invoiceId, (inv) => applyRetract(inv, actor, nowIso()))
    if (res?.kind === 'retracted') pushToast(set, get, 'toast.retracted', {}, 'info')
  },

  exportInvoice: (invoiceId) => {
    const actor = get().currentUserId
    const res = mutate(set, get, invoiceId, (inv) => applyExport(inv, actor, nowIso()))
    if (res?.kind !== 'exported') return
    const inv = get().invoices.find((i) => i.id === invoiceId)
    pushToast(set, get, 'toast.exported', {}, 'success')
    if (inv) {
      const booker = bookerOf(inv)
      if (booker) notifyUser(set, get, booker, 'exported', inv)
    }
  },

  simulateArrival: () => {
    const template = arrivalTemplates[arrivalSeq % arrivalTemplates.length]
    arrivalSeq += 1
    const suffix = 200 + arrivalSeq
    const base = clone(template)
    const inv: Invoice = {
      ...base,
      id: uid('inv'),
      systemInvoiceNumber: base.systemInvoiceNumber.replace(/\d{2}$/, String(suffix).slice(-2)),
      opInfoNumber: `${base.opInfoNumber}-${arrivalSeq}`,
      status: 'NEW',
      currentApprovalStep: 0,
      chain: [],
      approvalHistory: [],
      validationIssues: [],
      routing: { outcome: 'none', reasonKey: 'routing.explain.none' },
      createdAt: nowIso(),
      updatedAt: nowIso(),
      scenarioTag: 'simulated',
      lineItems: base.lineItems.map((l) => ({ ...l, id: uid('li') })),
      attachments: base.attachments.map((a) => ({ ...a, id: uid('att') })),
    }
    const { companies, routingRules, config, invoices } = get()
    initializeInvoice(inv, { companies, rules: routingRules, config, existing: invoices })
    set({ invoices: [inv, ...invoices] })
    pushToast(set, get, 'toast.simulated', {}, 'info')
  },

  completePair: (invoiceId) => {
    const { companies, routingRules, config, invoices } = get()
    const target = invoices.find((i) => i.id === invoiceId)
    if (!target) return
    const inv = clone(target)
    const missing = inv.intakeState
    inv.intakeState = 'complete'
    if (missing === 'missing_pdf') {
      inv.attachments = [
        { id: uid('att'), name: `${inv.systemInvoiceNumber}.pdf`, kind: 'source_pdf', sizeKb: 232, pageCount: 3 },
        ...inv.attachments,
      ]
      inv.sourceFile = `${inv.systemInvoiceNumber}.pdf`
    } else if (missing === 'missing_index') {
      inv.attachments = [
        ...inv.attachments,
        { id: uid('att'), name: `${inv.systemInvoiceNumber}.idx`, kind: 'index_file', sizeKb: 4 },
      ]
      inv.indexFile = `${inv.systemInvoiceNumber}.idx`
    }
    inv.approvalHistory = []
    inv.validationIssues = []
    inv.chain = []
    inv.status = 'NEW'
    inv.currentApprovalStep = 0
    initializeInvoice(inv, { companies, rules: routingRules, config, existing: invoices.filter((i) => i.id !== invoiceId) })
    inv.updatedAt = nowIso()
    set({ invoices: invoices.map((i) => (i.id === invoiceId ? inv : i)) })
    pushToast(set, get, 'toast.released', {}, 'success')
  },

  clearNearDuplicate: (invoiceId) => {
    set({
      invoices: get().invoices.map((i) =>
        i.id === invoiceId ? { ...i, nearDuplicateOf: undefined, updatedAt: nowIso() } : i,
      ),
    })
    pushToast(set, get, 'toast.released', {}, 'success')
  },

  assignManualToRule: (invoiceId, ruleId) => {
    const { routingRules, config, invoices } = get()
    const rule = routingRules.find((r) => r.id === ruleId)
    const target = invoices.find((i) => i.id === invoiceId)
    if (!rule || !target) return
    const inv = clone(target)
    inv.chain = resolveChain(inv, rule, config)
    inv.routing = { outcome: 'costcenter', matchedRuleId: rule.id, reasonKey: 'routing.explain.costcenter' }
    inv.approvalHistory.push({ id: uid('ev'), userId: null, action: 'ROUTED', timestamp: nowIso() })
    startApproval(inv, nowIso())
    inv.updatedAt = nowIso()
    set({ invoices: invoices.map((i) => (i.id === invoiceId ? inv : i)) })
    pushToast(set, get, 'toast.released', {}, 'success')
  },

  upsertRule: (rule) => {
    const rules = get().routingRules
    const exists = rules.some((r) => r.id === rule.id)
    set({ routingRules: exists ? rules.map((r) => (r.id === rule.id ? rule : r)) : [...rules, rule] })
    pushToast(set, get, 'toast.ruleSaved', {}, 'success')
  },

  deleteRule: (ruleId) => {
    set({ routingRules: get().routingRules.filter((r) => r.id !== ruleId) })
    pushToast(set, get, 'routing.deleted', {}, 'info')
  },

  markNotificationRead: (id) =>
    set({ notifications: get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }),

  markAllNotificationsRead: (userId) =>
    set({
      notifications: get().notifications.map((n) => (n.toUserId === userId ? { ...n, read: true } : n)),
    }),

  dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

  resetDemo: () => {
    set({ ...freshState(), notifications: [], toasts: [] })
    arrivalSeq = 0
    pushToast(set, get, 'toast.reset', {}, 'info')
  },
}))

// ---------------------------------------------------------------------------
// internal helpers
// ---------------------------------------------------------------------------

type SetFn = (partial: Partial<StoreState>) => void
type GetFn = () => StoreState

function mutate(
  set: SetFn,
  get: GetFn,
  invoiceId: string,
  fn: (inv: Invoice) => ActionResult,
): ActionResult | null {
  const invoices = get().invoices
  const target = invoices.find((i) => i.id === invoiceId)
  if (!target) return null
  const draft = clone(target)
  const result = fn(draft)
  if (result.kind === 'noop') return result
  draft.updatedAt = nowIso()
  set({ invoices: invoices.map((i) => (i.id === invoiceId ? draft : i)) })
  return result
}

function pushToast(
  set: SetFn,
  get: GetFn,
  messageKey: string,
  params: Record<string, string | number>,
  kind: Toast['kind'],
) {
  const toast: Toast = { id: uid('toast'), messageKey, params, kind }
  set({ toasts: [...get().toasts, toast] })
}

const notifCopy: Record<NotificationType, { title: string; body: string; email: string }> = {
  approved: { title: 'notif.approved.title', body: 'notif.approved.body', email: 'notif.approved.email' },
  assigned: { title: 'notif.assigned.title', body: 'notif.assigned.body', email: 'notif.assigned.email' },
  delegated: { title: 'notif.delegated.title', body: 'notif.delegated.body', email: 'notif.delegated.email' },
  declined: { title: 'notif.declined.title', body: 'notif.declined.body', email: 'notif.declined.email' },
  sla_breach: { title: 'notif.sla_breach.title', body: 'notif.sla_breach.body', email: 'notif.sla_breach.email' },
  exported: { title: 'notif.exported.title', body: 'notif.exported.body', email: 'notif.exported.email' },
  info: { title: 'notif.info.title', body: 'notif.info.body', email: '' },
}

export function retractInfoFor(inv: Invoice, userId: string) {
  return canRetract(inv, userId)
}

function notifyUser(
  set: SetFn,
  get: GetFn,
  toUserId: string,
  type: NotificationType,
  inv: Invoice,
  extra: Record<string, string | number> = {},
) {
  const copy = notifCopy[type]
  const notification: AppNotification = {
    id: uid('ntf'),
    type,
    toUserId,
    invoiceId: inv.id,
    titleKey: copy.title,
    bodyKey: copy.body,
    emailSubjectKey: copy.email || undefined,
    params: extra,
    createdAt: nowIso(),
    read: false,
  }
  set({ notifications: [notification, ...get().notifications] })
}
