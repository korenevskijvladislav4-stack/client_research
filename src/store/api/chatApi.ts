import { baseApi } from './baseApi';

export interface ChatSession {
  id: number;
  title: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  created_at: string | null;
}

export interface ChatSessionWithMessages extends ChatSession {
  chat_messages: ChatMessage[];
}

export interface SendMessageResult {
  userMessage: ChatMessage;
  assistantMessage: ChatMessage;
}

export const chatApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getChatSessions: builder.query<ChatSession[], void>({
      query: () => '/chat/sessions',
      providesTags: ['Chat'],
    }),
    createChatSession: builder.mutation<ChatSession, { title?: string } | void>({
      query: (body = {}) => ({
        url: '/chat/sessions',
        method: 'POST',
        body: body ?? {},
      }),
      invalidatesTags: ['Chat'],
    }),
    getChatSession: builder.query<ChatSessionWithMessages, number>({
      query: (sessionId) => `/chat/sessions/${sessionId}`,
      providesTags: (_result, _err, id) => [{ type: 'Chat', id: String(id) }],
    }),
    deleteChatSession: builder.mutation<{ ok: boolean }, number>({
      query: (sessionId) => ({
        url: `/chat/sessions/${sessionId}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Chat'],
    }),
    sendChatMessage: builder.mutation<SendMessageResult, { sessionId: number; content: string }>({
      query: ({ sessionId, content }) => ({
        url: `/chat/sessions/${sessionId}/messages`,
        method: 'POST',
        body: { content },
      }),
      invalidatesTags: (_result, _err, { sessionId }) => [{ type: 'Chat', id: String(sessionId) }, 'Chat'],
    }),
  }),
});

export const {
  useGetChatSessionsQuery,
  useCreateChatSessionMutation,
  useGetChatSessionQuery,
  useDeleteChatSessionMutation,
  useSendChatMessageMutation,
} = chatApi;
