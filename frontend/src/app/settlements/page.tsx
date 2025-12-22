'use client'

import Link from 'next/link'
import { useSettlements, useDeleteSettlement } from '@/hooks/useSettlements'
import { useProperties } from '@/hooks/useProperties'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { FileText, Plus, Trash2, Eye, Download, CheckCircle, Clock, FileCheck } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { SettlementStatus } from '@/types'

const statusConfig: Record<SettlementStatus, { label: string; color: string; icon: React.ComponentType<any> }> = {
  DRAFT: { label: 'Entwurf', color: 'bg-gray-100 text-gray-800', icon: Clock },
  CALCULATED: { label: 'Berechnet', color: 'bg-blue-100 text-blue-800', icon: FileCheck },
  FINALIZED: { label: 'Finalisiert', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  EXPORTED: { label: 'Exportiert', color: 'bg-purple-100 text-purple-800', icon: Download },
}

export default function SettlementsPage() {
  const { data: settlements, isLoading, error } = useSettlements()
  const { data: propertiesData } = useProperties()
  const deleteSettlement = useDeleteSettlement()

  const properties = propertiesData?.items || []

  const getPropertyName = (propertyId: string) => {
    return properties.find((p) => p.id === propertyId)?.name || 'Unbekannt'
  }

  const handleDelete = async (id: string, periodLabel: string) => {
    if (confirm(`Möchten Sie die Abrechnung "${periodLabel}" wirklich löschen?`)) {
      await deleteSettlement.mutateAsync(id)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Fehler beim Laden der Abrechnungen</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Abrechnungen</h1>
          <p className="text-gray-500 mt-1">Verwalten Sie Ihre Nebenkostenabrechnungen</p>
        </div>
        <Link href="/settlements/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Neue Abrechnung
          </Button>
        </Link>
      </div>

      {!settlements || settlements.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">Keine Abrechnungen</h3>
              <p className="mt-1 text-sm text-gray-500">
                Erstellen Sie Ihre erste Nebenkostenabrechnung.
              </p>
              <div className="mt-6">
                <Link href="/settlements/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Abrechnung erstellen
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {settlements.map((settlement) => {
            const status = statusConfig[settlement.status]
            const StatusIcon = status.icon
            return (
              <Card key={settlement.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-gray-100 rounded-lg">
                        <FileText className="h-6 w-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg">
                          Abrechnung {settlement.year}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {getPropertyName(settlement.property_id)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {settlement.period_label}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm ${status.color}`}>
                        <StatusIcon className="h-4 w-4" />
                        {status.label}
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/settlements/${settlement.id}`}>
                          <Button variant="outline" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            Details
                          </Button>
                        </Link>
                        {settlement.status === 'DRAFT' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDelete(settlement.id, settlement.period_label)}
                            disabled={deleteSettlement.isPending}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
