import { useDispatch, useSelector } from 'react-redux';
import { useState } from 'react';
import { api } from '../helpers/apiClient';
import { updateUser } from '../redux/slices/authSlice';
import type { RootState } from '../redux/store';

export const useUpdateProfile = () => {
  const dispatch = useDispatch();
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateProfile = async (data: {
    name?: string;
    prename?: string;
    telephone?: string;
    email?: string;
    address?: string;
  }) => {
    setLoading(true);
    setError(null);
    try {
      // Map component names to API names if necessary, here we use lowercase as per instructions
      const res = await api.put<any>('/api/Users/profile', data);
      
      const updatedUser = {
        ...currentUser,
        Username: data.name ? `${data.name} ${data.prename || ''}`.trim() : currentUser?.Username,
        Email: data.email ?? currentUser?.Email,
        Address: data.address ?? (currentUser as any)?.Address,
        Role: currentUser?.Role, // ensure role persists
        Avatar: currentUser?.Avatar,
      };

      dispatch(updateUser(updatedUser));
      localStorage.setItem('tricareer_user', JSON.stringify(updatedUser));
      
      return true;
    } catch (e: any) {
      setError(e?.message || 'Update failed');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { updateProfile, loading, error };
};

