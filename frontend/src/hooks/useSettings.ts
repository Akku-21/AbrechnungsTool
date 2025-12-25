import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  settingsApi,
  Settings,
  SettingsUpdate,
  RecommendedModel,
  TestConnectionRequest,
  TestConnectionResponse,
} from '@/lib/api/settings'
import type { SignatureSettings, SignatureType, TextFontStyle } from '@/types'

export function useSettings() {
  return useQuery<Settings>({
    queryKey: ['settings'],
    queryFn: settingsApi.get,
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: SettingsUpdate) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

export function useRecommendedModels() {
  return useQuery<RecommendedModel[]>({
    queryKey: ['settings', 'recommended-models'],
    queryFn: settingsApi.getRecommendedModels,
    staleTime: 1000 * 60 * 60, // 1 hour - models don't change often
  })
}

export function useTestOpenRouter() {
  return useMutation<TestConnectionResponse, Error, TestConnectionRequest>({
    mutationFn: settingsApi.testOpenRouter,
  })
}

// Signature Hooks
export function useSignatureSettings() {
  return useQuery<SignatureSettings>({
    queryKey: ['settings', 'signature'],
    queryFn: settingsApi.getSignatureSettings,
  })
}

export function useUpdateSignatureType() {
  const queryClient = useQueryClient()

  return useMutation<SignatureSettings, Error, SignatureType>({
    mutationFn: settingsApi.updateSignatureType,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

export function useUploadCertificate() {
  const queryClient = useQueryClient()

  return useMutation<SignatureSettings, Error, { file: File; password: string }>({
    mutationFn: ({ file, password }) => settingsApi.uploadCertificate(file, password),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

export function useDeleteCertificate() {
  const queryClient = useQueryClient()

  return useMutation<SignatureSettings, Error>({
    mutationFn: settingsApi.deleteCertificate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

export function useUploadSignatureImage() {
  const queryClient = useQueryClient()

  return useMutation<SignatureSettings, Error, File>({
    mutationFn: settingsApi.uploadSignatureImage,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

export function useSaveSignaturePad() {
  const queryClient = useQueryClient()

  return useMutation<SignatureSettings, Error, string>({
    mutationFn: settingsApi.saveSignaturePad,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

export function useUpdateSignatureText() {
  const queryClient = useQueryClient()

  return useMutation<SignatureSettings, Error, { text: string; font: TextFontStyle }>({
    mutationFn: ({ text, font }) => settingsApi.updateSignatureText(text, font),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}

export function useClearSignature() {
  const queryClient = useQueryClient()

  return useMutation<SignatureSettings, Error>({
    mutationFn: settingsApi.clearSignature,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
    },
  })
}
