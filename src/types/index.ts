// ============================================================================
// Domain model — Studio Hamburg Invoice Approval Workflow PoC
// This file is the shared contract for the engine, store, seed data and UI.
// ============================================================================

export type SourceSystem = 'NAF' | 'CSAM'

export interface Company {
  companyNumber: string // 2-digit code, e.g. "54", "02"
  name: string
  sourceSystem: SourceSystem // mutually exclusive per company
  active: boolean
}

export type UserRole = 'booker' | 'approver' | 'manager' | 'admin'

export interface User {
  id: string
  name: string
  role: UserRole
  title: string // job title, display only
  email: string
  avatarColor: string // tailwind gradient stops, e.g. "from-sky-500 to-blue-600"
  active: boolean // departed/deactivated users still appear in history
}

export interface Group {
  id: string
  name: string
  memberUserIds: string[]
}

// ----------------------------------------------------------------------------
// Routing rules (mock seed data, mirrors legacy ROUTING_N table)
// ----------------------------------------------------------------------------

export interface ApproverSlot {
  role: string // conceptual role: Besteller / Kostenstellenverantwortlicher / Freizeichner4..7
  userId: string
  spendLimit: number // in EUR
}

export interface RoutingRule {
  id: string
  companyNumber: string
  costCenter: string
  costCarrier: string | null // null => cost-center-level fallback
  label: string
  booker: string // userId of Buchhalter1 — first step, not counted as approver
  approvers: ApproverSlot[] // ordered, up to 7
}

// ----------------------------------------------------------------------------
// Invoice
// ----------------------------------------------------------------------------

export type RoutingType = 'RGA' | 'RGP' | 'RGK' | 'Manuell'

export type InvoiceStatus =
  | 'NEW' // just arrived, parsed
  | 'INCOMPLETE' // pdf/index pair incomplete
  | 'IN_REVIEW' // walking the approval chain
  | 'APPROVED' // chain closed
  | 'EXPORTED' // handed to accounting
  | 'REJECTED' // declined by an approver
  | 'ERROR' // validation failure -> error queue
  | 'MANUAL' // manual routing queue (Manuell or no rule found)
  | 'DUPLICATE' // hard duplicate — blocked at intake

export type IntakeState = 'complete' | 'missing_pdf' | 'missing_index'

export interface LineItem {
  id: string
  drCr: 'debit' | 'credit' // Soll / Haben
  account: string
  amount: number
  text: string
  costCarrier?: string
  costCenter?: string
  costType?: string
  taxCode?: string
}

export type AttachmentKind = 'source_pdf' | 'index_file' | 'supporting'

export interface Attachment {
  id: string
  name: string
  kind: AttachmentKind
  sizeKb: number
  pageCount?: number
  addedByUserId?: string
  addedAt?: string
}

export type ValidationCode =
  | 'missing_required'
  | 'invalid_format'
  | 'company_unknown'
  | 'company_inactive'
  | 'amount_mismatch'

export interface ValidationIssue {
  field: string
  code: ValidationCode
  severity: 'error' | 'warning'
}

// Timeline / audit event types. A superset of the inbox actions plus system events.
export type HistoryEventType =
  | 'CREATED' // intake
  | 'VALIDATED'
  | 'ROUTED'
  | 'BOOKED' // booker step completed
  | 'APPROVED'
  | 'ESCALATED' // system auto-escalation to next approver (limit exceeded)
  | 'DECLINED'
  | 'DELEGATED'
  | 'REMIND_LATER' // parked / snoozed
  | 'CLOSED_NO_ACTION'
  | 'ADD_ATTACHMENT'
  | 'RETRACTED'
  | 'SLA_FLAGGED'
  | 'EXPORTED'

export interface ApprovalEvent {
  id: string
  userId: string | null // null for system events
  action: HistoryEventType
  timestamp: string // ISO
  comment?: string
  limitAtTime?: number // approver spend limit at moment of action
  meta?: {
    delegatedToUserId?: string
    delegatedToGroupId?: string
    attachmentName?: string
    reasonKey?: string
    fromStep?: number
    toStep?: number
    remindAt?: string
  }
}

export type StepState =
  | 'upcoming' // not reached yet
  | 'current' // awaiting this approver's action
  | 'approved'
  | 'declined'
  | 'delegated'
  | 'skipped'
  | 'closed_no_action'

export interface ApprovalStep {
  index: number
  role: string
  userId: string
  spendLimit: number
  isBooker: boolean // step 0
  state: StepState
  delegatedToUserId?: string
  delegatedToGroupId?: string
  actedAt?: string // when this step's actor acted
}

export type RoutingOutcome = 'project' | 'costcenter' | 'manual' | 'fallback' | 'none'

export interface RoutingResult {
  outcome: RoutingOutcome
  matchedRuleId?: string
  reasonKey: string // i18n key explaining why it routed here
}

export interface Invoice {
  id: string
  systemInvoiceNumber: string // internal, generated, includes company prefix
  opInfoNumber: string // external sender's number — no programmatic link
  companyNumber: string
  creditorName: string
  invoiceDate: string // ISO date
  bookingDate: string // ISO date
  bookingMonth: string // 'YYYY-MM'
  costCenter: string
  costCarrier?: string // KoTr — presence drives project vs cost-center routing
  project?: string
  routingType: RoutingType
  totalAmount: number
  currency: string
  taxRate: number
  lineItems: LineItem[]

  status: InvoiceStatus
  currentApprovalStep: number // index into chain (chain[0] is the booker)
  chain: ApprovalStep[]
  approvalHistory: ApprovalEvent[]
  attachments: Attachment[]
  sourceFile?: string
  indexFile?: string

  intakeState: IntakeState
  validationIssues: ValidationIssue[]
  routing: RoutingResult
  duplicateOf?: string // invoice id — hard duplicate
  nearDuplicateOf?: string[] // invoice ids — flagged for review

  manualOrdererUserId?: string // optional override: inserted ahead of routing pick

  createdAt: string
  updatedAt: string
  lastActionAt?: string // when it landed on the current approver (SLA clock start)
  remindAt?: string // active "remind me later" snooze target
  slaDaysThreshold?: number // per-invoice override (else global config)
  exportedAt?: string

  scenarioTag?: string // demo helper: which acceptance scenario this seeds
}

// ----------------------------------------------------------------------------
// Notifications (in-app; simulate the email + deep link)
// ----------------------------------------------------------------------------

export type NotificationType =
  | 'approved'
  | 'assigned'
  | 'delegated'
  | 'declined'
  | 'sla_breach'
  | 'exported'
  | 'info'

export interface AppNotification {
  id: string
  type: NotificationType
  toUserId: string
  invoiceId?: string
  titleKey: string
  bodyKey?: string
  emailSubjectKey?: string // simulated email subject line
  params?: Record<string, string | number>
  createdAt: string
  read: boolean
}

// ----------------------------------------------------------------------------
// App configuration (configurable business rules)
// ----------------------------------------------------------------------------

export type MandatoryField =
  | 'systemInvoiceNumber'
  | 'creditorName'
  | 'invoiceDate'
  | 'costCenter'
  | 'project'

export interface AppConfig {
  mandatoryFields: MandatoryField[]
  slaDaysThreshold: number // default 3
  fourEyesMin: number // default 2
  maxApprovers: number // default 7
}

// ----------------------------------------------------------------------------
// Inbox actions (the six distinct approver flows + retract)
// ----------------------------------------------------------------------------

export type InboxAction =
  | 'approve'
  | 'decline'
  | 'delegate'
  | 'remind'
  | 'add_page'
  | 'close_no_action'
  | 'retract'

// Convenience: derived status label bucket for the UI (independent of raw status)
export type StatusBucket =
  | 'pending_you' // pending the current viewer's approval
  | 'waiting_others' // in review but not on the viewer
  | 'approved'
  | 'exported'
  | 'rejected'
  | 'error'
  | 'manual'
  | 'duplicate'
  | 'incomplete'
  | 'new'

export type Language = 'en' | 'de'
