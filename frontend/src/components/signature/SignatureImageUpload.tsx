'use client'

import { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/Button'
import { Upload, Image as ImageIcon, Trash2, CheckCircle } from 'lucide-react'

interface SignatureImageUploadProps {
  onUpload: (file: File) => void
  isPending?: boolean
  isUploaded?: boolean
}

export function SignatureImageUpload({
  onUpload,
  isPending,
  isUploaded
}: SignatureImageUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onUpload(acceptedFiles[0])
    }
  }, [onUpload])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg'],
    },
    maxFiles: 1,
    disabled: isPending,
  })

  return (
    <div className="space-y-4">
      {isUploaded && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <p className="text-sm font-medium text-green-800">
            Unterschriftsbild hochgeladen
          </p>
        </div>
      )}

      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <ImageIcon className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        <p className="text-gray-600 mb-1">
          {isDragActive
            ? 'Bild hier ablegen...'
            : isUploaded
              ? 'Neues Bild hochladen zum Ersetzen'
              : 'Unterschriftsbild hier ablegen'}
        </p>
        <p className="text-sm text-gray-400">
          PNG oder JPG (transparenter Hintergrund empfohlen)
        </p>
      </div>

      {isPending && (
        <p className="text-sm text-gray-500 text-center">
          Bild wird hochgeladen...
        </p>
      )}

      <div className="text-sm text-gray-500 space-y-1">
        <p><strong>Tipps:</strong></p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Verwenden Sie ein Bild mit transparentem Hintergrund (PNG)</li>
          <li>Scannen Sie Ihre Unterschrift auf weißem Papier</li>
          <li>Empfohlene Größe: 300-500px Breite</li>
        </ul>
      </div>
    </div>
  )
}
