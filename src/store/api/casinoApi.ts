import { baseApi } from './baseApi';

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

export const casinoApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCasinos: builder.query<Casino[], void>({
      query: () => '/casinos',
      providesTags: ['Casino'],
    }),
    getCasinoById: builder.query<Casino, number>({
      query: (id) => `/casinos/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Casino', id }],
    }),
    createCasino: builder.mutation<Casino, CreateCasinoDto>({
      query: (body) => ({
        url: '/casinos',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Casino'],
    }),
    updateCasino: builder.mutation<Casino, { id: number; data: Partial<CreateCasinoDto> }>({
      query: ({ id, data }) => ({
        url: `/casinos/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Casino', id }],
    }),
    deleteCasino: builder.mutation<void, number>({
      query: (id) => ({
        url: `/casinos/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Casino'],
    }),
  }),
});

export const {
  useGetCasinosQuery,
  useGetCasinoByIdQuery,
  useCreateCasinoMutation,
  useUpdateCasinoMutation,
  useDeleteCasinoMutation,
} = casinoApi;
