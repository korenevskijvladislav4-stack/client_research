import { baseApi } from './baseApi';

export interface ProfileField {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProfileFieldDto {
  name: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateProfileFieldDto {
  name?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface ProfileContext {
  id: number;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateProfileContextDto {
  name: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface UpdateProfileContextDto {
  name?: string;
  sort_order?: number;
  is_active?: boolean;
}

export interface ProfileSetting {
  id: number;
  casino_id: number;
  geo: string;
  field_id: number;
  context_id: number;
  value: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UpdateProfileSettingDto {
  geo: string;
  field_id: number;
  context_id: number;
  value: boolean;
}

export interface BatchUpdateProfileSettingsDto {
  geo: string;
  settings: Array<{
    field_id: number;
    context_id: number;
    value: boolean;
  }>;
}

export interface AggregatedSettingCasino {
  id: number;
  name: string;
  geo: string;
}

export interface AggregatedProfileSetting {
  field_id: number;
  context_id: number;
  casinos: AggregatedSettingCasino[];
  count: number;
}

export interface AggregatedProfileSettingsParams {
  geo?: string;
  casino_ids?: number[];
}

export const profileSettingsApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Profile Settings Fields (for Yes/No matrix)
    getSettingsFields: builder.query<ProfileField[], void>({
      query: () => '/profile-fields',
      providesTags: ['ProfileField'],
    }),
    getSettingsFieldById: builder.query<ProfileField, number>({
      query: (id) => `/profile-fields/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'ProfileField', id }],
    }),
    createSettingsField: builder.mutation<ProfileField, CreateProfileFieldDto>({
      query: (data) => ({
        url: '/profile-fields',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['ProfileField'],
    }),
    updateSettingsField: builder.mutation<ProfileField, { id: number; data: UpdateProfileFieldDto }>({
      query: ({ id, data }) => ({
        url: `/profile-fields/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'ProfileField', id }, 'ProfileField'],
    }),
    deleteSettingsField: builder.mutation<void, number>({
      query: (id) => ({
        url: `/profile-fields/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ProfileField'],
    }),

    // Profile Contexts
    getProfileContexts: builder.query<ProfileContext[], void>({
      query: () => '/profile-contexts',
      providesTags: ['ProfileContext'],
    }),
    getProfileContextById: builder.query<ProfileContext, number>({
      query: (id) => `/profile-contexts/${id}`,
      providesTags: (_result, _error, id) => [{ type: 'ProfileContext', id }],
    }),
    createProfileContext: builder.mutation<ProfileContext, CreateProfileContextDto>({
      query: (data) => ({
        url: '/profile-contexts',
        method: 'POST',
        body: data,
      }),
      invalidatesTags: ['ProfileContext'],
    }),
    updateProfileContext: builder.mutation<ProfileContext, { id: number; data: UpdateProfileContextDto }>({
      query: ({ id, data }) => ({
        url: `/profile-contexts/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (_result, _error, { id }) => [{ type: 'ProfileContext', id }, 'ProfileContext'],
    }),
    deleteProfileContext: builder.mutation<void, number>({
      query: (id) => ({
        url: `/profile-contexts/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['ProfileContext'],
    }),

    // Profile Settings
    getCasinoProfileSettings: builder.query<ProfileSetting[], { casinoId: number; geo?: string }>({
      query: ({ casinoId, geo }) => ({
        url: `/profile-settings/casino/${casinoId}`,
        params: geo ? { geo } : {},
      }),
      providesTags: (_result, _error, { casinoId }) => [{ type: 'ProfileSetting', id: casinoId }],
    }),
    updateProfileSetting: builder.mutation<ProfileSetting, { casinoId: number; data: UpdateProfileSettingDto }>({
      query: ({ casinoId, data }) => ({
        url: `/profile-settings/casino/${casinoId}`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { casinoId }) => [{ type: 'ProfileSetting', id: casinoId }],
    }),
    batchUpdateProfileSettings: builder.mutation<ProfileSetting[], { casinoId: number; data: BatchUpdateProfileSettingsDto }>({
      query: ({ casinoId, data }) => ({
        url: `/profile-settings/casino/${casinoId}/batch`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { casinoId }) => [{ type: 'ProfileSetting', id: casinoId }],
    }),

    // Aggregated profile settings (for analytics page)
    getAggregatedProfileSettings: builder.query<AggregatedProfileSetting[], AggregatedProfileSettingsParams>({
      query: (params) => ({
        url: '/profile-settings/aggregated',
        params: {
          geo: params.geo,
          casino_ids: params.casino_ids?.join(','),
        },
      }),
      providesTags: ['ProfileSetting'],
    }),
  }),
});

export const {
  useGetSettingsFieldsQuery,
  useGetSettingsFieldByIdQuery,
  useCreateSettingsFieldMutation,
  useUpdateSettingsFieldMutation,
  useDeleteSettingsFieldMutation,
  useGetProfileContextsQuery,
  useGetProfileContextByIdQuery,
  useCreateProfileContextMutation,
  useUpdateProfileContextMutation,
  useDeleteProfileContextMutation,
  useGetCasinoProfileSettingsQuery,
  useUpdateProfileSettingMutation,
  useBatchUpdateProfileSettingsMutation,
  useGetAggregatedProfileSettingsQuery,
} = profileSettingsApi;
