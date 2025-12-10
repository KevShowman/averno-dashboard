import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { usePageTitle } from '../hooks/usePageTitle'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
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
  createdAt: string
  updatedAt: string
}

const statusConfig: Record<FamilyContactStatus, { label: string; color: string; bgColor: string; icon: typeof Circle }> = {
  UNKNOWN: { label: 'Unbekannt', color: 'text-gray-400', bgColor: 'bg-gray-500/20', icon: HelpCircle },
  ACTIVE: { label: 'Aktiv', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: CheckCircle },
  ENDANGERED: { label: 'Gefährdet', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', icon: AlertCircle },
  DISSOLVED: { label: 'Aufgelöst', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: XCircle },
}

export default function ListenfuehrungPage() {
  const { user } = useAuthStore()
  usePageTitle('Listenführung')
  const queryClient = useQueryClient()
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<FamilyContact | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
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
  })

  const canManage = hasRole(user, ['EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA', 'CONTACTO'])

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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-amber-500/20 p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/5 via-transparent to-amber-500/5 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-amber-500/20 rounded-xl">
              <BookOpen className="h-8 w-8 text-amber-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Listenführung</h1>
              <p className="text-gray-400 mt-1">
                Zentrale Kontaktliste der Familien in Narco City
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Button
              onClick={handleExport}
              variant="outline"
              className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
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
                className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Familie hinzufügen
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Search & Stats */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Suche nach Familie, Kontakt..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800/50 border-gray-700 focus:border-amber-500/50"
          />
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
          <Users className="h-4 w-4 text-amber-400" />
          <span className="text-gray-400">
            <span className="text-white font-medium">{filteredContacts.length}</span> Familien
          </span>
        </div>
      </div>

      {/* Contacts Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        </div>
      ) : filteredContacts.length === 0 ? (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="p-12 text-center">
            <Building2 className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-400 mb-2">
              {searchTerm ? 'Keine Treffer gefunden' : 'Noch keine Familien eingetragen'}
            </h3>
            <p className="text-gray-500 text-sm">
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
              className="bg-gray-900/50 border-amber-500/10 hover:border-amber-500/30 transition-all group"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 rounded-lg group-hover:bg-amber-500/20 transition-colors">
                      <Building2 className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white group-hover:text-amber-300 transition-colors">
                        {contact.familyName}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
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
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700/50 text-gray-300">
                            <MapPin className="h-3 w-3" />
                            {contact.propertyZip}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {canManage && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openEditDialog(contact)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-amber-400"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openDeleteDialog(contact)}
                        className="h-8 w-8 p-0 text-gray-400 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Ansprechpartner 1 */}
                {(contact.contact1FirstName || contact.contact1LastName || contact.contact1Phone) && (
                  <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <div className="flex items-center gap-2 text-xs text-amber-400/70 mb-2">
                      <User className="h-3 w-3" />
                      <span>Ansprechpartner 1</span>
                    </div>
                    {formatContactName(contact.contact1FirstName, contact.contact1LastName) && (
                      <p className="text-white text-sm font-medium">
                        {formatContactName(contact.contact1FirstName, contact.contact1LastName)}
                      </p>
                    )}
                    {contact.contact1Phone && (
                      <div className="flex items-center gap-2 mt-1 text-gray-400 text-sm">
                        <Phone className="h-3 w-3" />
                        <span>{contact.contact1Phone}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Ansprechpartner 2 */}
                {(contact.contact2FirstName || contact.contact2LastName || contact.contact2Phone) && (
                  <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <div className="flex items-center gap-2 text-xs text-amber-400/70 mb-2">
                      <User className="h-3 w-3" />
                      <span>Ansprechpartner 2</span>
                    </div>
                    {formatContactName(contact.contact2FirstName, contact.contact2LastName) && (
                      <p className="text-white text-sm font-medium">
                        {formatContactName(contact.contact2FirstName, contact.contact2LastName)}
                      </p>
                    )}
                    {contact.contact2Phone && (
                      <div className="flex items-center gap-2 mt-1 text-gray-400 text-sm">
                        <Phone className="h-3 w-3" />
                        <span>{contact.contact2Phone}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Führung/Patron */}
                {contact.leadershipInfo && (
                  <div className="p-3 bg-amber-500/5 rounded-lg border border-amber-500/20">
                    <div className="flex items-center gap-2 text-xs text-amber-400 mb-1">
                      <Crown className="h-3 w-3" />
                      <span>Führung / Patron</span>
                    </div>
                    <p className="text-amber-200 text-sm">{contact.leadershipInfo}</p>
                  </div>
                )}

                {/* Notizen */}
                {contact.notes && (
                  <div className="pt-2 border-t border-gray-800">
                    <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                      <FileText className="h-3 w-3" />
                      <span>Notizen</span>
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-2">{contact.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={isCreateDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsCreateDialogOpen(false)
          setIsEditDialogOpen(false)
          setSelectedContact(null)
          resetForm()
        }
      }}>
        <DialogContent className="bg-gray-900 border-amber-500/20 max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Building2 className="h-5 w-5 text-amber-400" />
              {isEditDialogOpen ? 'Familie bearbeiten' : 'Neue Familie hinzufügen'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Erfasse die Kontaktdaten der Familie für die zentrale Liste.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Familienname + Status */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-gray-300">Familienname *</Label>
                <Input
                  placeholder="z.B. Los Santos Cartel"
                  value={formData.familyName}
                  onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
                  className="bg-gray-800/50 border-gray-700 focus:border-amber-500/50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-gray-300">Status</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, status: 'UNKNOWN' })}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all text-sm ${
                      formData.status === 'UNKNOWN'
                        ? 'bg-gray-500/20 border-gray-400/50 text-gray-300'
                        : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
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
                        : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
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
                        ? 'bg-yellow-500/20 border-yellow-400/50 text-yellow-300'
                        : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
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
                        : 'bg-gray-800/50 border-gray-700 text-gray-400 hover:border-gray-600'
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
                <MapPin className="h-4 w-4 text-amber-400" />
                <Label className="text-gray-300">Anwesen PLZ</Label>
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
                className="bg-gray-800/50 border-gray-700 focus:border-amber-500/50 max-w-xs"
              />
              <p className="text-xs text-gray-500">Maximal 6-stellige Nummer</p>
            </div>

            {/* Ansprechpartner 1 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                <User className="h-4 w-4" />
                Ansprechpartner 1
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-gray-400 text-xs">Vorname</Label>
                  <Input
                    placeholder="Vorname"
                    value={formData.contact1FirstName}
                    onChange={(e) => setFormData({ ...formData, contact1FirstName: e.target.value })}
                    className="bg-gray-800/50 border-gray-700 focus:border-amber-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400 text-xs">Nachname</Label>
                  <Input
                    placeholder="Nachname"
                    value={formData.contact1LastName}
                    onChange={(e) => setFormData({ ...formData, contact1LastName: e.target.value })}
                    className="bg-gray-800/50 border-gray-700 focus:border-amber-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400 text-xs">IC Rufnummer</Label>
                  <Input
                    placeholder="123-4567"
                    value={formData.contact1Phone}
                    onChange={(e) => setFormData({ ...formData, contact1Phone: e.target.value })}
                    className="bg-gray-800/50 border-gray-700 focus:border-amber-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Ansprechpartner 2 */}
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-amber-400 text-sm font-medium">
                <User className="h-4 w-4" />
                Ansprechpartner 2
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <Label className="text-gray-400 text-xs">Vorname</Label>
                  <Input
                    placeholder="Vorname"
                    value={formData.contact2FirstName}
                    onChange={(e) => setFormData({ ...formData, contact2FirstName: e.target.value })}
                    className="bg-gray-800/50 border-gray-700 focus:border-amber-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400 text-xs">Nachname</Label>
                  <Input
                    placeholder="Nachname"
                    value={formData.contact2LastName}
                    onChange={(e) => setFormData({ ...formData, contact2LastName: e.target.value })}
                    className="bg-gray-800/50 border-gray-700 focus:border-amber-500/50"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-gray-400 text-xs">IC Rufnummer</Label>
                  <Input
                    placeholder="123-4567"
                    value={formData.contact2Phone}
                    onChange={(e) => setFormData({ ...formData, contact2Phone: e.target.value })}
                    className="bg-gray-800/50 border-gray-700 focus:border-amber-500/50"
                  />
                </div>
              </div>
            </div>

            {/* Führung/Patron */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-amber-400" />
                <Label className="text-gray-300">Kontaktdaten Patron / Führung</Label>
              </div>
              <Input
                placeholder="Name oder Telefonnummer der Führung"
                value={formData.leadershipInfo}
                onChange={(e) => setFormData({ ...formData, leadershipInfo: e.target.value })}
                className="bg-gray-800/50 border-gray-700 focus:border-amber-500/50"
              />
              <p className="text-xs text-gray-500">
                Kann Vorname, Nachname oder Telefonnummer sein
              </p>
            </div>

            {/* Notizen */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-gray-400" />
                <Label className="text-gray-300">Notizen</Label>
              </div>
              <Textarea
                placeholder="Zusätzliche Informationen..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-gray-800/50 border-gray-700 focus:border-amber-500/50 min-h-[80px]"
              />
            </div>
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
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
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
              className="bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white"
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
        <DialogContent className="bg-gray-900 border-red-500/20">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              Familie löschen
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Möchtest du <span className="text-white font-medium">{selectedContact?.familyName}</span> wirklich aus der Liste entfernen? Diese Aktion kann nicht rückgängig gemacht werden.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
              className="border-gray-700 text-gray-300 hover:bg-gray-800"
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

