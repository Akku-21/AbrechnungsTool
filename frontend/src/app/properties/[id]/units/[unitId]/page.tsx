'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { useUnit, useUpdateUnit } from '@/hooks/useUnits'
import { useProperty } from '@/hooks/useProperties'
import { useTenants, useCreateTenant, useDeleteTenant, useMoveOutTenant } from '@/hooks/useTenants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import {
  ArrowLeft,
  Edit,
  Plus,
  Home,
  User,
  Trash2,
  Save,
  X,
  Calendar,
  Mail,
  Phone,
  LogOut,
} from 'lucide-react'
import { formatArea, formatCurrency, formatDate } from '@/lib/utils'
import { TenantCreate } from '@/types'

export default function UnitDetailPage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>
}) {
  const { id: propertyId, unitId } = use(params)
  const { data: unit, isLoading: unitLoading } = useUnit(unitId)
  const { data: property } = useProperty(propertyId)
  const { data: tenants, isLoading: tenantsLoading } = useTenants(unitId)
  const updateUnit = useUpdateUnit()
  const createTenant = useCreateTenant()
  const deleteTenant = useDeleteTenant()
  const moveOutTenant = useMoveOutTenant()

  const [isEditing, setIsEditing] = useState(false)
  const [showTenantForm, setShowTenantForm] = useState(false)
  const [moveOutDate, setMoveOutDate] = useState<string>('')
  const [tenantToMoveOut, setTenantToMoveOut] = useState<string | null>(null)

  // Unit edit form state
  const [editForm, setEditForm] = useState({
    designation: '',
    area_sqm: '',
    floor: '',
    rooms: '',
    has_balcony: false,
    has_garden: false,
  })

  // New tenant form state
  const [tenantForm, setTenantForm] = useState<TenantCreate>({
    unit_id: unitId,
    first_name: '',
    last_name: '',
    salutation: '',
    email: '',
    phone: '',
    move_in_date: '',
    resident_count: 1,
    monthly_prepayment: undefined,
  })

  const startEditing = () => {
    if (unit) {
      setEditForm({
        designation: unit.designation,
        area_sqm: unit.area_sqm.toString(),
        floor: unit.floor?.toString() || '',
        rooms: unit.rooms?.toString() || '',
        has_balcony: unit.has_balcony,
        has_garden: unit.has_garden,
      })
      setIsEditing(true)
    }
  }

  const handleSaveUnit = async () => {
    await updateUnit.mutateAsync({
      id: unitId,
      data: {
        designation: editForm.designation,
        area_sqm: parseFloat(editForm.area_sqm),
        floor: editForm.floor ? parseInt(editForm.floor) : undefined,
        rooms: editForm.rooms ? parseFloat(editForm.rooms) : undefined,
        has_balcony: editForm.has_balcony,
        has_garden: editForm.has_garden,
      },
    })
    setIsEditing(false)
  }

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault()
    await createTenant.mutateAsync({
      ...tenantForm,
      monthly_prepayment: tenantForm.monthly_prepayment
        ? Number(tenantForm.monthly_prepayment)
        : undefined,
    })
    setShowTenantForm(false)
    setTenantForm({
      unit_id: unitId,
      first_name: '',
      last_name: '',
      salutation: '',
      email: '',
      phone: '',
      move_in_date: '',
      resident_count: 1,
      monthly_prepayment: undefined,
    })
  }

  const handleDeleteTenant = async (tenantId: string, name: string) => {
    if (confirm(`Möchten Sie den Mieter "${name}" wirklich löschen?`)) {
      await deleteTenant.mutateAsync(tenantId)
    }
  }

  const handleMoveOut = async (tenantId: string) => {
    if (moveOutDate) {
      await moveOutTenant.mutateAsync({ id: tenantId, moveOutDate })
      setTenantToMoveOut(null)
      setMoveOutDate('')
    }
  }

  if (unitLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  if (!unit) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Wohneinheit nicht gefunden</p>
      </div>
    )
  }

  const activeTenants = tenants?.filter((t) => t.is_active && !t.move_out_date) || []
  const pastTenants = tenants?.filter((t) => !t.is_active || t.move_out_date) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href={`/properties/${propertyId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <p className="text-sm text-muted-foreground">
              {property?.name} • {property?.full_address}
            </p>
            <h1 className="text-3xl font-bold text-gray-900">{unit.designation}</h1>
          </div>
        </div>
        {!isEditing && (
          <Button variant="outline" onClick={startEditing}>
            <Edit className="mr-2 h-4 w-4" />
            Bearbeiten
          </Button>
        )}
      </div>

      {/* Unit Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            Wohneinheit-Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="designation">Bezeichnung</Label>
                  <Input
                    id="designation"
                    value={editForm.designation}
                    onChange={(e) => setEditForm({ ...editForm, designation: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="area_sqm">Fläche (m²)</Label>
                  <Input
                    id="area_sqm"
                    type="number"
                    step="0.01"
                    value={editForm.area_sqm}
                    onChange={(e) => setEditForm({ ...editForm, area_sqm: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="floor">Stockwerk</Label>
                  <Input
                    id="floor"
                    type="number"
                    value={editForm.floor}
                    onChange={(e) => setEditForm({ ...editForm, floor: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="rooms">Zimmer</Label>
                  <Input
                    id="rooms"
                    type="number"
                    step="0.5"
                    value={editForm.rooms}
                    onChange={(e) => setEditForm({ ...editForm, rooms: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.has_balcony}
                    onChange={(e) => setEditForm({ ...editForm, has_balcony: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Balkon
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={editForm.has_garden}
                    onChange={(e) => setEditForm({ ...editForm, has_garden: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  Garten
                </label>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleSaveUnit} disabled={updateUnit.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  Speichern
                </Button>
                <Button variant="outline" onClick={() => setIsEditing(false)}>
                  <X className="mr-2 h-4 w-4" />
                  Abbrechen
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-muted-foreground">Fläche</p>
                <p className="text-lg font-medium">{formatArea(unit.area_sqm)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Stockwerk</p>
                <p className="text-lg font-medium">
                  {unit.floor !== null && unit.floor !== undefined ? `${unit.floor}. Stock` : '-'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Zimmer</p>
                <p className="text-lg font-medium">{unit.rooms || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ausstattung</p>
                <p className="text-lg font-medium">
                  {[unit.has_balcony && 'Balkon', unit.has_garden && 'Garten']
                    .filter(Boolean)
                    .join(', ') || '-'}
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Active Tenants */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Aktuelle Mieter</CardTitle>
            <CardDescription>Derzeit in dieser Wohneinheit wohnend</CardDescription>
          </div>
          <Button onClick={() => setShowTenantForm(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Mieter hinzufügen
          </Button>
        </CardHeader>
        <CardContent>
          {showTenantForm && (
            <form onSubmit={handleCreateTenant} className="mb-6 p-4 border rounded-lg bg-gray-50">
              <h4 className="font-medium mb-4">Neuer Mieter</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="salutation">Anrede</Label>
                  <select
                    id="salutation"
                    value={tenantForm.salutation}
                    onChange={(e) => setTenantForm({ ...tenantForm, salutation: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                  >
                    <option value="">Bitte wählen</option>
                    <option value="Herr">Herr</option>
                    <option value="Frau">Frau</option>
                    <option value="Divers">Divers</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="first_name">Vorname *</Label>
                  <Input
                    id="first_name"
                    value={tenantForm.first_name}
                    onChange={(e) => setTenantForm({ ...tenantForm, first_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last_name">Nachname *</Label>
                  <Input
                    id="last_name"
                    value={tenantForm.last_name}
                    onChange={(e) => setTenantForm({ ...tenantForm, last_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-Mail</Label>
                  <Input
                    id="email"
                    type="email"
                    value={tenantForm.email}
                    onChange={(e) => setTenantForm({ ...tenantForm, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={tenantForm.phone}
                    onChange={(e) => setTenantForm({ ...tenantForm, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="move_in_date">Einzugsdatum *</Label>
                  <Input
                    id="move_in_date"
                    type="date"
                    value={tenantForm.move_in_date}
                    onChange={(e) => setTenantForm({ ...tenantForm, move_in_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resident_count">Anzahl Bewohner</Label>
                  <Input
                    id="resident_count"
                    type="number"
                    min="1"
                    value={tenantForm.resident_count}
                    onChange={(e) =>
                      setTenantForm({ ...tenantForm, resident_count: parseInt(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="monthly_prepayment">Monatliche Vorauszahlung (EUR)</Label>
                  <Input
                    id="monthly_prepayment"
                    type="number"
                    step="0.01"
                    value={tenantForm.monthly_prepayment || ''}
                    onChange={(e) =>
                      setTenantForm({
                        ...tenantForm,
                        monthly_prepayment: e.target.value ? parseFloat(e.target.value) : undefined,
                      })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button type="submit" disabled={createTenant.isPending}>
                  <Save className="mr-2 h-4 w-4" />
                  Speichern
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowTenantForm(false)}>
                  <X className="mr-2 h-4 w-4" />
                  Abbrechen
                </Button>
              </div>
            </form>
          )}

          {tenantsLoading ? (
            <p className="text-muted-foreground">Laden...</p>
          ) : activeTenants.length === 0 ? (
            <div className="text-center py-6">
              <User className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">Keine aktiven Mieter</h3>
              <p className="mt-1 text-sm text-gray-500">Diese Wohneinheit steht derzeit leer.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {activeTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-green-100 rounded-full">
                      <User className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-medium">
                        {tenant.salutation} {tenant.full_name}
                      </h4>
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          Einzug: {formatDate(tenant.move_in_date)}
                        </span>
                        {tenant.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-4 w-4" />
                            {tenant.email}
                          </span>
                        )}
                        {tenant.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-4 w-4" />
                            {tenant.phone}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-4 text-sm mt-1">
                        <span>{tenant.resident_count} Bewohner</span>
                        {tenant.monthly_prepayment && (
                          <span>
                            Vorauszahlung: {formatCurrency(tenant.monthly_prepayment)}/Monat
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tenantToMoveOut === tenant.id ? (
                      <div className="flex items-center gap-2">
                        <Input
                          type="date"
                          value={moveOutDate}
                          onChange={(e) => setMoveOutDate(e.target.value)}
                          className="w-40"
                        />
                        <Button
                          size="sm"
                          onClick={() => handleMoveOut(tenant.id)}
                          disabled={!moveOutDate || moveOutTenant.isPending}
                        >
                          Bestätigen
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setTenantToMoveOut(null)
                            setMoveOutDate('')
                          }}
                        >
                          Abbrechen
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTenantToMoveOut(tenant.id)}
                        >
                          <LogOut className="mr-2 h-4 w-4" />
                          Auszug
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteTenant(tenant.id, tenant.full_name)}
                          disabled={deleteTenant.isPending}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Past Tenants */}
      {pastTenants.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Ehemalige Mieter</CardTitle>
            <CardDescription>Frühere Bewohner dieser Wohneinheit</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pastTenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-gray-50"
                >
                  <div className="flex items-center gap-4">
                    <div className="p-2 bg-gray-200 rounded-full">
                      <User className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-600">
                        {tenant.salutation} {tenant.full_name}
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(tenant.move_in_date)} -{' '}
                        {tenant.move_out_date ? formatDate(tenant.move_out_date) : 'unbekannt'}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteTenant(tenant.id, tenant.full_name)}
                    disabled={deleteTenant.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
