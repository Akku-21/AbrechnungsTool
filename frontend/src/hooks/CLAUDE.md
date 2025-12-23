# Hooks Module

Custom React hooks for data fetching with TanStack React Query.

## Pattern

Each entity has a hook file with:
- `use{Entity}s()`: List query
- `use{Entity}(id)`: Single item query
- `useCreate{Entity}()`: Create mutation
- `useUpdate{Entity}()`: Update mutation
- `useDelete{Entity}()`: Delete mutation

## Example Hook

```typescript
// hooks/useProperties.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchProperties, createProperty } from '@/lib/api/properties'

// List query
export function useProperties() {
  return useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
  })
}

// Create mutation with cache invalidation
export function useCreateProperty() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createProperty,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
    },
  })
}
```

## Available Hooks

| Hook | Purpose |
|------|---------|
| `useProperties` | Property list and CRUD |
| `useUnits(propertyId)` | Units for a property |
| `useTenants(unitId)` | Tenants for a unit |
| `useSettlements` | Settlement list and CRUD |
| `useDocuments(settlementId)` | Documents for settlement |
| `useInvoices(settlementId)` | Invoices for settlement |
| `useSettings` | App settings |

## Usage in Components

```typescript
function PropertyList() {
  const { data: properties, isLoading, error } = useProperties()
  const createMutation = useCreateProperty()

  if (isLoading) return <Spinner />
  if (error) return <Error message={error.message} />

  return (
    <div>
      {properties.map(p => <PropertyCard key={p.id} property={p} />)}
      <button onClick={() => createMutation.mutate(newPropertyData)}>
        Add
      </button>
    </div>
  )
}
```

## Query Keys

Consistent query key structure for cache management:
```typescript
['properties']                    // All properties
['properties', id]                // Single property
['settlements']                   // All settlements
['settlements', id]               // Single settlement
['settlements', id, 'documents']  // Documents for settlement
['settlements', id, 'invoices']   // Invoices for settlement
```

## Adding a New Hook

1. Create `hooks/useNewEntity.ts`
2. Create API functions in `lib/api/newEntity.ts`
3. Define query keys consistently
4. Add cache invalidation in mutations
