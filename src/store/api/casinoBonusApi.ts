import { baseApi } from './baseApi';
import { PaginationInfo, QueryParams, buildQueryString } from '../../types/api.types';

export type BonusStatus = 'active' | 'paused' | 'expired' | 'draft';
export type BonusCategory = 'casino' | 'sport';
// Вид бонуса — общий для казино и спорта
export type BonusKind = 'deposit' | 'nodeposit' | 'cashback' | 'rakeback';
// Тип бонуса — механика, включая спортивные варианты
export type BonusType =
  | 'cash'
  | 'freespin'
  | 'combo'
  | 'freebet'
  | 'wagering'
  | 'insurance'
  | 'accumulator'
  | 'odds_boost';

export interface CasinoBonus {
  id: number;
  casino_id: number;
  casino_name?: string;
  geo: string;
  name: string;
  bonus_category?: BonusCategory;
  bonus_kind?: BonusKind;
  bonus_type?: BonusType;
  bonus_value?: number;
  bonus_unit?: 'percent' | 'amount' | null;
  currency?: string;
  freespins_count?: number;
  freespin_value?: number;
  freespin_game?: string;
  cashback_percent?: number;
  cashback_percent_min?: number | null;
  cashback_percent_max?: number | null;
  cashback_period?: string;
  min_deposit?: number;
  max_bonus?: number;
  max_cashout?: number;
  /** Максвин по кэш-бонусу: значение (фикс. сумма или коэффициент) */
  max_win_cash_value?: number | null;
  /** Максвин по кэш-бонусу: тип — фиксированная сумма или коэффициент */
  max_win_cash_unit?: 'fixed' | 'coefficient' | null;
  /** Максвин для фриспинов: значение (фикс. сумма или коэффициент) */
  max_win_freespin_value?: number | null;
  /** Максвин для фриспинов: тип — фиксированная сумма или коэффициент */
  max_win_freespin_unit?: 'fixed' | 'coefficient' | null;
  /** Максвин для процентной части (в комбо): значение */
  max_win_percent_value?: number | null;
  /** Максвин для процентной части: тип — фикс. сумма или коэффициент */
  max_win_percent_unit?: 'fixed' | 'coefficient' | null;
  wagering_requirement?: number;
  wagering_freespin?: number | null;
  wagering_games?: string;
  wagering_time_limit?: string | null;
  promo_code?: string;
  valid_from?: string;
  valid_to?: string;
  status: BonusStatus;
  notes?: string;
  /** Создано из входящего письма (утверждение ИИ-предложения) */
  created_from_email?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CasinoBonusImage {
  id: number;
  casino_id: number;
  bonus_id: number;
  file_path: string;
  original_name?: string;
  created_at: string;
  url: string;
  bonus_name?: string;
}

export interface AllBonusesResponse {
  data: CasinoBonus[];
  pagination?: PaginationInfo;
  total?: number;
  limit?: number;
  offset?: number;
}

export interface BonusFilters {
  casino_id?: number;
  geo?: string;
  bonus_category?: string;
  bonus_kind?: string;
  bonus_type?: string;
  status?: string;
}

export interface AllBonusesParams extends QueryParams {
  filters?: BonusFilters;
  // legacy flat params (backward compatibility)
  casino_id?: number;
  geo?: string;
  bonus_category?: string;
  bonus_kind?: string;
  bonus_type?: string;
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export const casinoBonusApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getAllBonuses: builder.query<AllBonusesResponse, AllBonusesParams>({
      query: (params = {}) => {
        const normalized: AllBonusesParams = { ...params };

        if (!normalized.filters) {
          const legacyFilters: BonusFilters = {
            casino_id: params.casino_id,
            geo: params.geo,
            bonus_category: params.bonus_category,
            bonus_kind: params.bonus_kind,
            bonus_type: params.bonus_type,
            status: params.status,
          };
          const cleanLegacyFilters = Object.fromEntries(
            Object.entries(legacyFilters).filter(([, value]) => value !== undefined && value !== null && value !== '')
          ) as BonusFilters;
          if (Object.keys(cleanLegacyFilters).length > 0) {
            normalized.filters = cleanLegacyFilters;
          }
        }

        if (!normalized.pageSize && params.limit) {
          normalized.pageSize = params.limit;
        }
        if (!normalized.page && params.limit && params.offset !== undefined) {
          normalized.page = Math.floor(params.offset / params.limit) + 1;
        }

        return `/bonuses${buildQueryString(normalized)}`;
      },
      transformResponse: (response: any): AllBonusesResponse => {
        const data = Array.isArray(response?.data) ? response.data : [];
        const pagination = response?.pagination;
        return {
          data,
          pagination,
          total: response?.total ?? pagination?.total ?? data.length,
          limit: response?.limit ?? pagination?.pageSize ?? data.length,
          offset:
            response?.offset ??
            (pagination ? Math.max(0, (pagination.page - 1) * pagination.pageSize) : 0),
        };
      },
      providesTags: ['Bonus'],
    }),
    getCasinoBonuses: builder.query<CasinoBonus[], { casinoId: number; geo?: string | string[] }>({
      query: ({ casinoId, geo }) => {
        const params = new URLSearchParams();
        if (geo) {
          const geos = Array.isArray(geo) ? geo : [geo];
          geos.forEach((g) => params.append('geo', g));
        }
        const qs = params.toString();
        return `/casinos/${casinoId}/bonuses${qs ? `?${qs}` : ''}`;
      },
      providesTags: (_result, _error, arg) => [
        { type: 'Bonus' as const, id: `CASINO_${arg.casinoId}` },
      ],
    }),
    createCasinoBonus: builder.mutation<CasinoBonus, { casinoId: number } & Partial<CasinoBonus>>({
      query: ({ casinoId, ...body }) => ({
        url: `/casinos/${casinoId}/bonuses`,
        method: 'POST',
        body,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Bonus' as const, id: `CASINO_${arg.casinoId}` },
      ],
    }),
    updateCasinoBonus: builder.mutation<
      CasinoBonus,
      { casinoId: number; id: number; patch: Partial<CasinoBonus> }
    >({
      query: ({ casinoId, id, patch }) => ({
        url: `/casinos/${casinoId}/bonuses/${id}`,
        method: 'PUT',
        body: patch,
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Bonus' as const, id: `CASINO_${arg.casinoId}` },
      ],
    }),
    deleteCasinoBonus: builder.mutation<{ message: string }, { casinoId: number; id: number }>({
      query: ({ casinoId, id }) => ({
        url: `/casinos/${casinoId}/bonuses/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, arg) => [
        { type: 'Bonus' as const, id: `CASINO_${arg.casinoId}` },
      ],
    }),
    getBonusImages: builder.query<CasinoBonusImage[], { casinoId: number; bonusId: number }>({
      query: ({ casinoId, bonusId }) => `/casinos/${casinoId}/bonuses/${bonusId}/images`,
      providesTags: (_result, _error, { casinoId }) => [{ type: 'CasinoComment', id: casinoId }],
    }),
    uploadBonusImages: builder.mutation<
      CasinoBonusImage[],
      { casinoId: number; bonusId: number; files: File[] }
    >({
      query: ({ casinoId, bonusId, files }) => {
        const formData = new FormData();
        files.forEach((file) => {
          formData.append('images', file);
        });
        return {
          url: `/casinos/${casinoId}/bonuses/${bonusId}/images`,
          method: 'POST',
          body: formData,
        };
      },
      invalidatesTags: (_result, _error, { casinoId }) => [{ type: 'CasinoComment', id: casinoId }],
    }),
    deleteBonusImage: builder.mutation<
      { message: string },
      { casinoId: number; bonusId: number; imageId: number }
    >({
      query: ({ casinoId, bonusId, imageId }) => ({
        url: `/casinos/${casinoId}/bonuses/${bonusId}/images/${imageId}`,
        method: 'DELETE',
      }),
      invalidatesTags: (_result, _error, { casinoId }) => [{ type: 'CasinoComment', id: casinoId }],
    }),
    analyzeBonusImage: builder.mutation<
      Partial<CasinoBonus>,
      { casinoId: number; geo?: string; file: File }
    >({
      query: ({ casinoId, geo, file }) => {
        const formData = new FormData();
        formData.append('image', file);
        if (geo) {
          formData.append('geo', geo);
        }
        return {
          url: `/casinos/${casinoId}/bonuses/ai-from-image`,
          method: 'POST',
          body: formData,
        };
      },
      transformResponse: (response: any): Partial<CasinoBonus> => {
        if (response && typeof response === 'object' && response.suggestions) {
          return response.suggestions as Partial<CasinoBonus>;
        }
        return {};
      },
    }),
  }),
});

export const {
  useGetAllBonusesQuery,
  useGetCasinoBonusesQuery,
  useCreateCasinoBonusMutation,
  useUpdateCasinoBonusMutation,
  useDeleteCasinoBonusMutation,
  useGetBonusImagesQuery,
  useUploadBonusImagesMutation,
  useDeleteBonusImageMutation,
  useAnalyzeBonusImageMutation,
} = casinoBonusApi;
