import {
  cn,
  formatCurrency,
  formatDate,
  formatArea,
  formatNumber,
  formatPercent,
  isoToGerman,
  germanToIso,
  formatAmountForInput,
  parseGermanAmount,
  getDocumentsWithInvoices,
} from '@/lib/utils'
import type { Invoice } from '@/types'

describe('cn (class name utility)', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('merges tailwind classes correctly', () => {
    expect(cn('p-4', 'p-2')).toBe('p-2')
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500')
  })

  it('handles arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })

  it('handles objects', () => {
    expect(cn({ foo: true, bar: false })).toBe('foo')
  })
})

describe('formatCurrency', () => {
  it('formats positive amounts in German EUR format', () => {
    expect(formatCurrency(1234.56)).toMatch(/1\.234,56/)
    expect(formatCurrency(1234.56)).toContain('€')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toMatch(/0,00/)
  })

  it('formats negative amounts', () => {
    expect(formatCurrency(-500)).toMatch(/-?500,00/)
  })

  it('rounds to 2 decimal places', () => {
    expect(formatCurrency(123.456)).toMatch(/123,46/)
  })

  it('formats large amounts with thousand separators', () => {
    expect(formatCurrency(1000000)).toMatch(/1\.000\.000/)
  })
})

describe('formatDate', () => {
  it('formats ISO date to German format', () => {
    expect(formatDate('2024-01-15')).toBe('15.01.2024')
  })

  it('formats date with different months', () => {
    expect(formatDate('2024-12-25')).toBe('25.12.2024')
  })

  it('handles single digit days and months with padding', () => {
    expect(formatDate('2024-03-05')).toBe('05.03.2024')
  })
})

describe('formatArea', () => {
  it('formats area with m² suffix', () => {
    expect(formatArea(100)).toBe('100 m²')
  })

  it('formats large areas with thousand separators', () => {
    expect(formatArea(1500)).toBe('1.500 m²')
  })

  it('formats decimal areas', () => {
    expect(formatArea(75.5)).toBe('75,5 m²')
  })
})

describe('formatNumber', () => {
  it('formats with default 2 decimals', () => {
    expect(formatNumber(1234.5)).toBe('1.234,50')
  })

  it('formats with custom decimals', () => {
    expect(formatNumber(1234.5678, 3)).toBe('1.234,568')
  })

  it('formats with zero decimals', () => {
    expect(formatNumber(1234.5, 0)).toBe('1.235')
  })

  it('handles negative numbers', () => {
    expect(formatNumber(-1234.5)).toBe('-1.234,50')
  })
})

describe('formatPercent', () => {
  it('formats percentage with default 1 decimal', () => {
    expect(formatPercent(75.5)).toBe('75,5%')
  })

  it('formats percentage with custom decimals', () => {
    expect(formatPercent(33.333, 2)).toBe('33,33%')
  })

  it('handles 100%', () => {
    expect(formatPercent(100)).toBe('100,0%')
  })

  it('handles 0%', () => {
    expect(formatPercent(0)).toBe('0,0%')
  })
})

describe('isoToGerman', () => {
  it('converts ISO date to German format', () => {
    expect(isoToGerman('2024-01-15')).toBe('15.01.2024')
  })

  it('converts date with different parts', () => {
    expect(isoToGerman('2023-12-31')).toBe('31.12.2023')
  })

  it('returns empty string for empty input', () => {
    expect(isoToGerman('')).toBe('')
  })

  it('returns original string if invalid format', () => {
    expect(isoToGerman('invalid')).toBe('invalid')
    expect(isoToGerman('2024-01')).toBe('2024-01')
  })

  it('handles padded dates correctly', () => {
    expect(isoToGerman('2024-03-05')).toBe('05.03.2024')
  })
})

describe('germanToIso', () => {
  it('converts German date to ISO format', () => {
    expect(germanToIso('15.01.2024')).toBe('2024-01-15')
  })

  it('converts date with different parts', () => {
    expect(germanToIso('31.12.2023')).toBe('2023-12-31')
  })

  it('returns empty string for empty input', () => {
    expect(germanToIso('')).toBe('')
  })

  it('returns original string if invalid format', () => {
    expect(germanToIso('invalid')).toBe('invalid')
    expect(germanToIso('01.2024')).toBe('01.2024')
  })

  it('handles padded dates correctly', () => {
    expect(germanToIso('05.03.2024')).toBe('2024-03-05')
  })
})

describe('isoToGerman and germanToIso (roundtrip)', () => {
  it('roundtrip conversion preserves date', () => {
    const original = '2024-06-15'
    expect(germanToIso(isoToGerman(original))).toBe(original)
  })

  it('reverse roundtrip preserves date', () => {
    const original = '15.06.2024'
    expect(isoToGerman(germanToIso(original))).toBe(original)
  })
})

describe('formatAmountForInput', () => {
  it('formats number to German format with 2 decimals', () => {
    expect(formatAmountForInput(1234.56)).toBe('1.234,56')
  })

  it('formats string number', () => {
    expect(formatAmountForInput('1234.56')).toBe('1.234,56')
  })

  it('pads decimals', () => {
    expect(formatAmountForInput(100)).toBe('100,00')
  })

  it('returns empty string for NaN', () => {
    expect(formatAmountForInput('invalid')).toBe('')
    expect(formatAmountForInput(NaN)).toBe('')
  })

  it('handles zero', () => {
    expect(formatAmountForInput(0)).toBe('0,00')
  })

  it('handles large numbers', () => {
    expect(formatAmountForInput(1000000.5)).toBe('1.000.000,50')
  })

  it('rounds to 2 decimals', () => {
    expect(formatAmountForInput(123.456)).toBe('123,46')
  })
})

describe('parseGermanAmount', () => {
  it('parses German formatted number', () => {
    expect(parseGermanAmount('1.234,56')).toBe(1234.56)
  })

  it('parses number without thousand separators', () => {
    expect(parseGermanAmount('100,50')).toBe(100.5)
  })

  it('parses whole numbers', () => {
    expect(parseGermanAmount('100')).toBe(100)
  })

  it('returns 0 for empty string', () => {
    expect(parseGermanAmount('')).toBe(0)
  })

  it('returns 0 for invalid input', () => {
    expect(parseGermanAmount('invalid')).toBe(0)
  })

  it('handles large numbers', () => {
    expect(parseGermanAmount('1.000.000,00')).toBe(1000000)
  })
})

describe('formatAmountForInput and parseGermanAmount (roundtrip)', () => {
  it('roundtrip conversion preserves amount', () => {
    const original = 1234.56
    expect(parseGermanAmount(formatAmountForInput(original))).toBe(original)
  })

  it('reverse roundtrip preserves amount', () => {
    const original = '1.234,56'
    expect(formatAmountForInput(parseGermanAmount(original))).toBe(original)
  })
})

describe('getDocumentsWithInvoices', () => {
  it('returns empty set for undefined invoices', () => {
    expect(getDocumentsWithInvoices(undefined)).toEqual(new Set())
  })

  it('returns empty set for empty array', () => {
    expect(getDocumentsWithInvoices([])).toEqual(new Set())
  })

  it('extracts document IDs from invoices', () => {
    const invoices = [
      { id: '1', document_id: 'doc-1' },
      { id: '2', document_id: 'doc-2' },
    ] as Invoice[]

    const result = getDocumentsWithInvoices(invoices)
    expect(result.has('doc-1')).toBe(true)
    expect(result.has('doc-2')).toBe(true)
    expect(result.size).toBe(2)
  })

  it('filters out invoices without document_id', () => {
    const invoices = [
      { id: '1', document_id: 'doc-1' },
      { id: '2', document_id: null },
      { id: '3', document_id: undefined },
      { id: '4', document_id: 'doc-4' },
    ] as unknown as Invoice[]

    const result = getDocumentsWithInvoices(invoices)
    expect(result.has('doc-1')).toBe(true)
    expect(result.has('doc-4')).toBe(true)
    expect(result.size).toBe(2)
  })

  it('handles duplicate document IDs', () => {
    const invoices = [
      { id: '1', document_id: 'doc-1' },
      { id: '2', document_id: 'doc-1' },
    ] as Invoice[]

    const result = getDocumentsWithInvoices(invoices)
    expect(result.size).toBe(1)
  })
})
