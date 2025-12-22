'use client'

import { use, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useProperty, useUpdateProperty } from '@/hooks/useProperties'
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

export default function EditPropertyPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const router = useRouter()
  const { data: property, isLoading } = useProperty(id)
  const updateProperty = useUpdateProperty()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<PropertyFormData>({
    resolver: zodResolver(propertySchema),
  })

  useEffect(() => {
    if (property) {
      reset({
        name: property.name,
        street: property.street,
        house_number: property.house_number,
        postal_code: property.postal_code,
        city: property.city,
        total_area_sqm: property.total_area_sqm,
      })
    }
  }, [property, reset])

  const onSubmit = async (data: PropertyFormData) => {
    try {
      await updateProperty.mutateAsync({ id, data })
      router.push(`/properties/${id}`)
    } catch (error) {
      console.error('Fehler beim Aktualisieren:', error)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Laden...</p>
      </div>
    )
  }

  if (!property) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-destructive">Liegenschaft nicht gefunden</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/properties/${id}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Liegenschaft bearbeiten</h1>
          <p className="text-gray-500 mt-1">{property.name}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Liegenschaftsdaten</CardTitle>
          <CardDescription>
            Bearbeiten Sie die Daten der Liegenschaft
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
              <Button type="submit" disabled={isSubmitting || updateProperty.isPending}>
                {isSubmitting || updateProperty.isPending ? 'Speichern...' : 'Änderungen speichern'}
              </Button>
              <Link href={`/properties/${id}`}>
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
