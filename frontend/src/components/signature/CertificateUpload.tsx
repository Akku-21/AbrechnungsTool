'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Upload, FileKey, Trash2, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react'

interface CertificateUploadProps {
  onUpload: (file: File, password: string) => void
  onDelete?: () => void
  isPending?: boolean
  isUploaded?: boolean
  filename?: string
}

export function CertificateUpload({
  onUpload,
  onDelete,
  isPending,
  isUploaded,
  filename
}: CertificateUploadProps) {
  const [file, setFile] = useState<File | null>(null)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setError(null)
    if (acceptedFiles.length > 0) {
      const f = acceptedFiles[0]
      const ext = f.name.toLowerCase()
      if (ext.endsWith('.p12') || ext.endsWith('.pfx')) {
        setFile(f)
      } else {
        setError('Nur .p12 oder .pfx Dateien sind erlaubt')
      }
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/x-pkcs12': ['.p12', '.pfx'],
    },
    maxFiles: 1,
    disabled: isPending,
  })

  const handleUpload = () => {
    if (file && password) {
      onUpload(file, password)
    }
  }

  const handleClear = () => {
    setFile(null)
    setPassword('')
    setError(null)
  }

  // Wenn bereits ein Zertifikat hochgeladen ist
  if (isUploaded && !file) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">Zertifikat aktiv</p>
            <p className="text-sm text-green-600">{filename || 'certificate.p12'}</p>
          </div>
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onDelete}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-500">
          Laden Sie ein neues Zertifikat hoch, um das aktuelle zu ersetzen.
        </p>
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
        >
          <input {...getInputProps()} />
          <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-600">
            Neues Zertifikat hochladen (.p12 / .pfx)
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <AlertCircle className="w-4 h-4" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {!file ? (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}`}
        >
          <input {...getInputProps()} />
          <FileKey className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600 mb-1">
            {isDragActive
              ? 'Datei hier ablegen...'
              : 'PKCS#12 Zertifikat hier ablegen'}
          </p>
          <p className="text-sm text-gray-400">
            oder klicken zum Auswählen (.p12 / .pfx)
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <FileKey className="w-5 h-5 text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-800">{file.name}</p>
              <p className="text-xs text-blue-600">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleClear}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cert-password">Zertifikatspasswort</Label>
            <div className="relative">
              <Input
                id="cert-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Passwort eingeben..."
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="button"
            onClick={handleUpload}
            disabled={!password || isPending}
            className="w-full"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isPending ? 'Wird hochgeladen...' : 'Zertifikat hochladen'}
          </Button>
        </div>
      )}
    </div>
  )
}
