'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Building2, Loader2, Check, Sparkles, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useSettings, useUpdateSettings, useRecommendedModels, useTestOpenRouter } from '@/hooks/useSettings'
import { SignatureConfig } from '@/components/signature'

export default function SettingsPage() {
  const { data: settings, isLoading } = useSettings()
  const { data: recommendedModels } = useRecommendedModels()
  const updateSettings = useUpdateSettings()
  const testConnection = useTestOpenRouter()

  const [companyForm, setCompanyForm] = useState({
    company_name: '',
    company_street: '',
    company_postal_code: '',
    company_city: '',
  })

  const [llmForm, setLlmForm] = useState({
    openrouter_api_key: '',
    openrouter_model: '',
    llm_correction_enabled: false,
  })

  const [showApiKey, setShowApiKey] = useState(false)
  const [saved, setSaved] = useState(false)
  const [llmSaved, setLlmSaved] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    if (settings) {
      setCompanyForm({
        company_name: settings.company_name,
        company_street: settings.company_street,
        company_postal_code: settings.company_postal_code,
        company_city: settings.company_city,
      })
      setLlmForm({
        openrouter_api_key: '', // Never pre-fill API key
        openrouter_model: settings.openrouter_model || '',
        llm_correction_enabled: settings.llm_correction_enabled,
      })
    }
  }, [settings])

  const handleSaveCompany = async () => {
    await updateSettings.mutateAsync(companyForm)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleSaveLlm = async () => {
    const updateData: Record<string, unknown> = {
      openrouter_model: llmForm.openrouter_model,
      llm_correction_enabled: llmForm.llm_correction_enabled,
    }
    // Only send API key if it was changed (not empty)
    if (llmForm.openrouter_api_key) {
      updateData.openrouter_api_key = llmForm.openrouter_api_key
    }
    await updateSettings.mutateAsync(updateData)
    setLlmSaved(true)
    setTimeout(() => setLlmSaved(false), 2000)
    // Clear the API key field after saving
    setLlmForm(prev => ({ ...prev, openrouter_api_key: '' }))
    setTestResult(null)
  }

  const handleTestConnection = async () => {
    setTestResult(null)
    const result = await testConnection.mutateAsync({
      api_key: llmForm.openrouter_api_key || undefined,
      model: llmForm.openrouter_model || undefined,
    })
    setTestResult(result)
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
                <CardDescription>Absenderangaben fuer Abrechnungen</CardDescription>
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
                <Label htmlFor="company_street">Strasse und Hausnummer</Label>
                <Input
                  id="company_street"
                  value={companyForm.company_street}
                  onChange={(e) => setCompanyForm({ ...companyForm, company_street: e.target.value })}
                  placeholder="Musterstrasse 1"
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

        {/* OCR & KI-Korrektur */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Sparkles className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <CardTitle>OCR & KI-Korrektur</CardTitle>
                <CardDescription>
                  Optionale LLM-basierte Korrektur von OCR-Fehlern via OpenRouter
                </CardDescription>
              </div>
              {llmSaved && (
                <div className="flex items-center gap-2 text-green-600">
                  <Check className="h-5 w-5" />
                  <span className="text-sm">Gespeichert</span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* API-Key */}
            <div className="space-y-2">
              <Label htmlFor="openrouter_api_key">OpenRouter API-Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="openrouter_api_key"
                    type={showApiKey ? 'text' : 'password'}
                    value={llmForm.openrouter_api_key}
                    onChange={(e) => setLlmForm({ ...llmForm, openrouter_api_key: e.target.value })}
                    placeholder={settings?.openrouter_api_key_set ? '••••••••••••••••' : 'sk-or-v1-...'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Holen Sie sich einen API-Key unter{' '}
                <a href="https://openrouter.ai/keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  openrouter.ai/keys
                </a>
                {settings?.openrouter_api_key_set && (
                  <span className="ml-2 text-green-600">(Key hinterlegt)</span>
                )}
              </p>
            </div>

            {/* Model Selection */}
            <div className="space-y-2">
              <Label htmlFor="openrouter_model">Modell</Label>
              <select
                id="openrouter_model"
                value={llmForm.openrouter_model}
                onChange={(e) => setLlmForm({ ...llmForm, openrouter_model: e.target.value })}
                className="w-full h-10 px-3 rounded-md border border-input bg-background text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <option value="">-- Modell auswaehlen --</option>
                {recommendedModels?.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                Claude Sonnet 4.5 bietet die beste Qualitaet, Gemini Flash ist am schnellsten und guenstigsten.
              </p>
            </div>

            {/* Enable Toggle */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">KI-Korrektur aktivieren</Label>
                <p className="text-sm text-muted-foreground">
                  OCR-Text wird automatisch durch ein LLM korrigiert
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={llmForm.llm_correction_enabled}
                  onChange={(e) => setLlmForm({ ...llmForm, llm_correction_enabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>

            {/* Test Connection */}
            {testResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg ${testResult.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                {testResult.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600" />
                )}
                <span className="text-sm">{testResult.message}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                onClick={handleSaveLlm}
                disabled={updateSettings.isPending}
              >
                {updateSettings.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Speichern
              </Button>
              <Button
                variant="outline"
                onClick={handleTestConnection}
                disabled={testConnection.isPending || (!llmForm.openrouter_api_key && !settings?.openrouter_api_key_set)}
              >
                {testConnection.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Verbindung testen
              </Button>
            </div>

            {/* Cost Info */}
            <div className="text-xs text-muted-foreground border-t pt-4">
              <p className="font-medium mb-1">Geschaetzte Kosten pro Rechnung:</p>
              <ul className="space-y-0.5">
                <li>Claude Sonnet 4.5: ~0,012 USD</li>
                <li>Claude 3.5 Haiku: ~0,003 USD</li>
                <li>GPT-4o Mini: ~0,001 USD</li>
                <li>Gemini 2.5 Flash: ~0,0003 USD</li>
                <li>Llama 3.3 70B: ~0,0006 USD</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* PDF-Signatur Konfiguration */}
        <SignatureConfig />
      </div>
    </div>
  )
}
