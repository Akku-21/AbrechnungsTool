'use client'

import { use } from 'react'
import Link from 'next/link'
import { useProperty } from '@/hooks/useProperties'
import { useUnits, useCreateUnit, useDeleteUnit } from '@/hooks/useUnits'
import { useTenants } from '@/hooks/useTenants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useConfirmDialog } from '@/components/ui/ConfirmDialog'
import { ArrowLeft, Edit, Plus, Home, User, Trash2 } from 'lucide-react'
import { formatArea, formatCurrency } from '@/lib/utils'

export default function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data: property, isLoading: propertyLoading } = useProperty(id)
  const { data: units, isLoading: unitsLoading } = useUnits(id)
  const { data: tenants } = useTenants()
  const deleteUnit = useDeleteUnit()
  const { confirm, ConfirmDialog } = useConfirmDialog()

  const handleDeleteUnit = async (unitId: string, designation: string) => {
    const confirmed = await confirm({
      title: 'Wohneinheit löschen',
      message: `Möchten Sie die Wohneinheit "${designation}" wirklich löschen?`,
      confirmLabel: 'Löschen',
      variant: 'destructive',
    })
    if (confirmed) {
      await deleteUnit.mutateAsync(unitId)
    }
  }

  if (propertyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Liegenschaft nicht gefunden</p>
      </div>
    )
  }

  const getTenantForUnit = (unitId: string) => {
    return tenants?.find((t) => t.unit_id === unitId && t.is_active)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/properties">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{property.name}</h1>
            <p className="text-gray-500 mt-1">{property.full_address}</p>
          </div>
        </div>
        <Link href={`/properties/${id}/edit`}>
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Bearbeiten
          </Button>
        </Link>
      </div>

      {/* Property Details */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Gesamtfläche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{formatArea(property.total_area_sqm)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Wohneinheiten
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{units?.length || 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Adresse
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              {property.street} {property.house_number}
              <br />
              {property.postal_code} {property.city}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Units */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Wohneinheiten</CardTitle>
            <CardDescription>Übersicht aller Wohneinheiten dieser Liegenschaft</CardDescription>
          </div>
          <Link href={`/properties/${id}/units/new`}>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Wohneinheit hinzufügen
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {unitsLoading ? (
            <p className="text-muted-foreground">Laden...</p>
          ) : !units || units.length === 0 ? (
            <div className="text-center py-6">
              <Home className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                Keine Wohneinheiten
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Fügen Sie Wohneinheiten zu dieser Liegenschaft hinzu.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {units.map((unit) => {
                const tenant = getTenantForUnit(unit.id)
                return (
                  <div
                    key={unit.id}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Home className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{unit.designation}</h4>
                        <p className="text-sm text-muted-foreground">
                          {formatArea(unit.area_sqm)}
                          {unit.rooms && ` • ${unit.rooms} Zimmer`}
                          {unit.floor !== null && ` • ${unit.floor}. Stock`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {tenant ? (
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-green-600" />
                          <span>{tenant.full_name}</span>
                          {tenant.monthly_prepayment && (
                            <span className="text-muted-foreground">
                              ({formatCurrency(tenant.monthly_prepayment)}/Monat)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-muted-foreground">Leer stehend</span>
                      )}
                      <div className="flex gap-2">
                        <Link href={`/properties/${id}/units/${unit.id}`}>
                          <Button variant="outline" size="sm">
                            Details
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteUnit(unit.id, unit.designation)}
                          disabled={deleteUnit.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {ConfirmDialog}
    </div>
  )
}
