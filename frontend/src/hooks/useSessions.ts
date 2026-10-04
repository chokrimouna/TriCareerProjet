import { useEffect, useState } from 'react';
import { api } from '../helpers/apiClient';

export function useSessions(applicationId?: number) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    const user = JSON.parse(localStorage.getItem('tricareer_user') || '{}');
    const role = (user.Role || user.role || '').toLowerCase();
    const departmentId = user.DepartmentId || user.departmentId;
    const userId = user.Id || user.id || user.userId;

    const params = new URLSearchParams();
    if (role.includes('team') || role.includes('leader') || role.includes('recruiter') || role.includes('recruteur')) {
      if (departmentId) params.append('departmentId', departmentId);
      if (userId) params.append('userId', userId);
    } else if (role.includes('candidat')) {
      if (userId) params.append('userId', userId);
    }

    const queryString = params.toString();
    const fetchUrl = applicationId
      ? `/api/Sessions/simple/${applicationId}`
      : `/api/Sessions${queryString ? `?${queryString}` : ''}`;

    try {
      const result = await api.get<any[]>(fetchUrl);
      setData(Array.isArray(result) ? result : []);
    } catch (err: any) {
      console.error('useSessions hook error:', err);
      setError(err?.message || 'Error');
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [applicationId]);

  return { data, loading, error, refetch: fetchData };
}
