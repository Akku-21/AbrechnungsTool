'use client'

import Link from 'next/link'
import { useProperties, useDeleteProperty } from '@/hooks/useProperties'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Building2, Plus, Trash2, Edit, Eye } from 'lucide-react'
import { formatArea } from '@/lib/utils'

export default function PropertiesPage() {
  const { data, isLoading, error } = useProperties()
  const deleteProperty = useDeleteProperty()

  const properties = data?.items || []

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Möchten Sie die Liegenschaft "${name}" wirklich löschen?`)) {
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
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
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
    </div>
  )
}
