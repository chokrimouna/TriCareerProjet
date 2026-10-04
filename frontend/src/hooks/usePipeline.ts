import { useState, useCallback, useEffect } from 'react';
import { api } from '../helpers/apiClient';

export function usePipeline() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any[]>([]);

  const fetchPipelines = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.get<any[]>('/api/Piplines');
      setData(result);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch pipelines');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPipelines();
  }, [fetchPipelines]);

  const getReviews = useCallback(async (applicationId: number) => {
    setLoading(true);
    try {
      const result = await api.get<any[]>(`/api/CandidateReview/application/${applicationId}`);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to fetch reviews');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const addReview = async (review: any) => {
    setLoading(true);
    try {
      const result = await api.post('/api/CandidateReview', review);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to add review');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const startSession = async (sessionId: string | number) => {
    try {
      return await api.post(`/api/Sessions/${sessionId}/start`, {});
    } catch (err: any) {
      console.error('Failed to start session', err);
      throw err;
    }
  };

  const submitSession = async (sessionId: string | number, formData: FormData) => {
    try {
      return await api.post(`/api/Sessions/${sessionId}/submit`, formData);
    } catch (err: any) {
      console.error('Failed to submit session', err);
      throw err;
    }
  };

  const getApplication = useCallback(async (id: number) => {
    setLoading(true);
    try {
      return await api.get<any>(`/api/Application/${id}`);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch application');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateStatus = async (data: { recId: number; status: number; final?: boolean; score?: number; comment?: string }) => {
    setLoading(true);
    try {
      const result = await api.put('/api/RecruitementProcess/UpdateStatus', data);
      return result;
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { data, getReviews, addReview, getApplication, updateStatus, startSession, submitSession, loading, error };
}
