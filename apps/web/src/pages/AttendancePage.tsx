import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { usePageTitle } from '../hooks/usePageTitle'
import { hasRole } from '../lib/utils'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Checkbox } from '../components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog'
import { toast } from 'sonner'
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Users,
  UserCheck,
  UserX,
  Settings,
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Clock,
  Check,
  Search,
  AlertCircle,
} from 'lucide-react'
import { Input } from '../components/ui/input'

interface User {
  id: string
  username: string
  icFirstName?: string
  icLastName?: string
  role: string
  avatarUrl?: string
}

interface UserAttendance {
  user: User
  attendance: Record<string, boolean>
  totalDays: number
}

interface WeekOverview {
  week: string
  startDate: string
  endDate: string
  days: string[]
  users: UserAttendance[]
}

interface Permission {
  id: string
  userId: string
  user: User
  grantedBy: {
    id: string
    username: string
    icFirstName?: string
  }
  grantedAt: string
}

// Hilfsfunktion: Wochenstring aus Datum
const getWeekString = (date: Date): string => {
  const onejan = new Date(date.getFullYear(), 0, 1)
  const week = Math.ceil(((date.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7)
  return `${date.getFullYear()}-W${week.toString().padStart(2, '0')}`
}

// Hilfsfunktion: Datum aus Wochenstring
const getDateFromWeekString = (weekString: string): Date => {
  const [year, weekPart] = weekString.split('-W')
  const weekNumber = parseInt(weekPart)
  const jan4 = new Date(parseInt(year), 0, 4)
  const dayOfWeek = jan4.getDay() || 7
  const startOfYear = new Date(jan4)
  startOfYear.setDate(jan4.getDate() - dayOfWeek + 1)
  const result = new Date(startOfYear)
  result.setDate(startOfYear.getDate() + (weekNumber - 1) * 7)
  return result
}

// Tag-Namen
const DAY_NAMES = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

export default function AttendancePage() {
  const { user } = useAuthStore()
  usePageTitle('Anwesenheitsliste')
  const queryClient = useQueryClient()

  const [currentWeek, setCurrentWeek] = useState(getWeekString(new Date()))
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [confirmAction, setConfirmAction] = useState<'add' | 'remove'>('add')

  const isLeadership = hasRole(user, ['EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA'])

  // Fetch week overview
  const { data: weekData, isLoading } = useQuery<WeekOverview>({
    queryKey: ['attendance', currentWeek],
    queryFn: () => api.get(`/attendance?week=${currentWeek}`).then(res => res.data),
  })

  // Fetch permission status
  const { data: canMarkData } = useQuery<{ canMark: boolean }>({
    queryKey: ['attendance-can-mark'],
    queryFn: () => api.get('/attendance/can-mark').then(res => res.data),
  })

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['attendance-stats'],
    queryFn: () => api.get('/attendance/stats?weeks=4').then(res => res.data),
  })

  // Fetch permissions (for settings)
  const { data: permissions = [] } = useQuery<Permission[]>({
    queryKey: ['attendance-permissions'],
    queryFn: () => api.get('/attendance/permissions').then(res => res.data),
    enabled: isLeadership,
  })

  // Fetch all users (for granting permissions)
  const { data: allUsers = [] } = useQuery<User[]>({
    queryKey: ['users-all'],
    queryFn: () => api.get('/users').then(res => res.data),
    enabled: isLeadership && isSettingsOpen,
  })

  const canMark = canMarkData?.canMark || false

  // Mark attendance mutation
  const markMutation = useMutation({
    mutationFn: (data: { userIds: string[]; date: string }) =>
      api.post('/attendance', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] })
      toast.success('Anwesenheit eingetragen')
      setSelectedUsers(new Set())
      setIsConfirmDialogOpen(false)
    },
    onError: () => {
      toast.error('Fehler beim Eintragen')
    },
  })

  // Remove attendance mutation
  const removeMutation = useMutation({
    mutationFn: (data: { userIds: string[]; date: string }) =>
      api.post('/attendance/remove', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance'] })
      queryClient.invalidateQueries({ queryKey: ['attendance-stats'] })
      toast.success('Anwesenheit entfernt')
      setSelectedUsers(new Set())
      setIsConfirmDialogOpen(false)
    },
    onError: () => {
      toast.error('Fehler beim Entfernen')
    },
  })

  // Grant permission mutation
  const grantPermissionMutation = useMutation({
    mutationFn: (userId: string) =>
      api.post('/attendance/permissions', { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-permissions'] })
      toast.success('Berechtigung erteilt')
    },
    onError: () => {
      toast.error('Fehler beim Erteilen der Berechtigung')
    },
  })

  // Revoke permission mutation
  const revokePermissionMutation = useMutation({
    mutationFn: (userId: string) =>
      api.delete(`/attendance/permissions/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance-permissions'] })
      toast.success('Berechtigung entzogen')
    },
    onError: () => {
      toast.error('Fehler beim Entziehen der Berechtigung')
    },
  })

  // Filter users by search
  const filteredUsers = useMemo(() => {
    if (!weekData?.users) return []
    if (!searchTerm) return weekData.users
    const search = searchTerm.toLowerCase()
    return weekData.users.filter(u => 
      u.user.username.toLowerCase().includes(search) ||
      u.user.icFirstName?.toLowerCase().includes(search) ||
      u.user.icLastName?.toLowerCase().includes(search)
    )
  }, [weekData?.users, searchTerm])

  // Navigation
  const goToPreviousWeek = () => {
    const date = getDateFromWeekString(currentWeek)
    date.setDate(date.getDate() - 7)
    setCurrentWeek(getWeekString(date))
  }

  const goToNextWeek = () => {
    const date = getDateFromWeekString(currentWeek)
    date.setDate(date.getDate() + 7)
    setCurrentWeek(getWeekString(date))
  }

  const goToCurrentWeek = () => {
    setCurrentWeek(getWeekString(new Date()))
  }

  // Handle cell click
  const handleCellClick = (userId: string, date: string, isPresent: boolean) => {
    if (!canMark) return
    
    setSelectedDate(date)
    setConfirmAction(isPresent ? 'remove' : 'add')
    
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  // Handle confirm
  const handleConfirm = () => {
    if (!selectedDate || selectedUsers.size === 0) return
    
    if (confirmAction === 'add') {
      markMutation.mutate({
        userIds: Array.from(selectedUsers),
        date: selectedDate,
      })
    } else {
      removeMutation.mutate({
        userIds: Array.from(selectedUsers),
        date: selectedDate,
      })
    }
  }

  // Open confirm dialog
  const openConfirmDialog = () => {
    if (selectedUsers.size === 0 || !selectedDate) {
      toast.error('Wähle mindestens einen User und ein Datum aus')
      return
    }
    setIsConfirmDialogOpen(true)
  }

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })
  }

  // Get user display name
  const getUserName = (u: User) => {
    if (u.icFirstName && u.icLastName) return `${u.icFirstName} ${u.icLastName}`
    if (u.icFirstName) return u.icFirstName
    return u.username
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-cyan-500/20 p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-cyan-500/20 rounded-xl">
              <Calendar className="h-8 w-8 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Tägliche Anwesenheit</h1>
              <p className="text-gray-400 mt-1">
                Erfasse die Anwesenheit der Mitglieder
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isLeadership && (
              <Button
                onClick={() => setIsSettingsOpen(true)}
                variant="outline"
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
              >
                <Settings className="h-4 w-4 mr-2" />
                Berechtigungen
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Week Navigation */}
      <Card className="bg-gray-900/50 border-gray-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={goToPreviousWeek}
              variant="outline"
              className="border-gray-700 hover:bg-gray-800"
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              Vorherige Woche
            </Button>
            
            <div className="flex items-center gap-4">
              <span className="text-lg font-medium text-white">
                {weekData ? `${formatDate(weekData.startDate)} - ${formatDate(weekData.endDate)}` : currentWeek}
              </span>
              <Button
                onClick={goToCurrentWeek}
                variant="ghost"
                size="sm"
                className="text-cyan-400 hover:text-cyan-300"
              >
                Heute
              </Button>
            </div>
            
            <Button
              onClick={goToNextWeek}
              variant="outline"
              className="border-gray-700 hover:bg-gray-800"
            >
              Nächste Woche
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Table */}
        <div className="lg:col-span-3">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="border-b border-gray-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-cyan-400" />
                  Anwesenheits-Tabelle
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                    <Input
                      placeholder="Suchen..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-48 bg-gray-800/50 border-gray-700"
                    />
                  </div>
                  {canMark && selectedUsers.size > 0 && selectedDate && (
                    <Button
                      onClick={openConfirmDialog}
                      className="bg-cyan-600 hover:bg-cyan-700"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      {selectedUsers.size} Bestätigen
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500" />
                </div>
              ) : weekData ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-800">
                        <th className="text-left p-3 text-gray-400 font-medium sticky left-0 bg-gray-900/95 z-10">
                          Mitglied
                        </th>
                        {weekData.days.map((day, index) => (
                          <th key={day} className="p-3 text-center text-gray-400 font-medium min-w-[60px]">
                            <div>{DAY_NAMES[index]}</div>
                            <div className="text-xs">{formatDate(day)}</div>
                          </th>
                        ))}
                        <th className="p-3 text-center text-gray-400 font-medium">
                          Σ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((ua) => (
                        <tr key={ua.user.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                          <td className="p-3 sticky left-0 bg-gray-900/95 z-10">
                            <div className="flex items-center gap-2">
                              {ua.user.avatarUrl ? (
                                <img
                                  src={ua.user.avatarUrl}
                                  alt=""
                                  className="h-8 w-8 rounded-full"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-xs text-gray-400">
                                  {getUserName(ua.user).charAt(0)}
                                </div>
                              )}
                              <span className="text-white text-sm font-medium">
                                {getUserName(ua.user)}
                              </span>
                            </div>
                          </td>
                          {weekData.days.map((day) => {
                            const isPresent = ua.attendance[day]
                            const isSelected = selectedUsers.has(ua.user.id) && selectedDate === day
                            return (
                              <td key={day} className="p-3 text-center">
                                <button
                                  onClick={() => handleCellClick(ua.user.id, day, isPresent)}
                                  disabled={!canMark}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                    isSelected
                                      ? 'bg-cyan-500 text-white ring-2 ring-cyan-400'
                                      : isPresent
                                        ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                        : canMark
                                          ? 'bg-gray-800/50 text-gray-600 hover:bg-gray-700/50 hover:text-gray-400'
                                          : 'bg-gray-800/30 text-gray-700'
                                  }`}
                                >
                                  {isPresent ? <Check className="h-4 w-4" /> : null}
                                </button>
                              </td>
                            )
                          })}
                          <td className="p-3 text-center">
                            <span className={`font-bold ${
                              ua.totalDays >= 5 ? 'text-green-400' :
                              ua.totalDays >= 3 ? 'text-yellow-400' :
                              'text-red-400'
                            }`}>
                              {ua.totalDays}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {!canMark && (
            <div className="mt-4 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-400" />
              <span className="text-yellow-300 text-sm">
                Du hast keine Berechtigung, Anwesenheiten einzutragen. Kontaktiere die Leaderschaft.
              </span>
            </div>
          )}
        </div>

        {/* Stats Panel */}
        <div className="space-y-4">
          {/* Top Active */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                Aktivste (4 Wochen)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {statsData?.topActive?.slice(0, 5).map((s: any, i: number) => (
                <div key={s.user.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-4">{i + 1}.</span>
                    <span className="text-white">{getUserName(s.user)}</span>
                  </div>
                  <span className="text-green-400 font-medium">{s.count}</span>
                </div>
              ))}
              {!statsData?.topActive?.length && (
                <p className="text-gray-500 text-sm">Keine Daten</p>
              )}
            </CardContent>
          </Card>

          {/* Most Inactive */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-sm flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-red-400" />
                Inaktivste (4 Wochen)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {statsData?.mostInactive?.slice(0, 5).map((s: any, i: number) => (
                <div key={s.user.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 w-4">{i + 1}.</span>
                    <span className="text-white">{getUserName(s.user)}</span>
                  </div>
                  <span className="text-red-400 font-medium">{s.count}</span>
                </div>
              ))}
              {!statsData?.mostInactive?.length && (
                <p className="text-gray-500 text-sm">Keine Daten</p>
              )}
            </CardContent>
          </Card>

          {/* Period Info */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-cyan-400">
                  {statsData?.totalAttendances || 0}
                </div>
                <div className="text-gray-400 text-sm">
                  Anwesenheiten (4 Wochen)
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-cyan-400" />
              Anwesenheit bestätigen
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {confirmAction === 'add' ? (
                <>
                  Bitte bestätige, dass die ausgewählten {selectedUsers.size} Person(en) am{' '}
                  <span className="text-white font-medium">{selectedDate ? formatDate(selectedDate) : ''}</span>{' '}
                  <span className="text-cyan-400 font-medium">nach 17:00 Uhr</span> für{' '}
                  <span className="text-cyan-400 font-medium">mindestens 1 Stunde</span> aktiv waren.
                </>
              ) : (
                <>
                  Möchtest du die Anwesenheit von {selectedUsers.size} Person(en) am{' '}
                  <span className="text-white font-medium">{selectedDate ? formatDate(selectedDate) : ''}</span>{' '}
                  entfernen?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
              className="border-gray-700"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={markMutation.isPending || removeMutation.isPending}
              className={confirmAction === 'add' ? 'bg-cyan-600 hover:bg-cyan-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {markMutation.isPending || removeMutation.isPending ? 'Speichere...' : 'Bestätigen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Settings className="h-5 w-5 text-cyan-400" />
              Berechtigungen verwalten
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Bestimme, wer Anwesenheiten eintragen darf (zusätzlich zu Leadership und Intelligencia).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {/* Current Permissions */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-300">Aktuelle Berechtigungen</h3>
              {permissions.length === 0 ? (
                <p className="text-gray-500 text-sm">Keine zusätzlichen Berechtigungen vergeben</p>
              ) : (
                permissions.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {p.user.avatarUrl ? (
                        <img src={p.user.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                          {getUserName(p.user).charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="text-white text-sm font-medium">{getUserName(p.user)}</div>
                        <div className="text-gray-500 text-xs">
                          Erteilt von {p.grantedBy.icFirstName || p.grantedBy.username}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => revokePermissionMutation.mutate(p.userId)}
                      disabled={revokePermissionMutation.isPending}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>

            {/* Add Permission */}
            <div className="space-y-2 border-t border-gray-800 pt-4">
              <h3 className="text-sm font-medium text-gray-300">Berechtigung erteilen</h3>
              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto">
                {allUsers
                  .filter(u => !permissions.some(p => p.userId === u.id))
                  .filter(u => !['FUTURO', 'GAST'].includes(u.role))
                  .map((u) => (
                    <Button
                      key={u.id}
                      variant="outline"
                      size="sm"
                      onClick={() => grantPermissionMutation.mutate(u.id)}
                      disabled={grantPermissionMutation.isPending}
                      className="justify-start border-gray-700 hover:bg-gray-800"
                    >
                      <Plus className="h-3 w-3 mr-2" />
                      {getUserName(u)}
                    </Button>
                  ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

