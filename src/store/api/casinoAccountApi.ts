import { baseApi } from './baseApi';

export interface CasinoAccount {
  id: number;
  casino_id: number;
  casino_name?: string | null;
  geo: string;
  email?: string | null;
  phone?: string | null;
  password: string;
  owner_id?: number | null;
  owner_username?: string | null;
  last_modified_at: string;
  created_at: string;
  updated_at: string;
}

export interface AllAccountsParams {
  casino_id?: number;
  geo?: string;
  owner_id?: number;
  search?: string;
}

export interface CreateCasinoAccountDto {
  geo: string;
  email?: string | null;
  phone?: string | null;
  password: string;
  owner_id?: number | null;
}

export interface UpdateCasinoAccountDto {
  geo?: string;
  email?: string | null;
  phone?: string | null;
  password?: string;
  owner_id?: number | null;
}

export const casinoAccountApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllAccounts: builder.query<CasinoAccount[], AllAccountsParams | void>({
      query: (params) => ({ url: `/accounts`, params: (params as any) || undefined }),
      providesTags: [{ type: 'CasinoAccount', id: 'ALL' }],
    }),
    getCasinoAccounts: builder.query<CasinoAccount[], number>({
      query: (casinoId) => `/casinos/${casinoId}/accounts`,
      providesTags: (_result, _error, casinoId) => [{ type: 'CasinoAccount', id: casinoId }],
    }),
    createCasinoAccount: builder.mutation<CasinoAccount, { casinoId: number; data: CreateCasinoAccountDto }>({
      query: ({ casinoId, data }) => ({
        url: `/casinos/${casinoId}/accounts`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { casinoId }) => [{ type: 'CasinoAccount', id: casinoId }],
    }),
    updateCasinoAccount: builder.mutation<CasinoAccount, { id: number; data: UpdateCasinoAccountDto }>({
      query: ({ id, data }) => ({
        url: `/accounts/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'CasinoAccount', id }],
    }),
    deleteCasinoAccount: builder.mutation<void, number>({
      query: (id) => ({
        url: `/accounts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'CasinoAccount', id }],
    }),
  }),
});

export const {
  useGetAllAccountsQuery,
  useGetCasinoAccountsQuery,
  useCreateCasinoAccountMutation,
  useUpdateCasinoAccountMutation,
  useDeleteCasinoAccountMutation,
} = casinoAccountApi;
