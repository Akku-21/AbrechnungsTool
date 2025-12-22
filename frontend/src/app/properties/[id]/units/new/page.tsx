'use client'

import { use } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProperty } from '@/hooks/useProperties'
import { useCreateUnit } from '@/hooks/useUnits'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const unitSchema = z.object({
  designation: z.string().min(1, 'Bezeichnung ist erforderlich'),
  area_sqm: z.coerce.number().positive('Fläche muss größer als 0 sein'),
  floor: z.coerce.number().optional(),
  rooms: z.coerce.number().positive().optional(),
  has_balcony: z.boolean().default(false),
  has_garden: z.boolean().default(false),
})

type UnitFormData = z.infer<typeof unitSchema>

export default function NewUnitPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id: propertyId } = use(params)
  const router = useRouter()
  const { data: property, isLoading } = useProperty(propertyId)
  const createUnit = useCreateUnit()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<UnitFormData>({
    resolver: zodResolver(unitSchema),
    defaultValues: {
      has_balcony: false,
      has_garden: false,
    },
  })

  const onSubmit = async (data: UnitFormData) => {
    try {
      await createUnit.mutateAsync({
        property_id: propertyId,
        ...data,
      })
      router.push(`/properties/${propertyId}`)
    } catch (error) {
      console.error('Fehler beim Erstellen:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/properties/${propertyId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Neue Wohneinheit</h1>
          <p className="text-gray-500 mt-1">
            Für: {property?.name}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Wohneinheitsdaten</CardTitle>
          <CardDescription>
            Geben Sie die Daten der Wohneinheit ein
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="designation">Bezeichnung</Label>
              <Input
                id="designation"
                placeholder="z.B. Wohnung 1 oder EG links"
                {...register('designation')}
              />
              {errors.designation && (
                <p className="text-sm text-destructive">{errors.designation.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="area_sqm">Wohnfläche (m²)</Label>
                <Input
                  id="area_sqm"
                  type="number"
                  step="0.01"
                  placeholder="75.00"
                  {...register('area_sqm')}
                />
                {errors.area_sqm && (
                  <p className="text-sm text-destructive">{errors.area_sqm.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="rooms">Zimmer</Label>
                <Input
                  id="rooms"
                  type="number"
                  step="0.5"
                  placeholder="3"
                  {...register('rooms')}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="floor">Stockwerk</Label>
              <Input
                id="floor"
                type="number"
                placeholder="0 = EG, 1 = 1. OG"
                {...register('floor')}
              />
            </div>

            <div className="flex gap-6">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  {...register('has_balcony')}
                />
                <span className="text-sm">Balkon vorhanden</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-gray-300"
                  {...register('has_garden')}
                />
                <span className="text-sm">Garten vorhanden</span>
              </label>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Speichern...' : 'Wohneinheit anlegen'}
              </Button>
              <Link href={`/properties/${propertyId}`}>
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
