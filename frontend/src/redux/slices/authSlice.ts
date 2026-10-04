import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type AuthUser = {
  Id: number;
  Email: string;
  Username: string;
  Role: string;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
};

const initialToken = localStorage.getItem('tricareer_token');
const initialUserRaw = localStorage.getItem('tricareer_user');
const initialUser = initialUserRaw ? JSON.parse(initialUserRaw) : null;

const initialState: AuthState = {
  user: initialUser,
  token: initialToken,
  isAuthenticated: !!initialToken,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action: PayloadAction<{ user: AuthUser; token: string }>) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      localStorage.clear();
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;

