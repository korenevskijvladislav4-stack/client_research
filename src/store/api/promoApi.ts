import { baseApi } from './baseApi';

export interface PromoCampaign {
  id: number;
  casino_id: number;
  geo?: string | null;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  promo_code?: string;
  bonus_type?: string;
  bonus_amount?: number;
  wagering_requirement?: number;
  status: 'active' | 'expired' | 'upcoming';
  created_at: string;
  updated_at: string;
}

export interface CreatePromoDto {
  casino_id: number;
  geo?: string;
  title: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  promo_code?: string;
  bonus_type?: string;
  bonus_amount?: number;
  wagering_requirement?: number;
  status?: 'active' | 'expired' | 'upcoming';
}

export const promoApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getPromos: builder.query<PromoCampaign[], { casino_id?: number; geo?: string } | void>({
      query: (params) => {
        if (params && (params.casino_id || params.geo)) {
          const qs = new URLSearchParams();
          if (params.casino_id) qs.append('casino_id', String(params.casino_id));
          if (params.geo) qs.append('geo', params.geo);
          return `/promos?${qs.toString()}`;
        }
        return '/promos';
      },
      providesTags: ['Promo'],
    }),
    getPromoById: builder.query<PromoCampaign, number>({
      query: (id) => `/promos/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Promo', id }],
    }),
    createPromo: builder.mutation<PromoCampaign, CreatePromoDto>({
      query: (body) => ({
        url: '/promos',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Promo'],
    }),
    updatePromo: builder.mutation<PromoCampaign, { id: number; data: Partial<CreatePromoDto> }>({
      query: ({ id, data }) => ({
        url: `/promos/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Promo', id }],
    }),
    deletePromo: builder.mutation<void, number>({
      query: (id) => ({
        url: `/promos/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Promo'],
    }),
  }),
});

export const {
  useGetPromosQuery,
  useGetPromoByIdQuery,
  useCreatePromoMutation,
  useUpdatePromoMutation,
  useDeletePromoMutation,
} = promoApi;
