'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Save } from 'lucide-react'
import type { TextFontStyle } from '@/types'
import { TEXT_FONT_LABELS } from '@/types'

interface TextSignatureConfigProps {
  onSave: (text: string, font: TextFontStyle) => void
  isPending?: boolean
  currentText?: string
  currentFont?: TextFontStyle
}

export function TextSignatureConfig({
  onSave,
  isPending,
  currentText = '',
  currentFont = 'HANDWRITING'
}: TextSignatureConfigProps) {
  const [text, setText] = useState(currentText)
  const [font, setFont] = useState<TextFontStyle>(currentFont)

  useEffect(() => {
    setText(currentText)
  }, [currentText])

  useEffect(() => {
    setFont(currentFont)
  }, [currentFont])

  const handleSave = () => {
    if (text.trim()) {
      onSave(text.trim(), font)
    }
  }

  // Font-Vorschau Styles
  const fontStyles: Record<TextFontStyle, React.CSSProperties> = {
    HANDWRITING: { fontStyle: 'italic', fontFamily: 'Georgia, serif' },
    SERIF: { fontFamily: 'Times New Roman, serif' },
    SANS: { fontFamily: 'Arial, sans-serif' },
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="sig-text">Signaturtext</Label>
        <Input
          id="sig-text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="z.B. Max Mustermann"
          maxLength={100}
        />
        <p className="text-sm text-gray-500">
          Dieser Text wird als Ihre Unterschrift auf dem PDF angezeigt.
        </p>
      </div>

      <div className="space-y-2">
        <Label>Schriftstil</Label>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(TEXT_FONT_LABELS) as TextFontStyle[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFont(f)}
              className={`p-3 text-center border rounded-lg transition-colors
                ${font === f
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 hover:border-gray-300'}`}
            >
              <span className="text-lg" style={fontStyles[f]}>
                Abc
              </span>
              <p className="text-xs mt-1 text-gray-600">
                {TEXT_FONT_LABELS[f]}
              </p>
            </button>
          ))}
        </div>
      </div>

      {text && (
        <div className="space-y-2">
          <Label>Vorschau</Label>
          <div className="p-4 bg-gray-50 border rounded-lg">
            <span
              className="text-2xl text-blue-900"
              style={fontStyles[font]}
            >
              {text}
            </span>
          </div>
        </div>
      )}

      <Button
        type="button"
        onClick={handleSave}
        disabled={!text.trim() || isPending}
        className="w-full"
      >
        <Save className="w-4 h-4 mr-2" />
        {isPending ? 'Speichere...' : 'Speichern'}
      </Button>
    </div>
  )
}
