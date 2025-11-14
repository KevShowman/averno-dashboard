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
    // Handle Discord access errors (400 Bad Request)
    if (error.response?.status === 400) {
      const message = error.response?.data?.message || '';
      if (message.includes('Discord-Server') || message.includes('keine Rollen')) {
        const encodedMessage = encodeURIComponent(message);
        window.location.href = `/discord-error?message=${encodedMessage}&type=discord_access`;
        return Promise.reject(error);
      }
    }
    
    // Handle unauthorized (401)
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
  deleteUser: (id: string) => api.delete(`/users/${id}`),
}

// Packages API (früher Kokain, jetzt allgemein für Pakete)
export const packagesApi = {
  createDeposit: (data: { packages: number; note?: string }) => 
    api.post('/packages/deposit', data),
  checkPendingWeeklyDelivery: () => api.get('/packages/check-weekly-delivery'),
  createDepositWithWeeklyDelivery: (data: { 
    packages: number; 
    note?: string; 
    useForWeeklyDelivery: boolean; 
    weeklyDeliveryId: string 
  }) => api.post('/packages/deposit-with-weekly-delivery', data),
  getPendingDeposits: () => api.get('/packages/deposits/pending'),
  getConfirmedDeposits: () => api.get('/packages/deposits/confirmed'),
  confirmDeposit: (id: string) => api.patch(`/packages/deposit/${id}/confirm`),
  rejectDeposit: (id: string, reason: string) => api.patch(`/packages/deposit/${id}/reject`, { reason }),
  deleteDeposit: (id: string) => api.delete(`/packages/deposit/${id}`),
  getHandovers: () => api.get('/packages/archives'),
  archiveHandover: (name: string) => api.post('/packages/archive', { name }),
  getHandoverDetails: (id: string) => api.get(`/packages/archives/${id}`),
  getSummary: () => api.get('/packages/summary'),
  getPrice: () => api.get('/packages/price'),
  setPrice: (price: number) => api.post('/packages/price', { price }),
  getRecentDeposits: () => api.get('/packages/deposits/recent'),
}

// Discord API
export const discordApi = {
  getAllowedMembers: () => api.get('/discord/allowed-members'),
  syncAllMembers: () => api.post('/discord/sync-all'),
  getUserRole: (discordId: string) => api.get(`/discord/user-role/${discordId}`),
  syncAndRemoveInactive: () => api.post('/discord/sync-and-remove-inactive'),
}

// Aufstellung API
export const aufstellungApi = {
  create: (data: { date: string; time: string; reason: string }) =>
    api.post('/aufstellung', data),
  getAll: () => api.get('/aufstellung'),
  getUpcoming: () => api.get('/aufstellung/upcoming'),
  getMyPending: () => api.get('/aufstellung/my-pending'),
  getById: (id: string) => api.get(`/aufstellung/${id}`),
  respond: (id: string, status: 'COMING' | 'NOT_COMING' | 'UNSURE') =>
    api.post(`/aufstellung/${id}/respond`, { status }),
  sanctionNonResponders: (id: string) => api.post(`/aufstellung/${id}/sanction-non-responders`),
  delete: (id: string) => api.delete(`/aufstellung/${id}`),
  
  // Exclusions
  createExclusion: (data: { userId: string; reason: string; startDate: string; endDate?: string }) =>
    api.post('/aufstellung/exclusions', data).then(res => res.data),
  getExclusions: () => api.get('/aufstellung/exclusions').then(res => res.data),
  getActiveExclusions: () => api.get('/aufstellung/exclusions/active').then(res => res.data),
  deactivateExclusion: (id: string) => api.patch(`/aufstellung/exclusions/${id}/deactivate`).then(res => res.data),
  deleteExclusion: (id: string) => api.delete(`/aufstellung/exclusions/${id}`).then(res => res.data),
};

// Abmeldung API
export const abmeldungApi = {
  create: (data: { startDate: string; endDate: string; reason?: string }) =>
    api.post('/abmeldung', data).then(res => res.data),
  getAll: () => api.get('/abmeldung').then(res => res.data),
  getCurrent: () => api.get('/abmeldung/current').then(res => res.data),
  getMy: () => api.get('/abmeldung/my').then(res => res.data),
  update: (id: string, data: { startDate?: string; endDate?: string; reason?: string }) =>
    api.patch(`/abmeldung/${id}`, data).then(res => res.data),
  delete: (id: string) => api.delete(`/abmeldung/${id}`).then(res => res.data),
  cleanup: () => api.post('/abmeldung/cleanup').then(res => res.data),
};

// BloodList API
export const bloodListApi = {
  bloodIn: (data: { vorname: string; nachname: string; telefon: number; steam: string; bloodinDurch: string }) =>
    api.post('/bloodlist/blood-in', data).then(res => res.data),
  bloodOut: (data: { identifier: string; grund: string }) =>
    api.post('/bloodlist/blood-out', data).then(res => res.data),
  getActive: () => api.get('/bloodlist/active').then(res => res.data),
  getHistory: () => api.get('/bloodlist/history').then(res => res.data),
  getAll: () => api.get('/bloodlist/all').then(res => res.data),
  getStats: () => api.get('/bloodlist/stats').then(res => res.data),
  search: (query: string) => api.get('/bloodlist/search', { params: { q: query } }).then(res => res.data),
  getById: (id: string) => api.get(`/bloodlist/${id}`).then(res => res.data),
};

// Familiensammeln API
export const familiensammelnApi = {
  getCurrentWeek: () => api.get('/familiensammeln/current').then(res => res.data),
  getWeek: (id: string) => api.get(`/familiensammeln/week/${id}`).then(res => res.data),
  getAllWeeks: (limit?: number) => api.get('/familiensammeln/weeks', { params: { limit } }).then(res => res.data),
  getWeekStatistics: (weekId: string) => api.get(`/familiensammeln/week/${weekId}/statistics`).then(res => res.data),
  getAllTimeStatistics: () => api.get('/familiensammeln/all-time-statistics').then(res => res.data),
  createWeek: (data: { weekStart: string }) => api.post('/familiensammeln/week', data).then(res => res.data),
  addParticipation: (data: { weekId: string; userId: string; date: string }) =>
    api.post('/familiensammeln/participation', data).then(res => res.data),
  updateParticipationTourCount: (participationId: string, tourCount: number) =>
    api.patch(`/familiensammeln/participation/${participationId}/tourcount`, { tourCount }).then(res => res.data),
  removeParticipation: (participationId: string) =>
    api.delete(`/familiensammeln/participation/${participationId}`).then(res => res.data),
  // Processor (Verarbeiter) APIs
  getProcessors: (weekId: string) => api.get(`/familiensammeln/week/${weekId}/processors`).then(res => res.data),
  startProcessor: (weekId: string, userId: string) =>
    api.post(`/familiensammeln/week/${weekId}/processors`, { userId }).then(res => res.data),
  completeProcessor: (processorId: string) =>
    api.post(`/familiensammeln/processors/${processorId}/complete`).then(res => res.data),
  deleteProcessor: (processorId: string) =>
    api.delete(`/familiensammeln/processors/${processorId}`).then(res => res.data),
};

// Organigramm API
export const organigrammApi = {
  getAssignments: () => api.get('/organigramm/assignments').then(res => res.data),
  assignUserToRole: (data: { roleId: string; userId: string }) => 
    api.post('/organigramm/assignments', data).then(res => res.data),
  removeUserFromRole: (roleId: string, userId: string) => 
    api.delete(`/organigramm/assignments/${roleId}/${userId}`),
  removeAllAssignments: () => api.delete('/organigramm/assignments'),
};

// Clothing API
export const clothingApi = {
  getAllTemplates: () => api.get('/clothing/templates').then(res => res.data),
  getTemplate: (rankGroup: string) => api.get(`/clothing/templates/${rankGroup}`).then(res => res.data),
  saveTemplate: (rankGroup: string, data: any) => api.post(`/clothing/templates/${rankGroup}`, data).then(res => res.data),
  getMyClothing: () => api.get('/clothing/my-clothing').then(res => res.data),
  saveMyClothing: (data: any) => api.put('/clothing/my-clothing', data).then(res => res.data),
};

