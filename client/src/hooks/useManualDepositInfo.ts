import { useQuery } from "@tanstack/react-query";

// Background refreshes must not unmount the photo input while the gallery is open.
// Each country/operator URL has its own cache entry to avoid showing another
// operator's deposit number while loading a new selection.
export function useManualDepositInfo<T = any>(url: string, enabled: boolean) {
  const query = useQuery<T>({
    queryKey: [url],
    enabled,
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async ({ signal }) => {
      const response = await fetch(url, { credentials: "include", cache: "no-store", signal });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Impossible de charger les informations de dépôt.");
      return data;
    },
  });
  return { depositInfo: query.data, depositLoading: query.isPending && enabled };
}
