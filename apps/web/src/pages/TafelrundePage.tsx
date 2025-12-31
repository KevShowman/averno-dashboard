import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { usePageTitle } from '../hooks/usePageTitle'
import { hasRole } from '../lib/utils'
import { toast } from 'sonner'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import {
  Users,
  Plus,
  Calendar,
  MapPin,
  Clock,
  Check,
  X,
  HelpCircle,
  ChevronRight,
  ChevronLeft,
  Trash2,
  Edit,
  Settings,
  Shield,
  Loader2,
  UserPlus,
  AlertCircle,
  Car,
} from 'lucide-react'
import { MeetingPointPicker } from '../components/MeetingPointPicker'

type TafelrundeStatus = 'PLANNED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED'
type AttendanceStatus = 'UNKNOWN' | 'ATTENDING' | 'NOT_ATTENDING' | 'MAYBE'

interface FamilyContact {
  id: string
  familyName: string
  status: string
  propertyZip?: string
}

interface TafelrundeFamily {
  id: string
  familyContactId: string
  familyContact: FamilyContact
  attendanceStatus: AttendanceStatus
  note?: string
  updatedBy?: {
    id: string
    username: string
  }
  updatedAt: string
}

interface Tafelrunde {
  id: string
  title: string
  description?: string
  date: string
  location?: string
  status: TafelrundeStatus
  createdBy: {
    id: string
    username: string
    icFirstName?: string
    icLastName?: string
  }
  families: TafelrundeFamily[]
  _count: {
    families: number
  }
  createdAt: string
}

interface TafelrundePermission {
  id: string
  userId: string
  user: {
    id: string
    username: string
    icFirstName?: string
    icLastName?: string
    role: string
  }
  grantedBy: {
    id: string
    username: string
  }
  createdAt: string
}

interface UserForPermission {
  id: string
  username: string
  icFirstName?: string
  icLastName?: string
  role: string
}

const LEADERSHIP_ROLES = ['EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA', 'ADMIN']

const statusConfig: Record<TafelrundeStatus, { label: string; color: string; bgColor: string }> = {
  PLANNED: { label: 'Geplant', color: 'text-blue-400', bgColor: 'bg-blue-500/20' },
  ACTIVE: { label: 'Aktiv', color: 'text-green-400', bgColor: 'bg-green-500/20' },
  COMPLETED: { label: 'Abgeschlossen', color: 'text-gray-400', bgColor: 'bg-gray-500/20' },
  CANCELLED: { label: 'Abgesagt', color: 'text-red-400', bgColor: 'bg-red-500/20' },
}

const attendanceConfig: Record<AttendanceStatus, { label: string; color: string; bgColor: string; icon: typeof Check }> = {
  UNKNOWN: { label: 'Unbekannt', color: 'text-gray-400', bgColor: 'bg-gray-500/20', icon: HelpCircle },
  ATTENDING: { label: 'Kommt', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: Check },
  NOT_ATTENDING: { label: 'Kommt nicht', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: X },
  MAYBE: { label: 'Vielleicht', color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: HelpCircle },
}

export default function TafelrundePage() {
  usePageTitle('Tafelrunde')
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  
  const [activeTab, setActiveTab] = useState<'overview' | 'permissions'>('overview')
  const [selectedTafelrunde, setSelectedTafelrunde] = useState<Tafelrunde | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isAddFamiliesDialogOpen, setIsAddFamiliesDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState('')
  
  const [createStep, setCreateStep] = useState<1 | 2>(1) // Wizard-Step für Create Dialog
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    meetingPointMapName: '' as string,
    meetingPointX: null as number | null,
    meetingPointY: null as number | null,
    pickupStartTime: '',
    arrivalDeadline: '',
  })

  const isLeadership = user && LEADERSHIP_ROLES.includes(user.role)
  const isPartner = user?.isPartner === true

  // Queries
  const { data: tafelrunden = [], isLoading } = useQuery<Tafelrunde[]>({
    queryKey: ['tafelrunden'],
    queryFn: () => api.get('/tafelrunde').then(res => res.data),
  })

  const { data: familyContacts = [] } = useQuery<FamilyContact[]>({
    queryKey: ['family-contacts-for-tafelrunde'],
    queryFn: () => api.get('/family-contacts').then(res => res.data),
  })

  const permissionsQuery = useQuery({
    queryKey: ['tafelrunde-permissions'],
    queryFn: () => api.get('/tafelrunde/permissions/list').then(res => res.data as TafelrundePermission[]),
    enabled: !!isLeadership,
  })
  const permissions = permissionsQuery.data ?? []

  const availableUsersQuery = useQuery({
    queryKey: ['users-for-tafelrunde-permission'],
    queryFn: () => api.get('/users').then(res => res.data as UserForPermission[]),
    enabled: !!isLeadership,
  })
  const availableUsers = availableUsersQuery.data ?? []

  const permissionCheckQuery = useQuery({
    queryKey: ['tafelrunde-permission-check'],
    queryFn: () => api.get('/tafelrunde/permissions/check').then(res => res.data as { hasPermission: boolean }),
  })

  const canManage = isLeadership || permissionCheckQuery.data?.hasPermission === true

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => {
      const dateTime = `${data.date}T${data.time || '00:00'}:00`
      return api.post('/tafelrunde', {
        title: data.title,
        description: data.description || undefined,
        date: dateTime,
        location: data.location || undefined,
        meetingPointMapName: data.meetingPointMapName,
        meetingPointX: data.meetingPointX,
        meetingPointY: data.meetingPointY,
        pickupStartTime: data.pickupStartTime || undefined,
        arrivalDeadline: data.arrivalDeadline || undefined,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tafelrunden'] })
      setIsCreateDialogOpen(false)
      setCreateStep(1)
      resetForm()
      toast.success('Tafelrunde erstellt')
    },
    onError: () => {
      toast.error('Fehler beim Erstellen')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData & { status: TafelrundeStatus }> }) => {
      const updateData: any = {
        title: data.title,
        description: data.description || undefined,
        location: data.location || undefined,
        meetingPointMapName: data.meetingPointMapName || undefined,
        meetingPointX: data.meetingPointX,
        meetingPointY: data.meetingPointY,
        pickupStartTime: data.pickupStartTime || undefined,
        arrivalDeadline: data.arrivalDeadline || undefined,
        status: data.status,
      }
      if (data.date && data.time) {
        updateData.date = `${data.date}T${data.time}:00`
      }
      return api.put(`/tafelrunde/${id}`, updateData)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tafelrunden'] })
      setIsEditDialogOpen(false)
      setSelectedTafelrunde(null)
      toast.success('Tafelrunde aktualisiert')
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tafelrunde/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tafelrunden'] })
      setIsDeleteDialogOpen(false)
      setSelectedTafelrunde(null)
      toast.success('Tafelrunde gelöscht')
    },
    onError: () => {
      toast.error('Fehler beim Löschen')
    },
  })

  const addFamiliesMutation = useMutation({
    mutationFn: ({ tafelrundeId, familyContactIds }: { tafelrundeId: string; familyContactIds: string[] }) =>
      api.post(`/tafelrunde/${tafelrundeId}/families/bulk`, { familyContactIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tafelrunden'] })
      setIsAddFamiliesDialogOpen(false)
      toast.success('Familien hinzugefügt')
    },
    onError: () => {
      toast.error('Fehler beim Hinzufügen')
    },
  })

  const removeFamilyMutation = useMutation({
    mutationFn: ({ tafelrundeId, familyContactId }: { tafelrundeId: string; familyContactId: string }) =>
      api.delete(`/tafelrunde/${tafelrundeId}/families/${familyContactId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tafelrunden'] })
      toast.success('Familie entfernt')
    },
    onError: () => {
      toast.error('Fehler beim Entfernen')
    },
  })

  const updateAttendanceMutation = useMutation({
    mutationFn: ({ tafelrundeId, familyContactId, attendanceStatus, note }: {
      tafelrundeId: string
      familyContactId: string
      attendanceStatus: AttendanceStatus
      note?: string
    }) =>
      api.put(`/tafelrunde/${tafelrundeId}/families/${familyContactId}/attendance`, { attendanceStatus, note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tafelrunden'] })
      toast.success('Status aktualisiert')
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren')
    },
  })

  const grantPermissionMutation = useMutation({
    mutationFn: (userId: string) => api.post(`/tafelrunde/permissions/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tafelrunde-permissions'] })
      setSelectedUserId('')
      toast.success('Berechtigung erteilt')
    },
    onError: () => {
      toast.error('Fehler beim Erteilen')
    },
  })

  const revokePermissionMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/tafelrunde/permissions/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tafelrunde-permissions'] })
      toast.success('Berechtigung entzogen')
    },
    onError: () => {
      toast.error('Fehler beim Entziehen')
    },
  })

  const resetForm = () => {
    setFormData({ 
      title: '', 
      description: '', 
      date: '', 
      time: '', 
      location: '',
      meetingPointMapName: '',
      meetingPointX: null,
      meetingPointY: null,
      pickupStartTime: '',
      arrivalDeadline: '',
    })
    setCreateStep(1)
  }

  const handleEdit = (tafelrunde: Tafelrunde) => {
    const date = new Date(tafelrunde.date)
    setFormData({
      title: tafelrunde.title,
      description: tafelrunde.description || '',
      date: date.toISOString().split('T')[0],
      time: date.toTimeString().slice(0, 5),
      location: tafelrunde.location || '',
      meetingPointMapName: (tafelrunde as any).meetingPointMapName || '',
      meetingPointX: (tafelrunde as any).meetingPointX ?? null,
      meetingPointY: (tafelrunde as any).meetingPointY ?? null,
      pickupStartTime: (tafelrunde as any).pickupStartTime || '',
      arrivalDeadline: (tafelrunde as any).arrivalDeadline || '',
    })
    setSelectedTafelrunde(tafelrunde)
    setIsEditDialogOpen(true)
  }

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  // Familien die noch nicht in der Tafelrunde sind
  const getAvailableFamilies = (tafelrunde: Tafelrunde) => {
    const existingFamilyIds = tafelrunde.families.map(f => f.familyContactId)
    return familyContacts.filter(f => !existingFamilyIds.includes(f.id))
  }

  // User die noch keine Berechtigung haben
  const usersWithoutPermission = availableUsers.filter(u => 
    !permissions.some(p => p.userId === u.id) &&
    !LEADERSHIP_ROLES.includes(u.role) &&
    !u.role.includes('PARTNER')
  )

  // Sortierte Tafelrunden
  const sortedTafelrunden = [...tafelrunden].sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  )

  const plannedTafelrunden = sortedTafelrunden.filter(t => t.status === 'PLANNED' || t.status === 'ACTIVE')
  const pastTafelrunden = sortedTafelrunden.filter(t => t.status === 'COMPLETED' || t.status === 'CANCELLED')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="h-8 w-8 text-amber-500" />
            Tafelrunde
          </h1>
          <p className="text-muted-foreground mt-1">
            Verwalte Besprechungen und Abstimmungen mit anderen Familien
          </p>
        </div>
        {canManage && !isPartner && (
          <Button
            onClick={() => {
              resetForm()
              setIsCreateDialogOpen(true)
            }}
            className="bg-amber-500 hover:bg-amber-600"
          >
            <Plus className="h-4 w-4 mr-2" />
            Neue Tafelrunde
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-t-lg transition-colors ${
            activeTab === 'overview'
              ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Übersicht
          </div>
        </button>
        {isLeadership && (
          <button
            onClick={() => setActiveTab('permissions')}
            className={`px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === 'permissions'
                ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-500'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Berechtigungen
            </div>
          </button>
        )}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
            </div>
          ) : tafelrunden.length === 0 ? (
            <Card className="bg-gray-900/50 border-gray-800">
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                <p className="text-gray-400">Noch keine Tafelrunden erstellt</p>
                {canManage && !isPartner && (
                  <Button
                    onClick={() => setIsCreateDialogOpen(true)}
                    className="mt-4 bg-amber-500 hover:bg-amber-600"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Erste Tafelrunde erstellen
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Geplante/Aktive Tafelrunden */}
              {plannedTafelrunden.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-white">Anstehende Tafelrunden</h2>
                  <div className="grid gap-4">
                    {plannedTafelrunden.map((tafelrunde) => (
                      <TafelrundeCard
                        key={tafelrunde.id}
                        tafelrunde={tafelrunde}
                        canManage={!!canManage && !isPartner}
                        isPartner={isPartner}
                        onEdit={() => handleEdit(tafelrunde)}
                        onDelete={() => {
                          setSelectedTafelrunde(tafelrunde)
                          setIsDeleteDialogOpen(true)
                        }}
                        onAddFamilies={() => {
                          setSelectedTafelrunde(tafelrunde)
                          setIsAddFamiliesDialogOpen(true)
                        }}
                        onRemoveFamily={(familyId) => {
                          removeFamilyMutation.mutate({
                            tafelrundeId: tafelrunde.id,
                            familyContactId: familyId,
                          })
                        }}
                        onUpdateAttendance={(familyId, status) => {
                          updateAttendanceMutation.mutate({
                            tafelrundeId: tafelrunde.id,
                            familyContactId: familyId,
                            attendanceStatus: status,
                          })
                        }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Vergangene Tafelrunden */}
              {pastTafelrunden.length > 0 && (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-gray-400">Vergangene Tafelrunden</h2>
                  <div className="grid gap-4">
                    {pastTafelrunden.map((tafelrunde) => (
                      <TafelrundeCard
                        key={tafelrunde.id}
                        tafelrunde={tafelrunde}
                        canManage={!!canManage && !isPartner}
                        isPartner={isPartner}
                        onEdit={() => handleEdit(tafelrunde)}
                        onDelete={() => {
                          setSelectedTafelrunde(tafelrunde)
                          setIsDeleteDialogOpen(true)
                        }}
                        onAddFamilies={() => {
                          setSelectedTafelrunde(tafelrunde)
                          setIsAddFamiliesDialogOpen(true)
                        }}
                        onRemoveFamily={(familyId) => {
                          removeFamilyMutation.mutate({
                            tafelrundeId: tafelrunde.id,
                            familyContactId: familyId,
                          })
                        }}
                        onUpdateAttendance={(familyId, status) => {
                          updateAttendanceMutation.mutate({
                            tafelrundeId: tafelrunde.id,
                            familyContactId: familyId,
                            attendanceStatus: status,
                          })
                        }}
                        collapsed
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && isLeadership && (
        <div className="space-y-4">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-500" />
                Tafelrunden-Berechtigungen
              </CardTitle>
              <CardDescription>
                Bestimme welche Mitglieder Tafelrunden erstellen und verwalten dürfen.
                Leadership hat automatisch Zugriff. Partner können nur Anwesenheit markieren.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Neue Berechtigung vergeben */}
              <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700/50">
                <h4 className="text-sm font-medium text-gray-300 mb-3">Berechtigung vergeben</h4>
                <div className="flex gap-2">
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                  >
                    <option value="">Mitglied auswählen...</option>
                    {usersWithoutPermission.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.icFirstName && u.icLastName 
                          ? `${u.icFirstName} ${u.icLastName} (${u.username})`
                          : u.username
                        }
                      </option>
                    ))}
                  </select>
                  <Button
                    onClick={() => selectedUserId && grantPermissionMutation.mutate(selectedUserId)}
                    disabled={!selectedUserId || grantPermissionMutation.isPending}
                    className="bg-amber-500 hover:bg-amber-600"
                  >
                    {grantPermissionMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-1" />
                        Berechtigen
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Aktuelle Berechtigungen */}
              {permissions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Keine zusätzlichen Berechtigungen vergeben</p>
                  <p className="text-sm mt-1">Leadership hat automatisch Zugriff</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-400">Berechtigte Mitglieder</h4>
                  {permissions.map((permission) => (
                    <div
                      key={permission.id}
                      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700/50"
                    >
                      <div>
                        <p className="font-medium text-white">
                          {permission.user.icFirstName && permission.user.icLastName
                            ? `${permission.user.icFirstName} ${permission.user.icLastName}`
                            : permission.user.username
                          }
                        </p>
                        <p className="text-xs text-gray-500">
                          Berechtigt von {permission.grantedBy?.username || 'System'}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        onClick={() => {
                          if (confirm(`Berechtigung für ${permission.user.username} entziehen?`)) {
                            revokePermissionMutation.mutate(permission.userId)
                          }
                        }}
                        disabled={revokePermissionMutation.isPending}
                      >
                        {revokePermissionMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <>
                            <X className="h-4 w-4 mr-1" />
                            Entziehen
                          </>
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Info-Box */}
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="text-sm text-gray-300">
                <p className="font-medium text-blue-400 mb-1">Hinweis zu Berechtigungen</p>
                <ul className="list-disc list-inside space-y-1 text-gray-400">
                  <li>Leadership (Patron, Don, Asesor) hat automatisch Zugriff</li>
                  <li>Berechtigte Mitglieder können Tafelrunden erstellen und verwalten</li>
                  <li>Partner können nur den Anwesenheitsstatus von Familien ändern</li>
                  <li>Alle Aktionen werden im Audit-Log protokolliert</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Dialog - Zweistufiger Wizard */}
      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open)
        if (!open) {
          setCreateStep(1)
          resetForm()
        }
      }}>
        <DialogContent className={`bg-gray-900 border-gray-700 ${createStep === 1 ? 'max-w-4xl' : 'max-w-lg'}`}>
          {/* Step Indicator */}
          <div className="flex items-center gap-4 mb-4">
            <div className={`flex items-center gap-2 ${createStep >= 1 ? 'text-amber-400' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${createStep >= 1 ? 'bg-amber-500 text-gray-900' : 'bg-gray-700'}`}>
                1
              </div>
              <span className="text-sm font-medium">Treffpunkt wählen</span>
            </div>
            <ChevronRight className="h-4 w-4 text-gray-600" />
            <div className={`flex items-center gap-2 ${createStep >= 2 ? 'text-amber-400' : 'text-gray-500'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${createStep >= 2 ? 'bg-amber-500 text-gray-900' : 'bg-gray-700'}`}>
                2
              </div>
              <span className="text-sm font-medium">Details eingeben</span>
            </div>
          </div>

          {/* Step 1: Treffpunkt auf Karte wählen */}
          {createStep === 1 && (
            <>
              <DialogHeader>
                <DialogTitle className="text-amber-400 flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Treffpunkt festlegen
                </DialogTitle>
                <DialogDescription>
                  Wähle den Ort auf der Karte, zu dem alle Familien gebracht werden sollen.
                </DialogDescription>
              </DialogHeader>
              
              <MeetingPointPicker
                value={formData.meetingPointMapName && formData.meetingPointX !== null ? {
                  mapName: formData.meetingPointMapName as any,
                  x: formData.meetingPointX,
                  y: formData.meetingPointY!,
                } : undefined}
                onChange={(point) => {
                  setFormData({
                    ...formData,
                    meetingPointMapName: point.mapName,
                    meetingPointX: point.x,
                    meetingPointY: point.y,
                  })
                  setCreateStep(2)
                }}
                onCancel={() => {
                  setIsCreateDialogOpen(false)
                  resetForm()
                }}
              />
            </>
          )}

          {/* Step 2: Details eingeben */}
          {createStep === 2 && (
            <>
              <DialogHeader>
                <DialogTitle className="text-amber-400 flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Tafelrunde Details
                </DialogTitle>
                <DialogDescription>
                  Gib die Details für die Tafelrunde ein.
                </DialogDescription>
              </DialogHeader>
              
              {/* Gewählter Treffpunkt Anzeige */}
              <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg mb-4">
                <Check className="h-5 w-5 text-green-400" />
                <div className="flex-1">
                  <span className="text-green-200 text-sm">
                    Treffpunkt: <strong>
                      {formData.meetingPointMapName === 'NARCO_CITY' ? 'Narco City' :
                       formData.meetingPointMapName === 'ROXWOOD' ? 'Roxwood' :
                       formData.meetingPointMapName === 'CAYO_PERICO' ? 'Cayo Perico' : formData.meetingPointMapName}
                    </strong>
                  </span>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setCreateStep(1)}
                  className="text-amber-400 hover:text-amber-300"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Ändern
                </Button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Titel *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="z.B. Bündnis Abstimmung"
                    className="bg-gray-800 border-gray-600"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Beschreibung</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Worum geht es bei dieser Tafelrunde?"
                    rows={2}
                    className="bg-gray-800 border-gray-600 resize-none"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Datum *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="bg-gray-800 border-gray-600"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Uhrzeit der Tafelrunde</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                      className="bg-gray-800 border-gray-600"
                    />
                  </div>
                </div>

                {/* Taxi-Zeitplanung */}
                <div className="space-y-3 pt-3 border-t border-gray-700">
                  <Label className="text-yellow-400 flex items-center gap-2">
                    <Car className="h-4 w-4" />
                    Taxi-Zeitplanung
                  </Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="pickupStartTime" className="text-gray-400 text-sm">Abholung ab</Label>
                      <Input
                        id="pickupStartTime"
                        type="time"
                        value={formData.pickupStartTime}
                        onChange={(e) => setFormData({ ...formData, pickupStartTime: e.target.value })}
                        placeholder="z.B. 17:30"
                        className="bg-gray-800 border-gray-600"
                      />
                      <p className="text-xs text-gray-500">Wann sollen Fahrer anfangen abzuholen?</p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="arrivalDeadline" className="text-gray-400 text-sm">Spätestens am Treffpunkt</Label>
                      <Input
                        id="arrivalDeadline"
                        type="time"
                        value={formData.arrivalDeadline}
                        onChange={(e) => setFormData({ ...formData, arrivalDeadline: e.target.value })}
                        placeholder="z.B. 18:00"
                        className="bg-gray-800 border-gray-600"
                      />
                      <p className="text-xs text-gray-500">Bis wann müssen alle am Treffpunkt sein?</p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="location">Treffpunkt-Beschreibung (optional)</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="z.B. Vor der Casa, Parkplatz hinten"
                    className="bg-gray-800 border-gray-600"
                  />
                </div>
              </div>
              
              <DialogFooter className="mt-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setCreateStep(1)}
                >
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Zurück
                </Button>
                <Button
                  onClick={() => createMutation.mutate(formData)}
                  disabled={!formData.title || !formData.date || !formData.meetingPointMapName || createMutation.isPending}
                  className="bg-amber-500 hover:bg-amber-600"
                >
                  {createMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Plus className="h-4 w-4 mr-2" />
                  )}
                  Tafelrunde erstellen
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-amber-400">Tafelrunde bearbeiten</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Titel *</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="bg-gray-800 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Beschreibung</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="bg-gray-800 border-gray-600 resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Datum *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  className="bg-gray-800 border-gray-600"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-time">Uhrzeit</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  className="bg-gray-800 border-gray-600"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-location">Treffpunkt</Label>
              <Input
                id="edit-location"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="bg-gray-800 border-gray-600"
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={selectedTafelrunde?.status}
                onValueChange={(value) => {
                  if (selectedTafelrunde) {
                    updateMutation.mutate({
                      id: selectedTafelrunde.id,
                      data: { ...formData, status: value as TafelrundeStatus },
                    })
                  }
                }}
              >
                <SelectTrigger className="bg-gray-800 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNED">Geplant</SelectItem>
                  <SelectItem value="ACTIVE">Aktiv</SelectItem>
                  <SelectItem value="COMPLETED">Abgeschlossen</SelectItem>
                  <SelectItem value="CANCELLED">Abgesagt</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                if (selectedTafelrunde) {
                  updateMutation.mutate({
                    id: selectedTafelrunde.id,
                    data: formData,
                  })
                }
              }}
              disabled={!formData.title || !formData.date || updateMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Check className="h-4 w-4 mr-2" />
              )}
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-red-400">Tafelrunde löschen</DialogTitle>
            <DialogDescription>
              Möchtest du die Tafelrunde "{selectedTafelrunde?.title}" wirklich löschen?
              Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsDeleteDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedTafelrunde && deleteMutation.mutate(selectedTafelrunde.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Families Dialog */}
      <AddFamiliesDialog
        open={isAddFamiliesDialogOpen}
        onOpenChange={setIsAddFamiliesDialogOpen}
        tafelrunde={selectedTafelrunde}
        availableFamilies={selectedTafelrunde ? getAvailableFamilies(selectedTafelrunde) : []}
        onAdd={(familyIds) => {
          if (selectedTafelrunde) {
            addFamiliesMutation.mutate({
              tafelrundeId: selectedTafelrunde.id,
              familyContactIds: familyIds,
            })
          }
        }}
        isPending={addFamiliesMutation.isPending}
      />
    </div>
  )
}

// Tafelrunde Card Component
function TafelrundeCard({
  tafelrunde,
  canManage,
  isPartner,
  onEdit,
  onDelete,
  onAddFamilies,
  onRemoveFamily,
  onUpdateAttendance,
  collapsed = false,
}: {
  tafelrunde: Tafelrunde
  canManage: boolean
  isPartner: boolean
  onEdit: () => void
  onDelete: () => void
  onAddFamilies: () => void
  onRemoveFamily: (familyId: string) => void
  onUpdateAttendance: (familyId: string, status: AttendanceStatus) => void
  collapsed?: boolean
}) {
  const [isExpanded, setIsExpanded] = useState(!collapsed)
  const status = statusConfig[tafelrunde.status]

  const summary = {
    attending: tafelrunde.families.filter(f => f.attendanceStatus === 'ATTENDING').length,
    notAttending: tafelrunde.families.filter(f => f.attendanceStatus === 'NOT_ATTENDING').length,
    unknown: tafelrunde.families.filter(f => f.attendanceStatus === 'UNKNOWN' || f.attendanceStatus === 'MAYBE').length,
  }

  return (
    <Card className="bg-gray-900/50 border-gray-800">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg text-white">{tafelrunde.title}</CardTitle>
              <span className={`px-2 py-0.5 text-xs rounded-full ${status.bgColor} ${status.color}`}>
                {status.label}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-400">
              <div className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(tafelrunde.date).toLocaleDateString('de-DE', {
                  weekday: 'short',
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                })}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {new Date(tafelrunde.date).toLocaleTimeString('de-DE', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
              {tafelrunde.location && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {tafelrunde.location}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <Button size="sm" variant="ghost" onClick={onEdit}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" className="text-red-400 hover:text-red-300" onClick={onDelete}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              <ChevronRight className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </Button>
          </div>
        </div>
        
        {/* Summary */}
        <div className="flex items-center gap-4 mt-3 text-sm">
          <span className="text-gray-500">{tafelrunde.families.length} Familien</span>
          {tafelrunde.families.length > 0 && (
            <>
              <span className="text-green-400">{summary.attending} kommen</span>
              <span className="text-red-400">{summary.notAttending} nicht</span>
              <span className="text-gray-400">{summary.unknown} offen</span>
            </>
          )}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          {tafelrunde.description && (
            <p className="text-gray-400 text-sm mb-4 p-3 bg-gray-800/50 rounded-lg">
              {tafelrunde.description}
            </p>
          )}

          {/* Familien Liste */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium text-gray-300">Eingeladene Familien</h4>
              {canManage && (
                <Button size="sm" variant="ghost" onClick={onAddFamilies}>
                  <Plus className="h-4 w-4 mr-1" />
                  Familien hinzufügen
                </Button>
              )}
            </div>

            {tafelrunde.families.length === 0 ? (
              <div className="text-center py-6 text-gray-500">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Noch keine Familien eingeladen</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tafelrunde.families.map((family) => {
                  const attConfig = attendanceConfig[family.attendanceStatus]
                  const AttIcon = attConfig.icon
                  
                  return (
                    <div
                      key={family.id}
                      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-full ${attConfig.bgColor}`}>
                          <AttIcon className={`h-4 w-4 ${attConfig.color}`} />
                        </div>
                        <div>
                          <p className="font-medium text-white">{family.familyContact.familyName}</p>
                          {family.familyContact.propertyZip && (
                            <p className="text-xs text-gray-500">PLZ: {family.familyContact.propertyZip}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Status Buttons */}
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className={family.attendanceStatus === 'ATTENDING' ? 'bg-green-500/20 text-green-400' : 'text-gray-400'}
                            onClick={() => onUpdateAttendance(family.familyContactId, 'ATTENDING')}
                            title="Kommt"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={family.attendanceStatus === 'NOT_ATTENDING' ? 'bg-red-500/20 text-red-400' : 'text-gray-400'}
                            onClick={() => onUpdateAttendance(family.familyContactId, 'NOT_ATTENDING')}
                            title="Kommt nicht"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className={family.attendanceStatus === 'MAYBE' ? 'bg-amber-500/20 text-amber-400' : 'text-gray-400'}
                            onClick={() => onUpdateAttendance(family.familyContactId, 'MAYBE')}
                            title="Vielleicht"
                          >
                            <HelpCircle className="h-4 w-4" />
                          </Button>
                        </div>
                        {canManage && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-400 hover:text-red-300 ml-2"
                            onClick={() => onRemoveFamily(family.familyContactId)}
                            title="Entfernen"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      )}
    </Card>
  )
}

// Add Families Dialog Component
function AddFamiliesDialog({
  open,
  onOpenChange,
  tafelrunde,
  availableFamilies,
  onAdd,
  isPending,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  tafelrunde: Tafelrunde | null
  availableFamilies: FamilyContact[]
  onAdd: (familyIds: string[]) => void
  isPending: boolean
}) {
  const [selectedFamilies, setSelectedFamilies] = useState<string[]>([])

  const handleToggleFamily = (familyId: string) => {
    setSelectedFamilies(prev =>
      prev.includes(familyId)
        ? prev.filter(id => id !== familyId)
        : [...prev, familyId]
    )
  }

  const handleSelectAll = () => {
    if (selectedFamilies.length === availableFamilies.length) {
      setSelectedFamilies([])
    } else {
      setSelectedFamilies(availableFamilies.map(f => f.id))
    }
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) setSelectedFamilies([])
      onOpenChange(isOpen)
    }}>
      <DialogContent className="bg-gray-900 border-gray-700 max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-amber-400">Familien hinzufügen</DialogTitle>
          <DialogDescription>
            Wähle Familien aus, die zur Tafelrunde "{tafelrunde?.title}" eingeladen werden sollen
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {availableFamilies.length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Alle bekannten Familien wurden bereits eingeladen</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-400">
                  {selectedFamilies.length} von {availableFamilies.length} ausgewählt
                </span>
                <Button size="sm" variant="ghost" onClick={handleSelectAll}>
                  {selectedFamilies.length === availableFamilies.length ? 'Keine auswählen' : 'Alle auswählen'}
                </Button>
              </div>
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                {availableFamilies.map((family) => (
                  <div
                    key={family.id}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                      selectedFamilies.includes(family.id)
                        ? 'bg-amber-500/20 border border-amber-500/50'
                        : 'bg-gray-800/50 border border-transparent hover:bg-gray-800'
                    }`}
                    onClick={() => handleToggleFamily(family.id)}
                  >
                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                      selectedFamilies.includes(family.id)
                        ? 'bg-amber-500 border-amber-500'
                        : 'border-gray-600'
                    }`}>
                      {selectedFamilies.includes(family.id) && (
                        <Check className="h-3 w-3 text-black" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{family.familyName}</p>
                      {family.propertyZip && (
                        <p className="text-xs text-gray-500">PLZ: {family.propertyZip}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Abbrechen
          </Button>
          <Button
            onClick={() => onAdd(selectedFamilies)}
            disabled={selectedFamilies.length === 0 || isPending}
            className="bg-amber-500 hover:bg-amber-600"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Plus className="h-4 w-4 mr-2" />
            )}
            {selectedFamilies.length} Familien hinzufügen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


