import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // Data remains fresh for 30s before triggering background refetch
      gcTime: 5 * 60 * 1000, // Unused query data cached in memory for 5 minutes
      retry: 1, // Single automatic retry on network failure before raising error
      refetchOnWindowFocus: false, // Prevent redundant requests when switching browser tabs
    },
  },
});

