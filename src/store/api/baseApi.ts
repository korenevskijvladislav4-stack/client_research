import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { message } from 'antd';
import { getApiBaseUrl } from '../../config/api';
import { logout } from '../slices/authSlice';
import type { RootState } from '../store';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: getApiBaseUrl(),
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as RootState).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

const baseQuery = async (
  args: Parameters<typeof rawBaseQuery>[0],
  api: Parameters<typeof rawBaseQuery>[1],
  extraOptions: Parameters<typeof rawBaseQuery>[2],
) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error) {
    const status = result.error.status;
    if (status === 401) {
      api.dispatch(logout());
      const msg = getApiErrorMessage(result.error, 'Сессия истекла. Войдите снова.');
      message.error(msg);
    } else if (
      status === 'FETCH_ERROR' ||
      status === 'PARSING_ERROR' ||
      status === 'TIMEOUT_ERROR'
    ) {
      message.error('Сервер недоступен. Проверьте подключение или попробуйте позже.');
    }
  }
  return result;
};

export const baseApi = createApi({
  baseQuery,
  tagTypes: ['Casino', 'Email', 'EmailTopics', 'Profile', 'Bonus', 'CasinoComment', 'BonusNames', 'PaymentTypes', 'PaymentMethods', 'PromoTypes', 'Providers', 'ProfileField', 'ProfileContext', 'ProfileSetting', 'Comment', 'CasinoAccount', 'AccountTransaction', 'User', 'SlotSelector', 'SlotScreenshot', 'ScreenshotGallery', 'Geo', 'CasinoPayment', 'Slot', 'ImapAccount', 'Tag', 'CasinoTag', 'CasinoHistory', 'Promo', 'Chat', 'ChatAiModels', 'AiEmailProposals'],
  endpoints: () => ({}),
});

/** Extract user-facing error text from an RTK Query error object */
export function getApiErrorMessage(error: unknown, fallback = 'Произошла ошибка'): string {
  if (!error || typeof error !== 'object') return fallback;
  const err = error as Record<string, unknown>;
  const status = err.status;
  if (status === 'FETCH_ERROR' || status === 'PARSING_ERROR' || status === 'TIMEOUT_ERROR') {
    return 'Сервер недоступен. Проверьте подключение или попробуйте позже.';
  }
  const data = err.data;
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>;
    if (typeof d.error === 'string') return d.error;
    if (typeof d.message === 'string') return d.message;
  }
  if (typeof err.message === 'string') return err.message;
  return fallback;
}
