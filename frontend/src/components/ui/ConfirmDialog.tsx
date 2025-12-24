'use client'

import * as React from 'react'
import { Button } from './Button'
import { AlertCircle, Loader2 } from 'lucide-react'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void | Promise<void>
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
  isLoading?: boolean
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Bestätigen',
  cancelLabel = 'Abbrechen',
  variant = 'default',
  isLoading = false,
}: ConfirmDialogProps) {
  const [isPending, setIsPending] = React.useState(false)

  const handleConfirm = async () => {
    setIsPending(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      setIsPending(false)
    }
  }

  if (!isOpen) return null

  const loading = isLoading || isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={loading ? undefined : onClose}
      />

      {/* Dialog */}
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-full ${variant === 'destructive' ? 'bg-red-100' : 'bg-orange-100'}`}>
              <AlertCircle className={`h-6 w-6 ${variant === 'destructive' ? 'text-red-600' : 'text-orange-600'}`} />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <p className="mt-2 text-gray-600">{message}</p>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              {cancelLabel}
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={loading}
              className={variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
            >
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook for easier usage
interface UseConfirmDialogOptions {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'destructive'
}

export function useConfirmDialog() {
  const [state, setState] = React.useState<{
    isOpen: boolean
    options: UseConfirmDialogOptions | null
    resolve: ((value: boolean) => void) | null
  }>({
    isOpen: false,
    options: null,
    resolve: null,
  })

  const confirm = React.useCallback((options: UseConfirmDialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setState({
        isOpen: true,
        options,
        resolve,
      })
    })
  }, [])

  const handleClose = React.useCallback(() => {
    state.resolve?.(false)
    setState({ isOpen: false, options: null, resolve: null })
  }, [state.resolve])

  const handleConfirm = React.useCallback(() => {
    state.resolve?.(true)
    setState({ isOpen: false, options: null, resolve: null })
  }, [state.resolve])

  const ConfirmDialogComponent = React.useMemo(() => {
    if (!state.isOpen || !state.options) return null

    return (
      <ConfirmDialog
        isOpen={state.isOpen}
        onClose={handleClose}
        onConfirm={handleConfirm}
        title={state.options.title}
        message={state.options.message}
        confirmLabel={state.options.confirmLabel}
        cancelLabel={state.options.cancelLabel}
        variant={state.options.variant}
      />
    )
  }, [state.isOpen, state.options, handleClose, handleConfirm])

  return { confirm, ConfirmDialog: ConfirmDialogComponent }
}
