import { baseApi } from './baseApi';

export type AiEmailProposalType = 'bonus' | 'promo';
export type AiEmailProposalStatus = 'pending' | 'approved' | 'rejected';

export interface AiEmailProposalListItem {
  id: number;
  email_id: number;
  topic_id: number | null;
  proposal_type: AiEmailProposalType;
  status: AiEmailProposalStatus;
  viewed_at: string | null;
  payload_json: Record<string, unknown>;
  suggested_casino_id: number | null;
  suggested_geo: string | null;
  casino_name_guess: string | null;
  error_message: string | null;
  resolved_bonus_id: number | null;
  resolved_promo_id: number | null;
  created_at: string | null;
  emails?: {
    id: number;
    subject?: string | null;
    date_received?: string | null;
    screenshot_url?: string | null;
    from_email?: string | null;
    from_name?: string | null;
  };
  email_topics?: { id: number; name: string } | null;
  casinos?: { id: number; name: string } | null;
}

export const aiEmailProposalsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAiEmailProposals: builder.query<AiEmailProposalListItem[], { viewed: boolean; type?: AiEmailProposalType }>({
      query: ({ viewed, type }) => ({
        url: '/ai-email-proposals',
        params: { viewed: viewed ? '1' : '0', ...(type ? { type } : {}) },
      }),
      providesTags: ['AiEmailProposals'],
    }),
    getAiEmailProposal: builder.query<AiEmailProposalListItem, number>({
      query: (id) => `/ai-email-proposals/${id}`,
      providesTags: ['AiEmailProposals'],
    }),
    markAiEmailProposalViewed: builder.mutation<AiEmailProposalListItem, number>({
      query: (id) => ({ url: `/ai-email-proposals/${id}/viewed`, method: 'POST' }),
      invalidatesTags: ['AiEmailProposals'],
    }),
    rejectAiEmailProposal: builder.mutation<AiEmailProposalListItem, number>({
      query: (id) => ({ url: `/ai-email-proposals/${id}/reject`, method: 'POST' }),
      invalidatesTags: ['AiEmailProposals', 'Bonus', 'Promo'],
    }),
    approveAiEmailProposalBonus: builder.mutation<
      { bonus: unknown },
      { id: number; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({
        url: `/ai-email-proposals/${id}/approve-bonus`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AiEmailProposals', 'Bonus'],
    }),
    approveAiEmailProposalPromo: builder.mutation<
      { promo: unknown },
      { id: number; body: Record<string, unknown> }
    >({
      query: ({ id, body }) => ({
        url: `/ai-email-proposals/${id}/approve-promo`,
        method: 'POST',
        body,
      }),
      invalidatesTags: ['AiEmailProposals', 'Promo'],
    }),
    /** Только admin: пересоздать предложение ИИ по письму */
    devTriggerAiEmailProposal: builder.mutation<
      {
        ok: boolean;
        skipped?: boolean;
        message?: string;
        proposal?: AiEmailProposalListItem | null;
      },
      { emailId: number; type: AiEmailProposalType; force?: boolean }
    >({
      query: ({ emailId, type, force }) => ({
        url: '/ai-email-proposals/dev/trigger',
        method: 'POST',
        params: force ? { force: '1' } : undefined,
        body: { email_id: emailId, type, ...(force ? { force: true } : {}) },
      }),
      invalidatesTags: ['AiEmailProposals'],
    }),
  }),
});

export const {
  useGetAiEmailProposalsQuery,
  useGetAiEmailProposalQuery,
  useMarkAiEmailProposalViewedMutation,
  useRejectAiEmailProposalMutation,
  useApproveAiEmailProposalBonusMutation,
  useApproveAiEmailProposalPromoMutation,
  useDevTriggerAiEmailProposalMutation,
} = aiEmailProposalsApi;
