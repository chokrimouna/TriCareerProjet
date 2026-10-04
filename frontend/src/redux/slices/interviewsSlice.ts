import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { api } from '../../helpers/apiClient';

export const fetchAllInterviews = createAsyncThunk('interviews/fetchAll', async () => {
  return await api.get<any[]>('/api/RecruitementProcess');
});

type InterviewsState = {
  data: any[];
  loading: boolean;
  error: string | null;
};

const initialState: InterviewsState = {
  data: [],
  loading: false,
  error: null,
};

const interviewsSlice = createSlice({
  name: 'interviews',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllInterviews.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAllInterviews.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchAllInterviews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch interviews';
      });
  },
});

export default interviewsSlice.reducer;

