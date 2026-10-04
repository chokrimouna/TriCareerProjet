import { useCallback, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { api } from '../helpers/apiClient';
import { getRoleRedirect } from '../helpers/getRoleRedirect';
import { setCredentials } from '../redux/slices/authSlice';
import { toast } from 'sonner';
import type { AppDispatch } from '../redux/store';

export function useLogin() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const inFlightRef = useRef(false);

  return useCallback(async (username: string, password: string, redirectTo?: string) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    try {
      const data = await api.post<{ token: string; user: { Id: number; Email: string; Username: string; Role: string; Etat?: boolean; etat?: boolean } }>(
        '/api/Auth/login',
        { email: username, password },
      );
      
      const { token, user } = data;
      const isUserActive = user.Etat ?? user.etat ?? true;

      if (!isUserActive) {
        toast.error("Votre compte est inactif. Veuillez contacter l'administrateur.");
        return;
      }

      localStorage.setItem('tricareer_token', token);
      localStorage.setItem('tricareer_user', JSON.stringify(user));
      dispatch(setCredentials({ token, user }));

      // If a redirect URL was provided (e.g. from exam email link), navigate there directly
      const savedRedirect = sessionStorage.getItem('redirectAfterLogin');
      
      if (redirectTo) {
        navigate(redirectTo);
      } else if (savedRedirect && savedRedirect !== '/login' && savedRedirect !== '/') {
        sessionStorage.removeItem('redirectAfterLogin');
        navigate(savedRedirect, { replace: true });
      } else {
        const role = (data as { user?: { role?: string; Role?: string } }).user?.role || data.user?.Role || '';
        navigate(getRoleRedirect(role));
      }
    } catch (error: any) {
      toast.error(error?.message || "Erreur lors de la connexion");
    } finally {
      inFlightRef.current = false;
    }
  }, [dispatch, navigate]);
}
