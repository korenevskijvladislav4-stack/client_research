import { baseApi } from './baseApi';
import { PaginatedResponse, QueryParams, buildQueryString } from '../../types/api.types';

export interface Casino {
  id: number;
  name: string;
  website?: string;
  description?: string;
  geo?: string[];
  is_our?: boolean;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface CreateCasinoDto {
  name: string;
  website?: string;
  description?: string;
  geo?: string[];
  is_our?: boolean;
  status?: 'active' | 'inactive' | 'pending';
}

export interface CasinoFilters {
  status?: string;
  is_our?: boolean;
  search?: string;
}

export interface CasinoQueryParams extends QueryParams {
  filters?: CasinoFilters;
}

export const casinoApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Paginated list
    getCasinos: builder.query<PaginatedResponse<Casino>, CasinoQueryParams | void>({
      query: (params) => `/casinos${buildQueryString(params || {})}`,
      providesTags: (result) =>
        result
          ? [
              ...result.data.map(({ id }) => ({ type: 'Casino' as const, id })),
              { type: 'Casino' as const, id: 'LIST' },
            ]
          : [{ type: 'Casino' as const, id: 'LIST' }],
    }),
    
    // All casinos (for dropdowns) - no pagination
    getAllCasinos: builder.query<Casino[], void>({
      query: () => '/casinos?pageSize=1000',
      transformResponse: (response: PaginatedResponse<Casino>) => response.data,
      providesTags: [{ type: 'Casino' as const, id: 'ALL' }],
    }),

    getCasinoById: builder.query<Casino, number>({
      query: (id) => `/casinos/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Casino' as const, id }],
    }),

    createCasino: builder.mutation<Casino, CreateCasinoDto>({
      query: (body) => ({
        url: '/casinos',
        method: 'POST',
        body,
      }),
      invalidatesTags: [{ type: 'Casino', id: 'LIST' }, { type: 'Casino', id: 'ALL' }],
    }),

    updateCasino: builder.mutation<Casino, { id: number; data: Partial<CreateCasinoDto> }>({
      query: ({ id, data }) => ({
        url: `/casinos/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'Casino', id },
        { type: 'Casino', id: 'LIST' },
        { type: 'Casino', id: 'ALL' },
      ],
    }),

    deleteCasino: builder.mutation<void, number>({
      query: (id) => ({
        url: `/casinos/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: [{ type: 'Casino', id: 'LIST' }, { type: 'Casino', id: 'ALL' }],
    }),
  }),
});

export const {
  useGetCasinosQuery,
  useGetAllCasinosQuery,
  useGetCasinoByIdQuery,
  useCreateCasinoMutation,
  useUpdateCasinoMutation,
  useDeleteCasinoMutation,
} = casinoApi;
