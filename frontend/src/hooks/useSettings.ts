import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi, Settings, SettingsUpdate } from '@/lib/api/settings'

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
