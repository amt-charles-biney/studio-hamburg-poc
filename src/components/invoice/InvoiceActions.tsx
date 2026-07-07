import { useState, type DragEvent } from 'react'
import {
  Check,
  Clock3,
  FileUp,
  MinusCircle,
  Send,
  Share2,
  Stamp,
  ThumbsUp,
  Undo2,
  UploadCloud,
  X,
} from 'lucide-react'
import { cn } from '@/lib/cn'
import { useI18n } from '@/i18n'
import { useStore } from '@/store/useStore'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { FieldGroup, Input, Select, Textarea } from '@/components/ui/Field'
import { Tooltip } from '@/components/ui/primitives'
import { canRetract, currentStep, fourEyesProgress } from '@/engine/approval'
import { addDaysIso, nowIso } from '@/engine/util'
import type { Invoice } from '@/types'

type ModalKind = 'approve' | 'decline' | 'delegate' | 'remind' | 'add_page' | 'close_no_action' | 'retract' | null

export function InvoiceActions({ inv }: { inv: Invoice }) {
  const { t, formatCurrency } = useI18n()
  const store = useStore()
  const currentUserId = store.currentUserId
  const config = store.config

  const [modal, setModal] = useState<ModalKind>(null)
  const [comment, setComment] = useState('')
  const [delegateMode, setDelegateMode] = useState<'person' | 'group'>('person')
  const [delegateTarget, setDelegateTarget] = useState('')
  const [fileName, setFileName] = useState('')
  const [dragOver, setDragOver] = useState(false)

  const pending = store.isPendingForViewer(inv, currentUserId)
  const step = currentStep(inv)
  const isBookerStep = pending && !!step?.isBooker
  const isApproverStep = pending && !step?.isBooker
  const retract = canRetract(inv, currentUserId)
  const canExport = inv.status === 'APPROVED'
  const progress = fourEyesProgress(inv, config)
  const covers = step && !step.isBooker ? step.spendLimit >= inv.totalAmount : false

  const close = () => {
    setModal(null)
    setComment('')
    setDelegateTarget('')
    setFileName('')
  }

  if (!pending && !canExport && !retract.allowed && !(retract.locked && retract.stepIndex !== undefined)) {
    return null
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {isBookerStep && (
          <Button variant="primary" icon={Stamp} onClick={() => store.book(inv.id)}>
            {t('action.book')}
          </Button>
        )}

        {isApproverStep && (
          <Button variant="primary" icon={Check} onClick={() => setModal('approve')}>
            {t('action.approve')}
          </Button>
        )}

        {canExport && (
          <Button variant="primary" icon={Send} onClick={() => store.exportInvoice(inv.id)}>
            {t('action.export')}
          </Button>
        )}

        {isApproverStep && (
          <Button variant="danger" icon={X} onClick={() => setModal('decline')}>
            {t('action.decline')}
          </Button>
        )}

        {pending && (
          <>
            <Button variant="secondary" icon={Share2} onClick={() => setModal('delegate')}>
              {t('action.delegate')}
            </Button>
            {isApproverStep && (
              <Button variant="secondary" icon={Clock3} onClick={() => setModal('remind')}>
                {t('action.remind')}
              </Button>
            )}
            <Button variant="secondary" icon={FileUp} onClick={() => setModal('add_page')}>
              {t('action.add_page')}
            </Button>
            <Button variant="ghost" icon={MinusCircle} onClick={() => setModal('close_no_action')}>
              {t('action.close_no_action')}
            </Button>
          </>
        )}

        {retract.allowed && (
          <Button variant="ghost" icon={Undo2} onClick={() => setModal('retract')}>
            {t('action.retract')}
          </Button>
        )}
        {!retract.allowed && retract.locked && retract.stepIndex !== undefined && (
          <Tooltip label={t('action.retract.locked')}>
            <span>
              <Button variant="ghost" icon={Undo2} disabled>
                {t('action.retract')}
              </Button>
            </span>
          </Tooltip>
        )}
      </div>

      {/* Approve */}
      <Modal
        open={modal === 'approve'}
        onClose={close}
        title={t('action.approve.confirm')}
        description={t('action.approve.desc')}
        icon={ThumbsUp}
        iconClass="bg-emerald-50 text-emerald-600"
        footer={
          <>
            <Button variant="ghost" onClick={close}>{t('common.cancel')}</Button>
            <Button variant="success" icon={Check} onClick={() => { store.approve(inv.id, comment.trim() || undefined); close() }}>
              {t('action.approve')}
            </Button>
          </>
        }
      >
        <div className={cn('mb-4 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm', covers ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
          <div className="flex-1">
            <p className="font-medium">
              {covers ? t('detail.chain.willClose') : t('detail.chain.willEscalate')}
            </p>
            <p className="mt-0.5 text-xs opacity-80">
              {t('inbox.yourLimit')}: {formatCurrency(step?.spendLimit ?? 0, inv.currency)} · {t('detail.chain.fourEyes', { done: progress.count, min: progress.min })}
            </p>
          </div>
        </div>
        <FieldGroup label={t('common.comment')}>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('common.commentPlaceholder')} />
        </FieldGroup>
      </Modal>

      {/* Decline */}
      <Modal
        open={modal === 'decline'}
        onClose={close}
        title={t('action.decline.confirm')}
        description={t('action.decline.desc')}
        icon={X}
        iconClass="bg-rose-50 text-rose-600"
        footer={
          <>
            <Button variant="ghost" onClick={close}>{t('common.cancel')}</Button>
            <Button variant="danger" icon={X} onClick={() => { store.decline(inv.id, comment.trim() || undefined); close() }}>
              {t('action.decline')}
            </Button>
          </>
        }
      >
        <FieldGroup label={t('common.reason')}>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('common.commentPlaceholder')} />
        </FieldGroup>
      </Modal>

      {/* Delegate */}
      <Modal
        open={modal === 'delegate'}
        onClose={close}
        title={t('action.delegate.confirm')}
        description={t('action.delegate.desc')}
        icon={Share2}
        iconClass="bg-sky-50 text-sky-600"
        footer={
          <>
            <Button variant="ghost" onClick={close}>{t('common.cancel')}</Button>
            <Button
              variant="primary"
              icon={Share2}
              disabled={!delegateTarget || !comment.trim()}
              onClick={() => {
                store.delegate(
                  inv.id,
                  delegateMode === 'person' ? { userId: delegateTarget } : { groupId: delegateTarget },
                  comment.trim(),
                )
                close()
              }}
            >
              {t('action.delegate')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="inline-flex rounded-xl bg-ink-100 p-1">
            {(['person', 'group'] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setDelegateMode(m); setDelegateTarget('') }}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-[13px] font-medium transition',
                  delegateMode === m ? 'bg-white text-ink-900 shadow-soft' : 'text-ink-500',
                )}
              >
                {t(m === 'person' ? 'action.delegate.person' : 'action.delegate.group')}
              </button>
            ))}
          </div>
          <FieldGroup label={t('action.delegate.target')} required>
            <Select value={delegateTarget} onChange={(e) => setDelegateTarget(e.target.value)}>
              <option value="">{delegateMode === 'person' ? t('common.selectUser') : t('common.selectGroup')}</option>
              {delegateMode === 'person'
                ? store.users.filter((u) => u.active && u.id !== currentUserId).map((u) => (
                    <option key={u.id} value={u.id}>{u.name} · {u.title}</option>
                  ))
                : store.groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
            </Select>
          </FieldGroup>
          <FieldGroup label={t('common.comment')} required error={!comment.trim() ? t('action.commentRequired') : undefined}>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('common.commentPlaceholder')} />
          </FieldGroup>
        </div>
      </Modal>

      {/* Remind */}
      <Modal
        open={modal === 'remind'}
        onClose={close}
        title={t('action.remind.confirm')}
        description={t('action.remind.desc')}
        icon={Clock3}
        iconClass="bg-amber-50 text-amber-600"
      >
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {[
            { key: 'in1h', at: new Date(Date.now() + 3600_000).toISOString() },
            { key: 'in1d', at: addDaysIso(nowIso(), 1) },
            { key: 'in3d', at: addDaysIso(nowIso(), 3) },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => { store.remind(inv.id, opt.at); close() }}
              className="rounded-xl border border-ink-200 px-4 py-3 text-sm font-medium text-ink-700 transition hover:border-brand-300 hover:bg-brand-50 hover:text-brand-700"
            >
              {t(`action.remind.${opt.key}`)}
            </button>
          ))}
        </div>
      </Modal>

      {/* Add supporting page */}
      <Modal
        open={modal === 'add_page'}
        onClose={close}
        title={t('action.add_page')}
        icon={FileUp}
        iconClass="bg-violet-50 text-violet-600"
        footer={
          <>
            <Button variant="ghost" onClick={close}>{t('common.cancel')}</Button>
            <Button variant="primary" icon={FileUp} disabled={!fileName.trim()} onClick={() => { store.addPage(inv.id, fileName.trim()); close() }}>
              {t('common.add')}
            </Button>
          </>
        }
      >
        <label
          onDragOver={(e: DragEvent) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e: DragEvent) => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files?.[0]
            if (f) setFileName(f.name)
          }}
          className={cn(
            'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed px-6 py-10 text-center transition',
            dragOver ? 'border-brand-400 bg-brand-50' : 'border-ink-200 hover:border-brand-300 hover:bg-ink-50',
          )}
        >
          <UploadCloud size={28} className="text-brand-400" />
          <span className="text-sm font-medium text-ink-600">{fileName || t('detail.doc.mock')}</span>
          <input
            type="file"
            className="hidden"
            accept="application/pdf,image/*"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) setFileName(f.name) }}
          />
        </label>
        <div className="mt-3">
          <FieldGroup label={t('intake.pair.pdf')}>
            <Input value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="supporting-page.pdf" />
          </FieldGroup>
        </div>
      </Modal>

      {/* Close without action */}
      <Modal
        open={modal === 'close_no_action'}
        onClose={close}
        title={t('action.close_no_action.confirm')}
        description={t('action.close_no_action.desc')}
        icon={MinusCircle}
        iconClass="bg-slate-100 text-slate-600"
        footer={
          <>
            <Button variant="ghost" onClick={close}>{t('common.cancel')}</Button>
            <Button variant="secondary" icon={MinusCircle} onClick={() => { store.closeNoAction(inv.id, comment.trim() || undefined); close() }}>
              {t('action.close_no_action')}
            </Button>
          </>
        }
      >
        <FieldGroup label={t('common.comment')}>
          <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder={t('common.commentPlaceholder')} />
        </FieldGroup>
      </Modal>

      {/* Retract */}
      <Modal
        open={modal === 'retract'}
        onClose={close}
        title={t('action.retract')}
        description={t('action.retract.desc')}
        icon={Undo2}
        iconClass="bg-orange-50 text-orange-600"
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={close}>{t('common.cancel')}</Button>
            <Button variant="primary" icon={Undo2} onClick={() => { store.retract(inv.id); close() }}>
              {t('action.retract')}
            </Button>
          </>
        }
      />
    </>
  )
}
