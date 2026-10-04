import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '../../helpers/apiClient';

export const fetchAllUsers = createAsyncThunk('users/fetchAll', async () => {
  return await api.get<any[]>('/api/Users');
});

type UsersState = {
  data: any[];
  loading: boolean;
  error: string | null;
};

const initialState: UsersState = {
  data: [],
  loading: false,
  error: null,
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchAllUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch users';
      });
  },
});

export default usersSlice.reducer;

