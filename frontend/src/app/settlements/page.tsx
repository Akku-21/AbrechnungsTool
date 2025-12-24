'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { useSettlements, useDeleteSettlement } from '@/hooks/useSettlements'
import { useProperties } from '@/hooks/useProperties'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useConfirmDialog } from '@/components/ui/ConfirmDialog'
import { FileText, Plus, Trash2, Eye, Download, CheckCircle, Clock, FileCheck, Building2, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { fuzzyFilter } from '@/lib/fuzzySearch'
import { SettlementStatus, Property, Settlement } from '@/types'

const statusConfig: Record<SettlementStatus, { label: string; color: string; icon: React.ComponentType<any> }> = {
  DRAFT: { label: 'Entwurf', color: 'bg-gray-100 text-gray-800', icon: Clock },
  CALCULATED: { label: 'Berechnet', color: 'bg-blue-100 text-blue-800', icon: FileCheck },
  FINALIZED: { label: 'Finalisiert', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  EXPORTED: { label: 'Exportiert', color: 'bg-purple-100 text-purple-800', icon: Download },
}

interface GroupedSettlements {
  property: Property | null
  propertyId: string
  settlements: EnrichedSettlement[]
}

interface EnrichedSettlement extends Settlement {
  propertyName: string
  propertyAddress: string
}

export default function SettlementsPage() {
  const { data: settlements, isLoading, error } = useSettlements()
  const { data: propertiesData } = useProperties()
  const deleteSettlement = useDeleteSettlement()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [searchTerm, setSearchTerm] = useState('')
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const properties = propertiesData?.items || []

  const getProperty = (propertyId: string) => {
    return properties.find((p) => p.id === propertyId) || null
  }

  // Enrich settlements with property data for fuzzy search
  const enrichedSettlements = useMemo((): EnrichedSettlement[] => {
    if (!settlements) return []

    return settlements.map((settlement) => {
      const property = getProperty(settlement.property_id)
      return {
        ...settlement,
        propertyName: property?.name || '',
        propertyAddress: property?.full_address || '',
      }
    })
  }, [settlements, properties])

  // Filter settlements by search term using fuzzy search
  const filteredSettlements = useMemo(() => {
    if (!searchTerm) return enrichedSettlements

    return fuzzyFilter(
      enrichedSettlements,
      ['propertyName', 'propertyAddress', 'period_label', 'year'],
      searchTerm
    )
  }, [enrichedSettlements, searchTerm])

  // Group settlements by property
  const groupedSettlements = useMemo(() => {
    const groups: GroupedSettlements[] = []
    const propertyMap = new Map<string, EnrichedSettlement[]>()

    filteredSettlements.forEach((settlement) => {
      const existing = propertyMap.get(settlement.property_id)
      if (existing) {
        existing.push(settlement)
      } else {
        propertyMap.set(settlement.property_id, [settlement])
      }
    })

    // Sort properties by name
    const sortedPropertyIds = Array.from(propertyMap.keys()).sort((a, b) => {
      const propA = getProperty(a)
      const propB = getProperty(b)
      return (propA?.name || '').localeCompare(propB?.name || '')
    })

    sortedPropertyIds.forEach((propertyId) => {
      const propertySettlements = propertyMap.get(propertyId) || []
      // Sort settlements by year descending
      propertySettlements.sort((a, b) => b.year - a.year)
      groups.push({
        property: getProperty(propertyId),
        propertyId,
        settlements: propertySettlements,
      })
    })

    return groups
  }, [filteredSettlements, properties])

  const toggleGroup = (propertyId: string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(propertyId)) {
        next.delete(propertyId)
      } else {
        next.add(propertyId)
      }
      return next
    })
  }

  const handleDelete = async (id: string, periodLabel: string) => {
    const confirmed = await confirm({
      title: 'Abrechnung löschen',
      message: `Möchten Sie die Abrechnung "${periodLabel}" wirklich löschen?`,
      confirmLabel: 'Löschen',
      variant: 'destructive',
    })
    if (confirmed) {
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

  const draftCount = settlements?.filter((s) => s.status === 'DRAFT').length || 0
  const finalizedCount = settlements?.filter((s) => s.status === 'FINALIZED').length || 0

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

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gesamt
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{settlements?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Bearbeitung
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-orange-600">{draftCount}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Abgeschlossen
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{finalizedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      {settlements && settlements.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Suche</CardTitle>
            <CardDescription>Suchen Sie nach Abrechnungen</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suche nach Liegenschaft, Jahr, Zeitraum..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
      )}

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
      ) : filteredSettlements.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">Keine Ergebnisse</h3>
              <p className="mt-1 text-sm text-gray-500">
                Keine Abrechnungen gefunden für "{searchTerm}"
              </p>
              <div className="mt-4">
                <Button variant="outline" onClick={() => setSearchTerm('')}>
                  Suche zurücksetzen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedSettlements.map((group) => {
            const isCollapsed = collapsedGroups.has(group.propertyId)

            return (
              <Card key={group.propertyId}>
                {/* Property Header */}
                <button
                  onClick={() => toggleGroup(group.propertyId)}
                  className="w-full text-left"
                >
                  <CardHeader className="pb-3 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isCollapsed ? (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        )}
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <CardTitle className="text-lg">
                            {group.property?.name || 'Unbekannte Liegenschaft'}
                          </CardTitle>
                          <CardDescription>
                            {group.property?.full_address || ''} • {group.settlements.length} Abrechnung{group.settlements.length !== 1 ? 'en' : ''}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </button>

                {/* Settlements List */}
                {!isCollapsed && (
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {group.settlements.map((settlement) => {
                        const status = statusConfig[settlement.status]
                        const StatusIcon = status.icon

                        return (
                          <div
                            key={settlement.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-4">
                              <div className="p-2 bg-gray-100 rounded-lg">
                                <FileText className="h-5 w-5 text-gray-600" />
                              </div>
                              <div>
                                <h4 className="font-semibold">
                                  Abrechnung {settlement.year}
                                </h4>
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
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleDelete(settlement.id, settlement.period_label)
                                    }}
                                    disabled={deleteSettlement.isPending}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {ConfirmDialog}
    </div>
  )
}
