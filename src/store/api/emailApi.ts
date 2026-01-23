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
  related_promo_id?: number;
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
    getEmails: builder.query<EmailsResponse, { limit?: number; offset?: number; is_read?: boolean; related_casino_id?: number }>({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.offset) queryParams.append('offset', params.offset.toString());
        if (params.is_read !== undefined) queryParams.append('is_read', params.is_read.toString());
        if (params.related_casino_id) queryParams.append('related_casino_id', params.related_casino_id.toString());
        return `/emails?${queryParams.toString()}`;
      },
      providesTags: ['Email'],
    }),
    getEmailsForCasinoByName: builder.query<EmailsResponse, { casinoId: number; limit?: number; offset?: number }>({
      query: ({ casinoId, limit, offset } = { casinoId: 0 }) => {
        const queryParams = new URLSearchParams();
        if (limit) queryParams.append('limit', limit.toString());
        if (offset) queryParams.append('offset', offset.toString());
        const qs = queryParams.toString();
        return `/emails/by-casino/${casinoId}${qs ? `?${qs}` : ''}`;
      },
      providesTags: ['Email'],
    }),
    getEmailById: builder.query<Email, number>({
      query: (id) => `/emails/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'Email', id }],
    }),
    syncEmails: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/emails/sync',
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
    linkEmailToPromo: builder.mutation<Email, { id: number; promo_id: number }>({
      query: ({ id, promo_id }) => ({
        url: `/emails/${id}/link-promo`,
        method: 'PATCH',
        body: { promo_id },
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'Email', id }],
    }),
  }),
});

export const {
  useGetEmailsQuery,
  useGetEmailsForCasinoByNameQuery,
  useGetEmailByIdQuery,
  useSyncEmailsMutation,
  useMarkEmailAsReadMutation,
  useLinkEmailToCasinoMutation,
  useLinkEmailToPromoMutation,
} = emailApi;
