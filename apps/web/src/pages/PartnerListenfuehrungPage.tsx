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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { toast } from 'sonner'
import {
  BookOpen,
  Plus,
  Send,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  Shield,
  Loader2,
  MapPin,
  Trash2,
  ExternalLink,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

type SuggestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED'
type SuggestionType = 'CREATE' | 'UPDATE' | 'DELETE'

interface PartnerSuggestion {
  id: string
  type?: SuggestionType
  familyName: string
  familyContactId?: string
  propertyZip?: string
  notes?: string
  status: SuggestionStatus
  suggestionStatus?: SuggestionStatus
  reviewNote?: string
  createdAt: string
  reviewedAt?: string
  mapName?: string
  mapX?: number
  mapY?: number
  mapIcon?: string
}

interface FamilyContact {
  id: string
  familyName: string
  status: string
  propertyZip?: string
  mapAnnotations?: MapAnnotation[]
}

interface MapAnnotation {
  id: string
  mapName: string
  x: number
  y: number
  icon: string
  label?: string
  familyContact?: {
    id: string
    familyName: string
    status: string
  }
}

const statusConfig: Record<SuggestionStatus, { label: string; color: string; bgColor: string; icon: typeof Clock }> = {
  PENDING: { label: 'Ausstehend', color: 'text-amber-400', bgColor: 'bg-amber-500/20', icon: Clock },
  APPROVED: { label: 'Genehmigt', color: 'text-green-400', bgColor: 'bg-green-500/20', icon: CheckCircle },
  REJECTED: { label: 'Abgelehnt', color: 'text-red-400', bgColor: 'bg-red-500/20', icon: XCircle },
}

export default function PartnerListenfuehrungPage() {
  const { user } = useAuthStore()
  usePageTitle('Listenführung - Partner')
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  
  const [activeTab, setActiveTab] = useState<'create' | 'delete'>('create')
  const [selectedFamilyForDelete, setSelectedFamilyForDelete] = useState<string>('')
  const [deleteReason, setDeleteReason] = useState('')
  
  const [formData, setFormData] = useState({
    familyName: '',
    familyStatus: 'UNKNOWN',
    propertyZip: '',
    contact1FirstName: '',
    contact1LastName: '',
    contact1Phone: '',
    contact2FirstName: '',
    contact2LastName: '',
    contact2Phone: '',
    notes: '',
    // Map fields
    mapName: '',
    linkedAnnotationId: '', // Link to existing map annotation
  })

  // Fetch partner's own suggestions
  const { data: suggestions = [], isLoading } = useQuery<PartnerSuggestion[]>({
    queryKey: ['partner-suggestions'],
    queryFn: () => api.get('/partner/suggestions').then(res => res.data),
  })

  // Fetch existing map annotations for linking
  const { data: mapAnnotations = [] } = useQuery<MapAnnotation[]>({
    queryKey: ['partner-map-annotations', formData.mapName],
    queryFn: () => api.get(`/partner/map-annotations${formData.mapName ? `?mapName=${formData.mapName}` : ''}`).then(res => res.data),
    enabled: !!formData.mapName,
  })

  // Fetch families for delete suggestions
  const { data: families = [] } = useQuery<FamilyContact[]>({
    queryKey: ['partner-families'],
    queryFn: () => api.get('/partner/families').then(res => res.data),
  })

  // Submit new suggestion (CREATE)
  const submitMutation = useMutation({
    mutationFn: (data: typeof formData) => api.post('/partner/suggestions', {
      type: 'CREATE',
      ...data,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-suggestions'] })
      toast.success('Vorschlag erfolgreich eingereicht! Er wird von der Leadership geprüft.')
      resetForm()
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Einreichen des Vorschlags')
    },
  })

  // Submit delete suggestion
  const submitDeleteMutation = useMutation({
    mutationFn: (data: { familyContactId: string; familyName: string; notes: string }) => api.post('/partner/suggestions', {
      type: 'DELETE',
      familyContactId: data.familyContactId,
      familyName: data.familyName,
      notes: data.notes,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-suggestions'] })
      toast.success('Löschvorschlag erfolgreich eingereicht!')
      setSelectedFamilyForDelete('')
      setDeleteReason('')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Einreichen des Löschvorschlags')
    },
  })

  const resetForm = () => {
    setFormData({
      familyName: '',
      familyStatus: 'UNKNOWN',
      propertyZip: '',
      contact1FirstName: '',
      contact1LastName: '',
      contact1Phone: '',
      contact2FirstName: '',
      contact2LastName: '',
      contact2Phone: '',
      notes: '',
      mapName: '',
      linkedAnnotationId: '',
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.familyName.trim()) {
      toast.error('Bitte gib einen Familiennamen ein')
      return
    }

    // Find linked annotation to get coordinates
    const linkedAnnotation = mapAnnotations.find(a => a.id === formData.linkedAnnotationId)
    
    const submitData = {
      ...formData,
      mapX: linkedAnnotation?.x,
      mapY: linkedAnnotation?.y,
      mapIcon: linkedAnnotation?.icon,
    }
    
    submitMutation.mutate(submitData)
  }

  // API might return suggestionStatus instead of status
  const getStatus = (s: PartnerSuggestion) => s.status || s.suggestionStatus || 'PENDING'
  const getType = (s: PartnerSuggestion) => s.type || 'CREATE'
  const pendingSuggestions = suggestions.filter(s => getStatus(s) === 'PENDING')
  const processedSuggestions = suggestions.filter(s => getStatus(s) !== 'PENDING')

  // Navigation zur Karte
  const navigateToMap = (mapName: string, x?: number, y?: number) => {
    const mapUrl = `/karte?map=${mapName}${x !== undefined && y !== undefined ? `&x=${x}&y=${y}` : ''}`
    navigate(mapUrl)
  }

  // Löschvorschlag einreichen
  const handleDeleteSubmit = () => {
    if (!selectedFamilyForDelete) {
      toast.error('Bitte wähle eine Familie aus')
      return
    }
    if (!deleteReason.trim()) {
      toast.error('Bitte gib einen Grund für die Löschung an')
      return
    }
    const family = families.find(f => f.id === selectedFamilyForDelete)
    if (family) {
      submitDeleteMutation.mutate({
        familyContactId: family.id,
        familyName: family.familyName,
        notes: deleteReason,
      })
    }
  }

  // Type Badge
  const getTypeBadge = (type: SuggestionType) => {
    switch (type) {
      case 'CREATE':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">Neu</span>
      case 'UPDATE':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">Änderung</span>
      case 'DELETE':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">Löschung</span>
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl">
          <BookOpen className="h-8 w-8 text-blue-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Listenführung</h1>
          <p className="text-gray-400">Schlage neue Familien-Kontakte vor</p>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Shield className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-gray-300 text-sm">
              Als Partner kannst du Kontaktdaten für Familien vorschlagen. Diese werden von der Leadership 
              geprüft bevor sie in die Liste aufgenommen werden. Du kannst eingegebene Daten danach nicht 
              mehr einsehen - nur den Status deiner Vorschläge.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Submit Form */}
        <Card className="bg-gray-800/50 border-gray-700/50">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <button
                type="button"
                onClick={() => setActiveTab('create')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'create'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/50'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Plus className="h-4 w-4 inline mr-1" />
                Neuer Kontakt
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('delete')}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === 'delete'
                    ? 'bg-red-500/20 text-red-400 border border-red-500/50'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <Trash2 className="h-4 w-4 inline mr-1" />
                Löschvorschlag
              </button>
            </div>
            <CardDescription>
              {activeTab === 'create' 
                ? 'Fülle die bekannten Informationen aus'
                : 'Schlage eine Familie zum Löschen vor'
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {activeTab === 'create' ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Family Name */}
              <div className="space-y-2">
                <Label htmlFor="familyName" className="text-gray-300">
                  Familienname <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="familyName"
                  value={formData.familyName}
                  onChange={(e) => setFormData({ ...formData, familyName: e.target.value })}
                  placeholder="z.B. Narco City Cartel"
                  className="bg-gray-900/50 border-gray-600"
                />
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label className="text-gray-300">Status</Label>
                <Select
                  value={formData.familyStatus}
                  onValueChange={(value) => setFormData({ ...formData, familyStatus: value })}
                >
                  <SelectTrigger className="bg-gray-900/50 border-gray-600">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNKNOWN">Unbekannt</SelectItem>
                    <SelectItem value="ACTIVE">Aktiv</SelectItem>
                    <SelectItem value="ENDANGERED">Gefährdet</SelectItem>
                    <SelectItem value="DISSOLVED">Aufgelöst</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Property ZIP */}
              <div className="space-y-2">
                <Label htmlFor="propertyZip" className="text-gray-300">PLZ / Standort</Label>
                <Input
                  id="propertyZip"
                  value={formData.propertyZip}
                  onChange={(e) => setFormData({ ...formData, propertyZip: e.target.value })}
                  placeholder="z.B. 5024"
                  className="bg-gray-900/50 border-gray-600"
                />
              </div>

              {/* Map Location */}
              <div className="space-y-3 p-4 bg-gray-900/30 rounded-lg">
                <h4 className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-amber-400" />
                  Karten-Standort (optional)
                </h4>
                <p className="text-xs text-gray-500">
                  Verknüpfe einen bestehenden Standort auf der Karte mit dieser Familie
                </p>
                
                {/* Map Selection */}
                <Select
                  value={formData.mapName}
                  onValueChange={(value) => setFormData({ ...formData, mapName: value, linkedAnnotationId: '' })}
                >
                  <SelectTrigger className="bg-gray-900/50 border-gray-600">
                    <SelectValue placeholder="Karte auswählen..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NARCO_CITY">Narco City</SelectItem>
                    <SelectItem value="ROXWOOD">Roxwood</SelectItem>
                    <SelectItem value="CAYO_PERICO">Cayo Perico</SelectItem>
                  </SelectContent>
                </Select>

                {/* Existing Annotations */}
                {formData.mapName && (
                  <Select
                    value={formData.linkedAnnotationId || undefined}
                    onValueChange={(value) => setFormData({ ...formData, linkedAnnotationId: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger className="bg-gray-900/50 border-gray-600">
                      <SelectValue placeholder="Bestehenden Standort verknüpfen..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Keinen Standort verknüpfen</SelectItem>
                      {mapAnnotations.map((annotation) => (
                        <SelectItem key={annotation.id} value={annotation.id}>
                          {annotation.label || annotation.familyContact?.familyName || `Standort ${annotation.id.slice(-6)}`}
                          {annotation.familyContact && ` (${annotation.familyContact.familyName})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {/* Contact 1 */}
              <div className="space-y-3 p-4 bg-gray-900/30 rounded-lg">
                <h4 className="text-sm font-medium text-gray-300">Kontaktperson 1</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    value={formData.contact1FirstName}
                    onChange={(e) => setFormData({ ...formData, contact1FirstName: e.target.value })}
                    placeholder="Vorname"
                    className="bg-gray-900/50 border-gray-600"
                  />
                  <Input
                    value={formData.contact1LastName}
                    onChange={(e) => setFormData({ ...formData, contact1LastName: e.target.value })}
                    placeholder="Nachname"
                    className="bg-gray-900/50 border-gray-600"
                  />
                </div>
                <Input
                  value={formData.contact1Phone}
                  onChange={(e) => setFormData({ ...formData, contact1Phone: e.target.value })}
                  placeholder="Telefonnummer"
                  className="bg-gray-900/50 border-gray-600"
                />
              </div>

              {/* Contact 2 */}
              <div className="space-y-3 p-4 bg-gray-900/30 rounded-lg">
                <h4 className="text-sm font-medium text-gray-300">Kontaktperson 2</h4>
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    value={formData.contact2FirstName}
                    onChange={(e) => setFormData({ ...formData, contact2FirstName: e.target.value })}
                    placeholder="Vorname"
                    className="bg-gray-900/50 border-gray-600"
                  />
                  <Input
                    value={formData.contact2LastName}
                    onChange={(e) => setFormData({ ...formData, contact2LastName: e.target.value })}
                    placeholder="Nachname"
                    className="bg-gray-900/50 border-gray-600"
                  />
                </div>
                <Input
                  value={formData.contact2Phone}
                  onChange={(e) => setFormData({ ...formData, contact2Phone: e.target.value })}
                  placeholder="Telefonnummer"
                  className="bg-gray-900/50 border-gray-600"
                />
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="text-gray-300">Notizen</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Weitere Informationen..."
                  rows={3}
                  className="bg-gray-900/50 border-gray-600 resize-none"
                />
              </div>

              <Button
                type="submit"
                disabled={submitMutation.isPending}
                className="w-full bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400"
              >
                {submitMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Wird eingereicht...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Vorschlag einreichen
                  </>
                )}
              </Button>
            </form>
            ) : (
              /* DELETE Tab */
              <div className="space-y-4">
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                  <div className="flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle className="h-4 w-4" />
                    Löschvorschläge müssen von der Leadership genehmigt werden
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">Familie auswählen</Label>
                  <Select
                    value={selectedFamilyForDelete}
                    onValueChange={setSelectedFamilyForDelete}
                  >
                    <SelectTrigger className="bg-gray-900/50 border-gray-600">
                      <SelectValue placeholder="Familie auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {families.map((family) => (
                        <SelectItem key={family.id} value={family.id}>
                          {family.familyName}
                          {family.propertyZip && ` (PLZ: ${family.propertyZip})`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-300">
                    Begründung für Löschung <span className="text-red-400">*</span>
                  </Label>
                  <Textarea
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Warum soll dieser Eintrag gelöscht werden?"
                    rows={4}
                    className="bg-gray-900/50 border-gray-600 resize-none"
                  />
                </div>

                <Button
                  onClick={handleDeleteSubmit}
                  disabled={submitDeleteMutation.isPending || !selectedFamilyForDelete || !deleteReason.trim()}
                  className="w-full bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400"
                >
                  {submitDeleteMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Wird eingereicht...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Löschvorschlag einreichen
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Suggestions Status */}
        <div className="space-y-6">
          {/* Pending Suggestions */}
          <Card className="bg-gray-800/50 border-gray-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Clock className="h-5 w-5 text-amber-400" />
                Ausstehende Vorschläge
                {pendingSuggestions.length > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-amber-500/20 text-amber-400">
                    {pendingSuggestions.length}
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Warten auf Prüfung durch die Leadership
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : pendingSuggestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Keine ausstehenden Vorschläge</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingSuggestions.map((suggestion) => (
                    <div
                      key={suggestion.id}
                      className={`p-3 bg-gray-900/30 rounded-lg border ${
                        getType(suggestion) === 'DELETE' 
                          ? 'border-red-500/30' 
                          : 'border-gray-700/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-white">{suggestion.familyName}</span>
                          {getTypeBadge(getType(suggestion))}
                        </div>
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${statusConfig.PENDING.bgColor} ${statusConfig.PENDING.color}`}>
                          <Clock className="h-3 w-3" />
                          {statusConfig.PENDING.label}
                        </span>
                      </div>
                      {suggestion.propertyZip && (
                        <p className="text-sm text-gray-500 mt-1">PLZ: {suggestion.propertyZip}</p>
                      )}
                      {suggestion.mapName && (
                        <div className="flex items-center gap-2 mt-1">
                          <MapPin className="h-3 w-3 text-amber-400" />
                          <span className="text-sm text-gray-500">
                            Karte: {suggestion.mapName === 'NARCO_CITY' ? 'Narco City' : suggestion.mapName === 'ROXWOOD' ? 'Roxwood' : 'Cayo Perico'}
                          </span>
                          <button
                            onClick={() => navigateToMap(suggestion.mapName!, suggestion.mapX, suggestion.mapY)}
                            className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Anzeigen
                          </button>
                        </div>
                      )}
                      <p className="text-xs text-gray-600 mt-2">
                        Eingereicht: {new Date(suggestion.createdAt).toLocaleDateString('de-DE')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Processed Suggestions */}
          <Card className="bg-gray-800/50 border-gray-700/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <CheckCircle className="h-5 w-5 text-green-400" />
                Bearbeitete Vorschläge
              </CardTitle>
              <CardDescription>
                Genehmigte und abgelehnte Vorschläge
              </CardDescription>
            </CardHeader>
            <CardContent>
              {processedSuggestions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>Keine bearbeiteten Vorschläge</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {processedSuggestions.map((suggestion) => {
                    const status = getStatus(suggestion)
                    const type = getType(suggestion)
                    const config = statusConfig[status]
                    const StatusIcon = config.icon
                    return (
                      <div
                        key={suggestion.id}
                        className={`p-3 bg-gray-900/30 rounded-lg border ${
                          status === 'REJECTED' ? 'border-red-500/30' : 'border-gray-700/50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{suggestion.familyName}</span>
                            {getTypeBadge(type)}
                          </div>
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ${config.bgColor} ${config.color}`}>
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
                          </span>
                        </div>
                        {suggestion.mapName && (
                          <div className="flex items-center gap-2 mt-1">
                            <MapPin className="h-3 w-3 text-amber-400" />
                            <span className="text-sm text-gray-500">
                              Karte: {suggestion.mapName === 'NARCO_CITY' ? 'Narco City' : suggestion.mapName === 'ROXWOOD' ? 'Roxwood' : 'Cayo Perico'}
                            </span>
                            {status === 'APPROVED' && (
                              <>
                                <span className="text-green-400 text-xs">(auf Karte sichtbar)</span>
                                <button
                                  onClick={() => navigateToMap(suggestion.mapName!, suggestion.mapX, suggestion.mapY)}
                                  className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                                >
                                  <ExternalLink className="h-3 w-3" />
                                  Anzeigen
                                </button>
                              </>
                            )}
                          </div>
                        )}
                        
                        {/* Ablehnungsbegründung prominent anzeigen */}
                        {status === 'REJECTED' && suggestion.reviewNote && (
                          <div className="mt-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <div className="flex items-center gap-2 text-red-400 text-sm font-medium mb-1">
                              <XCircle className="h-4 w-4" />
                              Ablehnungsgrund
                            </div>
                            <p className="text-sm text-gray-300">
                              {suggestion.reviewNote}
                            </p>
                          </div>
                        )}
                        
                        {/* Genehmigungsnotiz */}
                        {status === 'APPROVED' && suggestion.reviewNote && (
                          <p className="text-sm text-gray-400 mt-2 p-2 bg-gray-800/50 rounded">
                            {suggestion.reviewNote}
                          </p>
                        )}
                        
                        <p className="text-xs text-gray-600 mt-2">
                          Bearbeitet: {suggestion.reviewedAt 
                            ? new Date(suggestion.reviewedAt).toLocaleDateString('de-DE') 
                            : 'Unbekannt'}
                        </p>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

