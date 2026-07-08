import type {
  AppConfig,
  Attachment,
  Company,
  Group,
  Invoice,
  LineItem,
  RoutingRule,
  User,
} from '@/types'
import {
  applyApprove,
  applyAddPage,
  applyBook,
  applyCloseNoAction,
  applyDecline,
  applyDelegate,
  applyExport,
  type ScriptedAction,
} from '@/engine/approval'
import { initializeInvoice } from '@/engine/intake'
import { daysAgoIso, uid } from '@/engine/util'

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

export const defaultConfig: AppConfig = {
  mandatoryFields: ['systemInvoiceNumber', 'creditorName', 'invoiceDate', 'costCenter', 'project'],
  slaDaysThreshold: 3,
  fourEyesMin: 2,
  maxApprovers: 7,
}

// ---------------------------------------------------------------------------
// Companies (mix of NAV / SESAM; one inactive to exercise validation)
// ---------------------------------------------------------------------------

export const companies: Company[] = [
  { companyNumber: '54', name: 'Studio Hamburg Produktion Gruppe GmbH', sourceSystem: 'NAV', active: true },
  { companyNumber: '02', name: 'Real Film Produktion GmbH', sourceSystem: 'SESAM', active: true },
  { companyNumber: '71', name: 'Studio Hamburg MCI GmbH', sourceSystem: 'NAV', active: true },
  { companyNumber: '88', name: 'Nordlicht Film GmbH (i.L.)', sourceSystem: 'SESAM', active: false },
]

// ---------------------------------------------------------------------------
// Users (booker / approver / manager / admin; one departed)
// ---------------------------------------------------------------------------

export const users: User[] = [
  { id: 'u_lena', name: 'Lena Brandt', role: 'booker', title: 'AP Accountant', email: 'lena.brandt@studio-hamburg.de', avatarColor: 'from-sky-500 to-blue-600', active: true },
  { id: 'u_jonas', name: 'Jonas Vogt', role: 'booker', title: 'AP Accountant', email: 'jonas.vogt@studio-hamburg.de', avatarColor: 'from-cyan-500 to-teal-600', active: true },
  { id: 'u_mara', name: 'Mara Schulz', role: 'approver', title: 'Cost Centre Owner · Production', email: 'mara.schulz@studio-hamburg.de', avatarColor: 'from-violet-500 to-purple-600', active: true },
  { id: 'u_tarek', name: 'Tarek Öztürk', role: 'manager', title: 'Head of Production', email: 'tarek.oeztuerk@studio-hamburg.de', avatarColor: 'from-amber-500 to-orange-600', active: true },
  { id: 'u_ingrid', name: 'Ingrid Falk', role: 'manager', title: 'Managing Director', email: 'ingrid.falk@studio-hamburg.de', avatarColor: 'from-rose-500 to-pink-600', active: true },
  { id: 'u_paul', name: 'Paul Neumann', role: 'approver', title: 'Project Lead', email: 'paul.neumann@studio-hamburg.de', avatarColor: 'from-emerald-500 to-green-600', active: true },
  { id: 'u_sophie', name: 'Sophie Wagner', role: 'approver', title: 'Finance Controller', email: 'sophie.wagner@studio-hamburg.de', avatarColor: 'from-indigo-500 to-blue-600', active: true },
  { id: 'u_karl', name: 'Karl Reuter', role: 'approver', title: 'Deputy Director', email: 'karl.reuter@studio-hamburg.de', avatarColor: 'from-slate-400 to-slate-500', active: false },
  { id: 'u_greta', name: 'Greta Hoffmann', role: 'approver', title: 'Department Head · MCI', email: 'greta.hoffmann@studio-hamburg.de', avatarColor: 'from-fuchsia-500 to-pink-600', active: true },
  { id: 'u_diana', name: 'Diana König', role: 'admin', title: 'System Administrator', email: 'diana.koenig@studio-hamburg.de', avatarColor: 'from-purple-600 to-indigo-700', active: true },
]

export const groups: Group[] = [
  { id: 'g_finance', name: 'Finance Team', memberUserIds: ['u_sophie', 'u_jonas'] },
  { id: 'g_prod_leads', name: 'Production Leads', memberUserIds: ['u_mara', 'u_tarek', 'u_paul'] },
  { id: 'g_admin', name: 'AP Administrators', memberUserIds: ['u_diana'] },
]

export const defaultUserId = 'u_tarek'

// ---------------------------------------------------------------------------
// Routing rules — covers: simple 2-approver, escalation past low limits,
// project (KoTr) chain, and cost-centre fallback (null carrier).
// ---------------------------------------------------------------------------

export const routingRules: RoutingRule[] = [
  {
    id: 'R1',
    companyNumber: '54',
    costCenter: '5400',
    costCarrier: null,
    label: 'CC 5400 · Production Ops (fallback)',
    booker: 'u_lena',
    approvers: [
      { role: 'Cost-centre owner', userId: 'u_mara', spendLimit: 5000 },
      { role: 'Head of Production', userId: 'u_tarek', spendLimit: 50000 },
    ],
  },
  {
    id: 'R2',
    companyNumber: '54',
    costCenter: '5400',
    costCarrier: 'P-1042',
    label: 'Project P-1042 · "Tatort: Nordlicht"',
    booker: 'u_lena',
    approvers: [
      { role: 'Project lead', userId: 'u_paul', spendLimit: 3000 },
      { role: 'Head of Production', userId: 'u_tarek', spendLimit: 50000 },
      { role: 'Managing Director', userId: 'u_ingrid', spendLimit: 500000 },
    ],
  },
  {
    id: 'R3',
    companyNumber: '02',
    costCenter: '0210',
    costCarrier: 'P-2201',
    label: 'Project P-2201 · "Notruf Hafenkante"',
    booker: 'u_jonas',
    approvers: [
      { role: 'Finance Controller', userId: 'u_sophie', spendLimit: 10000 },
      { role: 'Department Head', userId: 'u_greta', spendLimit: 100000 },
    ],
  },
  {
    id: 'R4',
    companyNumber: '71',
    costCenter: '7100',
    costCarrier: null,
    label: 'CC 7100 · MCI (fallback)',
    booker: 'u_jonas',
    approvers: [
      { role: 'Department Head', userId: 'u_greta', spendLimit: 8000 },
      { role: 'Managing Director', userId: 'u_ingrid', spendLimit: 500000 },
    ],
  },
  {
    id: 'R5',
    companyNumber: '02',
    costCenter: '0210',
    costCarrier: null,
    label: 'CC 0210 · Real Film (fallback)',
    booker: 'u_jonas',
    approvers: [
      { role: 'Finance Controller', userId: 'u_sophie', spendLimit: 10000 },
      { role: 'Managing Director', userId: 'u_ingrid', spendLimit: 500000 },
    ],
  },
]

// ---------------------------------------------------------------------------
// Raw invoices + scripted histories
// ---------------------------------------------------------------------------

let liCounter = 0
function li(part: Partial<LineItem> & { account: string; amount: number; text: string }): LineItem {
  liCounter += 1
  return {
    id: `li_${liCounter}`,
    drCr: 'debit',
    costCenter: part.costCenter,
    costCarrier: part.costCarrier,
    costType: part.costType ?? '6100',
    taxCode: part.taxCode ?? 'VS19',
    ...part,
  }
}

function pair(base: string): Attachment[] {
  return [
    { id: uid('att'), name: `${base}.pdf`, kind: 'source_pdf', sizeKb: 248, pageCount: 3 },
    { id: uid('att'), name: `${base}.idx`, kind: 'index_file', sizeKb: 4 },
  ]
}

interface RawInvoice {
  systemInvoiceNumber: string
  opInfoNumber: string
  companyNumber: string
  creditorName: string
  invoiceDate: string
  bookingDate: string
  bookingMonth: string
  costCenter: string
  costCarrier?: string
  project?: string
  routingType: Invoice['routingType']
  totalAmount: number
  currency: string
  taxRate: number
  lineItems: LineItem[]
  attachments: Attachment[]
  intakeState?: Invoice['intakeState']
  manualOrdererUserId?: string
  createdDaysAgo: number
  scenarioTag: string
  script?: ScriptedAction[]
}

const raw: RawInvoice[] = [
  // 1 — simple 2-approver chain, fully approved & exported
  {
    systemInvoiceNumber: '54-2026-04412', opInfoNumber: 'KVN-88213', companyNumber: '54',
    creditorName: 'Kranverleih Nord GmbH', invoiceDate: '2026-06-14', bookingDate: '2026-06-16', bookingMonth: '2026-06',
    costCenter: '5400', project: 'Studio Operations', routingType: 'RGK', totalAmount: 3200, currency: 'EUR', taxRate: 19,
    lineItems: [li({ account: '6120', amount: 2689.08, text: 'Crane rental — 2 days', costCenter: '5400' })],
    attachments: pair('54-2026-04412'), createdDaysAgo: 12, scenarioTag: 'simple_export',
    script: [
      { type: 'book', by: 'u_lena', daysAgo: 11 },
      { type: 'approve', by: 'u_mara', daysAgo: 10, comment: 'Confirmed against the shoot schedule.' },
      { type: 'approve', by: 'u_tarek', daysAgo: 9 },
      { type: 'export', by: 'u_lena', daysAgo: 8 },
    ],
  },
  // 2 — simple chain, pending on the 2nd approver (Tarek) — the live demo case
  {
    systemInvoiceNumber: '54-2026-04455', opInfoNumber: 'LTH-4471', companyNumber: '54',
    creditorName: 'Lichttechnik Hansa GmbH', invoiceDate: '2026-06-28', bookingDate: '2026-06-30', bookingMonth: '2026-06',
    costCenter: '5400', project: 'Studio Operations', routingType: 'RGK', totalAmount: 4100, currency: 'EUR', taxRate: 19,
    lineItems: [li({ account: '6120', amount: 3445.38, text: 'Lighting equipment hire', costCenter: '5400' })],
    attachments: pair('54-2026-04455'), createdDaysAgo: 3, scenarioTag: 'pending_second',
    script: [
      { type: 'book', by: 'u_lena', daysAgo: 2 },
      { type: 'approve', by: 'u_mara', daysAgo: 1, comment: 'OK from the cost centre.' },
    ],
  },
  // 3 — multi-step escalation, currently pending on the MD (Ingrid)
  {
    systemInvoiceNumber: '54-2026-04478', opInfoNumber: 'POX-1190', companyNumber: '54',
    creditorName: 'Postproduktion Studio X', invoiceDate: '2026-06-25', bookingDate: '2026-06-27', bookingMonth: '2026-06',
    costCenter: '5400', costCarrier: 'P-1042', project: 'Tatort: Nordlicht', routingType: 'RGA', totalAmount: 120000, currency: 'EUR', taxRate: 19,
    lineItems: [
      li({ account: '6300', amount: 84033.61, text: 'Post-production — online & grading', costCenter: '5400', costCarrier: 'P-1042' }),
      li({ account: '6300', amount: 16806.72, text: 'Sound mix', costCenter: '5400', costCarrier: 'P-1042' }),
    ],
    attachments: pair('54-2026-04478'), createdDaysAgo: 5, scenarioTag: 'escalation',
    script: [
      { type: 'book', by: 'u_lena', daysAgo: 4 },
      { type: 'approve', by: 'u_paul', daysAgo: 3, comment: 'Within project budget.' },
      { type: 'approve', by: 'u_tarek', daysAgo: 2 },
    ],
  },
  // 4 — multi-step escalation, delegated to a since-departed user, fully approved & exported
  {
    systemInvoiceNumber: '54-2026-04390', opInfoNumber: 'RQB-2025-77', companyNumber: '54',
    creditorName: 'Requisite & Bau GmbH', invoiceDate: '2026-06-08', bookingDate: '2026-06-10', bookingMonth: '2026-06',
    costCenter: '5400', costCarrier: 'P-1042', project: 'Tatort: Nordlicht', routingType: 'RGA', totalAmount: 90000, currency: 'EUR', taxRate: 19,
    lineItems: [li({ account: '6200', amount: 75630.25, text: 'Set construction & props', costCenter: '5400', costCarrier: 'P-1042' })],
    attachments: pair('54-2026-04390'), createdDaysAgo: 16, scenarioTag: 'escalation_departed',
    script: [
      { type: 'book', by: 'u_lena', daysAgo: 15 },
      { type: 'approve', by: 'u_paul', daysAgo: 14 },
      { type: 'delegate', by: 'u_tarek', daysAgo: 13, targetUserId: 'u_karl', comment: 'Handing to Karl for sign-off while I am on location.' },
      { type: 'approve', by: 'u_karl', daysAgo: 12, comment: 'Checked the build quote.' },
      { type: 'approve', by: 'u_ingrid', daysAgo: 11 },
      { type: 'export', by: 'u_lena', daysAgo: 10 },
    ],
  },
  // 5 — declined / rejected
  {
    systemInvoiceNumber: '02-2026-01120', opInfoNumber: 'CAT-5510', companyNumber: '02',
    creditorName: 'Catering Elbe GmbH', invoiceDate: '2026-06-20', bookingDate: '2026-06-22', bookingMonth: '2026-06',
    costCenter: '0210', costCarrier: 'P-2201', project: 'Notruf Hafenkante', routingType: 'RGP', totalAmount: 15000, currency: 'EUR', taxRate: 19,
    lineItems: [li({ account: '6110', amount: 12605.04, text: 'Crew catering — week 24', costCenter: '0210', costCarrier: 'P-2201' })],
    attachments: pair('02-2026-01120'), createdDaysAgo: 8, scenarioTag: 'rejected',
    script: [
      { type: 'book', by: 'u_jonas', daysAgo: 7 },
      { type: 'approve', by: 'u_sophie', daysAgo: 6 },
      { type: 'decline', by: 'u_greta', daysAgo: 5, comment: 'Duplicate catering already billed under a separate PO — please re-issue.' },
    ],
  },
  // 6 — delegated, currently pending on the delegate (Ingrid)
  {
    systemInvoiceNumber: '71-2026-00733', opInfoNumber: 'FPN-3021', companyNumber: '71',
    creditorName: 'Fuhrpark Nord GmbH', invoiceDate: '2026-06-30', bookingDate: '2026-07-02', bookingMonth: '2026-07',
    costCenter: '7100', project: 'MCI Operations', routingType: 'RGK', totalAmount: 6500, currency: 'EUR', taxRate: 19,
    lineItems: [li({ account: '6540', amount: 5462.18, text: 'Vehicle fleet — monthly lease', costCenter: '7100' })],
    attachments: pair('71-2026-00733'), createdDaysAgo: 4, scenarioTag: 'delegated',
    script: [
      { type: 'book', by: 'u_jonas', daysAgo: 3 },
      { type: 'delegate', by: 'u_greta', daysAgo: 2, targetUserId: 'u_ingrid', comment: 'Above my usual remit — passing to Ingrid.' },
    ],
  },
  // 7 — hard duplicate of #1 (same number + booking date + amount)
  {
    systemInvoiceNumber: '54-2026-04412', opInfoNumber: 'KVN-88213-R', companyNumber: '54',
    creditorName: 'Kranverleih Nord GmbH', invoiceDate: '2026-06-14', bookingDate: '2026-06-16', bookingMonth: '2026-06',
    costCenter: '5400', project: 'Studio Operations', routingType: 'RGK', totalAmount: 3200, currency: 'EUR', taxRate: 19,
    lineItems: [li({ account: '6120', amount: 2689.08, text: 'Crane rental — 2 days', costCenter: '5400' })],
    attachments: pair('54-2026-04412-r'), createdDaysAgo: 2, scenarioTag: 'duplicate',
  },
  // 8 — near-duplicate of #5 (same company + project + amount, different number) — flagged, still routes
  {
    systemInvoiceNumber: '02-2026-01166', opInfoNumber: 'CAT-5561', companyNumber: '02',
    creditorName: 'Catering Elbe GmbH', invoiceDate: '2026-07-01', bookingDate: '2026-07-03', bookingMonth: '2026-07',
    costCenter: '0210', costCarrier: 'P-2201', project: 'Notruf Hafenkante', routingType: 'RGP', totalAmount: 15000, currency: 'EUR', taxRate: 19,
    lineItems: [li({ account: '6110', amount: 12605.04, text: 'Crew catering — week 26', costCenter: '0210', costCarrier: 'P-2201' })],
    attachments: pair('02-2026-01166'), createdDaysAgo: 2, scenarioTag: 'near_duplicate',
    script: [{ type: 'book', by: 'u_jonas', daysAgo: 1 }],
  },
  // 9 — validation error: missing cost centre
  {
    systemInvoiceNumber: '71-2026-00780', opInfoNumber: 'KFA-9982', companyNumber: '71',
    creditorName: 'Kostümfundus Altona', invoiceDate: '2026-07-02', bookingDate: '2026-07-04', bookingMonth: '2026-07',
    costCenter: '', project: 'MCI Operations', routingType: 'RGK', totalAmount: 2340, currency: 'EUR', taxRate: 19,
    lineItems: [li({ account: '6200', amount: 1966.39, text: 'Costume hire' })],
    attachments: pair('71-2026-00780'), createdDaysAgo: 1, scenarioTag: 'error_missing_cc',
  },
  // 10 — validation error: company inactive (prefix 88)
  {
    systemInvoiceNumber: '88-2026-00051', opInfoNumber: 'NLF-114', companyNumber: '88',
    creditorName: 'Drohnenflug Hamburg GmbH', invoiceDate: '2026-07-01', bookingDate: '2026-07-03', bookingMonth: '2026-07',
    costCenter: '8800', project: 'Aerial Unit', routingType: 'RGK', totalAmount: 5400, currency: 'EUR', taxRate: 19,
    lineItems: [li({ account: '6300', amount: 4537.82, text: 'Aerial drone crew — 1 day', costCenter: '8800' })],
    attachments: pair('88-2026-00051'), createdDaysAgo: 1, scenarioTag: 'error_company',
  },
  // 11 — incomplete pair: missing PDF (held open, not errored)
  {
    systemInvoiceNumber: '54-2026-04500', opInfoNumber: 'SND-6620', companyNumber: '54',
    creditorName: 'Tonstudio Deichtor', invoiceDate: '2026-07-04', bookingDate: '2026-07-06', bookingMonth: '2026-07',
    costCenter: '5400', project: 'Studio Operations', routingType: 'RGK', totalAmount: 2800, currency: 'EUR', taxRate: 19,
    lineItems: [li({ account: '6300', amount: 2352.94, text: 'Sound stage rental', costCenter: '5400' })],
    attachments: [{ id: uid('att'), name: '54-2026-04500.idx', kind: 'index_file', sizeKb: 4 }],
    intakeState: 'missing_pdf', createdDaysAgo: 1, scenarioTag: 'incomplete',
  },
  // 12 — Manuell routing type -> manual queue
  {
    systemInvoiceNumber: '54-2026-04511', opInfoNumber: 'LEG-2026-3', companyNumber: '54',
    creditorName: 'Kanzlei Rechtsrat & Partner', invoiceDate: '2026-06-29', bookingDate: '2026-07-01', bookingMonth: '2026-07',
    costCenter: '5400', project: 'Legal & Compliance', routingType: 'Manuell', totalAmount: 8900, currency: 'EUR', taxRate: 19,
    lineItems: [li({ account: '6825', amount: 7478.99, text: 'Legal advisory — contract review', costCenter: '5400' })],
    attachments: pair('54-2026-04511'), createdDaysAgo: 2, scenarioTag: 'manual',
  },
  // 13 — no matching rule (unknown cost centre) -> admin fallback, flagged
  {
    systemInvoiceNumber: '54-2026-04533', opInfoNumber: 'MSC-771', companyNumber: '54',
    creditorName: 'Musikrechte Verlag GmbH', invoiceDate: '2026-06-30', bookingDate: '2026-07-02', bookingMonth: '2026-07',
    costCenter: '5999', project: 'Music Licensing', routingType: 'RGK', totalAmount: 12400, currency: 'EUR', taxRate: 19,
    lineItems: [li({ account: '6400', amount: 10420.17, text: 'Music synchronisation licence', costCenter: '5999' })],
    attachments: pair('54-2026-04533'), createdDaysAgo: 2, scenarioTag: 'no_rule',
  },
  // 14 — RGA with unmatched carrier -> cost-centre fallback; fresh, pending 1st approver (Mara)
  {
    systemInvoiceNumber: '54-2026-04466', opInfoNumber: 'GRP-5540', companyNumber: '54',
    creditorName: 'Grafik & Print Altona', invoiceDate: '2026-07-03', bookingDate: '2026-07-05', bookingMonth: '2026-07',
    costCenter: '5400', costCarrier: 'P-7777', project: 'Studio Operations', routingType: 'RGA', totalAmount: 2500, currency: 'EUR', taxRate: 19,
    lineItems: [li({ account: '6600', amount: 2100.84, text: 'Print & signage', costCenter: '5400' })],
    attachments: pair('54-2026-04466'), createdDaysAgo: 2, scenarioTag: 'fallback_fresh',
    script: [{ type: 'book', by: 'u_lena', daysAgo: 1 }],
  },
  // 15 — closed without action (explicit stalled state)
  {
    systemInvoiceNumber: '02-2026-01199', opInfoNumber: 'INS-3300', companyNumber: '02',
    creditorName: 'Versicherung Hanse AG', invoiceDate: '2026-06-24', bookingDate: '2026-06-26', bookingMonth: '2026-06',
    costCenter: '0210', costCarrier: 'P-2201', project: 'Notruf Hafenkante', routingType: 'RGP', totalAmount: 4000, currency: 'EUR', taxRate: 19,
    lineItems: [li({ account: '6400', amount: 3361.34, text: 'Production insurance premium', costCenter: '0210', costCarrier: 'P-2201' })],
    attachments: pair('02-2026-01199'), createdDaysAgo: 7, scenarioTag: 'closed_no_action',
    script: [
      { type: 'book', by: 'u_jonas', daysAgo: 6 },
      { type: 'close_no_action', by: 'u_sophie', daysAgo: 5, comment: 'Not my cost centre — needs reassignment.' },
    ],
  },
  // 16 — SLA overdue: sitting on Tarek past the 3-day threshold
  {
    systemInvoiceNumber: '54-2026-04401', opInfoNumber: 'VFX-2211', companyNumber: '54',
    creditorName: 'Pixelwerk VFX GmbH', invoiceDate: '2026-06-22', bookingDate: '2026-06-24', bookingMonth: '2026-06',
    costCenter: '5400', costCarrier: 'P-1042', project: 'Tatort: Nordlicht', routingType: 'RGA', totalAmount: 70000, currency: 'EUR', taxRate: 19,
    lineItems: [li({ account: '6300', amount: 58823.53, text: 'Visual effects — 40 shots', costCenter: '5400', costCarrier: 'P-1042' })],
    attachments: pair('54-2026-04401'), createdDaysAgo: 9, scenarioTag: 'sla_overdue',
    script: [
      { type: 'book', by: 'u_lena', daysAgo: 8 },
      { type: 'approve', by: 'u_paul', daysAgo: 6, comment: 'Shot count matches the delivery note.' },
    ],
  },
  // 17 — sitting on the booker (booker "Book & release" step)
  {
    systemInvoiceNumber: '54-2026-04520', opInfoNumber: 'SEC-9001', companyNumber: '54',
    creditorName: 'Sicherheitsdienst Elbe', invoiceDate: '2026-07-04', bookingDate: '2026-07-06', bookingMonth: '2026-07',
    costCenter: '5400', project: 'Studio Operations', routingType: 'RGK', totalAmount: 1800, currency: 'EUR', taxRate: 19,
    lineItems: [li({ account: '6540', amount: 1512.61, text: 'Overnight security — studio lot', costCenter: '5400' })],
    attachments: pair('54-2026-04520'), createdDaysAgo: 1, scenarioTag: 'at_booker',
  },
]

function mk(r: RawInvoice): Invoice {
  const createdAt = daysAgoIso(r.createdDaysAgo)
  return {
    id: uid('inv'),
    systemInvoiceNumber: r.systemInvoiceNumber,
    opInfoNumber: r.opInfoNumber,
    companyNumber: r.companyNumber,
    creditorName: r.creditorName,
    invoiceDate: r.invoiceDate,
    bookingDate: r.bookingDate,
    bookingMonth: r.bookingMonth,
    costCenter: r.costCenter,
    costCarrier: r.costCarrier,
    project: r.project,
    routingType: r.routingType,
    totalAmount: r.totalAmount,
    currency: r.currency,
    taxRate: r.taxRate,
    lineItems: r.lineItems,
    status: 'NEW',
    currentApprovalStep: 0,
    chain: [],
    approvalHistory: [],
    attachments: r.attachments,
    sourceFile: r.attachments.find((a) => a.kind === 'source_pdf')?.name,
    indexFile: r.attachments.find((a) => a.kind === 'index_file')?.name,
    intakeState: r.intakeState ?? 'complete',
    validationIssues: [],
    routing: { outcome: 'none', reasonKey: 'routing.explain.none' },
    manualOrdererUserId: r.manualOrdererUserId,
    createdAt,
    updatedAt: createdAt,
    scenarioTag: r.scenarioTag,
  }
}

function replay(inv: Invoice, action: ScriptedAction, config: AppConfig): void {
  const ts = daysAgoIso(action.daysAgo)
  switch (action.type) {
    case 'book':
      applyBook(inv, action.by, ts, action.comment)
      break
    case 'approve':
      applyApprove(inv, action.by, ts, config, action.comment)
      break
    case 'decline':
      applyDecline(inv, action.by, ts, action.comment)
      break
    case 'delegate':
      applyDelegate(inv, action.by, ts, { userId: action.targetUserId, groupId: action.targetGroupId }, action.comment ?? '')
      break
    case 'add_page':
      if (action.attachment) applyAddPage(inv, action.by, ts, action.attachment)
      break
    case 'close_no_action':
      applyCloseNoAction(inv, action.by, ts, action.comment)
      break
    case 'export':
      applyExport(inv, action.by, ts)
      break
  }
}

/** Build the fully-initialised invoice set by running the real engine over the seed. */
export function buildInvoices(rules: RoutingRule[], comps: Company[], config: AppConfig): Invoice[] {
  const out: Invoice[] = []
  for (const r of raw) {
    const inv = mk(r)
    initializeInvoice(inv, { companies: comps, rules, config, existing: out })
    for (const action of r.script ?? []) replay(inv, action, config)
    const last = inv.approvalHistory[inv.approvalHistory.length - 1]
    inv.updatedAt = last?.timestamp ?? inv.createdAt
    out.push(inv)
  }
  return out
}
