'use client'

import * as React from 'react'
import { AlertCircle, CheckCircle, X } from 'lucide-react'

type ToastVariant = 'default' | 'success' | 'error'

interface Toast {
  id: string
  title?: string
  message: string
  variant: ToastVariant
}

interface ToastContextType {
  toasts: Toast[]
  toast: (options: { title?: string; message: string; variant?: ToastVariant }) => void
  dismiss: (id: string) => void
}

const ToastContext = React.createContext<ToastContextType | undefined>(undefined)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([])

  const toast = React.useCallback(
    ({ title, message, variant = 'default' }: { title?: string; message: string; variant?: ToastVariant }) => {
      const id = Math.random().toString(36).substring(7)
      setToasts((prev) => [...prev, { id, title, message, variant }])

      // Auto dismiss after 5 seconds
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 5000)
    },
    []
  )

  const dismiss = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  )
}

function ToastContainer({
  toasts,
  onDismiss,
}: {
  toasts: Toast[]
  onDismiss: (id: string) => void
}) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-md">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`
            flex items-start gap-3 p-4 rounded-lg shadow-lg border
            animate-in slide-in-from-right-full duration-300
            ${toast.variant === 'error' ? 'bg-red-50 border-red-200' : ''}
            ${toast.variant === 'success' ? 'bg-green-50 border-green-200' : ''}
            ${toast.variant === 'default' ? 'bg-white border-gray-200' : ''}
          `}
        >
          {toast.variant === 'error' && (
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          )}
          {toast.variant === 'success' && (
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          )}
          <div className="flex-1">
            {toast.title && (
              <p className={`font-medium ${
                toast.variant === 'error' ? 'text-red-800' :
                toast.variant === 'success' ? 'text-green-800' :
                'text-gray-900'
              }`}>
                {toast.title}
              </p>
            )}
            <p className={`text-sm ${
              toast.variant === 'error' ? 'text-red-700' :
              toast.variant === 'success' ? 'text-green-700' :
              'text-gray-600'
            }`}>
              {toast.message}
            </p>
          </div>
          <button
            onClick={() => onDismiss(toast.id)}
            className={`flex-shrink-0 p-1 rounded hover:bg-black/5 ${
              toast.variant === 'error' ? 'text-red-500' :
              toast.variant === 'success' ? 'text-green-500' :
              'text-gray-400'
            }`}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}

export function useToast() {
  const context = React.useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
