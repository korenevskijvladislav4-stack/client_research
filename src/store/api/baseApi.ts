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

const baseQuery = async (args: any, api: any, extraOptions: any) => {
  const result = await rawBaseQuery(args, api, extraOptions);
  if (result.error) {
    const status = result.error.status;
    if (status === 401) {
      api.dispatch(logout());
      const msg = (result.error?.data as any)?.error;
      message.error(msg || 'Сессия истекла. Войдите снова.');
    } else if (
      status === 'FETCH_ERROR' ||
      status === 'PARSING_ERROR' ||
      status === 'TIMEOUT_ERROR'
    ) {
      message.error('Сервер недоступен. Проверьте подключение или попробуйте позже.');
    } else {
      // Показываем текст ошибки с бэкенда для остальных статусов
      const msg = getApiErrorMessage(result.error);
      message.error(msg);
    }
  }
  return result;
};

export const baseApi = createApi({
  baseQuery,
  tagTypes: ['Casino', 'Email', 'EmailTopics', 'Profile', 'Bonus', 'CasinoComment', 'BonusNames', 'PaymentTypes', 'PaymentMethods', 'PromoTypes', 'Providers', 'ProfileField', 'ProfileContext', 'ProfileSetting', 'Comment', 'CasinoAccount', 'AccountTransaction', 'User', 'SlotSelector', 'SlotScreenshot', 'ScreenshotGallery', 'Geo', 'CasinoPayment', 'Slot', 'ImapAccount', 'Tag', 'CasinoTag', 'CasinoHistory', 'Promo'],
  endpoints: () => ({}),
});

/** Текст ошибки с бэкенда для показа пользователю */
export function getApiErrorMessage(error: any, fallback = 'Ошибка запроса'): string {
  if (!error) return fallback;
  const status = error?.status;
  if (status === 'FETCH_ERROR' || status === 'PARSING_ERROR' || status === 'TIMEOUT_ERROR') {
    return 'Сервер недоступен. Проверьте подключение или попробуйте позже.';
  }
  const data = error?.data;
  if (data && typeof data === 'object') {
    if (typeof data.error === 'string') return data.error;
    if (typeof data.message === 'string') return data.message;
  }
  if (typeof error?.message === 'string') return error.message;
  return fallback;
}
