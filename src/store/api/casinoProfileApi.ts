import { baseApi } from './baseApi';

export type FieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'rating'
  | 'date'
  | 'url';

export interface ProfileField {
  id: number;
  key_name: string;
  label: string;
  description?: string | null;
  field_type: FieldType;
  options_json?: any;
  group_name?: string | null;
  sort_order: number;
  is_required: boolean;
  is_active: boolean;
}

export interface CasinoProfileItem {
  field: ProfileField;
  value: any;
  updated_at?: string | null;
  updated_by?: number | null;
}

export interface CasinoProfileResponse {
  casino_id: number;
  profile: CasinoProfileItem[];
}

export interface HistoryEvent {
  id: number;
  casino_id: number;
  field_id?: number | null;
  action: string;
  old_value_json?: any;
  new_value_json?: any;
  meta_json?: any;
  created_at: string;
  actor_user_id?: number | null;
  actor_username?: string | null;
  key_name?: string | null;
  label?: string | null;
}

export type AllProfileValues = Record<number, Record<string, any>>;

export const casinoProfileApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    listProfileFields: builder.query<ProfileField[], void>({
      query: () => `/fields`,
      providesTags: [{ type: 'Profile', id: 'FIELDS' }],
    }),
    getAllProfileValues: builder.query<AllProfileValues, void>({
      query: () => `/profile-values`,
      providesTags: [{ type: 'Profile', id: 'ALL_VALUES' }],
    }),
    createProfileField: builder.mutation<ProfileField, Partial<ProfileField>>({
      query: (body) => ({ url: `/fields`, method: 'POST', body }),
      invalidatesTags: [{ type: 'Profile', id: 'FIELDS' }],
    }),
    updateProfileField: builder.mutation<ProfileField, { id: number; patch: Partial<ProfileField> }>({
      query: ({ id, patch }) => ({ url: `/fields/${id}`, method: 'PUT', body: patch }),
      invalidatesTags: [{ type: 'Profile', id: 'FIELDS' }],
    }),
    deleteProfileField: builder.mutation<{ message: string }, number>({
      query: (id) => ({ url: `/fields/${id}`, method: 'DELETE' }),
      invalidatesTags: [{ type: 'Profile', id: 'FIELDS' }],
    }),

    getCasinoProfile: builder.query<CasinoProfileResponse, number>({
      query: (casinoId) => `/casinos/${casinoId}/profile`,
      providesTags: (_r, _e, casinoId) => [{ type: 'Profile', id: `CASINO_${casinoId}` }],
    }),
    updateCasinoProfile: builder.mutation<
      { message: string },
      { casinoId: number; items: Array<{ field_id: number; value_json: any }> }
    >({
      query: ({ casinoId, items }) => ({
        url: `/casinos/${casinoId}/profile`,
        method: 'PUT',
        body: { items },
      }),
      invalidatesTags: (_r, _e, { casinoId }) => [
        { type: 'Profile', id: `CASINO_${casinoId}` },
        { type: 'Profile', id: `HISTORY_${casinoId}` },
        { type: 'Profile', id: 'ALL_VALUES' },
      ],
    }),
    getCasinoProfileHistory: builder.query<HistoryEvent[], { casinoId: number; limit?: number }>({
      query: ({ casinoId, limit }) => `/casinos/${casinoId}/profile/history?limit=${limit ?? 200}`,
      providesTags: (_r, _e, { casinoId }) => [{ type: 'Profile', id: `HISTORY_${casinoId}` }],
    }),
  }),
});

export const {
  useListProfileFieldsQuery,
  useGetAllProfileValuesQuery,
  useCreateProfileFieldMutation,
  useUpdateProfileFieldMutation,
  useDeleteProfileFieldMutation,
  useGetCasinoProfileQuery,
  useUpdateCasinoProfileMutation,
  useGetCasinoProfileHistoryQuery,
} = casinoProfileApi;

