import { useEffect, useState, useCallback } from 'react';
import { api } from '../helpers/apiClient';

export function useInterviews() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInterviews = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<any[]>('/api/RecruitementProcess');
      setData(res);
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch interviews');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInterviews();
  }, [fetchInterviews]);

  return { data, loading, error, refetch: fetchInterviews };
}

