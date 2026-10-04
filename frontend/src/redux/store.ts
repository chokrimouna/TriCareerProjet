import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import applicationsReducer from './slices/applicationsSlice';
import usersReducer from './slices/usersSlice';
import interviewsReducer from './slices/interviewsSlice';


export const store = configureStore({
  reducer: {
    auth: authReducer,
    applications: applicationsReducer,
    users: usersReducer,
    interviews: interviewsReducer,

  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

