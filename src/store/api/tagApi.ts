import { baseApi } from './baseApi';

export interface Tag {
  id: number;
  name: string;
  color: string;
  created_at: string;
}

export const tagApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getTags: builder.query<Tag[], void>({
      query: () => '/tags',
      providesTags: ['Tag'],
    }),
    createTag: builder.mutation<Tag, { name: string; color?: string }>({
      query: (body) => ({
        url: '/tags',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Tag'],
    }),
    deleteTag: builder.mutation<{ message: string }, number>({
      query: (id) => ({
        url: `/tags/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Tag'],
    }),
    getAllCasinoTags: builder.query<Record<number, Tag[]>, void>({
      query: () => '/casino-tags',
      providesTags: ['CasinoTag'],
    }),
    getCasinoTags: builder.query<Tag[], number>({
      query: (casinoId) => `/casinos/${casinoId}/tags`,
      providesTags: (_r, _e, id) => [{ type: 'CasinoTag', id }],
    }),
    setCasinoTags: builder.mutation<Tag[], { casinoId: number; tagIds: number[] }>({
      query: ({ casinoId, tagIds }) => ({
        url: `/casinos/${casinoId}/tags`,
        method: 'PUT',
        body: { tagIds },
      }),
      invalidatesTags: (_r, _e, { casinoId }) => [
        { type: 'CasinoTag', id: casinoId },
        'Casino',
      ],
    }),
  }),
});

export const {
  useGetTagsQuery,
  useCreateTagMutation,
  useDeleteTagMutation,
  useGetAllCasinoTagsQuery,
  useGetCasinoTagsQuery,
  useSetCasinoTagsMutation,
} = tagApi;
