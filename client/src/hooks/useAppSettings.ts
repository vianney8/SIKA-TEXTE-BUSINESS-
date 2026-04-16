import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export function useAppSetting(key: string) {
  return useQuery({
    queryKey: [`/api/settings/${key}`],
    queryFn: async () => {
      const response = await fetch(`/api/settings/${key}?_=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate', 'Pragma': 'no-cache' },
      });
      const data = await response.json();
      return data.value || '';
    },
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

export function useAppSettings() {
  return useQuery({
    queryKey: ['/api/admin/settings'],
    queryFn: async () => {
      const response = await fetch('/api/admin/settings');
      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}