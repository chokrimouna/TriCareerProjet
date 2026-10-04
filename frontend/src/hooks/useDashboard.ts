import { useEffect, useState } from 'react';
import { api } from '../helpers/apiClient';

export function useDashboard() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // TODO: endpoint /api/Analytics not found in backend — using empty fallback
    let isMounted = true;
    (async () => {
      try {
        const res = await api.get<any[]>('/api/Analytics');
        if (isMounted) setData(res);
      } catch (e: any) {
        if (isMounted) {
          setData([]);
          setError(e?.message || 'Failed to fetch dashboard');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  return { data, loading, error };
}

