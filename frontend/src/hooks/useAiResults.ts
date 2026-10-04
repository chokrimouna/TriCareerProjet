import { useEffect, useState } from 'react';
import { api } from '../helpers/apiClient';

export function useAiResults() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = async () => {
    setLoading(true);
    try {
      const res = await api.get<any[]>('/api/AiResult');
      setData(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch AI results');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, []);

  return { data, loading, error, refetch };
}
