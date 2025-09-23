import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Only redirect if we're not already on the login page
      // This prevents redirect loops
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)

// Weekly Delivery API
export const weeklyDeliveryApi = {
  getDeliveries: (params?: { status?: string; userId?: string }) => 
    api.get('/weekly-delivery', { params }),
  getCurrentWeek: () => api.get('/weekly-delivery/current-week'),
  getStats: () => api.get('/weekly-delivery/stats'),
  createDelivery: (data: { weekStart: string; weekEnd: string }) => 
    api.post('/weekly-delivery', data),
  payDelivery: (id: string, data: { paidAmount?: number; paidMoney?: number }) => 
    api.patch(`/weekly-delivery/${id}/pay`, data),
  confirmDelivery: (id: string) => api.patch(`/weekly-delivery/${id}/confirm`),
  getExclusions: (params?: { isActive?: string }) => 
    api.get('/weekly-delivery/exclusions', { params }),
  createExclusion: (data: { userId: string; reason: string; startDate: string; endDate?: string }) => 
    api.post('/weekly-delivery/exclusions', data),
  deactivateExclusion: (id: string) => api.patch(`/weekly-delivery/exclusions/${id}/deactivate`),
}

// Sanctions API
export const sanctionsApi = {
  getSanctions: (params?: { userId?: string; status?: string; category?: string }) => 
    api.get('/sanctions', { params }),
  getMySanctions: () => api.get('/sanctions/my'),
  getUserActiveSanctions: (userId: string) => api.get(`/sanctions/user/${userId}/active`),
  getStats: () => api.get('/sanctions/stats'),
  getCategories: () => api.get('/sanctions/categories'),
  createSanction: (data: { userId: string; category: string; level: number; description: string }) => 
    api.post('/sanctions', data),
  paySanction: (id: string) => api.patch(`/sanctions/${id}/pay`),
  removeSanction: (id: string) => api.patch(`/sanctions/${id}/remove`),
  cleanupExpired: () => api.post('/sanctions/cleanup'),
}

