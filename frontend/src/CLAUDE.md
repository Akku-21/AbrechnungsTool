# Frontend Source

Main source code for Next.js application.

## Directory Structure

| Directory | Purpose |
|-----------|---------|
| `app/` | Next.js App Router pages and layouts |
| `components/` | Reusable React components |
| `hooks/` | Custom React hooks (mostly React Query) |
| `lib/` | Utilities, API client, helpers |
| `providers/` | React context providers |
| `types/` | TypeScript type definitions |

## Import Aliases

Configured in `tsconfig.json`:
```typescript
import { Button } from '@/components/ui/Button'
import { useProperties } from '@/hooks/useProperties'
import { fetchProperties } from '@/lib/api/properties'
import type { Property } from '@/types'
```

## App Router Conventions

```
app/
├── layout.tsx          # Root layout (wraps all pages)
├── page.tsx            # Home page (/)
├── properties/
│   ├── page.tsx        # /properties
│   ├── new/
│   │   └── page.tsx    # /properties/new
│   └── [id]/
│       ├── page.tsx    # /properties/:id
│       └── edit/
│           └── page.tsx # /properties/:id/edit
```

## Component Guidelines

### UI Components (`components/ui/`)
- Atomic, reusable components
- No business logic
- Props-driven, controlled by parent

### Layout Components (`components/layout/`)
- Page structure components
- Navigation, headers, sidebars

### Page Components (`app/`)
- Full pages
- Data fetching via hooks
- Form handling
- Navigation

## Data Flow

```
API (Backend)
    ↓
lib/api/ (Axios functions)
    ↓
hooks/ (React Query)
    ↓
Components (UI)
```

## State Management

- **Server State**: React Query (caching, background refetch)
- **Form State**: React Hook Form
- **Local UI State**: React useState/useReducer
- **No global state library** (not needed for this app size)

## Styling

- Tailwind CSS for utility classes
- shadcn/ui for pre-built components
- Radix UI for accessible primitives
- Custom CSS in `app/globals.css`

## Adding a New Feature

1. **Types**: Add interfaces to `types/index.ts`
2. **API**: Add functions to `lib/api/`
3. **Hook**: Create custom hook in `hooks/`
4. **Page/Component**: Create in `app/` or `components/`
