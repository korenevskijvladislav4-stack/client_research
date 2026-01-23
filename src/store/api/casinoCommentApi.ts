import { baseApi } from './baseApi';

export interface CasinoComment {
  id: number;
  casino_id: number;
  user_id: number;
  text: string;
  created_at: string;
  updated_at: string;
  username?: string;
}

export interface CasinoCommentImage {
  id: number;
  casino_id: number;
  comment_id: number | null;
  bonus_id?: number | null;
  payment_id?: number | null;
  file_path: string;
  original_name?: string | null;
  created_at: string;
  url: string;
  comment_text?: string;
  username?: string;
  bonus_name?: string;
  payment_name?: string;
  entity_type?: 'comment' | 'bonus' | 'payment';
  label?: string;
}

export interface CreateCommentDto {
  text: string;
}

export const casinoCommentApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getCasinoComments: builder.query<CasinoComment[], number>({
      query: (casinoId) => `/casinos/${casinoId}/comments`,
      providesTags: (_result, _error, casinoId) => [{ type: 'CasinoComment', id: casinoId }],
    }),
    createComment: builder.mutation<CasinoComment, { casinoId: number; data: CreateCommentDto }>({
      query: ({ casinoId, data }) => ({
        url: `/casinos/${casinoId}/comments`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { casinoId }) => [{ type: 'CasinoComment', id: casinoId }],
    }),
    updateComment: builder.mutation<CasinoComment, { id: number; casinoId: number; data: CreateCommentDto }>({
      query: ({ id, data }) => ({
        url: `/comments/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { casinoId }) => [{ type: 'CasinoComment', id: casinoId }],
    }),
    deleteComment: builder.mutation<void, { id: number; casinoId: number }>({
      query: ({ id }) => ({
        url: `/comments/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { casinoId }) => [{ type: 'CasinoComment', id: casinoId }],
    }),
    getCasinoImages: builder.query<CasinoCommentImage[], number>({
      query: (casinoId) => `/casinos/${casinoId}/images`,
      providesTags: (_result, _error, casinoId) => [{ type: 'CasinoComment', id: casinoId }],
    }),
    uploadCommentImage: builder.mutation<
      CasinoCommentImage,
      { casinoId: number; commentId: number; file: File }
    >({
      query: ({ casinoId, commentId, file }) => {
        const formData = new FormData();
        formData.append('image', file);
        return {
          url: `/casinos/${casinoId}/comments/${commentId}/images`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { casinoId }) => [{ type: 'CasinoComment', id: casinoId }],
    }),
  }),
});

export const {
  useGetCasinoCommentsQuery,
  useCreateCommentMutation,
  useUpdateCommentMutation,
  useDeleteCommentMutation,
  useGetCasinoImagesQuery,
  useUploadCommentImageMutation,
} = casinoCommentApi;
