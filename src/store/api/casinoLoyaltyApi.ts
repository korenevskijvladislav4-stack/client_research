import { baseApi } from './baseApi';

export type LoyaltyOrientation = 'casino' | 'sport';

export interface CasinoLoyaltyStatusImage {
  id: number;
  file_path: string;
  original_name: string | null;
  url: string;
}

export interface CasinoLoyaltyStatus {
  id: number;
  name: string;
  description_md: string;
  sort_order: number;
  /** Скриншоты уровня (если есть) */
  images?: CasinoLoyaltyStatusImage[];
}

export interface CasinoLoyaltyProgram {
  id: number;
  casino_id: number;
  geo: string;
  orientation: LoyaltyOrientation;
  conditions_md: string;
  created_at: string | null;
  updated_at: string | null;
  statuses: CasinoLoyaltyStatus[];
}

export interface LoyaltyAiSuggestion {
  orientation: LoyaltyOrientation | null;
  conditions_md: string;
  statuses: Array<{ name: string; description_md: string }>;
}

export interface LoyaltyStatusAiSuggestion {
  description_md: string;
  name: string | null;
}

export type LoyaltyStatusPayload = { id?: number; name: string; description_md: string };

export const casinoLoyaltyApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCasinoLoyaltyPrograms: builder.query<CasinoLoyaltyProgram[], { casinoId: number; geo?: string }>({
      query: ({ casinoId, geo }) => {
        const q = geo?.trim() ? `?geo=${encodeURIComponent(geo.trim())}` : '';
        return `/casinos/${casinoId}/loyalty-programs${q}`;
      },
      providesTags: (_r, _e, { casinoId }) => [{ type: 'CasinoLoyalty' as const, id: casinoId }],
    }),
    createCasinoLoyaltyProgram: builder.mutation<
      CasinoLoyaltyProgram,
      {
        casinoId: number;
        geo: string;
        orientation: LoyaltyOrientation;
        conditions_md: string;
        statuses: Array<{ name: string; description_md: string }>;
      }
    >({
      query: ({ casinoId, ...body }) => ({
        url: `/casinos/${casinoId}/loyalty-programs`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_r, _e, { casinoId }) => [{ type: 'CasinoLoyalty', id: casinoId }],
    }),
    updateCasinoLoyaltyProgram: builder.mutation<
      CasinoLoyaltyProgram,
      {
        casinoId: number;
        programId: number;
        geo?: string;
        orientation?: LoyaltyOrientation;
        conditions_md?: string;
        statuses?: LoyaltyStatusPayload[];
      }
    >({
      query: ({ casinoId, programId, ...body }) => ({
        url: `/casinos/${casinoId}/loyalty-programs/${programId}`,
        method: 'PUT',
        body,
      }),
      invalidatesTags: (_r, _e, { casinoId }) => [{ type: 'CasinoLoyalty', id: casinoId }],
    }),
    deleteCasinoLoyaltyProgram: builder.mutation<{ ok: boolean }, { casinoId: number; programId: number }>({
      query: ({ casinoId, programId }) => ({
        url: `/casinos/${casinoId}/loyalty-programs/${programId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { casinoId }) => [{ type: 'CasinoLoyalty', id: casinoId }],
    }),
    analyzeLoyaltyImage: builder.mutation<
      { suggestions: LoyaltyAiSuggestion | null },
      { casinoId: number; geo?: string; file: File }
    >({
      query: ({ casinoId, geo, file }) => {
        const fd = new FormData();
        fd.append('image', file);
        if (geo?.trim()) fd.append('geo', geo.trim());
        return {
          url: `/casinos/${casinoId}/loyalty-programs/ai-from-image`,
          method: 'POST',
          body: fd,
        };
      },
    }),
    analyzeLoyaltyStatusImage: builder.mutation<
      { suggestions: LoyaltyStatusAiSuggestion | null },
      { casinoId: number; file: File; statusName?: string }
    >({
      query: ({ casinoId, file, statusName }) => {
        const fd = new FormData();
        fd.append('image', file);
        if (statusName?.trim()) fd.append('status_name', statusName.trim());
        return {
          url: `/casinos/${casinoId}/loyalty-programs/ai-status-from-image`,
          method: 'POST',
          body: fd,
        };
      },
    }),
    uploadLoyaltyStatusImages: builder.mutation<
      CasinoLoyaltyStatusImage[],
      { casinoId: number; programId: number; statusId: number; files: File[] }
    >({
      query: ({ casinoId, programId, statusId, files }) => {
        const fd = new FormData();
        files.forEach((f) => fd.append('images', f));
        return {
          url: `/casinos/${casinoId}/loyalty-programs/${programId}/statuses/${statusId}/images`,
          method: 'POST',
          body: fd,
        };
      },
      invalidatesTags: (_r, _e, { casinoId }) => [{ type: 'CasinoLoyalty', id: casinoId }],
    }),
    deleteLoyaltyStatusImage: builder.mutation<
      { ok: boolean },
      { casinoId: number; imageId: number }
    >({
      query: ({ casinoId, imageId }) => ({
        url: `/casinos/${casinoId}/loyalty-program-status-images/${imageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_r, _e, { casinoId }) => [{ type: 'CasinoLoyalty', id: casinoId }],
    }),
    formatLoyaltyMarkdown: builder.mutation<{ markdown: string | null }, { casinoId: number; text: string }>({
      query: ({ casinoId, text }) => ({
        url: `/casinos/${casinoId}/loyalty-programs/format-markdown`,
        method: 'POST',
        body: { text },
      }),
    }),
  }),
});

export const {
  useGetCasinoLoyaltyProgramsQuery,
  useCreateCasinoLoyaltyProgramMutation,
  useUpdateCasinoLoyaltyProgramMutation,
  useDeleteCasinoLoyaltyProgramMutation,
  useAnalyzeLoyaltyImageMutation,
  useAnalyzeLoyaltyStatusImageMutation,
  useUploadLoyaltyStatusImagesMutation,
  useDeleteLoyaltyStatusImageMutation,
  useFormatLoyaltyMarkdownMutation,
} = casinoLoyaltyApi;
