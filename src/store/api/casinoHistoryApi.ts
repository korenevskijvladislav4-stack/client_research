import { baseApi } from './baseApi';

export interface HistoryEntry {
  id: number;
  casino_id: number;
  field_id?: number | null;
  action: string;
  old_value_json?: any;
  new_value_json?: any;
  meta_json?: any;
  created_at: string;
  actor_user_id?: number | null;
  actor_username?: string | null;
  field_label?: string | null;
  field_key?: string | null;
}

export interface HistoryResponse {
  data: HistoryEntry[];
  total: number;
  limit: number;
  offset: number;
}

export const casinoHistoryApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCasinoHistory: builder.query<
      HistoryResponse,
      { casinoId: number; limit?: number; offset?: number }
    >({
      query: ({ casinoId, limit = 50, offset = 0 }) =>
        `/casinos/${casinoId}/history?limit=${limit}&offset=${offset}`,
      providesTags: ['CasinoHistory'],
    }),
  }),
});

export const { useGetCasinoHistoryQuery } = casinoHistoryApi;
