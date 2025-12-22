'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProperties } from '@/hooks/useProperties'
import { useCreateSettlement } from '@/hooks/useSettlements'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const settlementSchema = z.object({
  property_id: z.string().min(1, 'Liegenschaft ist erforderlich'),
  period_start: z.string().min(1, 'Startdatum ist erforderlich'),
  period_end: z.string().min(1, 'Enddatum ist erforderlich'),
  notes: z.string().optional(),
})

type SettlementFormData = z.infer<typeof settlementSchema>

export default function NewSettlementPage() {
  const router = useRouter()
  const { data: propertiesData, isLoading: propertiesLoading } = useProperties()
  const createSettlement = useCreateSettlement()

  const properties = propertiesData?.items || []

  const currentYear = new Date().getFullYear()
  const defaultStart = `${currentYear - 1}-01-01`
  const defaultEnd = `${currentYear - 1}-12-31`

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SettlementFormData>({
    resolver: zodResolver(settlementSchema),
    defaultValues: {
      period_start: defaultStart,
      period_end: defaultEnd,
    },
  })

  const onSubmit = async (data: SettlementFormData) => {
    try {
      const settlement = await createSettlement.mutateAsync(data)
      router.push(`/settlements/${settlement.id}`)
    } catch (error) {
      console.error('Fehler beim Erstellen:', error)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/settlements">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Neue Abrechnung</h1>
          <p className="text-gray-500 mt-1">Erstellen Sie eine neue Nebenkostenabrechnung</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Abrechnungsdaten</CardTitle>
          <CardDescription>
            Wählen Sie die Liegenschaft und den Abrechnungszeitraum
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="property_id">Liegenschaft</Label>
              {propertiesLoading ? (
                <p className="text-sm text-muted-foreground">Laden...</p>
              ) : properties.length === 0 ? (
                <div className="p-4 border rounded-lg bg-gray-50">
                  <p className="text-sm text-muted-foreground">
                    Keine Liegenschaften vorhanden.{' '}
                    <Link href="/properties/new" className="text-primary hover:underline">
                      Jetzt anlegen
                    </Link>
                  </p>
                </div>
              ) : (
                <select
                  id="property_id"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  {...register('property_id')}
                >
                  <option value="">Bitte wählen...</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name} - {property.full_address}
                    </option>
                  ))}
                </select>
              )}
              {errors.property_id && (
                <p className="text-sm text-destructive">{errors.property_id.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="period_start">Abrechnungszeitraum von</Label>
                <Input
                  id="period_start"
                  type="date"
                  {...register('period_start')}
                />
                {errors.period_start && (
                  <p className="text-sm text-destructive">{errors.period_start.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="period_end">bis</Label>
                <Input
                  id="period_end"
                  type="date"
                  {...register('period_end')}
                />
                {errors.period_end && (
                  <p className="text-sm text-destructive">{errors.period_end.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notizen (optional)</Label>
              <textarea
                id="notes"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                placeholder="Optionale Notizen zur Abrechnung..."
                {...register('notes')}
              />
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting || properties.length === 0}>
                {isSubmitting ? 'Erstellen...' : 'Abrechnung erstellen'}
              </Button>
              <Link href="/settlements">
                <Button type="button" variant="outline">
                  Abbrechen
                </Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
