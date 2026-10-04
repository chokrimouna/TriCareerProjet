import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '../helpers/apiClient';

type InviteCandidatePayload = {
  name: string;
  prename: string;
  email: string;
  jobPostingId?: number;
};

export function useInviteCandidate() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inviteCandidate = async (payload: InviteCandidatePayload) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.post<any>('/api/Users/invite-candidate', payload);
      toast.success(`Invitation sent to ${payload.email}`);
      return result;
    } catch (e: any) {
      const message = e?.message || 'Failed to invite candidate';
      setError(message);
      toast.error(message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { inviteCandidate, loading, error };
}
