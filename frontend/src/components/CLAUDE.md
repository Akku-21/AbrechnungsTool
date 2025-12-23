# Components Module

Reusable React components.

## Structure

```
components/
├── ui/              # Atomic UI components (shadcn/ui style)
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── Label.tsx
│   ├── Dialog.tsx
│   └── Toaster.tsx
└── layout/          # Layout components
    ├── Header.tsx
    └── Sidebar.tsx
```

## UI Components (`ui/`)

Atomic, reusable components based on Radix UI primitives and shadcn/ui patterns.

### Button
```tsx
import { Button } from '@/components/ui/Button'

<Button variant="default">Primary</Button>
<Button variant="outline">Outline</Button>
<Button variant="ghost">Ghost</Button>
<Button variant="destructive">Delete</Button>
<Button disabled>Disabled</Button>
<Button size="sm">Small</Button>
```

### Card
```tsx
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>
    Content here
  </CardContent>
</Card>
```

### Input
```tsx
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'

<div>
  <Label htmlFor="name">Name</Label>
  <Input id="name" placeholder="Enter name" />
</div>
```

## Layout Components

### Header
Top navigation bar with app title and user menu.

### Sidebar
Left navigation with links to main sections:
- Dashboard
- Properties
- Settlements
- Tenants
- Settings

## Component Guidelines

1. **Props-driven**: Components receive all data via props
2. **No data fetching**: Data comes from parent (pages)
3. **Controlled inputs**: Parent manages form state
4. **Tailwind styling**: Use utility classes
5. **Accessibility**: Use Radix UI primitives

## Adding a Component

```tsx
// components/ui/Badge.tsx
import { cn } from '@/lib/utils'

interface BadgeProps {
  variant?: 'default' | 'success' | 'warning' | 'error'
  children: React.ReactNode
}

export function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span className={cn(
      'px-2 py-1 text-xs rounded-full',
      variant === 'success' && 'bg-green-100 text-green-800',
      variant === 'warning' && 'bg-yellow-100 text-yellow-800',
      variant === 'error' && 'bg-red-100 text-red-800',
      variant === 'default' && 'bg-gray-100 text-gray-800',
    )}>
      {children}
    </span>
  )
}
```
