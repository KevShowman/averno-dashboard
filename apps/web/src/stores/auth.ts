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
  role: 'EL_PATRON' | 'DON' | 'ASESOR' | 'ROUTENVERWALTUNG' | 'LOGISTICA' | 'SICARIO' | 'SOLDADO' | 'FUTURO' | 'PARTNER'
  allRoles?: ('EL_PATRON' | 'DON' | 'ASESOR' | 'ROUTENVERWALTUNG' | 'LOGISTICA' | 'SICARIO' | 'SOLDADO' | 'FUTURO' | 'PARTNER')[]
  gender?: 'MALE' | 'FEMALE'
  isPartner?: boolean
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
  partnerLogin: () => void
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
    
    // Get rememberMe preference from localStorage
    const rememberMe = localStorage.getItem('rememberMe') === 'true'
    
    // Pass rememberMe as state parameter to Discord OAuth
    const state = rememberMe ? 'remember_me' : 'no_remember'
    window.location.href = `/api/auth/discord?state=${state}`
  },

  partnerLogin: () => {
    // Redirect to normal OAuth endpoint with partner_login state
    window.location.href = `/api/auth/discord?state=partner_login`
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
    
    // Reset login status for next login
    sessionStorage.removeItem('hasLoggedIn')
    
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
        // Clear all queries and refetch
        state.queryClient.clear()
        state.queryClient.invalidateQueries()
      }
      
      // Force immediate version check after login
      // This ensures users with stale cache get the update notification
      setTimeout(() => {
        // Check if we need to show update notification for stale cache
        fetch('/api/version')
          .then(response => response.json())
          .then(versionInfo => {
            const storedVersion = localStorage.getItem('app-version')
            
            // If no stored version or version mismatch, show update notification
            if (!storedVersion || storedVersion !== versionInfo.version) {
              // Create a simple HTML notification that works even with stale cache
              const notification = document.createElement('div')
              notification.innerHTML = `
                <div style="
                  position: fixed;
                  top: 20px;
                  left: 50%;
                  transform: translateX(-50%);
                  background: #1f2937;
                  color: white;
                  padding: 16px 24px;
                  border-radius: 8px;
                  border: 1px solid #6A1F2B;
                  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                  z-index: 9999;
                  font-family: system-ui, -apple-system, sans-serif;
                  max-width: 400px;
                  text-align: center;
                ">
                  <div style="font-weight: 600; margin-bottom: 8px;">Neue Version verfügbar!</div>
                  <div style="font-size: 14px; margin-bottom: 16px; opacity: 0.9;">
                    Eine neue Version der Anwendung ist verfügbar. Bitte aktualisieren Sie die Seite.
                  </div>
                  <button onclick="
                    if ('caches' in window) {
                      caches.keys().then(names => {
                        names.forEach(name => {
                          caches.delete(name);
                        });
                      });
                    }
                    const url = new URL(window.location.href);
                    url.searchParams.set('_t', Date.now().toString());
                    url.searchParams.set('_cache', 'bust');
                    window.location.replace(url.toString());
                  " style="
                    background: #6A1F2B;
                    color: white;
                    border: none;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 500;
                    margin-right: 8px;
                  ">Aktualisieren</button>
                  <button onclick="this.parentElement.parentElement.remove()" style="
                    background: transparent;
                    color: white;
                    border: 1px solid #6A1F2B;
                    padding: 8px 16px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-weight: 500;
                  ">Später</button>
                </div>
              `
              document.body.appendChild(notification)
            }
            
            // Store the current version
            localStorage.setItem('app-version', versionInfo.version)
          })
          .catch(error => {
            console.warn('Version check failed:', error)
          })
      }, 500)
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
