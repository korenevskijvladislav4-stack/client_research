import { baseApi } from './baseApi';
import { PaginatedResponse, QueryParams, buildQueryString } from '../../types/api.types';

export interface PromoCampaign {
  id: number;
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
  status: 'active' | 'upcoming' | 'expired';
  created_at?: string;
  updated_at?: string;
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
  status?: 'active' | 'upcoming' | 'expired';
}

export interface PromoFilters {
  casino_id?: number;
  geo?: string;
  status?: string;
  search?: string;
}

export interface PromoQueryParams extends QueryParams {
  filters?: PromoFilters;
}

export const promoApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Paginated list
    getPromos: builder.query<PaginatedResponse<PromoCampaign>, PromoQueryParams | void>({
      query: (params) => `/promos${buildQueryString(params || {})}`,
      providesTags: (result) =>
        result?.data && Array.isArray(result.data)
          ? [
              ...result.data.map(({ id }) => ({ type: 'Promo' as const, id })),
              { type: 'Promo' as const, id: 'LIST' },
            ]
          : [{ type: 'Promo' as const, id: 'LIST' }],
    }),

    // All promos (for dropdowns)
    getAllPromos: builder.query<PromoCampaign[], void>({
      query: () => '/promos?pageSize=1000',
      transformResponse: (response: PaginatedResponse<PromoCampaign>) => response.data,
      providesTags: [{ type: 'Promo' as const, id: 'ALL' }],
    }),

    getPromoById: builder.query<PromoCampaign, number>({
      query: (id) => `/promos/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Promo' as const, id }],
    }),

    createPromo: builder.mutation<PromoCampaign, CreatePromoDto>({
      query: (body) => ({
        url: '/promos',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Promo', id: 'LIST' }, { type: 'Promo', id: 'ALL' }],
    }),

    updatePromo: builder.mutation<PromoCampaign, { id: number; data: Partial<CreatePromoDto> }>({
      query: ({ id, data }) => ({
        url: `/promos/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Promo', id },
        { type: 'Promo', id: 'LIST' },
        { type: 'Promo', id: 'ALL' },
      ],
    }),

    deletePromo: builder.mutation<void, number>({
      query: (id) => ({
        url: `/promos/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Promo', id: 'LIST' }, { type: 'Promo', id: 'ALL' }],
    }),
  }),
});

export const {
  useGetPromosQuery,
  useGetAllPromosQuery,
  useGetPromoByIdQuery,
  useCreatePromoMutation,
  useUpdatePromoMutation,
  useDeletePromoMutation,
} = promoApi;
