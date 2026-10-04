import { useState } from 'react';
import { toast } from 'sonner';
import { api } from '../helpers/apiClient';

type CreateUserPayload = {
  name: string;
  prename: string;
  email: string;
  roleId: number;
  telephone?: string;
};

export function useCreateUser() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createUser = async (payload: CreateUserPayload) => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.post<any>('/api/Users/create', payload);
      toast.success(`Utilisateur créé, identifiants envoyés à ${payload.email}`);
      return result;
    } catch (e: any) {
      const message = e?.message || "Échec de la création de l'utilisateur";
      setError(message);
      toast.error(message);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  return { createUser, loading, error };
}
