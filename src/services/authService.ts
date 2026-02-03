import axios from 'axios';
import { getApiBaseUrl } from '../config/api';

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
    const baseUrl = getApiBaseUrl();
    const response = await axios.post<AuthResponse>(`${baseUrl}auth/login`, credentials);
    return response.data;
  },

  register: async (data: RegisterData): Promise<void> => {
    const baseUrl = getApiBaseUrl();
    await axios.post(`${baseUrl}auth/register`, data);
  },
};
