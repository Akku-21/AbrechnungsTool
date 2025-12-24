'use client'

import Link from 'next/link'
import { useState, useMemo } from 'react'
import { useProperties, useDeleteProperty } from '@/hooks/useProperties'
import { useUnits } from '@/hooks/useUnits'
import { useTenants } from '@/hooks/useTenants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { useConfirmDialog } from '@/components/ui/ConfirmDialog'
import { Building2, Plus, Trash2, Edit, Eye, Search, Home } from 'lucide-react'
import { formatArea } from '@/lib/utils'
import { fuzzyFilter } from '@/lib/fuzzySearch'

export default function PropertiesPage() {
  const { data, isLoading, error } = useProperties()
  const { data: allUnits } = useUnits()
  const { data: allTenants } = useTenants()
  const deleteProperty = useDeleteProperty()
  const { confirm, ConfirmDialog } = useConfirmDialog()
  const [searchTerm, setSearchTerm] = useState('')

  const properties = data?.items || []

  // Calculate vacant units (units without active tenant)
  const vacantUnitsCount = useMemo(() => {
    if (!allUnits || !allTenants) return 0

    // Get unit IDs that have an active tenant (no move_out_date)
    const occupiedUnitIds = new Set(
      allTenants
        .filter((t) => t.is_active && !t.move_out_date)
        .map((t) => t.unit_id)
    )

    // Count units without active tenant
    return allUnits.filter((u) => !occupiedUnitIds.has(u.id)).length
  }, [allUnits, allTenants])

  const filteredProperties = useMemo(() => {
    if (!searchTerm) return properties

    return fuzzyFilter(
      properties,
      ['name', 'full_address', 'city', 'street', 'postal_code'],
      searchTerm
    )
  }, [properties, searchTerm])

  const handleDelete = async (id: string, name: string) => {
    const confirmed = await confirm({
      title: 'Liegenschaft löschen',
      message: `Möchten Sie die Liegenschaft "${name}" wirklich löschen?`,
      confirmLabel: 'Löschen',
      variant: 'destructive',
    })
    if (confirmed) {
      await deleteProperty.mutateAsync(id)
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
        <p className="text-destructive">Fehler beim Laden der Liegenschaften</p>
      </div>
    )
  }

  const totalUnits = properties.reduce((sum, p) => sum + (p.unit_count || 0), 0)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Liegenschaften</h1>
          <p className="text-gray-500 mt-1">Verwalten Sie Ihre Immobilien</p>
        </div>
        <Link href="/properties/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Neue Liegenschaft
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Liegenschaften
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{properties.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Wohneinheiten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{totalUnits}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Leerstehend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${vacantUnitsCount > 0 ? 'text-orange-600' : 'text-green-600'}`}>
              {vacantUnitsCount}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      {properties.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Suche</CardTitle>
            <CardDescription>Suchen Sie nach Liegenschaften</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suche nach Name, Adresse, Stadt, PLZ..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {properties.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Building2 className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">Keine Liegenschaften</h3>
              <p className="mt-1 text-sm text-gray-500">
                Beginnen Sie mit dem Anlegen einer Liegenschaft.
              </p>
              <div className="mt-6">
                <Link href="/properties/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Liegenschaft anlegen
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : filteredProperties.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <Search className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">Keine Ergebnisse</h3>
              <p className="mt-1 text-sm text-gray-500">
                Keine Liegenschaften gefunden für "{searchTerm}"
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredProperties.map((property) => (
            <Card key={property.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{property.name}</CardTitle>
                    <CardDescription className="mt-1">
                      {property.full_address}
                    </CardDescription>
                  </div>
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gesamtfläche:</span>
                    <span className="font-medium">{formatArea(property.total_area_sqm)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wohneinheiten:</span>
                    <span className="font-medium">{property.unit_count || 0}</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Link href={`/properties/${property.id}`} className="flex-1">
                    <Button variant="outline" size="sm" className="w-full">
                      <Eye className="mr-2 h-4 w-4" />
                      Details
                    </Button>
                  </Link>
                  <Link href={`/properties/${property.id}/edit`}>
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(property.id, property.name)}
                    disabled={deleteProperty.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {ConfirmDialog}
    </div>
  )
}
