import { create } from 'zustand'
import { api } from '../lib/api'
import { QueryClient } from '@tanstack/react-query'

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
  queryClient: QueryClient | null
  setQueryClient: (client: QueryClient) => void
  login: (redirectUrl?: string) => void
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  isCheckingAuth: false,
  queryClient: null,
  
  setQueryClient: (client: QueryClient) => {
    set({ queryClient: client })
  },

  login: (redirectUrl = '/app') => {
    // Store the redirect URL for after login
    localStorage.setItem('redirectUrl', redirectUrl)
    window.location.href = `/api/auth/discord`
  },

  logout: async () => {
    const state = get()
    
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout failed:', error)
    }
    
    // Clear auth state and invalidate all queries
    set({ user: null, isAuthenticated: false, isLoading: false })
    
    // Clear all queries when logging out
    if (state.queryClient) {
      state.queryClient.clear()
    }
    
    window.location.href = '/login'
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
      const newUser = response.data
      
      set({ 
        user: newUser, 
        isAuthenticated: true, 
        isLoading: false,
        isCheckingAuth: false
      })
      
      // Invalidate all queries when user logs in successfully
      if (state.queryClient) {
        state.queryClient.invalidateQueries()
      }
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
