import { baseApi } from './baseApi';

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

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query<User[], void>({
      query: () => '/auth/users',
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
