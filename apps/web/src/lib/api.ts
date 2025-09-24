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
  prepayWeeks: (data: { userId: string; weeks: number; paidAmount?: number; paidMoney?: number }) => 
    api.post('/weekly-delivery/prepay', data),
  indexAllUsers: () => api.post('/weekly-delivery/index-users'),
  autoSanctionOverdue: () => api.post('/weekly-delivery/auto-sanction'),
  weeklyReset: () => api.post('/weekly-delivery/weekly-reset'),
  archiveCurrentWeek: () => api.post('/weekly-delivery/archive-current-week'),
  getArchives: () => api.get('/weekly-delivery/archives'),
  getArchiveDetails: (id: string) => api.get(`/weekly-delivery/archives/${id}`),
}

// Sanctions API
export const sanctionsApi = {
  getSanctions: (params?: { userId?: string; status?: string; category?: string }) => 
    api.get('/sanctions', { params }),
  getMySanctions: () => api.get('/sanctions/my'),
  getUserActiveSanctions: (userId: string) => api.get(`/sanctions/user/${userId}/active`),
  getStats: () => api.get('/sanctions/stats'),
  getCategories: () => api.get('/sanctions/categories'),
  createSanction: (data: { userId: string; category: string; description: string }) => 
    api.post('/sanctions', data),
  createSanctionManual: (data: { userId: string; category: string; level: number; description: string }) => 
    api.post('/sanctions/manual', data),
  paySanction: (id: string) => api.patch(`/sanctions/${id}/pay`),
  removeSanction: (id: string) => api.patch(`/sanctions/${id}/remove`),
  cleanupExpired: () => api.post('/sanctions/cleanup'),
  resetUserLevels: (data: { userId: string; category: string }) => api.post('/sanctions/reset-user-levels', data),
  autoSanction48h: () => api.post('/sanctions/auto-sanction-48h'),
}

// Settings API
export const settingsApi = {
  getAllSettings: () => api.get('/settings'),
  getSetting: (key: string) => api.get(`/settings/${key}`),
  setSetting: (data: { key: string; value: any; type?: string }) => api.put('/settings', data),
  deleteSetting: (key: string) => api.delete(`/settings/${key}`),
  getWeeklyDeliverySettings: () => api.get('/settings/weekly-delivery/values'),
  setWeeklyDeliverySettings: (data: { packages: number; moneyPerPackage: number }) => api.put('/settings/weekly-delivery', data),
}

// Users API
export const usersApi = {
  getAllUsers: () => api.get('/users'),
  getUserById: (id: string) => api.get(`/users/${id}`),
  searchUsers: (query: string) => api.get(`/users/search/${query}`),
  getAvailableRoles: () => api.get('/users/roles/available'),
  getUserStats: () => api.get('/users/stats/overview'),
  updateUserRoles: (id: string, data: { allRoles: string[] }) => api.put(`/users/${id}/roles`, data),
}

// Kokain API (erweitert um Wochenabgabe-Integration)
export const kokainApi = {
  createDeposit: (data: { packages: number; note?: string }) => 
    api.post('/kokain/deposit', data),
  checkPendingWeeklyDelivery: () => api.get('/kokain/check-weekly-delivery'),
  createDepositWithWeeklyDelivery: (data: { 
    packages: number; 
    note?: string; 
    useForWeeklyDelivery: boolean; 
    weeklyDeliveryId: string 
  }) => api.post('/kokain/deposit-with-weekly-delivery', data),
  getPendingDeposits: () => api.get('/kokain/deposits/pending'),
  getConfirmedDeposits: () => api.get('/kokain/deposits/confirmed'),
  confirmDeposit: (id: string) => api.patch(`/kokain/deposit/${id}/confirm`),
  rejectDeposit: (id: string, reason: string) => api.patch(`/kokain/deposit/${id}/reject`, { reason }),
  deleteDeposit: (id: string) => api.delete(`/kokain/deposit/${id}`),
  getUebergaben: () => api.get('/kokain/uebergaben'),
  createUebergabe: (data: { name: string }) => api.post('/kokain/uebergabe', data),
  archiveUebergabe: (id: string) => api.patch(`/kokain/uebergabe/${id}/archive`),
  getDepositsByUebergabe: (uebergabeId: string) => api.get(`/kokain/uebergabe/${uebergabeId}/deposits`),
  getStats: () => api.get('/kokain/stats'),
}

