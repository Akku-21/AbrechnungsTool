'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Settings, Shield, Building2, Loader2, Check } from 'lucide-react'
import { useSettings, useUpdateSettings } from '@/hooks/useSettings'

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings()
  const updateSettings = useUpdateSettings()

  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    company_street: '',
    company_postal_code: '',
    company_city: '',
  })

  const [allocationForm, setAllocationForm] = useState({
    default_allocation_percentage: '100',
  })

  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settings) {
      setCompanyForm({
        company_name: settings.company_name,
        company_street: settings.company_street,
        company_postal_code: settings.company_postal_code,
        company_city: settings.company_city,
      })
      setAllocationForm({
        default_allocation_percentage: settings.default_allocation_percentage,
      })
    }
  }, [settings])

  const handleSaveCompany = async () => {
    await updateSettings.mutateAsync(companyForm)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSaveAllocation = async () => {
    await updateSettings.mutateAsync(allocationForm)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Einstellungen</h1>
          <p className="text-gray-500 mt-1">Anwendungseinstellungen verwalten</p>
        </div>
        {saved && (
          <div className="flex items-center gap-2 text-green-600">
            <Check className="h-5 w-5" />
            <span>Gespeichert</span>
          </div>
        )}
      </div>

      <div className="grid gap-6">
        {/* Vermieter/Firma */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Vermieter / Firma</CardTitle>
                <CardDescription>Absenderangaben für Abrechnungen</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name">Name / Firma</Label>
                <Input
                  id="company_name"
                  value={companyForm.company_name}
                  onChange={(e) => setCompanyForm({ ...companyForm, company_name: e.target.value })}
                  placeholder="Max Mustermann"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_street">Straße und Hausnummer</Label>
                <Input
                  id="company_street"
                  value={companyForm.company_street}
                  onChange={(e) => setCompanyForm({ ...companyForm, company_street: e.target.value })}
                  placeholder="Musterstraße 1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_postal_code">PLZ</Label>
                <Input
                  id="company_postal_code"
                  value={companyForm.company_postal_code}
                  onChange={(e) => setCompanyForm({ ...companyForm, company_postal_code: e.target.value })}
                  placeholder="12345"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_city">Stadt</Label>
                <Input
                  id="company_city"
                  value={companyForm.company_city}
                  onChange={(e) => setCompanyForm({ ...companyForm, company_city: e.target.value })}
                  placeholder="Musterstadt"
                />
              </div>
            </div>
            <Button
              onClick={handleSaveCompany}
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Speichern
            </Button>
          </CardContent>
        </Card>

        {/* Standard-Umlage */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Settings className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Kostenverteilung</CardTitle>
                <CardDescription>Standardwerte für neue Rechnungen</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-xs space-y-2">
              <Label htmlFor="default_allocation">Standard-Umlageanteil (%)</Label>
              <Input
                id="default_allocation"
                type="number"
                min="0"
                max="100"
                value={allocationForm.default_allocation_percentage}
                onChange={(e) => setAllocationForm({ default_allocation_percentage: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Dieser Wert wird für neue Rechnungen vorausgefüllt.
                100% bedeutet, dass die gesamten Kosten auf Mieter umgelegt werden.
              </p>
            </div>
            <Button
              onClick={handleSaveAllocation}
              disabled={updateSettings.isPending}
            >
              {updateSettings.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              Speichern
            </Button>
          </CardContent>
        </Card>

        {/* PDF-Signatur Status */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle>PDF-Signatur</CardTitle>
                <CardDescription>Digitale Signatur für exportierte PDFs</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">Status:</span>
              {settings?.signing_enabled ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Aktiv
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  Nicht konfiguriert
                </span>
              )}
            </div>
            {settings?.signing_enabled && settings.signing_cert_path && (
              <div className="text-sm text-muted-foreground">
                <p>Zertifikat: <code className="bg-gray-100 px-1 rounded">{settings.signing_cert_path}</code></p>
              </div>
            )}
            <p className="text-xs text-muted-foreground">
              {settings?.signing_enabled
                ? 'PDFs werden automatisch bei Export digital signiert.'
                : 'Um PDFs zu signieren, konfigurieren Sie SIGNING_CERT_PATH und SIGNING_CERT_PASSWORD in den Umgebungsvariablen.'}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
