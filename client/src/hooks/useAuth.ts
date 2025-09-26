import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    retry: false,
    staleTime: 0, // Always fresh check
  });

  // Debug logs
  if (error) {
    console.error("Auth error:", error);
  }

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
  };
}
