import axios from 'axios';

const API_URL = '/api';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    username: string;
    email: string;
    role: string;
  };
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await axios.post<AuthResponse>(`${API_URL}/auth/login`, credentials);
    return response.data;
  },

  register: async (data: RegisterData): Promise<void> => {
    await axios.post(`${API_URL}/auth/register`, data);
  },
};
