import { baseApi } from './baseApi';

export interface SlotSelector {
  id: number;
  casino_id: number;
  geo: string;
  section: string;
  category?: string | null;
  selector: string;
  url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CreateSlotSelectorDto {
  geo: string;
  section: string;
  category?: string | null;
  selector: string;
  url?: string | null;
}

export interface UpdateSlotSelectorDto {
  geo?: string;
  section?: string;
  category?: string | null;
  selector?: string;
  url?: string | null;
}

export interface SlotScreenshot {
  selector_id: number;
  geo: string;
  section: string;
  category?: string | null;
  url?: string | null;
  screenshot_id?: number;
  screenshot_path?: string;
  screenshot_url?: string;
  screenshot_created_at?: string;
}

export interface ScreenshotGalleryItem {
  screenshot_id: number;
  screenshot_path: string;
  screenshot_url: string;
  screenshot_created_at: string;
  selector_id: number;
  geo: string;
  section: string;
  category?: string | null;
  selector: string;
  url?: string | null;
  casino_id: number;
  casino_name: string;
}

export interface ScreenshotFilters {
  geo?: string;
  section?: string;
  category?: string;
  casinoId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export const slotSelectorApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getSelectorsByCasino: builder.query<SlotSelector[], number>({
      query: (casinoId) => `/casinos/${casinoId}/selectors`,
      providesTags: (_result, _error, casinoId) => [
        { type: 'SlotSelector', id: `LIST-${casinoId}` },
      ],
    }),
    createSelector: builder.mutation<SlotSelector, { casinoId: number; data: CreateSlotSelectorDto }>({
      query: ({ casinoId, data }) => ({
        url: `/casinos/${casinoId}/selectors`,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: (_result, _error, { casinoId }) => [
        { type: 'SlotSelector', id: `LIST-${casinoId}` },
        { type: 'SlotScreenshot', id: `LIST-${casinoId}` },
      ],
    }),
    updateSelector: builder.mutation<SlotSelector, { id: number; data: UpdateSlotSelectorDto }>({
      query: ({ id, data }) => ({
        url: `/selectors/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: (result, _error, { id }) => {
        const tags: any[] = [
          { type: 'SlotSelector', id },
          { type: 'SlotSelector', id: 'LIST' },
          { type: 'SlotScreenshot', id: 'LIST' },
          { type: 'ScreenshotGallery', id: 'LIST' },
        ];
        // Invalidate screenshots and selectors for the specific casino
        if (result?.casino_id) {
          tags.push(
            { type: 'SlotScreenshot', id: `LIST-${result.casino_id}` },
            { type: 'SlotSelector', id: `LIST-${result.casino_id}` }
          );
        }
        return tags;
      },
    }),
    deleteSelector: builder.mutation<void, number>({
      query: (id) => ({
        url: `/selectors/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, id) => {
        // We need to invalidate all screenshots lists since we don't know casino_id here
        return [
          { type: 'SlotSelector', id },
          { type: 'SlotSelector', id: 'LIST' },
          { type: 'SlotScreenshot', id: 'LIST' },
          // Invalidate all casino-specific screenshot lists (will be handled by providesTags)
          { type: 'SlotScreenshot', id: 'LIST' },
        ];
      },
    }),
    getScreenshotsByCasino: builder.query<SlotScreenshot[], number>({
      query: (casinoId) => `/casinos/${casinoId}/screenshots`,
      providesTags: (result, _error, casinoId) => {
        const tags: any[] = [
          { type: 'SlotScreenshot', id: `LIST-${casinoId}` },
          // Also provide general LIST tag for broader invalidation
          { type: 'SlotScreenshot', id: 'LIST' },
          { type: 'ScreenshotGallery', id: 'LIST' },
        ];
        // Add individual selector tags
        if (result) {
          result.forEach((s) => {
            tags.push({ type: 'SlotScreenshot', id: s.selector_id });
          });
        }
        return tags;
      },
    }),
    takeScreenshot: builder.mutation<SlotScreenshot, number>({
      query: (selectorId) => ({
        url: `/selectors/${selectorId}/screenshots`,
        method: 'POST',
      }),
      invalidatesTags: (_result, _error, _selectorId) => {
        const tags: any[] = [
          { type: 'SlotScreenshot', id: 'LIST' },
          { type: 'ScreenshotGallery', id: 'LIST' },
        ];
        // Invalidate all casino-specific lists since we don't know casino_id from selectorId
        // RTK Query will handle this by invalidating all matching providesTags
        return tags;
      },
    }),
    getAllScreenshots: builder.query<ScreenshotGalleryItem[], ScreenshotFilters | void>({
      query: (filters) => {
        const params = new URLSearchParams();
        if (filters && filters.geo) params.append('geo', filters.geo);
        if (filters && filters.section) params.append('section', filters.section);
        if (filters && filters.category) params.append('category', filters.category);
        if (filters && filters.casinoId) params.append('casinoId', filters.casinoId.toString());
        if (filters && filters.dateFrom) params.append('dateFrom', filters.dateFrom);
        if (filters && filters.dateTo) params.append('dateTo', filters.dateTo);
        
        const queryString = params.toString();
        return `/screenshots${queryString ? `?${queryString}` : ''}`;
      },
      providesTags: ['ScreenshotGallery'],
    }),
  }),
});

export const {
  useGetSelectorsByCasinoQuery,
  useCreateSelectorMutation,
  useUpdateSelectorMutation,
  useDeleteSelectorMutation,
  useGetScreenshotsByCasinoQuery,
  useTakeScreenshotMutation,
  useGetAllScreenshotsQuery,
} = slotSelectorApi;
