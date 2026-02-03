import { baseApi } from './baseApi';

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
  wagering_games?: string;
  promo_code?: string;
  valid_from?: string;
  valid_to?: string;
  status: BonusStatus;
  notes?: string;
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
  total: number;
  limit: number;
  offset: number;
}

export interface AllBonusesParams {
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
        const queryParams = new URLSearchParams();
        if (params.casino_id) queryParams.append('casino_id', params.casino_id.toString());
        if (params.geo) queryParams.append('geo', params.geo);
        if (params.bonus_category) queryParams.append('bonus_category', params.bonus_category);
        if (params.bonus_kind) queryParams.append('bonus_kind', params.bonus_kind);
        if (params.bonus_type) queryParams.append('bonus_type', params.bonus_type);
        if (params.status) queryParams.append('status', params.status);
        if (params.search) queryParams.append('search', params.search);
        if (params.limit) queryParams.append('limit', params.limit.toString());
        if (params.offset !== undefined) queryParams.append('offset', params.offset.toString());
        return `/bonuses?${queryParams.toString()}`;
      },
      providesTags: ['Bonus'],
    }),
    getCasinoBonuses: builder.query<CasinoBonus[], { casinoId: number; geo?: string }>({
      query: ({ casinoId, geo }) => {
        const params = new URLSearchParams();
        if (geo) params.append('geo', geo);
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
} = casinoBonusApi;
