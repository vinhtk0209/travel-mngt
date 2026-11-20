import { AlertTriangle } from 'lucide-react'
import type { ReactNode } from 'react'
import { Button } from './button'
import { Modal } from './modal'
import { useI18n } from '@/i18n/i18n-context'

type ConfirmDialogProps = {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  description: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  isLoading?: boolean
  tone?: 'danger' | 'primary'
}

export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  isLoading = false,
  tone = 'danger',
}: ConfirmDialogProps) {
  const { t } = useI18n()
  const confirmText = confirmLabel ?? t('common.confirm')
  const cancelText = cancelLabel ?? t('common.cancel')

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={tone === 'danger' ? 'danger' : 'primary'}
            onClick={onConfirm}
            isLoading={isLoading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50/70 p-4 text-sm leading-relaxed text-rose-800 dark:border-rose-900/70 dark:bg-rose-950/50 dark:text-rose-100">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-300" />
        <div className="min-w-0">{description}</div>
      </div>
    </Modal>
  )
}
