import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import { baseApi } from './api/baseApi';
import './api/casinoProfileApi';
import './api/casinoBonusApi';
import './api/casinoPaymentApi';
import './api/geoApi';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(baseApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
