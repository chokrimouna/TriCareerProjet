import { useEffect, useState } from 'react';
import { api } from '../helpers/apiClient';

export function useApplications(page?: number, pageSize?: number, teamLeaderId?: number) {
  const [data, setData] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async (p = page, ps = pageSize, tl = teamLeaderId) => {
    setLoading(true);
    try {
      let url = '/api/Application/getAllApps';
      const params = new URLSearchParams();
      if (p) params.append('page', p.toString());
      if (ps) params.append('pageSize', ps.toString());
      if (tl) params.append('teamLeaderId', tl.toString());
      
      const queryString = params.toString();
      if (queryString) url += `?${queryString}`;
      
      const res = await api.get<any>(url);
      
      if (p && ps) {
        setData(res.apps || []);
        setTotal(res.total || 0);
      } else {
        setData(Array.isArray(res) ? res : (res.apps || []));
        setTotal(Array.isArray(res) ? res.length : (res.total || 0));
      }
    } catch (e: any) {
      setError(e?.message || 'Failed to fetch applications');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [page, pageSize, teamLeaderId]);

  return { data, total, loading, error, refetch: fetchData };
}

