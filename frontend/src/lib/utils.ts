import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

export function formatDate(date: string): string {
  return new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(date))
}

export function formatArea(sqm: number): string {
  return `${sqm.toLocaleString('de-DE')} m²`
}

export function formatNumber(value: number, decimals: number = 2): string {
  return value.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toLocaleString('de-DE', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}%`
}

// Date Conversion (German DD.MM.YYYY <-> ISO YYYY-MM-DD)

/**
 * Convert ISO date (YYYY-MM-DD) to German format (DD.MM.YYYY)
 */
export function isoToGerman(isoDate: string): string {
  if (!isoDate) return ''
  const parts = isoDate.split('-')
  if (parts.length !== 3) return isoDate
  return `${parts[2]}.${parts[1]}.${parts[0]}`
}

/**
 * Convert German date (DD.MM.YYYY) to ISO format (YYYY-MM-DD)
 */
export function germanToIso(germanDate: string): string {
  if (!germanDate) return ''
  const parts = germanDate.split('.')
  if (parts.length !== 3) return germanDate
  return `${parts[2]}-${parts[1]}-${parts[0]}`
}

// Amount Formatting (German 1.234,56 <-> Number 1234.56)

/**
 * Format number for display input (German: 1.234,56)
 */
export function formatAmountForInput(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  if (isNaN(num)) return ''
  return num.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * Parse German formatted number (1.234,56) to float (1234.56)
 */
export function parseGermanAmount(value: string): number {
  if (!value) return 0
  // Remove thousand separators and convert decimal comma to point
  const normalized = value.replace(/\./g, '').replace(',', '.')
  return parseFloat(normalized) || 0
}

// Document helpers

import type { Invoice } from '@/types'

/**
 * Get set of document IDs that have associated invoices
 */
export function getDocumentsWithInvoices(invoices: Invoice[] | undefined): Set<string> {
  return new Set(
    invoices?.filter(inv => inv.document_id).map(inv => inv.document_id!) || []
  )
}
