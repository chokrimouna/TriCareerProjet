import { useEffect, useState } from 'react';
import { api } from '../helpers/apiClient';

export function useQuestions() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await api.get<any[]>('/api/Questions');
        if (isMounted) setData(res);
      } catch (e: any) {
        if (isMounted) setError(e?.message || 'Failed to fetch questions');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  return { data, loading, error, setData };
}
