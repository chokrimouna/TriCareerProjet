import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../redux/slices/authSlice';
import type { AppDispatch } from '../redux/store';

export function useLogout() {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  return () => {
    dispatch(logout());
    localStorage.clear();
    navigate('/jobs');
  };
}

