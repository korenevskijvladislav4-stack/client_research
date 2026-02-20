import { baseApi } from './baseApi';

export interface RefItem {
  id: number;
  name: string;
  created_at?: string;
}

export const referenceApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    // Bonus Names
    getBonusNames: builder.query<RefItem[], void>({
      query: () => '/ref/bonus-names',
      providesTags: ['BonusNames'],
    }),
    createBonusName: builder.mutation<RefItem, { name: string }>({
      query: (body) => ({
        url: '/ref/bonus-names',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['BonusNames'],
    }),

    // Payment Types
    getPaymentTypes: builder.query<RefItem[], void>({
      query: () => '/ref/payment-types',
      providesTags: ['PaymentTypes'],
    }),
    createPaymentType: builder.mutation<RefItem, { name: string }>({
      query: (body) => ({
        url: '/ref/payment-types',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['PaymentTypes'],
    }),

    // Payment Methods
    getPaymentMethods: builder.query<RefItem[], void>({
      query: () => '/ref/payment-methods',
      providesTags: ['PaymentMethods'],
    }),
    createPaymentMethod: builder.mutation<RefItem, { name: string }>({
      query: (body) => ({
        url: '/ref/payment-methods',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['PaymentMethods'],
    }),

    getPromoTypes: builder.query<RefItem[], void>({
      query: () => '/ref/promo-types',
      providesTags: ['PromoTypes'],
    }),
    createPromoType: builder.mutation<RefItem, { name: string }>({
      query: (body) => ({
        url: '/ref/promo-types',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['PromoTypes'],
    }),

    getProviders: builder.query<RefItem[], void>({
      query: () => '/ref/providers',
      providesTags: ['Providers'],
    }),
    createProvider: builder.mutation<RefItem, { name: string }>({
      query: (body) => ({
        url: '/ref/providers',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['Providers'],
    }),
  }),
});

export const {
  useGetBonusNamesQuery,
  useCreateBonusNameMutation,
  useGetPaymentTypesQuery,
  useCreatePaymentTypeMutation,
  useGetPaymentMethodsQuery,
  useCreatePaymentMethodMutation,
  useGetPromoTypesQuery,
  useCreatePromoTypeMutation,
  useGetProvidersQuery,
  useCreateProviderMutation,
} = referenceApi;
