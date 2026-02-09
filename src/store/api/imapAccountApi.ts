import { baseApi } from './baseApi';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ConnectionType = 'imap' | 'gmail_oauth';

export interface ImapAccount {
  id: number;
  name: string;
  connection_type: ConnectionType;
  host: string;
  port: number;
  user: string;
  tls: boolean;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateImapAccountBody {
  name: string;
  host: string;
  port?: number;
  user: string;
  password: string;
  tls?: boolean;
  is_active?: boolean;
}

export interface UpdateImapAccountBody {
  name?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  tls?: boolean;
  is_active?: boolean;
}

export interface GmailOAuthStatus {
  configured: boolean;
}

export interface GmailAuthUrlResponse {
  url: string;
}

export interface GmailCallbackBody {
  code: string;
  name?: string;
}

// ---------------------------------------------------------------------------
// API
// ---------------------------------------------------------------------------

export const imapAccountApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // CRUD
    getImapAccounts: builder.query<ImapAccount[], void>({
      query: () => '/imap-accounts',
      providesTags: ['ImapAccount'],
    }),
    getImapAccountById: builder.query<ImapAccount, number>({
      query: (id) => `/imap-accounts/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'ImapAccount', id }],
    }),
    createImapAccount: builder.mutation<ImapAccount, CreateImapAccountBody>({
      query: (body) => ({
        url: '/imap-accounts',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ImapAccount'],
    }),
    updateImapAccount: builder.mutation<ImapAccount, { id: number; body: UpdateImapAccountBody }>({
      query: ({ id, body }) => ({
        url: `/imap-accounts/${id}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_result, _error, { id }) => [
        { type: 'ImapAccount', id },
        'ImapAccount',
      ],
    }),
    deleteImapAccount: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/imap-accounts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ImapAccount'],
    }),

    // Test connection
    testImapAccount: builder.mutation<
      { success: boolean; message?: string; error?: string },
      number
    >({
      query: (id) => ({
        url: `/imap-accounts/${id}/test`,
        method: 'POST',
      }),
    }),

    // Gmail OAuth
    getGmailOAuthStatus: builder.query<GmailOAuthStatus, void>({
      query: () => '/imap-accounts/gmail/status',
    }),
    getGmailAuthUrl: builder.query<GmailAuthUrlResponse, void>({
      query: () => '/imap-accounts/gmail/auth-url',
    }),
    gmailOAuthCallback: builder.mutation<ImapAccount, GmailCallbackBody>({
      query: (body) => ({
        url: '/imap-accounts/gmail/callback',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ImapAccount'],
    }),
  }),
});

export const {
  useGetImapAccountsQuery,
  useGetImapAccountByIdQuery,
  useCreateImapAccountMutation,
  useUpdateImapAccountMutation,
  useDeleteImapAccountMutation,
  useTestImapAccountMutation,
  useGetGmailOAuthStatusQuery,
  useLazyGetGmailAuthUrlQuery,
  useGmailOAuthCallbackMutation,
} = imapAccountApi;
