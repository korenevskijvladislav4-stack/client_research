import { baseApi } from './baseApi';

export interface Geo {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
}

export const geoApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGeos: builder.query<Geo[], void>({
      query: () => '/geos',
      providesTags: ['Geo' as const],
    }),
    /** Все GEO, включая неактивные — для админки справочников */
    getAllGeos: builder.query<Geo[], void>({
      query: () => '/geos?all=1',
      providesTags: ['Geo' as const],
    }),
    createGeo: builder.mutation<Geo, { code: string; name?: string }>({
      query: (body) => ({
        url: '/geos',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Geo' as const],
    }),
    deleteGeo: builder.mutation<void, number>({
      query: (id) => ({
        url: `/geos/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Geo' as const],
    }),
  }),
});

export const { useGetGeosQuery, useGetAllGeosQuery, useCreateGeoMutation, useDeleteGeoMutation } = geoApi;

