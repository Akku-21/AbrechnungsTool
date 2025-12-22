'use client'

import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useCreateProperty } from '@/hooks/useProperties'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

const propertySchema = z.object({
  name: z.string().min(1, 'Name ist erforderlich'),
  street: z.string().min(1, 'Straße ist erforderlich'),
  house_number: z.string().min(1, 'Hausnummer ist erforderlich'),
  postal_code: z.string().min(5, 'PLZ muss mindestens 5 Zeichen haben'),
  city: z.string().min(1, 'Stadt ist erforderlich'),
  total_area_sqm: z.coerce.number().positive('Fläche muss größer als 0 sein'),
})

type PropertyFormData = z.infer<typeof propertySchema>

export default function NewPropertyPage() {
  const router = useRouter()
  const createProperty = useCreateProperty()

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
  })

  const onSubmit = async (data: PropertyFormData) => {
    try {
      const property = await createProperty.mutateAsync(data)
      router.push(`/properties/${property.id}`)
    } catch (error) {
      console.error('Fehler beim Erstellen:', error)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/properties">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Neue Liegenschaft</h1>
          <p className="text-gray-500 mt-1">Erstellen Sie eine neue Immobilie</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liegenschaftsdaten</CardTitle>
          <CardDescription>
            Geben Sie die Grunddaten der Liegenschaft ein
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name / Bezeichnung</Label>
              <Input
                id="name"
                placeholder="z.B. Musterstraße 1"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="street">Straße</Label>
                <Input
                  id="street"
                  placeholder="Musterstraße"
                  {...register('street')}
                />
                {errors.street && (
                  <p className="text-sm text-destructive">{errors.street.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="house_number">Hausnummer</Label>
                <Input
                  id="house_number"
                  placeholder="1"
                  {...register('house_number')}
                />
                {errors.house_number && (
                  <p className="text-sm text-destructive">{errors.house_number.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="postal_code">PLZ</Label>
                <Input
                  id="postal_code"
                  placeholder="12345"
                  {...register('postal_code')}
                />
                {errors.postal_code && (
                  <p className="text-sm text-destructive">{errors.postal_code.message}</p>
                )}
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="city">Stadt</Label>
                <Input
                  id="city"
                  placeholder="Musterstadt"
                  {...register('city')}
                />
                {errors.city && (
                  <p className="text-sm text-destructive">{errors.city.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="total_area_sqm">Gesamtwohnfläche (m²)</Label>
              <Input
                id="total_area_sqm"
                type="number"
                step="0.01"
                placeholder="150.00"
                {...register('total_area_sqm')}
              />
              {errors.total_area_sqm && (
                <p className="text-sm text-destructive">{errors.total_area_sqm.message}</p>
              )}
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Speichern...' : 'Liegenschaft anlegen'}
              </Button>
              <Link href="/properties">
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
