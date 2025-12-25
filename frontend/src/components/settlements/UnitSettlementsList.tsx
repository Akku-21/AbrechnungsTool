'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FileDown, FileText, ChevronRight, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/badge'
import { useUnitSettlements, useExportUnitSettlementPdf } from '@/hooks/useUnitSettlements'

interface UnitSettlementsListProps {
  settlementId: string
  isFinalized: boolean
}

function formatEuro(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

export function UnitSettlementsList({ settlementId, isFinalized }: UnitSettlementsListProps) {
  const { data, isLoading, error } = useUnitSettlements(settlementId)
  const exportPdfMutation = useExportUnitSettlementPdf()
  const [exportingId, setExportingId] = useState<string | null>(null)

  const handleExportPdf = async (e: React.MouseEvent, unitSettlementId: string, unitDesignation: string, tenantLastName: string) => {
    e.preventDefault()
    e.stopPropagation()
    setExportingId(unitSettlementId)
    try {
      const blob = await exportPdfMutation.mutateAsync(unitSettlementId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `Nebenkostenabrechnung_${unitDesignation}_${tenantLastName}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setExportingId(null)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Einzelabrechnungen</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Einzelabrechnungen</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-destructive">Fehler beim Laden der Einzelabrechnungen</p>
        </CardContent>
      </Card>
    )
  }

  if (!data || data.unit_settlements.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Einzelabrechnungen</CardTitle>
          <CardDescription>
            Noch keine Einzelabrechnungen vorhanden. Fügen Sie Rechnungen hinzu und die Berechnung erfolgt automatisch.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Einzelabrechnungen</CardTitle>
        <CardDescription>
          {data.unit_settlements.length} Wohneinheit{data.unit_settlements.length !== 1 ? 'en' : ''} &bull;{' '}
          Gesamtkosten: {formatEuro(data.total_costs)} &bull;{' '}
          Gesamtsaldo: <span className={data.total_balance >= 0 ? 'text-orange-600' : 'text-green-600'}>
            {formatEuro(data.total_balance)}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.unit_settlements.map((us) => (
            <Link
              key={us.id}
              href={`/settlements/${settlementId}/units/${us.id}`}
              className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors block"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{us.unit.designation}</span>
                  <span className="text-muted-foreground">|</span>
                  <span className="text-muted-foreground">{us.tenant.full_name}</span>
                  {us.documents.length > 0 && (
                    <Badge variant="outline" className="ml-2">
                      <FileText className="h-3 w-3 mr-1" />
                      {us.documents.length}
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                  <span>Kosten: {formatEuro(us.total_costs)}</span>
                  <span>Vorauszahlung: {formatEuro(us.total_prepayments)}</span>
                  <span className={us.balance >= 0 ? 'text-orange-600 font-medium' : 'text-green-600 font-medium'}>
                    {us.balance >= 0 ? 'Nachzahlung' : 'Guthaben'}: {formatEuro(Math.abs(us.balance))}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 ml-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => handleExportPdf(e, us.id, us.unit.designation, us.tenant.last_name)}
                  disabled={exportingId === us.id}
                >
                  {exportingId === us.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="h-4 w-4" />
                  )}
                  <span className="ml-1 hidden sm:inline">PDF</span>
                </Button>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
