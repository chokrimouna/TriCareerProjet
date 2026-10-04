import { useEffect, useState } from 'react';
import { api } from '../helpers/apiClient';

export function useApplication(id: string | number | undefined) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id === undefined) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    (async () => {
      try {
        const res = await api.get<any>(`/api/Application/${id}`);
        if (isMounted) setData(res);
      } catch (e: any) {
        if (isMounted) setError(e?.message || 'Failed to fetch application');
      } finally {
        if (isMounted) setLoading(false);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, [id]);

  return { data, loading, error };
}

