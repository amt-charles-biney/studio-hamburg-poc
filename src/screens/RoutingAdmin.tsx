import { Fragment, useState } from 'react'
import { motion } from 'framer-motion'
import { ChevronRight, GitBranch, Pencil, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/cn'
import { useI18n } from '@/i18n'
import { useStore } from '@/store/useStore'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { RoutingBadge } from '@/components/ui/Badge'
import { FieldGroup, Input, Label, Select } from '@/components/ui/Field'
import { Modal } from '@/components/ui/Modal'
import { EmptyState } from '@/components/ui/primitives'
import { Avatar } from '@/components/ui/Avatar'
import { CompanyTag } from '@/components/invoice/tags'
import type { ApproverSlot, RoutingRule } from '@/types'

// Local, string-based form model — spend limits + carrier are coerced on save.
interface ApproverForm {
  role: string
  userId: string
  spendLimit: string
}
interface RuleForm {
  id: string
  label: string
  companyNumber: string
  costCenter: string
  costCarrier: string
  booker: string
  approvers: ApproverForm[]
}

export function RoutingAdmin() {
  const { t } = useI18n()
  const rules = useStore((s) => s.routingRules)
  const companies = useStore((s) => s.companies)
  const users = useStore((s) => s.users)
  const config = useStore((s) => s.config)
  const upsertRule = useStore((s) => s.upsertRule)
  const deleteRule = useStore((s) => s.deleteRule)

  const [form, setForm] = useState<RuleForm | null>(null)
  const [errors, setErrors] = useState<{ costCenter?: string; approvers?: string }>({})

  function blankForm(): RuleForm {
    return {
      id: '',
      label: '',
      companyNumber: companies[0]?.companyNumber ?? '',
      costCenter: '',
      costCarrier: '',
      booker: users[0]?.id ?? '',
      approvers: [{ role: '', userId: users[0]?.id ?? '', spendLimit: '' }],
    }
  }

  function openCreate() {
    setErrors({})
    setForm(blankForm())
  }

  function openEdit(rule: RoutingRule) {
    setErrors({})
    setForm({
      id: rule.id,
      label: rule.label,
      companyNumber: rule.companyNumber,
      costCenter: rule.costCenter,
      costCarrier: rule.costCarrier ?? '',
      booker: rule.booker,
      approvers: rule.approvers.map((a) => ({
        role: a.role,
        userId: a.userId,
        spendLimit: String(a.spendLimit),
      })),
    })
  }

  function onDelete(rule: RoutingRule) {
    if (window.confirm(t('routing.deleteConfirm'))) deleteRule(rule.id)
  }

  // --- form mutators -------------------------------------------------------
  function patch(next: Partial<RuleForm>) {
    setForm((f) => (f ? { ...f, ...next } : f))
  }
  function patchApprover(index: number, next: Partial<ApproverForm>) {
    setForm((f) =>
      f ? { ...f, approvers: f.approvers.map((a, i) => (i === index ? { ...a, ...next } : a)) } : f,
    )
  }
  function addApprover() {
    setForm((f) =>
      f && f.approvers.length < config.maxApprovers
        ? { ...f, approvers: [...f.approvers, { role: '', userId: users[0]?.id ?? '', spendLimit: '' }] }
        : f,
    )
  }
  function removeApprover(index: number) {
    setForm((f) => (f ? { ...f, approvers: f.approvers.filter((_, i) => i !== index) } : f))
  }

  function onSave() {
    if (!form) return
    const nextErrors: typeof errors = {}
    if (!form.costCenter.trim()) nextErrors.costCenter = t('routing.validation.needCostCenter')
    if (form.approvers.length === 0) nextErrors.approvers = t('routing.validation.needApprover')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) return

    const rule: RoutingRule = {
      id: form.id || 'rule_' + Math.random().toString(36).slice(2, 8),
      companyNumber: form.companyNumber,
      costCenter: form.costCenter.trim(),
      costCarrier: form.costCarrier.trim() === '' ? null : form.costCarrier.trim(),
      label: form.label.trim(),
      booker: form.booker,
      approvers: form.approvers.map((a) => ({
        role: a.role.trim(),
        userId: a.userId,
        spendLimit: Number(a.spendLimit) || 0,
      })),
    }
    upsertRule(rule)
    setForm(null)
  }

  const newButton = (
    <Button variant="primary" icon={Plus} onClick={openCreate}>
      {t('routing.new')}
    </Button>
  )

  return (
    <div>
      <PageHeader title={t('routing.title')} subtitle={t('routing.subtitle')} actions={newButton} />

      {rules.length === 0 ? (
        <EmptyState icon={GitBranch} title={t('routing.empty')} className="card" action={newButton} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {rules.map((rule, i) => (
            <RuleCard key={rule.id} rule={rule} index={i} onEdit={() => openEdit(rule)} onDelete={() => onDelete(rule)} />
          ))}
        </div>
      )}

      <Modal
        open={!!form}
        onClose={() => setForm(null)}
        title={form?.id ? t('routing.edit') : t('routing.new')}
        icon={GitBranch}
        size="lg"
        footer={
          <>
            <Button variant="ghost" onClick={() => setForm(null)}>
              {t('common.cancel')}
            </Button>
            <Button variant="primary" onClick={onSave}>
              {t('common.save')}
            </Button>
          </>
        }
      >
        {form && (
          <div className="space-y-4">
            <FieldGroup label={t('routing.field.label')}>
              <Input value={form.label} onChange={(e) => patch({ label: e.target.value })} />
            </FieldGroup>

            <FieldGroup label={t('routing.field.company')}>
              <Select value={form.companyNumber} onChange={(e) => patch({ companyNumber: e.target.value })}>
                {companies.map((c) => (
                  <option key={c.companyNumber} value={c.companyNumber}>
                    {c.companyNumber} · {c.name}
                  </option>
                ))}
              </Select>
            </FieldGroup>

            <div className="grid gap-4 sm:grid-cols-2">
              <FieldGroup label={t('routing.field.costCenter')} required error={errors.costCenter}>
                <Input
                  value={form.costCenter}
                  onChange={(e) => patch({ costCenter: e.target.value })}
                />
              </FieldGroup>
              <FieldGroup label={t('routing.field.costCarrier')} hint={t('routing.field.costCarrier.hint')}>
                <Input
                  value={form.costCarrier}
                  onChange={(e) => patch({ costCarrier: e.target.value })}
                />
              </FieldGroup>
            </div>

            <FieldGroup label={t('routing.field.booker')} hint={t('routing.field.booker.hint')}>
              <Select value={form.booker} onChange={(e) => patch({ booker: e.target.value })}>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                    {u.active ? '' : ` · ${t('user.departed')}`}
                  </option>
                ))}
              </Select>
            </FieldGroup>

            {/* Ordered approver builder */}
            <div>
              <Label>{t('routing.field.approvers', { max: config.maxApprovers })}</Label>
              <div className="space-y-2.5">
                {form.approvers.map((a, i) => (
                  <div key={i} className="rounded-2xl border border-ink-200 bg-white p-3 shadow-soft">
                    <div className="mb-2.5 flex items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                        {i + 1}
                      </span>
                      <span className="text-xs font-semibold text-ink-500">
                        {t('common.step')} {i + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeApprover(i)}
                        aria-label={t('common.remove')}
                        className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 transition hover:bg-rose-50 hover:text-rose-600 focus-ring"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <FieldGroup label={t('routing.approver.role')}>
                        <Input value={a.role} onChange={(e) => patchApprover(i, { role: e.target.value })} />
                      </FieldGroup>
                      <FieldGroup label={t('routing.approver.user')}>
                        <Select value={a.userId} onChange={(e) => patchApprover(i, { userId: e.target.value })}>
                          {users.map((u) => (
                            <option key={u.id} value={u.id}>
                              {u.name}
                              {u.active ? '' : ` · ${t('user.departed')}`}
                            </option>
                          ))}
                        </Select>
                      </FieldGroup>
                    </div>
                    <div className="mt-2.5">
                      <FieldGroup label={t('routing.approver.limit')}>
                        <Input
                          type="number"
                          min="0"
                          inputMode="numeric"
                          value={a.spendLimit}
                          onChange={(e) => patchApprover(i, { spendLimit: e.target.value })}
                        />
                      </FieldGroup>
                    </div>
                  </div>
                ))}
              </div>

              {errors.approvers && <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.approvers}</p>}

              <Button
                variant="subtle"
                size="sm"
                icon={Plus}
                className="mt-3"
                onClick={addApprover}
                disabled={form.approvers.length >= config.maxApprovers}
              >
                {t('routing.addApprover')}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}

function RuleCard({
  rule,
  index,
  onEdit,
  onDelete,
}: {
  rule: RoutingRule
  index: number
  onEdit: () => void
  onDelete: () => void
}) {
  const { t } = useI18n()
  const getUser = useStore((s) => s.getUser)
  const booker = getUser(rule.booker)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.3 }}
      className="card card-hover flex flex-col p-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold text-ink-900">{rule.label}</h3>
            <RoutingBadge outcome={rule.costCarrier === null ? 'fallback' : 'project'} />
          </div>
          <div className="mt-1.5">
            <CompanyTag companyNumber={rule.companyNumber} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="ghost" size="icon" icon={Pencil} aria-label={t('common.edit')} onClick={onEdit} />
          <Button
            variant="ghost"
            size="icon"
            icon={Trash2}
            aria-label={t('common.delete')}
            className="text-ink-400 hover:bg-rose-50 hover:text-rose-600"
            onClick={onDelete}
          />
        </div>
      </div>

      {/* Scope */}
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3">
        <div className="min-w-0">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{t('routing.col.costCenter')}</dt>
          <dd className="mt-0.5 truncate font-mono text-[13px] font-medium text-ink-800">{rule.costCenter}</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-[11px] font-medium uppercase tracking-wide text-ink-400">{t('routing.col.costCarrier')}</dt>
          <dd className="mt-0.5 truncate font-mono text-[13px] font-medium text-ink-800">
            {rule.costCarrier ?? t('common.none')}
          </dd>
        </div>
      </dl>

      {/* Booker */}
      <div className="mt-4">
        <div className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-ink-400">
          {t('routing.col.booker')}
        </div>
        <div className="flex items-center gap-2.5">
          {booker && <Avatar user={booker} size="sm" />}
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-medium text-ink-800">{booker?.name ?? rule.booker}</span>
              {booker && !booker.active && <DepartedTag />}
            </div>
            {booker?.title && <div className="truncate text-xs text-ink-400">{booker.title}</div>}
          </div>
        </div>
      </div>

      {/* Approval chain */}
      <div className="mt-4">
        <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-ink-400">
          {t('routing.col.chain')}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {rule.approvers.map((slot, i) => (
            <Fragment key={i}>
              {i > 0 && <ChevronRight size={14} className="shrink-0 text-ink-300" />}
              <ApproverChip slot={slot} step={i + 1} />
            </Fragment>
          ))}
        </div>
      </div>
    </motion.div>
  )
}

function ApproverChip({ slot, step }: { slot: ApproverSlot; step: number }) {
  const { t, formatCurrency } = useI18n()
  const user = useStore((s) => s.getUser(slot.userId))
  return (
    <div className="flex items-center gap-2 rounded-xl border border-ink-200/70 bg-ink-50/60 px-2.5 py-1.5">
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
        {step}
      </span>
      {user && <Avatar user={user} size="xs" />}
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-[13px] font-medium text-ink-800">{user?.name ?? slot.userId}</span>
          {user && !user.active && <DepartedTag />}
        </div>
        <div className="truncate text-[11px] text-ink-400">
          {slot.role} · {formatCurrency(slot.spendLimit)}
        </div>
      </div>
    </div>
  )
}

function DepartedTag() {
  const { t } = useI18n()
  return (
    <span className={cn('rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide', 'bg-slate-100 text-slate-500')}>
      {t('user.departed')}
    </span>
  )
}
