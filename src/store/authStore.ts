import { create } from 'zustand';
import { User } from '../types';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

const API_URL = import.meta.env.VITE_API_URL || window.location.origin;

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isLoading: true,
  error: null,

  checkAuth: async () => {
    try {
      set({ isLoading: true, error: null });
      // Include credentials to send cookies
      const res = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include' 
      });
      
      if (res.ok) {
        const data = await res.json();
        set({ user: data.user, isLoading: false });
      } else if (res.status === 401 || res.status === 403) {
        set({ user: null, isLoading: false });
      } else {
        // For 500 or other errors, keep user as is (or null) but set error
        // If we were already logged in, we probably want to stay logged in visually or show a warning?
        // But on initial load, user is null.
        set({ error: `Server error: ${res.status}`, isLoading: false });
      }
    } catch (error) {
      console.error('Auth check failed', error);
      // Network error or other fetch failure
      set({ error: 'Connection failed', isLoading: false });
    }
  },

  logout: async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, { 
        method: 'POST',
        credentials: 'include'
      });
      set({ user: null });
    } catch (error) {
      console.error('Logout failed', error);
    }
  }
}));
