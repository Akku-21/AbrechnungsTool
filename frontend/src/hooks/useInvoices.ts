import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invoicesApi } from '@/lib/api/invoices'
import { InvoiceCreate, InvoiceUpdate } from '@/types'

export function useInvoices(options?: {
  settlementId?: string
  unitId?: string
  includeSettlementWide?: boolean
}) {
  return useQuery({
    queryKey: ['invoices', options],
    queryFn: () => invoicesApi.list(options),
    enabled: !!(options?.settlementId || options?.unitId),
  })
}

export function useInvoice(id: string) {
  return useQuery({
    queryKey: ['invoices', id],
    queryFn: () => invoicesApi.get(id),
    enabled: !!id,
  })
}

export function useCreateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: InvoiceCreate) => invoicesApi.create(data),
    onSuccess: () => {
      // Invalidate all invoice queries (settlement-wide and unit-specific)
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      // Also invalidate unit settlements since calculation is auto-triggered
      queryClient.invalidateQueries({ queryKey: ['unit-settlements'] })
    },
  })
}

export function useUpdateInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: InvoiceUpdate }) =>
      invoicesApi.update(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoices', id] })
    },
  })
}

export function useDeleteInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => invoicesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['unit-settlements'] })
    },
  })
}

export function useVerifyInvoice() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => invoicesApi.verify(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoices', id] })
    },
  })
}
