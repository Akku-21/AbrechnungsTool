'use client'

import { usePathname } from 'next/navigation'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/Button'

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/properties': 'Liegenschaften',
  '/settlements': 'Abrechnungen',
  '/tenants': 'Mieter',
  '/settings': 'Einstellungen',
}

export function Header() {
  const pathname = usePathname()

  // Get base path for dynamic routes
  const basePath = '/' + (pathname.split('/')[1] || '')
  const title = pageTitles[basePath] || pageTitles[pathname] || 'Nebenkostenabrechnung'

  return (
    <header className="h-16 border-b bg-white px-6 flex items-center justify-between">
      <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="icon">
          <Bell className="h-5 w-5" />
        </Button>
      </div>
    </header>
  )
}
