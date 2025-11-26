import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../services/api";

export function useApi<T>(endpoint: string, options?: any) {
  return useQuery<T>({
    queryKey: [endpoint],
    queryFn: async () => {
      return await apiClient.get<T>(endpoint);
    },
    ...options,
  });
}

export function useApiMutation<TData = any, TVariables = any>(
  endpoint: string,
  method: "post" | "put" | "delete" = "post",
  options?: any,
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (data: TVariables) => {
      return await apiClient[method]<TData>(endpoint, data);
    },
    onSuccess: (data, variables, context) => {
      if (options?.invalidateQueries) {
        queryClient.invalidateQueries({ queryKey: options.invalidateQueries });
      }
      if (options?.onSuccess) {
        options.onSuccess(data, variables, context);
      }
    },
    ...options,
  });
}
