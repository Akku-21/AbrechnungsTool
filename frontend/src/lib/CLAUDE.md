# Lib Module

Utilities, API client, and helper functions.

## Structure

```
lib/
├── api/
│   ├── client.ts      # Axios instance configuration
│   ├── properties.ts  # Property API functions
│   ├── units.ts
│   ├── tenants.ts
│   ├── settlements.ts
│   ├── documents.ts
│   ├── invoices.ts
│   └── settings.ts
└── utils.ts           # Utility functions
```

## API Client (`api/client.ts`)

Configured Axios instance for backend communication.

```typescript
import axios from 'axios'

const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1',
  headers: { 'Content-Type': 'application/json' },
})

// Error logging interceptor
apiClient.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error.response?.data)
    return Promise.reject(error)
  }
)

export default apiClient
```

## API Function Pattern

```typescript
// lib/api/properties.ts
import apiClient from './client'
import type { Property, PropertyCreate } from '@/types'

export async function fetchProperties(): Promise<Property[]> {
  const { data } = await apiClient.get('/properties')
  return data
}

export async function createProperty(property: PropertyCreate): Promise<Property> {
  const { data } = await apiClient.post('/properties', property)
  return data
}

export async function updateProperty(id: string, property: Partial<Property>): Promise<Property> {
  const { data } = await apiClient.patch(`/properties/${id}`, property)
  return data
}

export async function deleteProperty(id: string): Promise<void> {
  await apiClient.delete(`/properties/${id}`)
}
```

## File Upload

```typescript
// lib/api/documents.ts
export async function uploadDocument(settlementId: string, file: File) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('settlement_id', settlementId)

  const { data } = await apiClient.post('/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return data
}
```

## Utilities (`utils.ts`)

```typescript
// German number formatting
export function formatEuro(amount: number): string {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount)
}

// German date formatting
export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('de-DE').format(new Date(date))
}

// cn() for Tailwind class merging (from shadcn)
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
```

## Adding a New API Module

1. Create `lib/api/newEntity.ts`
2. Export CRUD functions
3. Create corresponding hook in `hooks/`
