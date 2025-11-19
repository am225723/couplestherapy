import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export function useApi<T>(endpoint: string, options?: any) {
  return useQuery<T>({
    queryKey: [endpoint],
    queryFn: async () => {
      const response = await api.get(endpoint);
      return response.data;
    },
    ...options,
  });
}

export function useApiMutation<TData = any, TVariables = any>(
  endpoint: string,
  method: 'post' | 'put' | 'delete' = 'post',
  options?: any
) {
  const queryClient = useQueryClient();

  return useMutation<TData, Error, TVariables>({
    mutationFn: async (data: TVariables) => {
      const response = await api[method](endpoint, data);
      return response.data;
    },
    onSuccess: () => {
      if (options?.invalidateQueries) {
        queryClient.invalidateQueries({ queryKey: options.invalidateQueries });
      }
    },
    ...options,
  });
}
