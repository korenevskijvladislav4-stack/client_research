import { baseApi } from './baseApi';
import { PaginationInfo, QueryParams, buildQueryString } from '../../types/api.types';

/** Направление платёжного решения: Депозит / Выплата */
export type PaymentDirection = 'deposit' | 'withdrawal';

export interface CasinoPayment {
  id: number;
  casino_id: number;
  geo: string;
  direction: PaymentDirection;
  type: string;
  method: string;
  min_amount?: number | null;
  max_amount?: number | null;
  currency?: string | null;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CasinoPaymentImage {
  id: number;
  casino_id: number;
  payment_id: number;
  file_path: string;
  original_name?: string;
  created_at: string;
  url: string;
  payment_name?: string;
}

export interface GetAllPaymentsResponse {
  data: (CasinoPayment & { casino_name?: string })[];
  pagination?: PaginationInfo;
  total?: number;
  limit?: number;
  offset?: number;
}

export interface PaymentFilters {
  casino_id?: number;
  geo?: string;
  type?: string;
  method?: string;
  direction?: PaymentDirection;
}

export interface GetAllPaymentsParams extends QueryParams {
  filters?: PaymentFilters;
  // legacy flat params (backward compatibility)
  casino_id?: number;
  geo?: string;
  type?: string;
  method?: string;
  direction?: PaymentDirection;
  search?: string;
  limit?: number;
  offset?: number;
}

export const casinoPaymentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllPayments: builder.query<GetAllPaymentsResponse, GetAllPaymentsParams>({
      query: (params) => {
        const normalized: GetAllPaymentsParams = { ...params };

        if (!normalized.filters) {
          const legacyFilters: PaymentFilters = {
            casino_id: params.casino_id,
            geo: params.geo,
            type: params.type,
            method: params.method,
            direction: params.direction,
          };
          const cleanLegacyFilters = Object.fromEntries(
            Object.entries(legacyFilters).filter(([, value]) => value !== undefined && value !== null && value !== '')
          ) as PaymentFilters;
          if (Object.keys(cleanLegacyFilters).length > 0) {
            normalized.filters = cleanLegacyFilters;
          }
        }

        if (!normalized.pageSize && params.limit) {
          normalized.pageSize = params.limit;
        }
        if (!normalized.page && params.limit && params.offset !== undefined) {
          normalized.page = Math.floor(params.offset / params.limit) + 1;
        }

        return `/payments${buildQueryString(normalized)}`;
      },
      transformResponse: (response: any): GetAllPaymentsResponse => {
        const data = Array.isArray(response?.data) ? response.data : [];
        const pagination = response?.pagination;
        return {
          data,
          pagination,
          total: response?.total ?? pagination?.total ?? data.length,
          limit: response?.limit ?? pagination?.pageSize ?? data.length,
          offset:
            response?.offset ??
            (pagination ? Math.max(0, (pagination.page - 1) * pagination.pageSize) : 0),
        };
      },
      providesTags: ['CasinoPayment'],
    }),
    getCasinoPayments: builder.query<CasinoPayment[], { casinoId: number; geo?: string }>({
      query: ({ casinoId, geo }) => {
        const params = new URLSearchParams();
        if (geo) params.append('geo', geo);
        const qs = params.toString();
        return `/casinos/${casinoId}/payments${qs ? `?${qs}` : ''}`;
      },
      providesTags: (_result, _error, arg) => [
        { type: 'CasinoPayment' as const, id: `CASINO_${arg.casinoId}` },
      ],
    }),
    createCasinoPayment: builder.mutation<CasinoPayment, { casinoId: number } & Partial<CasinoPayment>>({
      query: ({ casinoId, ...body }) => ({
        url: `/casinos/${casinoId}/payments`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'CasinoPayment' as const, id: `CASINO_${arg.casinoId}` },
      ],
    }),
    updateCasinoPayment: builder.mutation<
      CasinoPayment,
      { casinoId: number; id: number; patch: Partial<CasinoPayment> }
    >({
      query: ({ casinoId, id, patch }) => ({
        url: `/casinos/${casinoId}/payments/${id}`,
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'CasinoPayment' as const, id: `CASINO_${arg.casinoId}` },
      ],
    }),
    deleteCasinoPayment: builder.mutation<{ message: string }, { casinoId: number; id: number }>({
      query: ({ casinoId, id }) => ({
        url: `/casinos/${casinoId}/payments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'CasinoPayment' as const, id: `CASINO_${arg.casinoId}` },
      ],
    }),
    getPaymentImages: builder.query<CasinoPaymentImage[], { casinoId: number; paymentId: number }>({
      query: ({ casinoId, paymentId }) => `/casinos/${casinoId}/payments/${paymentId}/images`,
      providesTags: (_result, _error, { casinoId }) => [{ type: 'CasinoComment', id: casinoId }],
    }),
    uploadPaymentImages: builder.mutation<
      CasinoPaymentImage[],
      { casinoId: number; paymentId: number; files: File[] }
    >({
      query: ({ casinoId, paymentId, files }) => {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append('images', file);
        });
        return {
          url: `/casinos/${casinoId}/payments/${paymentId}/images`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { casinoId }) => [{ type: 'CasinoComment', id: casinoId }],
    }),
    deletePaymentImage: builder.mutation<
      { message: string },
      { casinoId: number; paymentId: number; imageId: number }
    >({
      query: ({ casinoId, paymentId, imageId }) => ({
        url: `/casinos/${casinoId}/payments/${paymentId}/images/${imageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { casinoId }) => [{ type: 'CasinoComment', id: casinoId }],
    }),
  }),
});

export const {
  useGetAllPaymentsQuery,
  useGetCasinoPaymentsQuery,
  useCreateCasinoPaymentMutation,
  useUpdateCasinoPaymentMutation,
  useDeleteCasinoPaymentMutation,
  useGetPaymentImagesQuery,
  useUploadPaymentImagesMutation,
  useDeletePaymentImageMutation,
} = casinoPaymentApi;
