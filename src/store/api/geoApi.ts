import { baseApi } from './baseApi';

export interface Geo {
  id: number;
  code: string;
  name: string;
  is_active: boolean;
  sort_order: number;
}

export const geoApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getGeos: builder.query<Geo[], void>({
      query: () => '/geos',
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
  }),
});

export const { useGetGeosQuery, useCreateGeoMutation } = geoApi;

