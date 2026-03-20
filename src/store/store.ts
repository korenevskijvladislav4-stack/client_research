import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import { baseApi } from './api/baseApi';

import './api/casinoApi';
import './api/casinoProfileApi';
import './api/casinoBonusApi';
import './api/casinoPaymentApi';
import './api/casinoPromoApi';
import './api/casinoCommentApi';
import './api/casinoAccountApi';
import './api/casinoProviderApi';
import './api/emailApi';
import './api/geoApi';
import './api/imapAccountApi';
import './api/profileSettingsApi';
import './api/referenceApi';
import './api/slotSelectorApi';
import './api/tagApi';
import './api/userApi';
import './api/chatApi';
import './api/chatModelsApi';
import './api/aiEmailProposalsApi';

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
