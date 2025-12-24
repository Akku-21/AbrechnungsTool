'use client'

import Link from 'next/link'
import { useTenants } from '@/hooks/useTenants'
import { useProperties } from '@/hooks/useProperties'
import { useUnits } from '@/hooks/useUnits'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { User, Search, Home, Calendar, Mail, Phone } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { fuzzyFilter } from '@/lib/fuzzySearch'
import { useState, useMemo } from 'react'

export default function TenantsPage() {
  const { data: tenants, isLoading: tenantsLoading } = useTenants()
  const { data: propertiesData } = useProperties()
  const { data: units } = useUnits()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all')

  const properties = propertiesData?.items || []

  const enrichedTenants = useMemo(() => {
    if (!tenants) return []

    return tenants.map((tenant) => {
      const unit = units?.find((u) => u.id === tenant.unit_id)
      const property = unit ? properties.find((p) => p.id === unit.property_id) : null

      return {
        ...tenant,
        unit,
        property,
        // Flattened fields for fuzzy search
        propertyName: property?.name || '',
        unitDesignation: unit?.designation || '',
      }
    })
  }, [tenants, units, properties])

  // First filter by active status
  const statusFilteredTenants = useMemo(() => {
    return enrichedTenants.filter((tenant) => {
      if (filterActive === 'active' && (!tenant.is_active || tenant.move_out_date)) return false
      if (filterActive === 'inactive' && tenant.is_active && !tenant.move_out_date) return false
      return true
    })
  }, [enrichedTenants, filterActive])

  // Then apply fuzzy search
  const filteredTenants = useMemo(() => {
    if (!searchTerm) return statusFilteredTenants

    return fuzzyFilter(
      statusFilteredTenants,
      ['full_name', 'email', 'propertyName', 'unitDesignation', 'phone'],
      searchTerm
    )
  }, [statusFilteredTenants, searchTerm])

  const activeTenants = enrichedTenants.filter((t) => t.is_active && !t.move_out_date)
  const inactiveTenants = enrichedTenants.filter((t) => !t.is_active || t.move_out_date)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mieter</h1>
          <p className="text-gray-500 mt-1">Übersicht aller Mieter</p>
        </div>
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
            <p className="text-2xl font-bold">{enrichedTenants.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aktive Mieter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{activeTenants.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ehemalige Mieter
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-500">{inactiveTenants.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Mietersuche</CardTitle>
          <CardDescription>Suchen und filtern Sie nach Mietern</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Suche nach Name, E-Mail, Liegenschaft..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={filterActive === 'all' ? 'default' : 'outline'}
                onClick={() => setFilterActive('all')}
                size="sm"
              >
                Alle
              </Button>
              <Button
                variant={filterActive === 'active' ? 'default' : 'outline'}
                onClick={() => setFilterActive('active')}
                size="sm"
              >
                Aktiv
              </Button>
              <Button
                variant={filterActive === 'inactive' ? 'default' : 'outline'}
                onClick={() => setFilterActive('inactive')}
                size="sm"
              >
                Ehemalig
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tenants List */}
      <Card>
        <CardHeader>
          <CardTitle>
            Mieterliste ({filteredTenants.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tenantsLoading ? (
            <p className="text-muted-foreground">Laden...</p>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-12">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">
                {searchTerm || filterActive !== 'all' ? 'Keine Mieter gefunden' : 'Keine Mieter vorhanden'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || filterActive !== 'all'
                  ? 'Versuchen Sie eine andere Suche oder Filter.'
                  : 'Mieter werden über die Wohneinheiten einer Liegenschaft angelegt.'}
              </p>
              {!searchTerm && filterActive === 'all' && (
                <div className="mt-6">
                  <Link href="/properties">
                    <Button>
                      <Home className="mr-2 h-4 w-4" />
                      Zu den Liegenschaften
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredTenants.map((tenant) => {
                const isActive = tenant.is_active && !tenant.move_out_date

                return (
                  <div
                    key={tenant.id}
                    className={`flex items-center justify-between p-4 border rounded-lg ${
                      isActive ? 'hover:bg-gray-50' : 'bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-2 rounded-full ${
                          isActive ? 'bg-green-100' : 'bg-gray-200'
                        }`}
                      >
                        <User
                          className={`h-5 w-5 ${
                            isActive ? 'text-green-600' : 'text-gray-500'
                          }`}
                        />
                      </div>
                      <div>
                        <h4 className={`font-medium ${!isActive && 'text-gray-500'}`}>
                          {tenant.salutation} {tenant.full_name}
                        </h4>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                          {tenant.property && tenant.unit && (
                            <span className="flex items-center gap-1">
                              <Home className="h-3 w-3" />
                              {tenant.property.name} - {tenant.unit.designation}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(tenant.move_in_date)}
                            {tenant.move_out_date && ` - ${formatDate(tenant.move_out_date)}`}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground mt-1">
                          {tenant.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {tenant.email}
                            </span>
                          )}
                          {tenant.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {tenant.phone}
                            </span>
                          )}
                          {tenant.monthly_prepayment && (
                            <span>
                              Vorauszahlung: {formatCurrency(tenant.monthly_prepayment)}/Monat
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {tenant.property && tenant.unit && (
                        <Link
                          href={`/properties/${tenant.property.id}/units/${tenant.unit.id}`}
                        >
                          <Button variant="outline" size="sm">
                            Zur Wohneinheit
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
