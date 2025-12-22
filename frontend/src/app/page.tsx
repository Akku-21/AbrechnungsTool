'use client'

import Link from 'next/link'
import { useProperties } from '@/hooks/useProperties'
import { useSettlements } from '@/hooks/useSettlements'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Building2, FileText, Plus, Home } from 'lucide-react'

export default function Dashboard() {
  const { data: propertiesData, isLoading: propertiesLoading } = useProperties()
  const { data: settlements, isLoading: settlementsLoading } = useSettlements()

  const properties = propertiesData?.items || []
  const recentSettlements = settlements?.slice(0, 5) || []

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Übersicht über Ihre Nebenkostenabrechnungen</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Liegenschaften</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {propertiesLoading ? '...' : properties.length}
            </div>
            <p className="text-xs text-muted-foreground">
              Verwaltete Objekte
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Wohneinheiten</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {propertiesLoading ? '...' : properties.reduce((sum, p) => sum + (p.unit_count || 0), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Gesamt
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Abrechnungen</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {settlementsLoading ? '...' : settlements?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Erstellt
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Schnellzugriff</CardTitle>
            <CardDescription>Häufig genutzte Aktionen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link href="/properties/new">
              <Button className="w-full justify-start" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Neue Liegenschaft anlegen
              </Button>
            </Link>
            <Link href="/settlements/new">
              <Button className="w-full justify-start" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Neue Abrechnung erstellen
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Letzte Abrechnungen</CardTitle>
            <CardDescription>Zuletzt bearbeitete Abrechnungen</CardDescription>
          </CardHeader>
          <CardContent>
            {settlementsLoading ? (
              <p className="text-sm text-muted-foreground">Laden...</p>
            ) : recentSettlements.length === 0 ? (
              <p className="text-sm text-muted-foreground">Keine Abrechnungen vorhanden</p>
            ) : (
              <ul className="space-y-2">
                {recentSettlements.map((settlement) => (
                  <li key={settlement.id}>
                    <Link
                      href={`/settlements/${settlement.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      {settlement.period_label} ({settlement.status})
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Properties Overview */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Liegenschaften</CardTitle>
            <CardDescription>Ihre verwalteten Objekte</CardDescription>
          </div>
          <Link href="/properties">
            <Button variant="outline" size="sm">Alle anzeigen</Button>
          </Link>
        </CardHeader>
        <CardContent>
          {propertiesLoading ? (
            <p className="text-sm text-muted-foreground">Laden...</p>
          ) : properties.length === 0 ? (
            <div className="text-center py-6">
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
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {properties.slice(0, 6).map((property) => (
                <Link key={property.id} href={`/properties/${property.id}`}>
                  <div className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <h3 className="font-medium">{property.name}</h3>
                    <p className="text-sm text-gray-500">{property.full_address}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {property.unit_count} Wohneinheit{property.unit_count !== 1 ? 'en' : ''}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
