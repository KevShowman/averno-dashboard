import { create } from 'zustand'
import { api } from '../lib/api'

export interface User {
  id: string
  username: string
  avatarUrl?: string
  email?: string
  role: 'EL_PATRON' | 'DON' | 'ASESOR' | 'SOLDADO'
  createdAt: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (redirectUrl?: string) => void
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  login: (redirectUrl = '/app') => {
    window.location.href = `/api/auth/discord`
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
      set({ user: null, isAuthenticated: false })
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed:', error)
      // Force logout on client side even if server request fails
      set({ user: null, isAuthenticated: false })
      window.location.href = '/login'
    }
  },

  checkAuth: async () => {
    try {
      const response = await api.get('/auth/me')
      set({ 
        user: response.data, 
        isAuthenticated: true, 
        isLoading: false 
      })
    } catch (error) {
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false 
      })
    }
  },
}))
