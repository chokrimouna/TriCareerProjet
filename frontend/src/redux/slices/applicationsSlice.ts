import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '../../helpers/apiClient';

export const fetchAllApplications = createAsyncThunk('applications/fetchAll', async () => {
  return await api.get<any[]>('/api/Application');
});

type ApplicationsState = {
  data: any[];
  loading: boolean;
  error: string | null;
};

const initialState: ApplicationsState = {
  data: [],
  loading: false,
  error: null,
};

const applicationsSlice = createSlice({
  name: 'applications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllApplications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllApplications.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchAllApplications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch applications';
      });
  },
});

export default applicationsSlice.reducer;

