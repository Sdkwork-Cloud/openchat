import type { AuthUser, LoginResponse } from '@openchat/opencat-admin-types';
import { adminApi } from './adminApi';

export interface AdminSignInInput {
  username: string;
  password: string;
}

export interface IAdminAuthService {
  login(input: AdminSignInInput): Promise<LoginResponse>;
  logout(): Promise<void>;
  getCurrentUser(): Promise<AuthUser>;
}

export const adminAuthService: IAdminAuthService = {
  login(input) {
    return adminApi.login(input);
  },

  logout() {
    return adminApi.logout();
  },

  getCurrentUser() {
    return adminApi.getCurrentUser();
  },
};
