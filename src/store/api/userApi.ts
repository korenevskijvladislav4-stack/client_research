import { baseApi } from './baseApi';
import { PaginatedResponse, QueryParams, buildQueryString } from '../../types/api.types';

export interface User {
  id: number;
  username: string;
  email: string;
  role: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface CreateUserDto {
  username: string;
  email: string;
  password: string;
  role?: 'admin' | 'user';
  is_active?: boolean;
}

export interface UpdateUserDto {
  username?: string;
  email?: string;
  password?: string;
  role?: 'admin' | 'user';
  is_active?: boolean;
}

export interface UserFilters {
  role?: 'admin' | 'user';
  is_active?: boolean;
}

export interface UserQueryParams extends QueryParams {
  filters?: UserFilters;
}

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<PaginatedResponse<User>, UserQueryParams | void>({
      query: (params) => `/auth/users${buildQueryString(params || {})}`,
      providesTags: ['User'],
    }),
    createUser: builder.mutation<User, CreateUserDto>({
      query: (body) => ({
        url: '/auth/users',
        method: 'POST',
        body,
      }),
      invalidatesTags: ['User'],
    }),
    updateUser: builder.mutation<User, { id: number; data: UpdateUserDto }>({
      query: ({ id, data }) => ({
        url: `/auth/users/${id}`,
        method: 'PUT',
        body: data,
      }),
      invalidatesTags: ['User'],
    }),
    deleteUser: builder.mutation<void, number>({
      query: (id) => ({
        url: `/auth/users/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['User'],
    }),
  }),
});

export const {
  useGetUsersQuery,
  useCreateUserMutation,
  useUpdateUserMutation,
  useDeleteUserMutation,
} = userApi;
