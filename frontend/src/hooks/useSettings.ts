import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  settingsApi,
  Settings,
  SettingsUpdate,
  RecommendedModel,
  TestConnectionRequest,
  TestConnectionResponse,
} from '@/lib/api/settings'

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
