import { baseApi } from './baseApi';

export interface ChatAiModel {
  id: number;
  model_id: string;
  label: string;
  input_price_per_million: string | number | null;
  output_price_per_million: string | number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

export type ChatAiModelCreateDto = {
  model_id: string;
  label: string;
  input_price_per_million?: number | null;
  output_price_per_million?: number | null;
  is_active?: boolean;
  sort_order?: number;
};

export type ChatAiModelUpdateDto = Partial<ChatAiModelCreateDto>;

export const chatModelsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getChatAiModelsAdmin: builder.query<ChatAiModel[], void>({
      query: () => '/chat/models',
      providesTags: ['ChatAiModels'],
    }),
    createChatAiModel: builder.mutation<ChatAiModel, ChatAiModelCreateDto>({
      query: (body) => ({
        url: '/chat/models',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['ChatAiModels', 'Chat'],
    }),
    updateChatAiModel: builder.mutation<ChatAiModel, { id: number; data: ChatAiModelUpdateDto }>({
      query: ({ id, data }) => ({
        url: `/chat/models/${id}`,
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: ['ChatAiModels', 'Chat'],
    }),
    deleteChatAiModel: builder.mutation<void, number>({
      query: (id) => ({
        url: `/chat/models/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ChatAiModels', 'Chat'],
    }),
  }),
});

export const {
  useGetChatAiModelsAdminQuery,
  useCreateChatAiModelMutation,
  useUpdateChatAiModelMutation,
  useDeleteChatAiModelMutation,
} = chatModelsApi;
