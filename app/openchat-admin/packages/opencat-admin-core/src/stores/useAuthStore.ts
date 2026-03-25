import { create } from 'zustand';
import {
  adminAuthService,
  clearStoredSession,
  getStoredSession,
  type AdminSignInInput,
} from '@openchat/opencat-admin-infrastructure';
import type { AuthUser } from '@openchat/opencat-admin-types';

export interface AuthStoreState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isBootstrapping: boolean;
  isSubmitting: boolean;
  error: string | null;
  bootstrap: () => Promise<void>;
  signIn: (credentials: AdminSignInInput) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

const initialSession = getStoredSession();

export const useAuthStore = create<AuthStoreState>((set) => ({
  user: initialSession?.user || null,
  token: initialSession?.token || null,
  isAuthenticated: Boolean(initialSession?.token && initialSession?.user),
  isBootstrapping: true,
  isSubmitting: false,
  error: null,

  async bootstrap() {
    const existing = getStoredSession();
    if (!existing) {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isBootstrapping: false,
        error: null,
      });
      return;
    }

    set({
      user: existing.user,
      token: existing.token,
      isAuthenticated: true,
      isBootstrapping: true,
      error: null,
    });

    try {
      const user = await adminAuthService.getCurrentUser();
      set({
        user,
        token: existing.token,
        isAuthenticated: true,
        isBootstrapping: false,
        error: null,
      });
    } catch (error) {
      clearStoredSession();
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isBootstrapping: false,
        error: error instanceof Error ? error.message : 'Authentication bootstrap failed.',
      });
    }
  },

  async signIn(credentials) {
    set({ isSubmitting: true, error: null });

    try {
      const response = await adminAuthService.login(credentials);
      set({
        user: response.user,
        token: response.token,
        isAuthenticated: true,
        isBootstrapping: false,
        isSubmitting: false,
        error: null,
      });
      return response.user;
    } catch (error) {
      clearStoredSession();
      const message = error instanceof Error ? error.message : 'Login failed.';
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isSubmitting: false,
        error: message,
      });
      throw error;
    }
  },

  async signOut() {
    set({ isSubmitting: true, error: null });

    try {
      await adminAuthService.logout();
    } finally {
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isSubmitting: false,
        isBootstrapping: false,
        error: null,
      });
    }
  },

  clearError() {
    set({ error: null });
  },

  reset() {
    clearStoredSession();
    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isBootstrapping: false,
      isSubmitting: false,
      error: null,
    });
  },
}));
