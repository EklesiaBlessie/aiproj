import { useState, useCallback } from 'react';
import api from '../lib/trpc';
import { AxiosRequestConfig } from 'axios';

export function useApi<T>() {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (config: AxiosRequestConfig) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await api(config);
      const payload = response.data?.data;
      const resData = Array.isArray(payload?.data) ? payload.data : payload ?? response.data;
      setData(resData);
      return response.data;
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error || err.response?.data?.message || err.message || 'An unexpected error occurred';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { data, isLoading, error, fetchData, setData };
}
