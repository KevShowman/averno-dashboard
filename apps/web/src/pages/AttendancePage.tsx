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
  BarChart3,
  Flame,
  Target,
  Award,
  Percent,
  CalendarDays,
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

interface UserStat {
  user: User
  bloodInDate: string | null
  daysSinceBloodIn: number
  totalAttendance: number
  attendancePercentage: number
  currentStreak: number
  last7Days: number
  last30Days: number
  last7DaysPercentage: number
  last30DaysPercentage: number
  actualLast7Days: number
  actualLast30Days: number
}

interface DetailedStats {
  userStats: UserStat[]
  rankings: {
    byPercentage: UserStat[]
    byStreak: UserStat[]
    byLast7Days: UserStat[]
    byTotal: UserStat[]
    lowestPercentage: UserStat[]
  }
  overview: {
    totalUsers: number
    usersWithBloodIn: number
    avgPercentage: number
    avgLast7Days: number
    totalAttendances: number
    trackingStartDate: string
    daysSinceTrackingStart: number
  }
}

export default function AttendancePage() {
  const { user } = useAuthStore()
  usePageTitle('Anwesenheitsliste')
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = useState<'weekly' | 'statistics'>('weekly')
  const [currentWeek, setCurrentWeek] = useState(getWeekString(new Date()))
  // Selected cells: Set of "userId:date" strings
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set())
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [statsSearchTerm, setStatsSearchTerm] = useState('')
  const [confirmAction, setConfirmAction] = useState<'add' | 'remove'>('add')

  const isLeadership = hasRole(user, ['PATRON', 'DON', 'CAPO', 'ADMIN'])

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

  // Fetch detailed stats
  const { data: detailedStats, isLoading: detailedStatsLoading } = useQuery<DetailedStats>({
    queryKey: ['attendance-detailed-stats'],
    queryFn: () => api.get('/attendance/detailed-stats').then(res => res.data),
    enabled: activeTab === 'statistics',
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
      queryClient.invalidateQueries({ queryKey: ['attendance-detailed-stats'] })
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
      queryClient.invalidateQueries({ queryKey: ['attendance-detailed-stats'] })
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

  // Helper to create cell key
  const getCellKey = (userId: string, date: string) => `${userId}:${date}`
  const parseCellKey = (key: string) => {
    const [userId, date] = key.split(':')
    return { userId, date }
  }

  // Check if cell is selected
  const isCellSelected = (userId: string, date: string) => selectedCells.has(getCellKey(userId, date))

  // Handle cell click
  const handleCellClick = (userId: string, date: string, isPresent: boolean) => {
    if (!canMark) return
    
    const cellKey = getCellKey(userId, date)
    const newSelected = new Set(selectedCells)
    
    if (newSelected.has(cellKey)) {
      // Deselect this cell
      newSelected.delete(cellKey)
    } else {
      // Select this cell - check if we're mixing add/remove actions
      const currentAction = isPresent ? 'remove' : 'add'
      
      // If we have existing selections, check if action matches
      if (newSelected.size > 0) {
        const firstKey = Array.from(newSelected)[0]
        const { userId: firstUserId, date: firstDate } = parseCellKey(firstKey)
        const firstUser = weekData?.users.find(u => u.user.id === firstUserId)
        const firstIsPresent = firstUser?.attendance[firstDate] || false
        const firstAction = firstIsPresent ? 'remove' : 'add'
        
        if (currentAction !== firstAction) {
          // Different action - start new selection
          newSelected.clear()
          setConfirmAction(currentAction)
        }
      } else {
        setConfirmAction(currentAction)
      }
      
      newSelected.add(cellKey)
    }
    
    setSelectedCells(newSelected)
  }

  // Handle confirm - process all selected cells
  const handleConfirm = async () => {
    if (selectedCells.size === 0) return
    
    // Group selections by date
    const byDate = new Map<string, string[]>()
    selectedCells.forEach(cellKey => {
      const { userId, date } = parseCellKey(cellKey)
      if (!byDate.has(date)) {
        byDate.set(date, [])
      }
      byDate.get(date)!.push(userId)
    })
    
    try {
      // Process each date
      if (confirmAction === 'add') {
        for (const [date, userIds] of byDate) {
          await markMutation.mutateAsync({ userIds, date })
        }
        toast.success(`${selectedCells.size} Anwesenheit(en) eingetragen`)
      } else {
        for (const [date, userIds] of byDate) {
          await removeMutation.mutateAsync({ userIds, date })
        }
        toast.success(`${selectedCells.size} Anwesenheit(en) entfernt`)
      }
      
      setSelectedCells(new Set())
      setIsConfirmDialogOpen(false)
    } catch {
      // Error already handled by mutation
    }
  }

  // Clear selection
  const clearSelection = () => {
    setSelectedCells(new Set())
  }

  // Open confirm dialog
  const openConfirmDialog = () => {
    if (selectedCells.size === 0) {
      toast.error('Wähle mindestens eine Zelle aus')
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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-orange-500/20 p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-orange-500/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/20 rounded-xl">
              <Calendar className="h-8 w-8 text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Tägliche Anwesenheit</h1>
              <p className="text-zinc-400 mt-1">
                Erfasse die Anwesenheit der Mitglieder
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {isLeadership && (
              <Button
                onClick={() => setIsSettingsOpen(true)}
                variant="outline"
                className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
              >
                <Settings className="h-4 w-4 mr-2" />
                Berechtigungen
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex gap-2 p-1 bg-zinc-900/50 rounded-xl border border-zinc-800 w-fit">
        <Button
          onClick={() => setActiveTab('weekly')}
          variant="ghost"
          className={`px-6 py-2 rounded-lg transition-all ${
            activeTab === 'weekly'
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Wochenansicht
        </Button>
        <Button
          onClick={() => setActiveTab('statistics')}
          variant="ghost"
          className={`px-6 py-2 rounded-lg transition-all ${
            activeTab === 'statistics'
              ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
              : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
          }`}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Statistiken
        </Button>
      </div>

      {activeTab === 'weekly' && (
      <>
      {/* Week Navigation */}
      <Card className="bg-zinc-900/50 border-zinc-800">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <Button
              onClick={goToPreviousWeek}
              variant="outline"
              className="border-zinc-700 hover:bg-zinc-800"
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
                className="text-orange-400 hover:text-orange-300"
              >
                Heute
              </Button>
            </div>
            
            <Button
              onClick={goToNextWeek}
              variant="outline"
              className="border-zinc-700 hover:bg-zinc-800"
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
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardHeader className="border-b border-zinc-800">
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <Users className="h-5 w-5 text-orange-400" />
                  Anwesenheits-Tabelle
                </CardTitle>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                    <Input
                      placeholder="Suchen..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-48 bg-zinc-800/50 border-zinc-700"
                    />
                  </div>
                  {canMark && selectedCells.size > 0 && (
                    <span className="text-orange-400 text-sm font-medium">
                      {selectedCells.size} ausgewählt
                    </span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
                </div>
              ) : weekData ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-800">
                        <th className="text-left p-3 text-zinc-400 font-medium sticky left-0 bg-zinc-900/95 z-10">
                          Mitglied
                        </th>
                        {weekData.days.map((day) => {
                          // Get actual day of week from the date
                          const date = new Date(day + 'T12:00:00') // Use noon to avoid timezone issues
                          const dayOfWeek = date.getDay() // 0 = Sunday, 1 = Monday, ...
                          const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // Convert to Monday = 0
                          return (
                            <th key={day} className="p-3 text-center text-zinc-400 font-medium min-w-[60px]">
                              <div>{DAY_NAMES[dayIndex]}</div>
                              <div className="text-xs">{formatDate(day)}</div>
                            </th>
                          )
                        })}
                        <th className="p-3 text-center text-zinc-400 font-medium">
                          Σ
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredUsers.map((ua) => (
                        <tr key={ua.user.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                          <td className="p-3 sticky left-0 bg-zinc-900/95 z-10">
                            <div className="flex items-center gap-2">
                              {ua.user.avatarUrl ? (
                                <img
                                  src={ua.user.avatarUrl}
                                  alt=""
                                  className="h-8 w-8 rounded-full"
                                />
                              ) : (
                                <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs text-zinc-400">
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
                            const isSelected = isCellSelected(ua.user.id, day)
                            const isSelectedForRemoval = isSelected && isPresent
                            const isSelectedForAdd = isSelected && !isPresent
                            return (
                              <td key={day} className="p-3 text-center">
                                <button
                                  onClick={() => handleCellClick(ua.user.id, day, isPresent)}
                                  disabled={!canMark}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                    isSelectedForRemoval
                                      ? 'bg-red-500 text-white ring-2 ring-red-400 ring-offset-1 ring-offset-zinc-900'
                                      : isSelectedForAdd
                                        ? 'bg-orange-500 text-white ring-2 ring-orange-400 ring-offset-1 ring-offset-zinc-900'
                                        : isPresent
                                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30'
                                          : canMark
                                            ? 'bg-zinc-800/50 text-zinc-600 hover:bg-zinc-700/50 hover:text-zinc-400'
                                            : 'bg-zinc-800/30 text-zinc-700'
                                  }`}
                                >
                                  {isSelectedForRemoval ? (
                                    <UserX className="h-4 w-4" />
                                  ) : isSelectedForAdd ? (
                                    <Check className="h-4 w-4" />
                                  ) : isPresent ? (
                                    <Check className="h-4 w-4" />
                                  ) : null}
                                </button>
                              </td>
                            )
                          })}
                          <td className="p-3 text-center">
                            <span className={`font-bold ${
                              ua.totalDays >= 5 ? 'text-green-400' :
                              ua.totalDays >= 3 ? 'text-orange-400' :
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
            <div className="mt-4 p-4 bg-orange-500/10 border border-orange-500/20 rounded-lg flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-orange-400" />
              <span className="text-orange-300 text-sm">
                Du hast keine Berechtigung, Anwesenheiten einzutragen. Kontaktiere die Leaderschaft.
              </span>
            </div>
          )}

          {/* Floating Action Bar */}
          {selectedCells.size > 0 && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
              <div className="bg-zinc-900 border border-orange-500/30 rounded-xl shadow-2xl shadow-orange-500/10 px-6 py-3 flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <Check className="h-4 w-4 text-orange-400" />
                  </div>
                  <span className="text-white font-medium">{selectedCells.size} ausgewählt</span>
                </div>
                <div className="w-px h-8 bg-zinc-700" />
                <Button
                  onClick={clearSelection}
                  variant="ghost"
                  size="sm"
                  className="text-zinc-400 hover:text-white"
                >
                  Abbrechen
                </Button>
                <Button
                  onClick={openConfirmDialog}
                  size="sm"
                  className={confirmAction === 'add' 
                    ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                    : 'bg-red-600 hover:bg-red-700 text-white'}
                >
                  {confirmAction === 'add' ? 'Anwesenheit eintragen' : 'Entfernen'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Stats Panel */}
        <div className="space-y-4">
          {/* Top Active */}
          <Card className="bg-zinc-900/50 border-zinc-800">
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
                    <span className="text-zinc-500 w-4">{i + 1}.</span>
                    <span className="text-white">{getUserName(s.user)}</span>
                  </div>
                  <span className="text-green-400 font-medium">{s.count}</span>
                </div>
              ))}
              {!statsData?.topActive?.length && (
                <p className="text-zinc-500 text-sm">Keine Daten</p>
              )}
            </CardContent>
          </Card>

          {/* Most Inactive */}
          <Card className="bg-zinc-900/50 border-zinc-800">
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
                    <span className="text-zinc-500 w-4">{i + 1}.</span>
                    <span className="text-white">{getUserName(s.user)}</span>
                  </div>
                  <span className="text-red-400 font-medium">{s.count}</span>
                </div>
              ))}
              {!statsData?.mostInactive?.length && (
                <p className="text-zinc-500 text-sm">Keine Daten</p>
              )}
            </CardContent>
          </Card>

          {/* Period Info */}
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="p-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-orange-400">
                  {statsData?.totalAttendances || 0}
                </div>
                <div className="text-zinc-400 text-sm">
                  Anwesenheiten (4 Wochen)
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      </>
      )}

      {/* Statistics Tab */}
      {activeTab === 'statistics' && (
        <div className="space-y-6">
          {detailedStatsLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full" />
            </div>
          ) : detailedStats ? (
            <>
              {/* Tracking Info Banner */}
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-4 flex items-center gap-3">
                <Calendar className="h-5 w-5 text-orange-400" />
                <div>
                  <span className="text-orange-300 text-sm">
                    Tracking seit <span className="font-bold">13.12.2025</span> • {detailedStats.overview.daysSinceTrackingStart} Tag(e) erfasst
                  </span>
                </div>
              </div>

              {/* Overview Cards */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardContent className="p-4 text-center">
                    <Users className="h-6 w-6 text-orange-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{detailedStats.overview.totalUsers}</div>
                    <div className="text-sm text-zinc-400">Gesamt Mitglieder</div>
                  </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardContent className="p-4 text-center">
                    <CalendarDays className="h-6 w-6 text-green-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{detailedStats.overview.totalAttendances}</div>
                    <div className="text-sm text-zinc-400">Anwesenheiten Total</div>
                  </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardContent className="p-4 text-center">
                    <Percent className="h-6 w-6 text-orange-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{detailedStats.overview.avgPercentage}%</div>
                    <div className="text-sm text-zinc-400">Ø Anwesenheit</div>
                  </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardContent className="p-4 text-center">
                    <Target className="h-6 w-6 text-purple-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{detailedStats.overview.avgLast7Days}</div>
                    <div className="text-sm text-zinc-400">Ø Tage (letzte 7)</div>
                  </CardContent>
                </Card>
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardContent className="p-4 text-center">
                    <Award className="h-6 w-6 text-rose-400 mx-auto mb-2" />
                    <div className="text-2xl font-bold text-white">{detailedStats.overview.usersWithBloodIn}</div>
                    <div className="text-sm text-zinc-400">Mit Blood-In</div>
                  </CardContent>
                </Card>
              </div>

              {/* Rankings Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top by Percentage */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                      <TrendingUp className="h-5 w-5 text-green-400" />
                      Beste Anwesenheitsquote
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                      Basierend auf Tagen seit Blood-In (min. 7 Tage)
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {detailedStats.rankings.byPercentage.slice(0, 10).map((stat, index) => (
                      <div key={stat.user.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-orange-500 text-black' :
                            index === 1 ? 'bg-zinc-300 text-black' :
                            index === 2 ? 'bg-orange-700 text-white' :
                            'bg-zinc-700 text-zinc-300'
                          }`}>
                            {index + 1}
                          </div>
                          {stat.user.avatarUrl ? (
                            <img src={stat.user.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm">
                              {(stat.user.icFirstName || stat.user.username).charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="text-white text-sm font-medium">
                              {stat.user.icFirstName && stat.user.icLastName
                                ? `${stat.user.icFirstName} ${stat.user.icLastName}`
                                : stat.user.username}
                            </div>
                            <div className="text-zinc-500 text-xs">
                              {stat.totalAttendance} von {stat.daysSinceBloodIn} Tagen
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            stat.attendancePercentage >= 70 ? 'text-green-400' :
                            stat.attendancePercentage >= 40 ? 'text-orange-400' :
                            'text-red-400'
                          }`}>
                            {stat.attendancePercentage}%
                          </div>
                        </div>
                      </div>
                    ))}
                    {detailedStats.rankings.byPercentage.length === 0 && (
                      <p className="text-zinc-500 text-sm text-center py-4">Keine Daten verfügbar</p>
                    )}
                  </CardContent>
                </Card>

                {/* Lowest Percentage */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                      <TrendingDown className="h-5 w-5 text-red-400" />
                      Niedrigste Anwesenheitsquote
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                      Mitglieder mit Verbesserungspotenzial
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {detailedStats.rankings.lowestPercentage.slice(0, 10).map((stat, index) => (
                      <div key={stat.user.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold bg-red-900/50 text-red-300">
                            {index + 1}
                          </div>
                          {stat.user.avatarUrl ? (
                            <img src={stat.user.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm">
                              {(stat.user.icFirstName || stat.user.username).charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="text-white text-sm font-medium">
                              {stat.user.icFirstName && stat.user.icLastName
                                ? `${stat.user.icFirstName} ${stat.user.icLastName}`
                                : stat.user.username}
                            </div>
                            <div className="text-zinc-500 text-xs">
                              {stat.totalAttendance} von {stat.daysSinceBloodIn} Tagen
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className={`text-lg font-bold ${
                            stat.attendancePercentage >= 70 ? 'text-green-400' :
                            stat.attendancePercentage >= 40 ? 'text-orange-400' :
                            'text-red-400'
                          }`}>
                            {stat.attendancePercentage}%
                          </div>
                        </div>
                      </div>
                    ))}
                    {detailedStats.rankings.lowestPercentage.length === 0 && (
                      <p className="text-zinc-500 text-sm text-center py-4">Keine Daten verfügbar</p>
                    )}
                  </CardContent>
                </Card>

                {/* Top Streaks */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                      <Flame className="h-5 w-5 text-orange-400" />
                      Aktuelle Streaks
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                      Aufeinanderfolgende aktive Tage
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {detailedStats.rankings.byStreak.filter(s => s.currentStreak > 0).slice(0, 10).map((stat, index) => (
                      <div key={stat.user.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-orange-500 text-black' :
                            index === 1 ? 'bg-orange-400 text-black' :
                            index === 2 ? 'bg-orange-300 text-black' :
                            'bg-zinc-700 text-zinc-300'
                          }`}>
                            {index + 1}
                          </div>
                          {stat.user.avatarUrl ? (
                            <img src={stat.user.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm">
                              {(stat.user.icFirstName || stat.user.username).charAt(0)}
                            </div>
                          )}
                          <div className="text-white text-sm font-medium">
                            {stat.user.icFirstName && stat.user.icLastName
                              ? `${stat.user.icFirstName} ${stat.user.icLastName}`
                              : stat.user.username}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-orange-400">
                          <Flame className="h-4 w-4" />
                          <span className="text-lg font-bold">{stat.currentStreak}</span>
                          <span className="text-sm text-zinc-400">Tage</span>
                        </div>
                      </div>
                    ))}
                    {detailedStats.rankings.byStreak.filter(s => s.currentStreak > 0).length === 0 && (
                      <p className="text-zinc-500 text-sm text-center py-4">Keine aktiven Streaks</p>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Days */}
                <Card className="bg-zinc-900/50 border-zinc-800">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-white flex items-center gap-2 text-lg">
                      <Calendar className="h-5 w-5 text-orange-400" />
                      Letzte {detailedStats.userStats[0]?.actualLast7Days || 7} Tage
                    </CardTitle>
                    <CardDescription className="text-zinc-400">
                      Aktivste Mitglieder seit Tracking-Start
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {detailedStats.rankings.byLast7Days.slice(0, 10).map((stat, index) => (
                      <div key={stat.user.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/30 hover:bg-zinc-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index === 0 ? 'bg-orange-500 text-black' :
                            index === 1 ? 'bg-orange-400 text-black' :
                            index === 2 ? 'bg-orange-300 text-black' :
                            'bg-zinc-700 text-zinc-300'
                          }`}>
                            {index + 1}
                          </div>
                          {stat.user.avatarUrl ? (
                            <img src={stat.user.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-sm">
                              {(stat.user.icFirstName || stat.user.username).charAt(0)}
                            </div>
                          )}
                          <div className="text-white text-sm font-medium">
                            {stat.user.icFirstName && stat.user.icLastName
                              ? `${stat.user.icFirstName} ${stat.user.icLastName}`
                              : stat.user.username}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-lg font-bold text-orange-400">{stat.last7Days}/{stat.actualLast7Days}</div>
                          <div className="text-xs text-zinc-500">{stat.last7DaysPercentage}%</div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* All Users Table */}
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-white flex items-center gap-2">
                        <Users className="h-5 w-5 text-orange-400" />
                        Alle Mitglieder Übersicht
                      </CardTitle>
                      <CardDescription className="text-zinc-400">
                        Detaillierte Statistiken aller Mitglieder
                      </CardDescription>
                    </div>
                    <div className="relative w-64">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                      <Input
                        placeholder="Suchen..."
                        value={statsSearchTerm}
                        onChange={(e) => setStatsSearchTerm(e.target.value)}
                        className="pl-9 bg-zinc-800/50 border-zinc-700 text-white placeholder:text-zinc-500"
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-zinc-800">
                          <th className="text-left text-zinc-400 text-sm font-medium py-3 px-2">Mitglied</th>
                          <th className="text-center text-zinc-400 text-sm font-medium py-3 px-2">Blood-In</th>
                          <th className="text-center text-zinc-400 text-sm font-medium py-3 px-2">Tage</th>
                          <th className="text-center text-zinc-400 text-sm font-medium py-3 px-2">Anwesend</th>
                          <th className="text-center text-zinc-400 text-sm font-medium py-3 px-2">Quote</th>
                          <th className="text-center text-zinc-400 text-sm font-medium py-3 px-2">Streak</th>
                          <th className="text-center text-zinc-400 text-sm font-medium py-3 px-2">7 Tage</th>
                          <th className="text-center text-zinc-400 text-sm font-medium py-3 px-2">30 Tage</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailedStats.userStats
                          .filter(stat => {
                            if (!statsSearchTerm) return true
                            const name = stat.user.icFirstName && stat.user.icLastName
                              ? `${stat.user.icFirstName} ${stat.user.icLastName}`
                              : stat.user.username
                            return name.toLowerCase().includes(statsSearchTerm.toLowerCase())
                          })
                          .sort((a, b) => b.attendancePercentage - a.attendancePercentage)
                          .map((stat) => (
                            <tr key={stat.user.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                              <td className="py-3 px-2">
                                <div className="flex items-center gap-2">
                                  {stat.user.avatarUrl ? (
                                    <img src={stat.user.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
                                  ) : (
                                    <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center text-xs">
                                      {(stat.user.icFirstName || stat.user.username).charAt(0)}
                                    </div>
                                  )}
                                  <span className="text-white text-sm">
                                    {stat.user.icFirstName && stat.user.icLastName
                                      ? `${stat.user.icFirstName} ${stat.user.icLastName}`
                                      : stat.user.username}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 px-2 text-center">
                                {stat.bloodInDate ? (
                                  <span className="text-zinc-300 text-sm">
                                    {new Date(stat.bloodInDate).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                                  </span>
                                ) : (
                                  <span className="text-zinc-600 text-sm">-</span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-center text-zinc-300 text-sm">
                                {stat.daysSinceBloodIn || '-'}
                              </td>
                              <td className="py-3 px-2 text-center text-white font-medium text-sm">
                                {stat.totalAttendance}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className={`font-bold text-sm ${
                                  stat.attendancePercentage >= 70 ? 'text-green-400' :
                                  stat.attendancePercentage >= 40 ? 'text-orange-400' :
                                  stat.attendancePercentage > 0 ? 'text-red-400' :
                                  'text-zinc-600'
                                }`}>
                                  {stat.bloodInDate ? `${stat.attendancePercentage}%` : '-'}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-center">
                                {stat.currentStreak > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-orange-400 text-sm">
                                    <Flame className="h-3 w-3" />
                                    {stat.currentStreak}
                                  </span>
                                ) : (
                                  <span className="text-zinc-600 text-sm">-</span>
                                )}
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className={`text-sm ${stat.last7DaysPercentage >= 70 ? 'text-green-400' : stat.last7DaysPercentage >= 40 ? 'text-orange-400' : 'text-zinc-400'}`}>
                                  {stat.last7Days}/{stat.actualLast7Days}
                                </span>
                              </td>
                              <td className="py-3 px-2 text-center">
                                <span className={`text-sm ${stat.last30DaysPercentage >= 70 ? 'text-green-400' : stat.last30DaysPercentage >= 40 ? 'text-orange-400' : 'text-zinc-400'}`}>
                                  {stat.last30Days}/{stat.actualLast30Days}
                                </span>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <div className="text-center py-12 text-zinc-400">Fehler beim Laden der Statistiken</div>
          )}
        </div>
      )}

      {/* Confirm Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-orange-400" />
              Anwesenheit bestätigen
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              {confirmAction === 'add' ? (
                <>
                  Bitte bestätige, dass die ausgewählten <span className="text-white font-medium">{selectedCells.size} Einträge</span>{' '}
                  <span className="text-orange-400 font-medium">nach 17:00 Uhr</span> für{' '}
                  <span className="text-orange-400 font-medium">mindestens 1 Stunde</span> aktiv waren.
                </>
              ) : (
                <>
                  Möchtest du <span className="text-white font-medium">{selectedCells.size} Einträge</span>{' '}
                  entfernen?
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsConfirmDialogOpen(false)}
              className="border-zinc-700"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={markMutation.isPending || removeMutation.isPending}
              className={confirmAction === 'add' ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {markMutation.isPending || removeMutation.isPending ? 'Speichere...' : 'Bestätigen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="bg-zinc-900 border-zinc-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Settings className="h-5 w-5 text-orange-400" />
              Berechtigungen verwalten
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Bestimme, wer Anwesenheiten eintragen darf (zusätzlich zu Leadership und Intelligencia).
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 max-h-[400px] overflow-y-auto">
            {/* Current Permissions */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-zinc-300">Aktuelle Berechtigungen</h3>
              {permissions.length === 0 ? (
                <p className="text-zinc-500 text-sm">Keine zusätzlichen Berechtigungen vergeben</p>
              ) : (
                permissions.map((p) => (
                  <div key={p.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {p.user.avatarUrl ? (
                        <img src={p.user.avatarUrl} alt="" className="h-8 w-8 rounded-full" />
                      ) : (
                        <div className="h-8 w-8 rounded-full bg-zinc-700 flex items-center justify-center text-xs">
                          {getUserName(p.user).charAt(0)}
                        </div>
                      )}
                      <div>
                        <div className="text-white text-sm font-medium">{getUserName(p.user)}</div>
                        <div className="text-zinc-500 text-xs">
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
            <div className="space-y-2 border-t border-zinc-800 pt-4">
              <h3 className="text-sm font-medium text-zinc-300">Berechtigung erteilen</h3>
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
                      className="justify-start border-zinc-700 hover:bg-zinc-800"
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

