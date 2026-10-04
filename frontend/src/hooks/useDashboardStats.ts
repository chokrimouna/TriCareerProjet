import { useEffect, useState } from 'react';
import { api } from '../helpers/apiClient';

export type DashboardStats = {
  totalApplications: number;
  activeJobPostings: number;
  scheduledInterviews: number;
  totalUsers: number;
};

export function useDashboardStats() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await api.get<DashboardStats>('/api/Dashboard/stats');
        if (isMounted) setData(res);
      } catch (e: any) {
        if (isMounted) setError(e?.message || 'Failed to fetch dashboard stats');
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
