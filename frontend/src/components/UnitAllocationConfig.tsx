'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { ALLOCATION_METHOD_LABELS } from '@/lib/constants'
import { useUnitAllocations, useBulkUpsertUnitAllocations } from '@/hooks/useUnitAllocations'
import {
  AllocationMethod,
  CostCategory,
  COST_CATEGORY_LABELS,
  UnitAllocation,
  UnitAllocationCreate,
} from '@/types'
import { Save, Settings, RotateCcw } from 'lucide-react'

const ALL_COST_CATEGORIES: CostCategory[] = [
  'GRUNDSTEUER',
  'WASSERVERSORGUNG',
  'ENTWAESSERUNG',
  'HEIZUNG',
  'WARMWASSER',
  'VERBUNDENE_ANLAGEN',
  'AUFZUG',
  'STRASSENREINIGUNG',
  'GEBAEUDEREINIGUNG',
  'GARTENPFLEGE',
  'BELEUCHTUNG',
  'SCHORNSTEINREINIGUNG',
  'VERSICHERUNG',
  'HAUSWART',
  'ANTENNE_KABEL',
  'WAESCHEPFLEGE',
  'SONSTIGE',
]

const ALL_ALLOCATION_METHODS: AllocationMethod[] = [
  'WOHNFLAECHE',
  'PERSONENZAHL',
  'EINHEIT',
  'VERBRAUCH',
  'MITEIGENTUMSANTEIL',
]

interface CategoryConfig {
  method: AllocationMethod
  percentage: string
  customValue: string
  isCustom: boolean
}

type AllocationState = Record<CostCategory, CategoryConfig>

interface UnitAllocationConfigProps {
  unitId: string
  unitAreaSqm: number
  propertyTotalAreaSqm: number
}

export default function UnitAllocationConfig({
  unitId,
  unitAreaSqm,
  propertyTotalAreaSqm,
}: UnitAllocationConfigProps) {
  const { data: allocations, isLoading } = useUnitAllocations(unitId)
  const bulkUpsert = useBulkUpsertUnitAllocations()

  const defaultPercentage =
    propertyTotalAreaSqm > 0
      ? ((unitAreaSqm / propertyTotalAreaSqm) * 100).toFixed(3)
      : '0.000'

  const [config, setConfig] = useState<AllocationState | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    if (allocations === undefined) return

    const allocationsByCategory = new Map<CostCategory, UnitAllocation>(
      allocations.map((a) => [a.cost_category, a])
    )

    const initial = {} as AllocationState
    for (const category of ALL_COST_CATEGORIES) {
      const existing = allocationsByCategory.get(category)
      if (existing) {
        initial[category] = {
          method: existing.allocation_method,
          percentage: (existing.allocation_percentage * 100).toFixed(3),
          customValue: existing.custom_value?.toString() || '',
          isCustom: true,
        }
      } else {
        initial[category] = {
          method: 'WOHNFLAECHE',
          percentage: defaultPercentage,
          customValue: '',
          isCustom: false,
        }
      }
    }
    setConfig(initial as AllocationState)
    setHasChanges(false)
  }, [allocations, defaultPercentage])

  const handleMethodChange = (category: CostCategory, method: AllocationMethod) => {
    if (!config) return

    const isDefault = method === 'WOHNFLAECHE'
    setConfig({
      ...config,
      [category]: {
        ...config[category],
        method,
        percentage: isDefault ? defaultPercentage : config[category].percentage === defaultPercentage ? '' : config[category].percentage,
        isCustom: !isDefault,
      },
    })
    setHasChanges(true)
  }

  const handlePercentageChange = (category: CostCategory, value: string) => {
    if (!config) return

    setConfig({
      ...config,
      [category]: {
        ...config[category],
        percentage: value,
      },
    })
    setHasChanges(true)
  }

  const handleCustomValueChange = (category: CostCategory, value: string) => {
    if (!config) return

    setConfig({
      ...config,
      [category]: {
        ...config[category],
        customValue: value,
      },
    })
    setHasChanges(true)
  }

  const handleResetCategory = (category: CostCategory) => {
    if (!config) return

    setConfig({
      ...config,
      [category]: {
        method: 'WOHNFLAECHE',
        percentage: defaultPercentage,
        customValue: '',
        isCustom: false,
      },
    })
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!config) return

    const entries = Object.entries(config) as [CostCategory, CategoryConfig][]
    const customAllocations: UnitAllocationCreate[] = entries
      .filter(([, cfg]) => cfg.isCustom && cfg.method !== 'WOHNFLAECHE')
      .map(([category, cfg]) => ({
        unit_id: unitId,
        cost_category: category,
        allocation_method: cfg.method,
        allocation_percentage: parseFloat(cfg.percentage) / 100,
        custom_value: cfg.customValue ? parseFloat(cfg.customValue) : undefined,
      }))

    await bulkUpsert.mutateAsync({ unitId, data: customAllocations })
    setHasChanges(false)
  }

  if (isLoading || !config) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Verteilerschlüssel
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Laden...</p>
        </CardContent>
      </Card>
    )
  }

  const customCount = (Object.values(config) as CategoryConfig[]).filter((c) => c.isCustom).length

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Verteilerschlüssel
          </CardTitle>
          <CardDescription>
            Kostenverteilung pro Kategorie konfigurieren.
            Standard: Wohnfläche ({defaultPercentage}%).
            {customCount > 0 && ` ${customCount} individuelle Zuordnung${customCount > 1 ? 'en' : ''}.`}
          </CardDescription>
        </div>
        {hasChanges && (
          <Button onClick={handleSave} disabled={bulkUpsert.isPending}>
            <Save className="mr-2 h-4 w-4" />
            Speichern
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium">Kostenart</th>
                <th className="pb-2 font-medium">Verteilung</th>
                <th className="pb-2 font-medium">Anteil (%)</th>
                <th className="pb-2 font-medium">Verbrauchswert</th>
                <th className="pb-2 font-medium w-10"></th>
              </tr>
            </thead>
            <tbody>
              {ALL_COST_CATEGORIES.map((category) => {
                const cfg = config[category]
                const isDefault = !cfg.isCustom
                const showCustomValue = cfg.method === 'VERBRAUCH'

                return (
                  <tr
                    key={category}
                    className={`border-b ${isDefault ? 'text-muted-foreground' : ''}`}
                  >
                    <td className="py-2 pr-4">
                      {COST_CATEGORY_LABELS[category]}
                    </td>
                    <td className="py-2 pr-4">
                      <select
                        value={cfg.method}
                        onChange={(e) =>
                          handleMethodChange(category, e.target.value as AllocationMethod)
                        }
                        className={`w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm ${
                          isDefault ? 'text-muted-foreground' : ''
                        }`}
                      >
                        {ALL_ALLOCATION_METHODS.map((method) => (
                          <option key={method} value={method}>
                            {ALLOCATION_METHOD_LABELS[method]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2 pr-4">
                      {isDefault ? (
                        <span className="text-sm">{defaultPercentage}%</span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            step="0.001"
                            min="0"
                            max="100"
                            value={cfg.percentage}
                            onChange={(e) =>
                              handlePercentageChange(category, e.target.value)
                            }
                            className="w-24 h-8 text-sm"
                          />
                          <span className="text-sm text-muted-foreground">%</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2 pr-4">
                      {showCustomValue ? (
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={cfg.customValue}
                          onChange={(e) =>
                            handleCustomValueChange(category, e.target.value)
                          }
                          className="w-24 h-8 text-sm"
                          placeholder="z.B. kWh"
                        />
                      ) : (
                        <span className="text-sm text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="py-2">
                      {!isDefault && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleResetCategory(category)}
                          title="Auf Wohnfläche zurücksetzen"
                        >
                          <RotateCcw className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
