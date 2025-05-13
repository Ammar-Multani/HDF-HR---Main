import React from "react";
import {
  QueryClient,
  QueryClientProvider,
  UseQueryResult,
  useMutation,
  useQuery,
  useQueryClient,
  UseMutationResult,
} from "@tanstack/react-query";
import { getAuthenticatedClient } from "./supabase";
import { PostgrestError } from "@supabase/supabase-js";

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Provider component for React Query
export const QueryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

// Type for Supabase query function
type SupabaseQueryFn<T> = (
  client: any
) => Promise<{ data: T | null; error: PostgrestError | null }>;

/**
 * Custom hook for authenticated Supabase queries
 */
export function useSupabaseQuery<T>(
  queryKey: any[],
  queryFn: SupabaseQueryFn<T>,
  options = {}
): UseQueryResult<T, PostgrestError> {
  return useQuery({
    queryKey,
    queryFn: async () => {
      const client = await getAuthenticatedClient();
      const { data, error } = await queryFn(client);

      if (error) {
        throw error;
      }

      return data as T;
    },
    ...options,
  });
}

/**
 * Custom hook for authenticated Supabase mutations
 */
export function useSupabaseMutation<TData, TVariables>(
  mutationFn: (
    variables: TVariables,
    client: any
  ) => Promise<{ data: TData | null; error: PostgrestError | null }>,
  options = {}
): UseMutationResult<TData, PostgrestError, TVariables> {
  return useMutation({
    mutationFn: async (variables) => {
      const client = await getAuthenticatedClient();
      const { data, error } = await mutationFn(variables, client);

      if (error) {
        throw error;
      }

      return data as TData;
    },
    ...options,
  });
}

/**
 * Utility to invalidate queries
 */
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return (queryKey: any[]) => {
    return queryClient.invalidateQueries({ queryKey });
  };
}

// Example query hooks

/**
 * Hook to fetch a user by ID
 */
export function useUser(userId: string) {
  return useSupabaseQuery(["user", userId], async (client) =>
    client.from("users").select("*").eq("id", userId).single()
  );
}

/**
 * Hook to fetch company users
 */
export function useCompanyUsers(companyId: string) {
  return useSupabaseQuery(["company_users", companyId], async (client) =>
    client.from("company_user").select("*").eq("company_id", companyId)
  );
}

/**
 * Hook to update a user
 */
export function useUpdateUser() {
  const invalidateQueries = useInvalidateQueries();

  return useSupabaseMutation(
    async (variables: { id: string; data: any }, client) => {
      return client
        .from("users")
        .update(variables.data)
        .eq("id", variables.id)
        .select("*")
        .single();
    },
    {
      onSuccess: (_, variables) => {
        invalidateQueries(["user", variables.id]);
      },
    }
  );
}
