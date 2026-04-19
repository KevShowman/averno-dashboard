import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { usersApi, discordApi } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { hasRole } from '../lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table'
import { Users, Crown, Shield, UserCheck, Package, MapPin, AlertTriangle, User as UserIcon, Zap, Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import EnhancedPeoplePicker from '../components/EnhancedPeoplePicker'

interface User {
  id: string
  username: string
  icFirstName?: string
  icLastName?: string
  avatarUrl?: string
  role: string
  allRoles?: string[]
  createdAt: string
}

interface Role {
  key: string
  name: string
  description: string
}

interface UserStats {
  totalUsers: number
  roles: Array<{
    role: string
    count: number
    name: string
  }>
}

const roleIcons = {
  'PATRON': Crown,
  'DON': Shield,
  'CAPO': UserCheck,
  'LOGISTICA': Package,
  'ROUTENVERWALTUNG': MapPin,
  'SICARIO': AlertTriangle,
  'LINCE': UserIcon,
  'FUTURO': UserIcon,
}

export default function UserManagementPage() {
  const { user: currentUser } = useAuthStore()
  const queryClient = useQueryClient()
  const [selectedUser, setSelectedUser] = useState<User | null>(null)

  // Prüfen ob User Patron oder Don ist
  const isElPatron = hasRole(currentUser, 'PATRON')
  const canManageUsers = hasRole(currentUser, ['PATRON', 'DON'])

  // Queries
  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => usersApi.getAllUsers().then(res => res.data),
  })

  const { data: userStats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ['user-stats'],
    queryFn: () => usersApi.getUserStats().then(res => res.data),
  })

  // Mutations
  const updateUserRolesMutation = useMutation({
    mutationFn: ({ userId, allRoles }: { userId: string; allRoles: string[] }) =>
      usersApi.updateUserRoles(userId, { allRoles }),
    onSuccess: () => {
      toast.success('Benutzer-Rollen wurden aktualisiert')
      queryClient.invalidateQueries({ queryKey: ['all-users'] })
      queryClient.invalidateQueries({ queryKey: ['user-stats'] })
      setSelectedUser(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Aktualisieren der Rollen')
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: (userId: string) => usersApi.deleteUser(userId),
    onSuccess: () => {
      toast.success('Benutzer wurde erfolgreich gelöscht')
      queryClient.invalidateQueries({ queryKey: ['all-users'] })
      queryClient.invalidateQueries({ queryKey: ['user-stats'] })
      setSelectedUser(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Löschen des Benutzers')
    },
  })

  const syncDiscordMutation = useMutation({
    mutationFn: () => discordApi.syncAndRemoveInactive(),
    onSuccess: (data) => {
      toast.success(`Discord-Sync abgeschlossen: ${data.data.removed} User entfernt, ${data.data.imported} neu importiert`)
      queryClient.invalidateQueries({ queryKey: ['all-users'] })
      queryClient.invalidateQueries({ queryKey: ['user-stats'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler bei der Discord-Synchronisierung')
    },
  })

  const handleUserSelect = (user: User | null) => {
    setSelectedUser(user)
  }

  const handleRoleUpdate = (userId: string, allRoles: string[]) => {
    updateUserRolesMutation.mutate({ userId, allRoles })
  }

  const handleDeleteUser = (userId: string, username: string) => {
    if (window.confirm(`Möchtest du ${username} wirklich löschen? Dies kann nicht rückgängig gemacht werden.`)) {
      deleteUserMutation.mutate(userId)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE')
  }

  const getDisplayName = (user: User) => {
    if (user.icFirstName && user.icLastName) {
      return `${user.icFirstName} ${user.icLastName}`
    }
    return user.username
  }

  if (!isElPatron) {
    return (
      <div className="p-6">
        <Card className="lasanta-card">
          <CardContent className="p-8 text-center">
            <Crown className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Zugriff verweigert</h2>
            <p className="text-gray-400">
              Nur Patron kann die Benutzerverwaltung zugreifen.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (isLoading || statsLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-gray-400">Lade Benutzerdaten...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-2">
            <Users className="h-8 w-8" />
            Benutzerverwaltung
          </h1>
          <p className="text-gray-400 mt-2">
            Verwalte Benutzer-Rollen und Berechtigungen
          </p>
        </div>
        {canManageUsers && (
          <Button
            onClick={() => syncDiscordMutation.mutate()}
            disabled={syncDiscordMutation.isPending}
            variant="outline"
            className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncDiscordMutation.isPending ? 'animate-spin' : ''}`} />
            Discord Sync
          </Button>
        )}
      </div>

      {/* Stats */}
      {userStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="lasanta-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <div className="text-2xl font-bold text-white">{userStats.totalUsers}</div>
                  <div className="text-sm text-gray-400">Gesamt Benutzer</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {userStats.roles.map((roleStat) => {
            const Icon = roleIcons[roleStat.role as keyof typeof roleIcons] || UserIcon
            return (
              <Card key={roleStat.role} className="lasanta-card">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <div>
                      <div className="text-2xl font-bold text-white">{roleStat.count}</div>
                      <div className="text-sm text-gray-400">{roleStat.name}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* User Selection */}
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Benutzer auswählen
            </CardTitle>
            <CardDescription className="text-gray-400">
              Wähle einen Benutzer aus, um dessen Rollen zu verwalten
            </CardDescription>
          </CardHeader>
          <CardContent>
            <EnhancedPeoplePicker
              onUserSelect={handleUserSelect}
              onRoleUpdate={handleRoleUpdate}
              selectedUser={selectedUser}
              showRoleManagement={true}
              placeholder="Benutzer suchen..."
            />
          </CardContent>
        </Card>

        {/* All Users Table */}
        <Card className="lasanta-card">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Users className="h-5 w-5" />
              Alle Benutzer
            </CardTitle>
            <CardDescription className="text-gray-400">
              Übersicht aller registrierten Benutzer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-gray-400">Benutzer</TableHead>
                    <TableHead className="text-gray-400">Rollen</TableHead>
                    <TableHead className="text-gray-400">Beigetreten</TableHead>
                    <TableHead className="text-gray-400">Aktionen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-gray-800/50">
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {user.avatarUrl ? (
                            <img
                              src={user.avatarUrl}
                              alt={getDisplayName(user)}
                              className="h-6 w-6 rounded-full"
                            />
                          ) : (
                            <UserIcon className="h-6 w-6 text-gray-400" />
                          )}
                          <div>
                            <div className="text-white text-sm font-medium">
                              {getDisplayName(user)}
                            </div>
                            <div className="text-gray-400 text-xs">
                              @{getDisplayName(user)}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.allRoles && user.allRoles.length > 1 ? (
                            user.allRoles.map((role, index) => {
                              const Icon = roleIcons[role as keyof typeof roleIcons] || UserIcon
                              return (
                                <Badge key={index} className="text-xs" variant="outline">
                                  <Icon className="h-3 w-3 mr-1" />
                                  {role}
                                </Badge>
                              )
                            })
                          ) : (
                            <Badge className="text-xs" variant="outline">
                              {user.role}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-300 text-sm">
                        {formatDate(user.createdAt)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUserSelect(user)}
                            className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
                          >
                            <Zap className="h-3 w-3 mr-1" />
                            Verwalten
                          </Button>
                          {canManageUsers && user.id !== currentUser?.id && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteUser(user.id, getDisplayName(user))}
                              disabled={deleteUserMutation.isPending}
                              className="text-red-400 border-red-400 hover:bg-red-400/10"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
