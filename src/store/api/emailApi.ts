import { baseApi } from './baseApi';

export interface Email {
  id: number;
  message_id: string;
  subject?: string;
  from_email?: string;
  from_name?: string;
  to_email?: string;
  body_text?: string;
  body_html?: string;
  date_received?: string;
  is_read: boolean;
  is_archived: boolean;
  related_casino_id?: number;
  ai_summary?: string;
  screenshot_url?: string;
  geo?: string;
  casino_name?: string;
  created_at: string;
}

export interface EmailsResponse {
  data: Email[];
  total: number;
  limit: number;
  offset: number;
}

export const emailApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getRecipients: builder.query<{ email: string; geo: string }[], void>({
      query: () => '/emails/recipients',
      providesTags: ['Email'],
    }),
    getEmails: builder.query<EmailsResponse, { limit?: number; offset?: number; is_read?: boolean; related_casino_id?: number; to_email?: string; date_from?: string; date_to?: string; geo?: string }>({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.offset) queryParams.append('offset', params.offset.toString());
        if (params.is_read !== undefined) queryParams.append('is_read', params.is_read.toString());
        if (params.related_casino_id) queryParams.append('related_casino_id', params.related_casino_id.toString());
        if (params.to_email) queryParams.append('to_email', params.to_email);
        if (params.date_from) queryParams.append('date_from', params.date_from);
        if (params.date_to) queryParams.append('date_to', params.date_to);
        if (params.geo) queryParams.append('geo', params.geo);
        return `/emails?${queryParams.toString()}`;
      },
      providesTags: ['Email'],
    }),
    getEmailsForCasinoByName: builder.query<EmailsResponse, { casinoId: number; limit?: number; offset?: number; to_email?: string }>({
      query: ({ casinoId, limit, offset, to_email } = { casinoId: 0 }) => {
        const queryParams = new URLSearchParams();
        if (limit) queryParams.append('limit', limit.toString());
        if (offset) queryParams.append('offset', offset.toString());
        if (to_email) queryParams.append('to_email', to_email);
        const qs = queryParams.toString();
        return `/emails/by-casino/${casinoId}${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Email'],
    }),
    getEmailAnalytics: builder.query<
      {
        data: { casino_id: number; casino_name: string; dt: string; cnt: number }[];
        date_from: string;
        date_to: string;
      },
      { date_from?: string; date_to?: string; to_email?: string; geo?: string }
    >({
      query: ({ date_from, date_to, to_email, geo } = {}) => {
        const p = new URLSearchParams();
        if (date_from) p.set('date_from', date_from);
        if (date_to) p.set('date_to', date_to);
        if (to_email) p.set('to_email', to_email);
        if (geo) p.set('geo', geo);
        const qs = p.toString();
        return `/emails/analytics${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Email'],
    }),
    getEmailById: builder.query<Email, number>({
      query: (id) => `/emails/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Email', id }],
    }),
    syncEmails: builder.mutation<
      { message: string; totalSynced?: number; results?: { accountId: number; name: string; synced: number; error?: string }[] },
      { accountId?: number } | void
    >({
      query: (params) => ({
        url: params?.accountId ? `/emails/sync?accountId=${params.accountId}` : '/emails/sync',
        method: 'POST',
      }),
      invalidatesTags: ['Email'],
    }),
    relinkEmails: builder.mutation<{ message: string; linked: number }, { reset?: boolean } | void>({
      query: (params) => ({
        url: `/emails/relink${params?.reset ? '?reset=true' : ''}`,
        method: 'POST',
      }),
      invalidatesTags: ['Email'],
    }),
    markEmailAsRead: builder.mutation<Email, number>({
      query: (id) => ({
        url: `/emails/${id}/read`,
        method: 'PATCH',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Email', id }],
    }),
    linkEmailToCasino: builder.mutation<Email, { id: number; casino_id: number }>({
      query: ({ id, casino_id }) => ({
        url: `/emails/${id}/link-casino`,
        method: 'PATCH',
        body: { casino_id },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Email', id }],
    }),
    requestEmailSummary: builder.mutation<Email, number>({
      query: (id) => ({
        url: `/emails/${id}/summarize`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Email', id }, 'Email'],
    }),
    requestEmailScreenshot: builder.mutation<Email, number>({
      query: (id) => ({
        url: `/emails/${id}/screenshot`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, id) => [{ type: 'Email', id }, 'Email'],
    }),
  }),
});

export const {
  useGetRecipientsQuery,
  useGetEmailsQuery,
  useGetEmailsForCasinoByNameQuery,
  useGetEmailAnalyticsQuery,
  useGetEmailByIdQuery,
  useSyncEmailsMutation,
  useRelinkEmailsMutation,
  useMarkEmailAsReadMutation,
  useLinkEmailToCasinoMutation,
  useRequestEmailSummaryMutation,
  useRequestEmailScreenshotMutation,
} = emailApi;
