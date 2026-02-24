import { baseApi } from './baseApi';

export interface ProviderAnalyticsParams {
  geo?: string[];
  casino_id?: number[];
  provider_id?: number[];
}

export interface ProviderAnalyticsResponse {
  casinos: { id: number; name: string }[];
  providers: { id: number; name: string }[];
  connections: { casino_id: number; provider_id: number }[];
}

export interface CasinoProviderItem {
  id: number;
  casino_id: number;
  provider_id: number;
  geo: string;
  created_at?: string;
  provider_name: string;
}

export interface ExtractAndAddResult {
  names: string[];
  added: number;
  message?: string;
}

export const casinoProviderApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getProviderAnalytics: builder.query<ProviderAnalyticsResponse, ProviderAnalyticsParams | void>({
      query: (params = {}) => {
        const p = new URLSearchParams();
        params?.geo?.forEach((g) => p.append('geo', g));
        params?.casino_id?.forEach((id) => p.append('casino_id', String(id)));
        params?.provider_id?.forEach((id) => p.append('provider_id', String(id)));
        const qs = p.toString();
        return `/providers/analytics${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Promo'],
    }),

    getCasinoProviders: builder.query<CasinoProviderItem[], { casinoId: number; geo?: string }>({
      query: ({ casinoId, geo }) => {
        const params = new URLSearchParams();
        if (geo) params.set('geo', geo);
        const qs = params.toString();
        return `/casinos/${casinoId}/providers${qs ? `?${qs}` : ''}`;
      },
      providesTags: (_result, _error, { casinoId }) => [
        { type: 'Casino' as const, id: `PROVIDERS_${casinoId}` },
      ],
    }),

    addProviderToCasino: builder.mutation<
      CasinoProviderItem,
      { casinoId: number; provider_id?: number; provider_name?: string; geo: string }
    >({
      query: ({ casinoId, ...body }) => ({
        url: `/casinos/${casinoId}/providers`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { casinoId }) => [
        { type: 'Casino', id: `PROVIDERS_${casinoId}` },
        'Providers',
      ],
    }),

    removeProviderFromCasino: builder.mutation<
      { ok: boolean },
      { casinoId: number; providerId: number; geo?: string }
    >({
      query: ({ casinoId, providerId, geo }) => {
        const params = new URLSearchParams();
        if (geo) params.set('geo', geo);
        const qs = params.toString();
        return {
          url: `/casinos/${casinoId}/providers/${providerId}${qs ? `?${qs}` : ''}`,
          method: 'DELETE',
        };
      },
      invalidatesTags: (_result, _error, { casinoId }) => [
        { type: 'Casino', id: `PROVIDERS_${casinoId}` },
      ],
    }),

    extractAndAddProviders: builder.mutation<
      ExtractAndAddResult,
      { casinoId: number; text: string; geo: string }
    >({
      query: ({ casinoId, ...body }) => ({
        url: `/casinos/${casinoId}/providers/extract-ai`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, { casinoId }) => [
        { type: 'Casino', id: `PROVIDERS_${casinoId}` },
        'Providers',
      ],
    }),
  }),
});

export const {
  useGetProviderAnalyticsQuery,
  useGetCasinoProvidersQuery,
  useAddProviderToCasinoMutation,
  useRemoveProviderFromCasinoMutation,
  useExtractAndAddProvidersMutation,
} = casinoProviderApi;
