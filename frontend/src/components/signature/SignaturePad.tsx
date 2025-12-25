'use client'

import { useRef, useState } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { Button } from '@/components/ui/Button'
import { Trash2, Save } from 'lucide-react'

interface SignaturePadProps {
  onSave: (imageData: string) => void
  isPending?: boolean
}

export function SignaturePad({ onSave, isPending }: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null)
  const [isEmpty, setIsEmpty] = useState(true)

  const clear = () => {
    sigCanvas.current?.clear()
    setIsEmpty(true)
  }

  const save = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      // PNG mit transparentem Hintergrund exportieren
      const dataUrl = sigCanvas.current.getTrimmedCanvas().toDataURL('image/png')
      onSave(dataUrl)
    }
  }

  const handleEnd = () => {
    setIsEmpty(sigCanvas.current?.isEmpty() ?? true)
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white">
        <SignatureCanvas
          ref={sigCanvas}
          canvasProps={{
            className: 'w-full h-[200px] cursor-crosshair',
            style: { touchAction: 'none' }
          }}
          backgroundColor="rgba(255, 255, 255, 0)"
          penColor="rgb(0, 0, 100)"
          onEnd={handleEnd}
        />
      </div>
      <p className="text-sm text-gray-500">
        Zeichnen Sie Ihre Unterschrift mit der Maus oder dem Finger.
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={clear}
          disabled={isEmpty}
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Löschen
        </Button>
        <Button
          type="button"
          onClick={save}
          disabled={isEmpty || isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          {isPending ? 'Speichere...' : 'Speichern'}
        </Button>
      </div>
    </div>
  )
}
