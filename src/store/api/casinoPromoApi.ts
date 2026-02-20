import { baseApi } from './baseApi';
import { PaginationInfo, QueryParams, buildQueryString } from '../../types/api.types';

export type PromoCategory = 'tournament' | 'promotion';
export type PromoStatus = 'active' | 'paused' | 'expired' | 'draft';

export interface CasinoPromo {
  id: number;
  casino_id: number;
  casino_name?: string;
  geo: string;
  promo_category: PromoCategory;
  name: string;
  promo_type?: string | null;
  period_start?: string | null;
  period_end?: string | null;
  provider?: string | null;
  prize_fund?: string | null;
  mechanics?: string | null;
  min_bet?: string | null;
  wagering_prize?: string | null;
  status: PromoStatus;
  created_at?: string;
  updated_at?: string;
}

export interface CasinoPromoImage {
  id: number;
  casino_id: number;
  promo_id: number;
  file_path: string;
  original_name?: string;
  created_at: string;
  url: string;
}

export interface AllPromosResponse {
  data: CasinoPromo[];
  pagination?: PaginationInfo;
  total?: number;
}

export interface PromoFilters {
  casino_id?: number;
  geo?: string;
  promo_category?: string;
  promo_type?: string;
  status?: string;
}

export interface AllPromosParams extends QueryParams {
  filters?: PromoFilters;
}

export const casinoPromoApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllPromos: builder.query<AllPromosResponse, AllPromosParams>({
      query: (params = {}) => `/promos${buildQueryString(params)}`,
      transformResponse: (response: any): AllPromosResponse => {
        const data = Array.isArray(response?.data) ? response.data : [];
        const pagination = response?.pagination;
        return { data, pagination, total: pagination?.total ?? data.length };
      },
      providesTags: ['Promo'],
    }),

    getCasinoPromos: builder.query<CasinoPromo[], { casinoId: number; geo?: string }>({
      query: ({ casinoId, geo }) => {
        const params = new URLSearchParams();
        if (geo) params.append('geo', geo);
        const qs = params.toString();
        return `/casinos/${casinoId}/promos${qs ? `?${qs}` : ''}`;
      },
      providesTags: (_result, _error, arg) => [
        { type: 'Promo' as const, id: `CASINO_${arg.casinoId}` },
      ],
    }),

    createCasinoPromo: builder.mutation<CasinoPromo, { casinoId: number } & Partial<CasinoPromo>>({
      query: ({ casinoId, ...body }) => ({
        url: `/casinos/${casinoId}/promos`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        'Promo',
        { type: 'Promo' as const, id: `CASINO_${arg.casinoId}` },
      ],
    }),

    updateCasinoPromo: builder.mutation<
      CasinoPromo,
      { casinoId: number; id: number; patch: Partial<CasinoPromo> }
    >({
      query: ({ casinoId, id, patch }) => ({
        url: `/casinos/${casinoId}/promos/${id}`,
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: (_result, _error, arg) => [
        'Promo',
        { type: 'Promo' as const, id: `CASINO_${arg.casinoId}` },
      ],
    }),

    deleteCasinoPromo: builder.mutation<{ success: boolean }, { casinoId: number; id: number }>({
      query: ({ casinoId, id }) => ({
        url: `/casinos/${casinoId}/promos/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, arg) => [
        'Promo',
        { type: 'Promo' as const, id: `CASINO_${arg.casinoId}` },
      ],
    }),

    getPromoImages: builder.query<CasinoPromoImage[], { casinoId: number; promoId: number }>({
      query: ({ casinoId, promoId }) => `/casinos/${casinoId}/promos/${promoId}/images`,
      providesTags: (_result, _error, { casinoId }) => [{ type: 'CasinoComment', id: casinoId }],
    }),

    uploadPromoImages: builder.mutation<
      CasinoPromoImage[],
      { casinoId: number; promoId: number; files: File[] }
    >({
      query: ({ casinoId, promoId, files }) => {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append('images', file);
        });
        return {
          url: `/casinos/${casinoId}/promos/${promoId}/images`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { casinoId }) => [{ type: 'CasinoComment', id: casinoId }],
    }),

    deletePromoImage: builder.mutation<
      { message: string },
      { casinoId: number; promoId: number; imageId: number }
    >({
      query: ({ casinoId, promoId, imageId }) => ({
        url: `/casinos/${casinoId}/promos/${promoId}/images/${imageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { casinoId }) => [{ type: 'CasinoComment', id: casinoId }],
    }),
  }),
});

export const {
  useGetAllPromosQuery,
  useGetCasinoPromosQuery,
  useCreateCasinoPromoMutation,
  useUpdateCasinoPromoMutation,
  useDeleteCasinoPromoMutation,
  useGetPromoImagesQuery,
  useUploadPromoImagesMutation,
  useDeletePromoImageMutation,
} = casinoPromoApi;
