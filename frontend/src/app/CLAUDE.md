# App Directory

Next.js 15 App Router pages and layouts.

## Routing Structure

```
app/
├── layout.tsx              # Root layout (providers, sidebar, header)
├── page.tsx                # Dashboard (/)
├── globals.css             # Global styles
├── properties/
│   ├── page.tsx            # Property list (/properties)
│   ├── new/
│   │   └── page.tsx        # Create property (/properties/new)
│   └── [id]/
│       ├── page.tsx        # Property detail (/properties/:id)
│       ├── edit/
│       │   └── page.tsx    # Edit property (/properties/:id/edit)
│       └── units/
│           ├── new/
│           │   └── page.tsx  # New unit (/properties/:id/units/new)
│           └── [unitId]/
│               └── page.tsx  # Unit detail (/properties/:id/units/:unitId)
├── settlements/
│   ├── page.tsx            # Settlement list (/settlements)
│   ├── new/
│   │   └── page.tsx        # Create settlement (/settlements/new)
│   └── [id]/
│       └── page.tsx        # Settlement detail (/settlements/:id)
├── tenants/
│   └── page.tsx            # Tenant list (/tenants)
└── settings/
    └── page.tsx            # App settings (/settings)
```

## Page Pattern

```tsx
// app/properties/page.tsx
'use client'

import { useProperties } from '@/hooks/useProperties'

export default function PropertiesPage() {
  const { data: properties, isLoading } = useProperties()

  if (isLoading) return <div>Loading...</div>

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Liegenschaften</h1>
      {/* Content */}
    </div>
  )
}
```

## Dynamic Routes

```tsx
// app/properties/[id]/page.tsx
'use client'

import { useParams } from 'next/navigation'
import { useProperty } from '@/hooks/useProperties'

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { data: property } = useProperty(id)

  return <div>{property?.name}</div>
}
```

## Key Pages

### Dashboard (`page.tsx`)
- Property count, unit count, settlement count
- Recent settlements
- Quick actions

### Settlement Detail (`settlements/[id]/page.tsx`)
Main workflow page:
- Document upload (drag & drop)
- OCR results verification
- Invoice creation/editing
- Manual entries
- Calculate button
- Finalize button
- PDF export

## Layout

Root layout wraps all pages:
```tsx
// layout.tsx
export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <Providers>
          <Sidebar />
          <div className="flex-1">
            <Header />
            <main>{children}</main>
          </div>
        </Providers>
      </body>
    </html>
  )
}
```

## Adding a New Page

1. Create folder structure under `app/`
2. Add `page.tsx` with `'use client'` directive
3. Use hooks for data fetching
4. Add navigation link to Sidebar
