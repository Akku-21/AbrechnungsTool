'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Label } from '@/components/ui/Label'
import {
  FileKey,
  Pencil,
  Image as ImageIcon,
  Type,
  Ban,
  CheckCircle,
  AlertCircle,
  Trash2,
  Loader2,
} from 'lucide-react'
import type { SignatureType, TextFontStyle } from '@/types'
import { SIGNATURE_TYPE_LABELS } from '@/types'
import {
  useSignatureSettings,
  useUpdateSignatureType,
  useUploadCertificate,
  useDeleteCertificate,
  useUploadSignatureImage,
  useSaveSignaturePad,
  useUpdateSignatureText,
  useClearSignature,
} from '@/hooks/useSettings'
import { SignaturePad } from './SignaturePad'
import { CertificateUpload } from './CertificateUpload'
import { SignatureImageUpload } from './SignatureImageUpload'
import { TextSignatureConfig } from './TextSignatureConfig'

const TYPE_ICONS: Record<SignatureType, React.ReactNode> = {
  NONE: <Ban className="w-5 h-5" />,
  CERTIFICATE: <FileKey className="w-5 h-5" />,
  PAD: <Pencil className="w-5 h-5" />,
  IMAGE: <ImageIcon className="w-5 h-5" />,
  TEXT: <Type className="w-5 h-5" />,
}

export function SignatureConfig() {
  const { data: sigSettings, isLoading, error } = useSignatureSettings()
  const [selectedType, setSelectedType] = useState<SignatureType | null>(null)

  const updateType = useUpdateSignatureType()
  const uploadCertificate = useUploadCertificate()
  const deleteCertificate = useDeleteCertificate()
  const uploadImage = useUploadSignatureImage()
  const savePad = useSaveSignaturePad()
  const updateText = useUpdateSignatureText()
  const clearSignature = useClearSignature()

  const isPending = updateType.isPending ||
    uploadCertificate.isPending ||
    deleteCertificate.isPending ||
    uploadImage.isPending ||
    savePad.isPending ||
    updateText.isPending ||
    clearSignature.isPending

  // Der aktuell angezeigte Typ (entweder die Auswahl oder der gespeicherte Typ)
  const displayType = selectedType ?? sigSettings?.signature_type ?? 'NONE'

  const handleTypeSelect = (type: SignatureType) => {
    setSelectedType(type)
    // Nur NONE direkt setzen, andere Typen benötigen Konfiguration
    if (type === 'NONE') {
      updateType.mutate(type, {
        onSuccess: () => setSelectedType(null)
      })
    }
  }

  const handleCertificateUpload = (file: File, password: string) => {
    uploadCertificate.mutate({ file, password }, {
      onSuccess: () => setSelectedType(null)
    })
  }

  const handleImageUpload = (file: File) => {
    uploadImage.mutate(file, {
      onSuccess: () => setSelectedType(null)
    })
  }

  const handlePadSave = (imageData: string) => {
    savePad.mutate(imageData, {
      onSuccess: () => setSelectedType(null)
    })
  }

  const handleTextSave = (text: string, font: TextFontStyle) => {
    updateText.mutate({ text, font }, {
      onSuccess: () => setSelectedType(null)
    })
  }

  const handleClear = () => {
    clearSignature.mutate(undefined, {
      onSuccess: () => setSelectedType(null)
    })
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>PDF-Signatur</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>PDF-Signatur</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <p>Fehler beim Laden der Signatur-Einstellungen</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>PDF-Signatur</CardTitle>
          {sigSettings?.configured && (
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle className="w-4 h-4" />
              <span className="text-sm">Aktiv</span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status-Anzeige */}
        {sigSettings?.configured && sigSettings.signature_type !== 'NONE' && (
          <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              {TYPE_ICONS[sigSettings.signature_type]}
              <div>
                <p className="font-medium text-green-800">
                  {SIGNATURE_TYPE_LABELS[sigSettings.signature_type]}
                </p>
                {sigSettings.signature_type === 'CERTIFICATE' && sigSettings.certificate_filename && (
                  <p className="text-sm text-green-600">{sigSettings.certificate_filename}</p>
                )}
                {sigSettings.signature_type === 'TEXT' && sigSettings.signature_text && (
                  <p className="text-sm text-green-600 italic">&quot;{sigSettings.signature_text}&quot;</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClear}
              disabled={isPending}
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Entfernen
            </Button>
          </div>
        )}

        {/* Typ-Auswahl */}
        <div className="space-y-3">
          <Label>Signaturmethode wählen</Label>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
            {(Object.keys(SIGNATURE_TYPE_LABELS) as SignatureType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => handleTypeSelect(type)}
                disabled={isPending}
                className={`p-3 flex flex-col items-center gap-2 border rounded-lg transition-colors
                  ${displayType === type
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'}
                  ${isPending ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {TYPE_ICONS[type]}
                <span className="text-xs text-center">
                  {type === 'NONE' ? 'Keine' : SIGNATURE_TYPE_LABELS[type].split(' ')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Typ-spezifische Konfiguration */}
        {displayType === 'CERTIFICATE' && (
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-4">Digitales Zertifikat (PKCS#12)</h4>
            <CertificateUpload
              onUpload={handleCertificateUpload}
              onDelete={() => deleteCertificate.mutate()}
              isPending={uploadCertificate.isPending || deleteCertificate.isPending}
              isUploaded={sigSettings?.certificate_uploaded}
              filename={sigSettings?.certificate_filename}
            />
            <p className="mt-4 text-sm text-gray-500">
              Digitale Zertifikate erzeugen kryptographisch verifizierbare Signaturen.
              Diese werden von PDF-Readern als &quot;digital signiert&quot; erkannt.
            </p>
          </div>
        )}

        {displayType === 'PAD' && (
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-4">Unterschrift zeichnen</h4>
            <SignaturePad
              onSave={handlePadSave}
              isPending={savePad.isPending}
            />
          </div>
        )}

        {displayType === 'IMAGE' && (
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-4">Unterschriftsbild hochladen</h4>
            <SignatureImageUpload
              onUpload={handleImageUpload}
              isPending={uploadImage.isPending}
              isUploaded={sigSettings?.signature_image_uploaded}
            />
          </div>
        )}

        {displayType === 'TEXT' && (
          <div className="pt-4 border-t">
            <h4 className="font-medium mb-4">Text-Signatur</h4>
            <TextSignatureConfig
              onSave={handleTextSave}
              isPending={updateText.isPending}
              currentText={sigSettings?.signature_text || ''}
              currentFont={sigSettings?.signature_text_font || 'HANDWRITING'}
            />
          </div>
        )}

        {/* Info-Text */}
        <div className="pt-4 border-t text-sm text-gray-500 space-y-2">
          <p>
            <strong>Hinweis:</strong> Die Signatur wird automatisch auf der letzten Seite
            jedes exportierten PDF-Dokuments eingefügt.
          </p>
          <p>
            Bei &quot;Digitales Zertifikat&quot; wird eine kryptographisch verifizierbare Signatur erstellt.
            Die anderen Optionen fügen eine visuelle Unterschrift als Bild ein.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
