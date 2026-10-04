import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '../helpers/apiClient';
import { getRoleRedirect } from '../helpers/getRoleRedirect';
import { setCredentials } from '../redux/slices/authSlice';
import type { AppDispatch } from '../redux/store';

type RegisterUser = {
  Id: number;
  Email: string;
  Username: string;
  Role: string;
};

export const useRegister = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const register = async (
    name: string,
    prename: string,
    email: string,
    password: string,
    roleId: number,
    telephone?: string,
  ) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.post<{ token: string; user: RegisterUser }>(
        '/api/Auth/register',
        { name, prename, email, password, roleId, telephone },
      );
      localStorage.setItem('tricareer_token', data.token);
      localStorage.setItem('tricareer_user', JSON.stringify(data.user));
      dispatch(setCredentials({ token: data.token, user: data.user }));
      toast.success('Compte créé avec succès !');
      const role = (data as { user?: { role?: string; Role?: string } }).user?.role || data.user?.Role || '';
      navigate(getRoleRedirect(role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return { register, loading, error };
};
