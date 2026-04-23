import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { usePageTitle } from '../hooks/usePageTitle'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
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
import { toast } from 'sonner'
import { hasRole } from '../lib/utils'
import {
  BookOpen,
  Plus,
  Pencil,
  Trash2,
  Download,
  Phone,
  User,
  Crown,
  Building2,
  Search,
  Users,
  FileText,
  AlertTriangle,
  MapPin,
  Circle,
  CheckCircle,
  XCircle,
  AlertCircle,
  HelpCircle,
  Key,
  Clock,
  Shield,
  UserPlus,
  Loader2,
  Info,
} from 'lucide-react'

type FamilyContactStatus = 'UNKNOWN' | 'ACTIVE' | 'ENDANGERED' | 'DISSOLVED'

interface FamilyContact {
  id: string
  familyName: string
  status: FamilyContactStatus
  propertyZip?: string
  contact1FirstName?: string
  contact1LastName?: string
  contact1Phone?: string
  contact2FirstName?: string
  contact2LastName?: string
  contact2Phone?: string
  leadershipInfo?: string
  notes?: string
  isKeyFamily: boolean
  isOutdated: boolean
  outdatedMarkedAt?: string
  outdatedMarkedBy?: {
    id: string
    username: string
    icFirstName?: string
    icLastName?: string
  }
  outdatedComment?: string
  createdAt: string
  updatedAt: string
}

interface ListPermission {
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
    icFirstName?: string
    icLastName?: string
  }
  grantedAt: string
}

const statusConfig: Record<FamilyContactStatus, { label: string; color: string; bgColor: string; icon: typeof Circle }> = {
  UNKNOWN: { label: 'Unbekannt', color: 'text-zinc-400', bgColor: 'bg-zinc-500/20', icon: HelpCircle },
  ACTIVE: { label: 'Aktiv', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: CheckCircle },
  ENDANGERED: { label: 'Gefährdet', color: 'text-orange-400', bgColor: 'bg-orange-500/20', icon: AlertCircle },
  DISSOLVED: { label: 'Aufgelöst', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: XCircle },
}

export default function ListenfuehrungPage() {
  const { user } = useAuthStore()
  usePageTitle('Listenführung')
  const queryClient = useQueryClient()
  
  const [activeTab, setActiveTab] = useState<'liste' | 'berechtigungen'>('liste')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isOutdatedDialogOpen, setIsOutdatedDialogOpen] = useState(false)
  const [outdatedComment, setOutdatedComment] = useState('')
  const [selectedContact, setSelectedContact] = useState<FamilyContact | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedNewPermissionUser, setSelectedNewPermissionUser] = useState('')
  
  // Form state
  const [formData, setFormData] = useState({
    familyName: '',
    status: 'UNKNOWN' as FamilyContactStatus,
    propertyZip: '',
    contact1FirstName: '',
    contact1LastName: '',
    contact1Phone: '',
    contact2FirstName: '',
    contact2LastName: '',
    contact2Phone: '',
    leadershipInfo: '',
    notes: '',
    isKeyFamily: false,
  })

  const isLeadership = hasRole(user, ['PATRON', 'DON', 'CAPO', 'ADMIN'])
  const hasContactRole = hasRole(user, ['CONTACTO'])
  const isPartner = user?.isPartner === true
  const partnerCanViewContacts = (user as any)?.partnerCanViewContacts === true

  // Fetch list permissions
  const { data: listPermissions = [], isLoading: permissionsLoading } = useQuery<ListPermission[]>({
    queryKey: ['list-permissions'],
    queryFn: () => api.get('/family-contacts/permissions/list').then(res => res.data),
    enabled: isLeadership, // Only fetch for leadership
  })

  // Check if user has a list permission
  const hasListPermission = listPermissions.some(p => p.userId === user?.id)
  
  // User can manage if they are Leadership, Contacto, Partner, or have a ListPermission
  const canManage = isLeadership || hasContactRole || hasListPermission || isPartner
  
  // Only Leadership, Contacto, ListPermission holders, or Partners with explicit permission can see full contact details
  const canViewDetails = isLeadership || hasContactRole || hasListPermission || (isPartner && partnerCanViewContacts)

  // Fetch all users for permission dropdown
  const { data: allUsers = [] } = useQuery({
    queryKey: ['all-users-for-permissions'],
    queryFn: () => api.get('/users').then(res => res.data),
    enabled: isLeadership,
  })

  const { data: contacts = [], isLoading } = useQuery({
    queryKey: ['family-contacts'],
    queryFn: () => api.get('/family-contacts').then(res => res.data),
  })

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/family-contacts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-contacts'] })
      toast.success('Kontakt erfolgreich erstellt')
      setIsCreateDialogOpen(false)
      resetForm()
    },
    onError: () => {
      toast.error('Fehler beim Erstellen des Kontakts')
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof formData }) => 
      api.put(`/family-contacts/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-contacts'] })
      toast.success('Kontakt erfolgreich aktualisiert')
      setIsEditDialogOpen(false)
      setSelectedContact(null)
      resetForm()
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren des Kontakts')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/family-contacts/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-contacts'] })
      toast.success('Kontakt erfolgreich gelöscht')
      setIsDeleteDialogOpen(false)
      setSelectedContact(null)
    },
    onError: () => {
      toast.error('Fehler beim Löschen des Kontakts')
    },
  })

  const markOutdatedMutation = useMutation({
    mutationFn: ({ id, isOutdated, comment }: { id: string; isOutdated: boolean; comment?: string }) => 
      api.patch(`/family-contacts/${id}/mark-outdated`, { isOutdated, comment }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['family-contacts'] })
      toast.success('Status erfolgreich aktualisiert')
      setIsOutdatedDialogOpen(false)
      setOutdatedComment('')
      setSelectedContact(null)
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren des Status')
    },
  })

  // Add list permission mutation
  const addListPermissionMutation = useMutation({
    mutationFn: (userId: string) => api.post('/family-contacts/permissions/list', { userId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-permissions'] })
      toast.success('Berechtigung erfolgreich hinzugefügt')
      setSelectedNewPermissionUser('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Hinzufügen der Berechtigung')
    },
  })

  // Remove list permission mutation
  const removeListPermissionMutation = useMutation({
    mutationFn: (userId: string) => api.delete(`/family-contacts/permissions/list/${userId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['list-permissions'] })
      toast.success('Berechtigung erfolgreich entfernt')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Entfernen der Berechtigung')
    },
  })

  const resetForm = () => {
    setFormData({
      familyName: '',
      status: 'UNKNOWN',
      propertyZip: '',
      contact1FirstName: '',
      contact1LastName: '',
      contact1Phone: '',
      contact2FirstName: '',
      contact2LastName: '',
      contact2Phone: '',
      leadershipInfo: '',
      notes: '',
      isKeyFamily: false,
    })
  }

  const openEditDialog = (contact: FamilyContact) => {
    setSelectedContact(contact)
    setFormData({
      familyName: contact.familyName || '',
      status: contact.status || 'UNKNOWN',
      propertyZip: contact.propertyZip || '',
      contact1FirstName: contact.contact1FirstName || '',
      contact1LastName: contact.contact1LastName || '',
      contact1Phone: contact.contact1Phone || '',
      contact2FirstName: contact.contact2FirstName || '',
      contact2LastName: contact.contact2LastName || '',
      contact2Phone: contact.contact2Phone || '',
      leadershipInfo: contact.leadershipInfo || '',
      notes: contact.notes || '',
      isKeyFamily: contact.isKeyFamily || false,
    })
    setIsEditDialogOpen(true)
  }

  const openDeleteDialog = (contact: FamilyContact) => {
    setSelectedContact(contact)
    setIsDeleteDialogOpen(true)
  }

  const handleExport = () => {
    window.open('/api/family-contacts/export', '_blank')
  }

  const filteredContacts = contacts.filter((contact: FamilyContact) => {
    const search = searchTerm.toLowerCase()
    return (
      contact.familyName?.toLowerCase().includes(search) ||
      contact.propertyZip?.toLowerCase().includes(search) ||
      contact.contact1FirstName?.toLowerCase().includes(search) ||
      contact.contact1LastName?.toLowerCase().includes(search) ||
      contact.contact2FirstName?.toLowerCase().includes(search) ||
      contact.contact2LastName?.toLowerCase().includes(search) ||
      contact.leadershipInfo?.toLowerCase().includes(search)
    )
  })

  const formatContactName = (firstName?: string, lastName?: string) => {
    if (firstName && lastName) return `${firstName} ${lastName}`
    if (firstName) return firstName
    if (lastName) return lastName
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 border border-orange-500/20 p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 via-transparent to-orange-500/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500/20 rounded-xl">
              <BookOpen className="h-8 w-8 text-orange-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Listenführung</h1>
              <p className="text-zinc-400 mt-1">
                Zentrale Kontaktliste der Familien auf Retro
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExport}
              variant="outline"
              className="border-orange-500/30 text-orange-400 hover:bg-orange-500/10"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            {canManage && (
              <Button
                onClick={() => {
                  resetForm()
                  setIsCreateDialogOpen(true)
                }}
                className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Familie hinzufügen
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
        <TabsList className="bg-zinc-800/50 border border-zinc-700">
          <TabsTrigger value="liste" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-300">
            <BookOpen className="h-4 w-4 mr-2" />
            Familienliste
          </TabsTrigger>
          {isLeadership && (
            <TabsTrigger value="berechtigungen" className="data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-300">
              <Shield className="h-4 w-4 mr-2" />
              Berechtigungen
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="liste" className="space-y-6 mt-6">
          {/* Search & Stats */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Suche nach Familie, Kontakt..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-zinc-800/50 border-zinc-700 focus:border-orange-500/50"
              />
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-zinc-800/50 rounded-lg border border-zinc-700">
              <Users className="h-4 w-4 text-orange-400" />
              <span className="text-zinc-400">
                <span className="text-white font-medium">{filteredContacts.length}</span> Familien
              </span>
            </div>
          </div>

          {/* Info for non-manage users */}
          {!canViewDetails && (
            <Card className="bg-orange-500/10 border-orange-500/30">
              <CardContent className="p-4 flex items-start gap-3">
                <Info className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-orange-300 text-sm">
                    Du siehst nur die Familiennamen. Kontaktdaten sind nur für berechtigte Mitglieder sichtbar.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contacts Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        </div>
      ) : filteredContacts.length === 0 ? (
        <Card className="bg-zinc-900/50 border-zinc-800">
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-zinc-400 mb-2">
              {searchTerm ? 'Keine Treffer gefunden' : 'Noch keine Familien eingetragen'}
            </h3>
            <p className="text-zinc-500 text-sm">
              {searchTerm 
                ? 'Versuche einen anderen Suchbegriff'
                : canManage 
                  ? 'Füge die erste Familie hinzu, um die Liste zu starten.'
                  : 'Contactos können neue Familien hinzufügen.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredContacts.map((contact: FamilyContact) => (
            <Card 
              key={contact.id} 
              className="bg-zinc-900/50 border-orange-500/10 hover:border-orange-500/30 transition-all group"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-500/10 rounded-lg group-hover:bg-orange-500/20 transition-colors">
                      <Building2 className="h-5 w-5 text-orange-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white group-hover:text-orange-300 transition-colors flex items-center gap-2">
                        {contact.familyName}
                        {/* Schlüsselfamilie Badge */}
                        {contact.isKeyFamily && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-500/20 text-orange-300 border border-orange-500/30" title="Schlüsselfamilie">
                            <Key className="h-3 w-3" />
                          </span>
                        )}
                        {/* Veraltet Badge */}
                        {contact.isOutdated && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/30" title="Information veraltet">
                            <Clock className="h-3 w-3" />
                          </span>
                        )}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {/* Status Badge */}
                        {(() => {
                          const config = statusConfig[contact.status] || statusConfig.UNKNOWN
                          const StatusIcon = config.icon
                          return (
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.color}`}>
                              <StatusIcon className="h-3 w-3" />
                              {config.label}
                            </span>
                          )
                        })()}
                        {/* PLZ Badge */}
                        {contact.propertyZip && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-zinc-700/50 text-zinc-300">
                            <MapPin className="h-3 w-3" />
                            {contact.propertyZip}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Als veraltet markieren Button - für alle */}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        if (contact.isOutdated) {
                          // Directly unmark as outdated
                          markOutdatedMutation.mutate({ id: contact.id, isOutdated: false })
                        } else {
                          // Open dialog for comment
                          setSelectedContact(contact)
                          setOutdatedComment('')
                          setIsOutdatedDialogOpen(true)
                        }
                      }}
                      disabled={markOutdatedMutation.isPending}
                      className={`h-8 w-8 p-0 ${contact.isOutdated ? 'text-red-400 hover:text-red-300' : 'text-zinc-400 hover:text-red-400 opacity-0 group-hover:opacity-100'} transition-all`}
                      title={contact.isOutdated ? 'Als aktuell markieren' : 'Als veraltet markieren'}
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                    {canManage && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openEditDialog(contact)}
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openDeleteDialog(contact)}
                          className="h-8 w-8 p-0 text-zinc-400 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {canViewDetails ? (
                  <>
                    {/* Ansprechpartner 1 */}
                    {(contact.contact1FirstName || contact.contact1LastName || contact.contact1Phone) && (
                      <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                        <div className="flex items-center gap-2 text-xs text-orange-400/70 mb-2">
                          <User className="h-3 w-3" />
                          <span>Ansprechpartner 1</span>
                        </div>
                        {formatContactName(contact.contact1FirstName, contact.contact1LastName) && (
                          <p className="text-white text-sm font-medium">
                            {formatContactName(contact.contact1FirstName, contact.contact1LastName)}
                          </p>
                        )}
                        {contact.contact1Phone && (
                          <div className="flex items-center gap-2 mt-1 text-zinc-400 text-sm">
                            <Phone className="h-3 w-3" />
                            <span>{contact.contact1Phone}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Ansprechpartner 2 */}
                    {(contact.contact2FirstName || contact.contact2LastName || contact.contact2Phone) && (
                      <div className="p-3 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                        <div className="flex items-center gap-2 text-xs text-orange-400/70 mb-2">
                          <User className="h-3 w-3" />
                          <span>Ansprechpartner 2</span>
                        </div>
                        {formatContactName(contact.contact2FirstName, contact.contact2LastName) && (
                          <p className="text-white text-sm font-medium">
                            {formatContactName(contact.contact2FirstName, contact.contact2LastName)}
                          </p>
                        )}
                        {contact.contact2Phone && (
                          <div className="flex items-center gap-2 mt-1 text-zinc-400 text-sm">
                            <Phone className="h-3 w-3" />
                            <span>{contact.contact2Phone}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Führung/Patron */}
                    {contact.leadershipInfo && (
                      <div className="p-3 bg-orange-500/5 rounded-lg border border-orange-500/20">
                        <div className="flex items-center gap-2 text-xs text-orange-400 mb-1">
                          <Crown className="h-3 w-3" />
                          <span>Führung / Patron</span>
                        </div>
                        <p className="text-orange-200 text-sm">{contact.leadershipInfo}</p>
                      </div>
                    )}

                    {/* Notizen */}
                    {contact.notes && (
                      <div className="pt-2 border-t border-zinc-800">
                        <div className="flex items-center gap-2 text-xs text-zinc-500 mb-1">
                          <FileText className="h-3 w-3" />
                          <span>Notizen</span>
                        </div>
                        <p className="text-zinc-400 text-sm line-clamp-2">{contact.notes}</p>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-4 text-zinc-500 text-sm">
                    Keine Berechtigung für Kontaktdetails
                  </div>
                )}

                {/* Veraltet-Info - für alle sichtbar */}
                {contact.isOutdated && (
                  <div className="pt-2 border-t border-zinc-800">
                    <div className="flex flex-col gap-1 text-xs text-red-400/70">
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>
                          Als veraltet markiert
                          {contact.outdatedMarkedBy && ` von ${contact.outdatedMarkedBy.icFirstName || contact.outdatedMarkedBy.username}`}
                          {contact.outdatedMarkedAt && ` am ${new Date(contact.outdatedMarkedAt).toLocaleDateString('de-DE')}`}
                        </span>
                      </div>
                      {contact.outdatedComment && (
                        <p className="text-red-300/70 italic ml-5">"{contact.outdatedComment}"</p>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
        </TabsContent>

        {/* Permissions Tab */}
        {isLeadership && (
          <TabsContent value="berechtigungen" className="space-y-6 mt-6">
            <Card className="bg-zinc-900/50 border-zinc-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <Shield className="h-5 w-5 text-orange-400" />
                  Listenführung-Berechtigungen
                </CardTitle>
                <CardDescription className="text-zinc-400">
                  Verwalte wer Zugriff auf die Familienkontakte hat und bearbeiten darf.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add new permission */}
                <div className="flex gap-3">
                  <Select value={selectedNewPermissionUser} onValueChange={setSelectedNewPermissionUser}>
                    <SelectTrigger className="flex-1 bg-zinc-800/50 border-zinc-700">
                      <SelectValue placeholder="Benutzer auswählen..." />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-800 border-zinc-700">
                      {allUsers
                        .filter((u: any) => 
                          !listPermissions.some(p => p.userId === u.id) &&
                          !hasRole(u, ['PATRON', 'DON', 'CAPO', 'ADMIN', 'CONTACTO'])
                        )
                        .map((u: any) => (
                          <SelectItem key={u.id} value={u.id}>
                            {u.icFirstName && u.icLastName 
                              ? `${u.icFirstName} ${u.icLastName}` 
                              : u.username} ({u.role})
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => selectedNewPermissionUser && addListPermissionMutation.mutate(selectedNewPermissionUser)}
                    disabled={!selectedNewPermissionUser || addListPermissionMutation.isPending}
                    className="bg-orange-600 hover:bg-orange-500"
                  >
                    {addListPermissionMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    Hinzufügen
                  </Button>
                </div>

                {/* Existing permissions */}
                {permissionsLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
                  </div>
                ) : listPermissions.length === 0 ? (
                  <div className="text-center py-8 text-zinc-500">
                    Keine zusätzlichen Berechtigungen vergeben.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {listPermissions.map((permission) => (
                      <div key={permission.id} className="flex items-center justify-between p-3 bg-zinc-800/50 rounded-lg border border-zinc-700">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center">
                            <User className="h-4 w-4 text-orange-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium">
                              {permission.user.icFirstName && permission.user.icLastName
                                ? `${permission.user.icFirstName} ${permission.user.icLastName}`
                                : permission.user.username}
                            </p>
                            <p className="text-xs text-zinc-500">
                              Hinzugefügt von {permission.grantedBy.icFirstName || permission.grantedBy.username}
                              {' • '}
                              {new Date(permission.grantedAt).toLocaleDateString('de-DE')}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeListPermissionMutation.mutate(permission.userId)}
                          disabled={removeListPermissionMutation.isPending}
                          className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Outdated Dialog */}
      <Dialog open={isOutdatedDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsOutdatedDialogOpen(false)
          setOutdatedComment('')
          setSelectedContact(null)
        }
      }}>
        <DialogContent className="bg-zinc-900 border-red-500/30">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-red-400" />
              Als veraltet markieren
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Markiere "{selectedContact?.familyName}" als veraltet. Du kannst optional einen Kommentar hinzufügen.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-zinc-300">Kommentar (optional)</Label>
            <Textarea
              placeholder="z.B. Telefonnummer nicht mehr erreichbar..."
              value={outdatedComment}
              onChange={(e) => setOutdatedComment(e.target.value)}
              className="mt-2 bg-zinc-800/50 border-zinc-700 focus:border-red-500/50"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOutdatedDialogOpen(false)}
              className="border-zinc-700"
            >
              Abbrechen
            </Button>
            <Button
              onClick={() => selectedContact && markOutdatedMutation.mutate({
                id: selectedContact.id,
                isOutdated: true,
                comment: outdatedComment || undefined,
              })}
              disabled={markOutdatedMutation.isPending}
              className="bg-red-600 hover:bg-red-500"
            >
              {markOutdatedMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Clock className="h-4 w-4 mr-2" />
              )}
              Als veraltet markieren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false)
          setIsEditDialogOpen(false)
          setSelectedContact(null)
          resetForm()
        }
      }}>
        <DialogContent className="bg-zinc-900 border-orange-500/20 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-orange-400" />
              {isEditDialogOpen ? 'Familie bearbeiten' : 'Neue Familie hinzufügen'}
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Erfasse die Kontaktdaten der Familie für die zentrale Liste.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Familienname + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-zinc-300">Familienname *</Label>
                <Input
                  placeholder="z.B. Retro Cartel"
                  value={formData.familyName}
                  onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
                  className="bg-zinc-800/50 border-zinc-700 focus:border-orange-500/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-zinc-300">Status</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'UNKNOWN' })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${
                      formData.status === 'UNKNOWN'
                        ? 'bg-zinc-500/20 border-zinc-400/50 text-zinc-300'
                        : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <HelpCircle className="h-4 w-4" />
                    Unbekannt
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'ACTIVE' })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${
                      formData.status === 'ACTIVE'
                        ? 'bg-green-500/20 border-green-400/50 text-green-300'
                        : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <CheckCircle className="h-4 w-4" />
                    Aktiv
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'ENDANGERED' })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${
                      formData.status === 'ENDANGERED'
                        ? 'bg-orange-500/20 border-orange-400/50 text-orange-300'
                        : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <AlertCircle className="h-4 w-4" />
                    Gefährdet
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'DISSOLVED' })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${
                      formData.status === 'DISSOLVED'
                        ? 'bg-red-500/20 border-red-400/50 text-red-300'
                        : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                    }`}
                  >
                    <XCircle className="h-4 w-4" />
                    Aufgelöst
                  </button>
                </div>
              </div>
            </div>

            {/* Anwesen PLZ */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-orange-400" />
                <Label className="text-zinc-300">Anwesen PLZ</Label>
              </div>
              <Input
                placeholder="z.B. 123456"
                value={formData.propertyZip}
                onChange={(e) => {
                  // Max 6 Stellen, nur Zahlen
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6)
                  setFormData({ ...formData, propertyZip: value })
                }}
                maxLength={6}
                className="bg-zinc-800/50 border-zinc-700 focus:border-orange-500/50 max-w-xs"
              />
              <p className="text-xs text-zinc-500">Maximal 6-stellige Nummer</p>
            </div>

            {/* Kontaktdetails nur für Berechtigte */}
            {canViewDetails ? (
              <>
                {/* Ansprechpartner 1 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-orange-400 text-sm font-medium">
                    <User className="h-4 w-4" />
                    Ansprechpartner 1
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs">Vorname</Label>
                      <Input
                        placeholder="Vorname"
                        value={formData.contact1FirstName}
                        onChange={(e) => setFormData({ ...formData, contact1FirstName: e.target.value })}
                        className="bg-zinc-800/50 border-zinc-700 focus:border-orange-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs">Nachname</Label>
                      <Input
                        placeholder="Nachname"
                        value={formData.contact1LastName}
                        onChange={(e) => setFormData({ ...formData, contact1LastName: e.target.value })}
                        className="bg-zinc-800/50 border-zinc-700 focus:border-orange-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs">IC Rufnummer</Label>
                      <Input
                        placeholder="123-4567"
                        value={formData.contact1Phone}
                        onChange={(e) => setFormData({ ...formData, contact1Phone: e.target.value })}
                        className="bg-zinc-800/50 border-zinc-700 focus:border-orange-500/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Ansprechpartner 2 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-orange-400 text-sm font-medium">
                    <User className="h-4 w-4" />
                    Ansprechpartner 2
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs">Vorname</Label>
                      <Input
                        placeholder="Vorname"
                        value={formData.contact2FirstName}
                        onChange={(e) => setFormData({ ...formData, contact2FirstName: e.target.value })}
                        className="bg-zinc-800/50 border-zinc-700 focus:border-orange-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs">Nachname</Label>
                      <Input
                        placeholder="Nachname"
                        value={formData.contact2LastName}
                        onChange={(e) => setFormData({ ...formData, contact2LastName: e.target.value })}
                        className="bg-zinc-800/50 border-zinc-700 focus:border-orange-500/50"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-zinc-400 text-xs">IC Rufnummer</Label>
                      <Input
                        placeholder="123-4567"
                        value={formData.contact2Phone}
                        onChange={(e) => setFormData({ ...formData, contact2Phone: e.target.value })}
                        className="bg-zinc-800/50 border-zinc-700 focus:border-orange-500/50"
                      />
                    </div>
                  </div>
                </div>

                {/* Führung/Patron */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Crown className="h-4 w-4 text-orange-400" />
                    <Label className="text-zinc-300">Kontaktdaten Patron / Führung</Label>
                  </div>
                  <Input
                    placeholder="Name oder Telefonnummer der Führung"
                    value={formData.leadershipInfo}
                    onChange={(e) => setFormData({ ...formData, leadershipInfo: e.target.value })}
                    className="bg-zinc-800/50 border-zinc-700 focus:border-orange-500/50"
                  />
                  <p className="text-xs text-zinc-500">
                    Kann Vorname, Nachname oder Telefonnummer sein
                  </p>
                </div>
              </>
            ) : (
              <div className="p-4 bg-zinc-800/30 rounded-lg border border-zinc-700/50">
                <p className="text-sm text-zinc-500 flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Kontaktdaten sind nur für berechtigte Benutzer sichtbar
                </p>
              </div>
            )}

            {/* Notizen */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-zinc-400" />
                <Label className="text-zinc-300">Notizen</Label>
              </div>
              <Textarea
                placeholder="Zusätzliche Informationen..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-zinc-800/50 border-zinc-700 focus:border-orange-500/50 min-h-[80px]"
              />
            </div>

            {/* Schlüsselfamilie Toggle - nur für Berechtigte */}
            {canManage && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, isKeyFamily: !formData.isKeyFamily })}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-all ${
                    formData.isKeyFamily
                      ? 'bg-orange-500/20 border-orange-500/50 text-orange-300'
                      : 'bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-600'
                  }`}
                >
                  <Key className={`h-5 w-5 ${formData.isKeyFamily ? 'text-orange-400' : 'text-zinc-500'}`} />
                  <div className="text-left">
                    <div className="font-medium">Schlüsselfamilie</div>
                    <div className="text-xs opacity-70">
                      {formData.isKeyFamily ? 'Diese Familie ist als offizielle Schlüsselfamilie markiert' : 'Als offizielle Schlüsselfamilie markieren'}
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false)
                setIsEditDialogOpen(false)
                setSelectedContact(null)
                resetForm()
              }}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                if (!formData.familyName.trim()) {
                  toast.error('Familienname ist erforderlich')
                  return
                }
                if (isEditDialogOpen && selectedContact) {
                  updateMutation.mutate({ id: selectedContact.id, data: formData })
                } else {
                  createMutation.mutate(formData)
                }
              }}
              disabled={createMutation.isPending || updateMutation.isPending}
              className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-500 hover:to-orange-600 text-white"
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : null}
              {isEditDialogOpen ? 'Speichern' : 'Hinzufügen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-zinc-900 border-red-500/20">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Familie löschen
            </DialogTitle>
            <DialogDescription className="text-zinc-400">
              Möchtest du <span className="text-white font-medium">{selectedContact?.familyName}</span> wirklich aus der Liste entfernen? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-zinc-700 text-zinc-300 hover:bg-zinc-800"
            >
              Abbrechen
            </Button>
            <Button
              onClick={() => selectedContact && deleteMutation.mutate(selectedContact.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {deleteMutation.isPending ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
              ) : null}
              Löschen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

