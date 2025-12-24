# Frontend - Next.js Application

<!-- SYNC: Update /README.md if making major changes to frontend structure or tech stack -->

Next.js 15 with React 19, TanStack Query, and Tailwind CSS.

## Tech Stack

- **Framework**: Next.js 15.1.3 (App Router)
- **UI**: React 19, Tailwind CSS, Radix UI, shadcn/ui
- **State**: TanStack React Query 5
- **Forms**: React Hook Form + Zod validation
- **HTTP**: Axios
- **Icons**: Lucide React
- **File Upload**: react-dropzone
- **Search**: fuse.js (fuzzy search with Levenshtein distance)

## Project Structure

```
frontend/
├── src/
│   ├── app/              # App Router (pages)
│   │   ├── layout.tsx    # Root layout
│   │   ├── page.tsx      # Dashboard
│   │   ├── properties/   # Property pages
│   │   ├── settlements/  # Settlement pages
│   │   ├── tenants/
│   │   └── settings/
│   ├── components/
│   │   ├── ui/           # Reusable UI components
│   │   └── layout/       # Header, Sidebar
│   ├── hooks/            # React Query hooks
│   ├── lib/
│   │   ├── api/          # API client functions
│   │   ├── fuzzySearch.ts # Fuzzy search utility (USE THIS!)
│   │   └── utils.ts      # Utility functions
│   ├── providers/        # Context providers
│   └── types/            # TypeScript interfaces
├── package.json
├── tailwind.config.js
└── Dockerfile
```

## Running Locally

```bash
# With Docker (recommended)
docker-compose up frontend

# Or standalone
npm install
npm run dev
```

## Environment Variables

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Key Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard with overview |
| `/properties` | Property list |
| `/properties/new` | Create property |
| `/properties/[id]` | Property detail + units |
| `/settlements` | Settlement list |
| `/settlements/new` | Create settlement |
| `/settlements/[id]` | Settlement detail (main workflow) |
| `/tenants` | Tenant list |
| `/settings` | App settings |

## Data Fetching Pattern

Uses TanStack React Query with custom hooks:

```typescript
// hooks/useProperties.ts
export function useProperties() {
  return useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties,
  })
}

// In component
const { data, isLoading, error } = useProperties()
```

## Adding New Features

1. **New Page**: Create in `app/` following App Router conventions
2. **New API Call**: Add to `lib/api/`, create hook in `hooks/`
3. **New Component**: Add to `components/ui/` or feature-specific folder
4. **New Type**: Add to `types/index.ts`
5. **New Search**: Always use fuzzy search (see below)

## Search Pattern (REQUIRED)

**IMPORTANT**: All search functionality MUST use the fuzzy search utility from `lib/fuzzySearch.ts`. Never implement simple string matching (`.includes()`, `.toLowerCase()`) for user-facing search.

```typescript
import { fuzzyFilter } from '@/lib/fuzzySearch'

// In component with search
const [searchTerm, setSearchTerm] = useState('')

const filteredItems = useMemo(() => {
  if (!searchTerm) return items

  return fuzzyFilter(
    items,
    ['field1', 'field2', 'nestedField.name'],  // fields to search
    searchTerm
  )
}, [items, searchTerm])
```

### Features
- **Levenshtein distance**: Tolerates typos (e.g., "Müler" finds "Müller")
- **Token matching**: Finds partial words
- **Relevance sorting**: Best matches first
- **Threshold 0.4**: Good balance between accuracy and tolerance

### For nested data (e.g., tenant with property)
Flatten the data first for search:

```typescript
const enrichedItems = useMemo(() => {
  return items.map((item) => ({
    ...item,
    // Flatten nested fields for fuzzy search
    propertyName: item.property?.name || '',
    unitDesignation: item.unit?.designation || '',
  }))
}, [items])

const filtered = fuzzyFilter(enrichedItems, ['name', 'propertyName'], searchTerm)
```

## Form Pattern

```typescript
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1),
})

function MyForm() {
  const form = useForm({
    resolver: zodResolver(schema),
  })

  return (
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <Input {...form.register('name')} />
    </form>
  )
}
```

## German Locale

- Date formatting: `date-fns` with `de` locale
- Currency: Custom formatting (German decimals)
- All UI labels in German
