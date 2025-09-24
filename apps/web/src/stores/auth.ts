import { create } from 'zustand'
import { api } from '../lib/api'

export interface User {
  id: string
  username: string
  icFirstName?: string
  icLastName?: string
  avatarUrl?: string
  email?: string
  role: 'EL_PATRON' | 'DON' | 'ASESOR' | 'ROUTENVERWALTUNG' | 'LOGISTICA' | 'SICARIO' | 'SOLDADO'
  allRoles?: ('EL_PATRON' | 'DON' | 'ASESOR' | 'ROUTENVERWALTUNG' | 'LOGISTICA' | 'SICARIO' | 'SOLDADO')[]
  createdAt: string
}

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  isCheckingAuth: boolean
  login: (redirectUrl?: string) => void
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isCheckingAuth: false,

  login: (redirectUrl = '/app') => {
    window.location.href = `/api/auth/discord`
  },

  logout: async () => {
    try {
      await api.post('/auth/logout')
      set({ user: null, isAuthenticated: false, isLoading: false })
      window.location.href = '/login'
    } catch (error) {
      console.error('Logout failed:', error)
      // Force logout on client side even if server request fails
      set({ user: null, isAuthenticated: false, isLoading: false })
      window.location.href = '/login'
    }
  },

  checkAuth: async () => {
    const state = get()
    
    // Prevent multiple simultaneous auth checks
    if (state.isCheckingAuth) {
      return
    }
    
    set({ isCheckingAuth: true })
    
    try {
      const response = await api.get('/auth/me')
      set({ 
        user: response.data, 
        isAuthenticated: true, 
        isLoading: false,
        isCheckingAuth: false
      })
    } catch (error) {
      console.error('Auth check failed:', error)
      set({ 
        user: null, 
        isAuthenticated: false, 
        isLoading: false,
        isCheckingAuth: false
      })
    }
  },
}))
