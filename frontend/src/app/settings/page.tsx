'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Settings, Shield, Bell, Database } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Einstellungen</h1>
        <p className="text-gray-500 mt-1">Anwendungseinstellungen verwalten</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Settings className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <CardTitle>Allgemein</CardTitle>
                <CardDescription>Grundlegende Einstellungen</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Allgemeine Einstellungen werden in einer zukünftigen Version verfügbar sein.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <Shield className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <CardTitle>PDF-Signatur</CardTitle>
                <CardDescription>Digitale Signatur konfigurieren</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">Status</span>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                Aktiv
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              PDFs werden automatisch bei Export signiert, wenn ein Zertifikat konfiguriert ist.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Bell className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <CardTitle>Benachrichtigungen</CardTitle>
                <CardDescription>E-Mail und Push-Einstellungen</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Benachrichtigungen werden in einer zukünftigen Version verfügbar sein.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Database className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <CardTitle>Daten</CardTitle>
                <CardDescription>Export und Backup</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Datenexport wird in einer zukünftigen Version verfügbar sein.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
