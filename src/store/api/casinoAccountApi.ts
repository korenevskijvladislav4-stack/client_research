import { baseApi } from './baseApi';
import { PaginatedResponse, QueryParams, buildQueryString } from '../../types/api.types';

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
  deposit_count?: number;
  withdrawal_count?: number;
}

export type AccountTransactionType = 'deposit' | 'withdrawal';

export interface AccountTransaction {
  id: number;
  account_id: number;
  type: AccountTransactionType;
  amount: number;
  currency?: string | null;
  transaction_date: string;
  notes?: string | null;
  created_at: string;
  casino_name?: string | null;
  casino_id?: number;
  geo?: string | null;
  email?: string | null;
}

export interface CreateAccountTransactionDto {
  type: AccountTransactionType;
  amount: number;
  currency?: string | null;
  transaction_date?: string;
  notes?: string | null;
}

export interface GetTransactionsParams extends QueryParams {
  account_id?: number;
  casino_id?: number;
  type?: AccountTransactionType;
  date_from?: string;
  date_to?: string;
}

export interface AccountFilters {
  casino_id?: number;
  geo?: string;
  owner_id?: number;
}

export interface AllAccountsParams extends QueryParams {
  filters?: AccountFilters;
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
    getAllAccounts: builder.query<PaginatedResponse<CasinoAccount>, AllAccountsParams | void>({
      query: (params) => `/accounts${buildQueryString(params || {})}`,
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
    getTransactions: builder.query<
      { data: AccountTransaction[]; pagination: { page: number; pageSize: number; total: number; totalPages: number } },
      GetTransactionsParams | void
    >({
      query: (params) => {
        const p = params || {};
        const q = new URLSearchParams();
        if (p.page) q.set('page', String(p.page));
        if (p.pageSize) q.set('pageSize', String(p.pageSize));
        if (p.account_id) q.set('account_id', String(p.account_id));
        if (p.casino_id) q.set('casino_id', String(p.casino_id));
        if (p.type) q.set('type', p.type);
        if (p.date_from) q.set('date_from', p.date_from);
        if (p.date_to) q.set('date_to', p.date_to);
        const qs = q.toString();
        return `/accounts/transactions${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['AccountTransaction'],
    }),
    createAccountTransaction: builder.mutation<AccountTransaction, { accountId: number; data: CreateAccountTransactionDto }>({
      query: ({ accountId, data }) => ({
        url: `/accounts/${accountId}/transactions`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['CasinoAccount', 'AccountTransaction'],
    }),
  }),
});

export const {
  useGetAllAccountsQuery,
  useGetCasinoAccountsQuery,
  useCreateCasinoAccountMutation,
  useUpdateCasinoAccountMutation,
  useDeleteCasinoAccountMutation,
  useGetTransactionsQuery,
  useCreateAccountTransactionMutation,
} = casinoAccountApi;
