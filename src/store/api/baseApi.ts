import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: 'http://research_api.supporthelper.website/api',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as any).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const baseApi = createApi({
  baseQuery,
  tagTypes: ['Casino', 'Promo', 'Email', 'Profile', 'Bonus', 'CasinoComment', 'BonusNames', 'PaymentTypes', 'PaymentMethods', 'ProfileField', 'ProfileContext', 'ProfileSetting', 'Comment', 'CasinoAccount', 'User', 'SlotSelector', 'SlotScreenshot', 'ScreenshotGallery', 'Geo', 'CasinoPayment', 'Slot'],
  endpoints: () => ({}),
});
