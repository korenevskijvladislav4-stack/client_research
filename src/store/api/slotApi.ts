import { baseApi } from './baseApi';

export interface Slot {
  id: number;
  casino_id: number;
  geo: string;
  name: string;
  provider?: string | null;
  image_url?: string | null;
  description?: string | null;
  rtp?: number | null;
  volatility?: string | null;
  min_bet?: number | null;
  max_bet?: number | null;
  max_win?: number | null;
  features?: string[] | null;
  tags?: string[] | null;
  is_featured: boolean;
  is_new: boolean;
  is_popular: boolean;
  parsed_at?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ParseSlotsRequest {
  url: string;
  geos: string[];
}

export interface ParseSlotsResponse {
  message: string;
  summary: Array<{ geo: string; count: number }>;
  total: number;
}

export const slotApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSlotsByCasino: builder.query<Slot[], { casinoId: number; geo?: string }>({
      query: ({ casinoId, geo }) => {
        const params = geo ? `?geo=${geo}` : '';
        return `/casinos/${casinoId}/slots${params}`;
      },
      providesTags: (_result, _error, { casinoId }) => [
        { type: 'Slot', id: `LIST-${casinoId}` },
      ],
    }),
    parseSlotsFromCasino: builder.mutation<ParseSlotsResponse, { casinoId: number; url: string; geos: string[] }>({
      query: ({ casinoId, url, geos }) => ({
        url: `/casinos/${casinoId}/slots/parse`,
        method: 'POST',
        body: { url, geos },
      }),
      invalidatesTags: (_result, _error, { casinoId }) => [
        { type: 'Slot', id: `LIST-${casinoId}` },
      ],
    }),
    deleteSlot: builder.mutation<void, number>({
      query: (id) => ({
        url: `/slots/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, _id) => [{ type: 'Slot' as const }],
    }),
  }),
});

export const {
  useGetSlotsByCasinoQuery,
  useParseSlotsFromCasinoMutation,
  useDeleteSlotMutation,
} = slotApi;
