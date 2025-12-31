import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { usePageTitle } from '../hooks/usePageTitle'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import {
  Users,
  UserPlus,
  UserMinus,
  Check,
  X,
  Clock,
  Shield,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  MapPin,
  FileText,
  Eye,
  Trash2,
  Phone,
  User,
  ExternalLink,
  Settings,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface PartnerAccessRequest {
  id: string
  discordId: string
  username: string
  avatarUrl?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewedById?: string
  reviewedBy?: {
    id: string
    username: string
    icFirstName?: string
    icLastName?: string
  }
  reviewedAt?: string
  reviewNote?: string
  createdAt: string
}

interface ActivePartner {
  id: string
  discordId: string
  username: string
  avatarUrl?: string
  createdAt: string
}

interface PartnerFamilySuggestion {
  id: string
  type: 'CREATE' | 'UPDATE' | 'DELETE'
  familyName: string
  familyStatus?: string
  propertyZip?: string
  notes?: string
  mapName?: string
  mapX?: number
  mapY?: number
  mapIcon?: string
  // Kontaktdaten (nur für Leadership sichtbar)
  contact1FirstName?: string
  contact1LastName?: string
  contact1Phone?: string
  contact2FirstName?: string
  contact2LastName?: string
  contact2Phone?: string
  suggestionStatus: 'PENDING' | 'APPROVED' | 'REJECTED'
  familyContact?: {
    id: string
    familyName: string
    status: string
    mapAnnotations?: Array<{
      id: string
      mapName: string
      x: number
      y: number
    }>
  }
  createdBy: {
    id: string
    username: string
  }
  reviewedBy?: {
    id: string
    username: string
  }
  reviewedAt?: string
  reviewNote?: string
  createdAt: string
}

interface PartnerManagementPermission {
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

export default function PartnerManagementPage() {
  usePageTitle('Partner-Verwaltung')
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'requests' | 'partners' | 'suggestions' | 'permissions'>('requests')
  const [expandedSuggestion, setExpandedSuggestion] = useState<string | null>(null)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  const isLeadership = user && LEADERSHIP_ROLES.includes(user.role)
  const isElPatron = user && user.role === 'EL_PATRON'

  // Queries
  const { data: pendingRequests = [], isLoading: loadingRequests } = useQuery({
    queryKey: ['partner-requests-pending'],
    queryFn: async () => {
      const res = await api.get('/partner/requests/pending')
      return res.data as PartnerAccessRequest[]
    },
  })

  const { data: allRequests = [], isLoading: loadingAllRequests } = useQuery({
    queryKey: ['partner-requests'],
    queryFn: async () => {
      const res = await api.get('/partner/requests')
      return res.data as PartnerAccessRequest[]
    },
  })

  const { data: activePartners = [], isLoading: loadingPartners } = useQuery({
    queryKey: ['partner-active'],
    queryFn: async () => {
      const res = await api.get('/partner/active')
      return res.data as ActivePartner[]
    },
  })

  const { data: pendingSuggestions = [], isLoading: loadingSuggestions } = useQuery({
    queryKey: ['partner-suggestions-pending'],
    queryFn: async () => {
      const res = await api.get('/partner/suggestions/pending')
      return res.data as PartnerFamilySuggestion[]
    },
  })

  // Permission queries (nur für El Patron)
  const permissionsQuery = useQuery({
    queryKey: ['partner-permissions'],
    queryFn: () => api.get('/partner/permissions').then(res => res.data as PartnerManagementPermission[]),
    enabled: !!isElPatron,
  })
  const permissions = permissionsQuery.data ?? []
  const loadingPermissions = permissionsQuery.isLoading

  const availableUsersQuery = useQuery({
    queryKey: ['users-for-permission'],
    queryFn: () => api.get('/users').then(res => res.data as UserForPermission[]),
    enabled: !!isElPatron,
  })
  const availableUsers = availableUsersQuery.data ?? []

  // Mutations
  const approveRequestMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/partner/requests/${id}/approve`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-requests'] })
      queryClient.invalidateQueries({ queryKey: ['partner-requests-pending'] })
      queryClient.invalidateQueries({ queryKey: ['partner-active'] })
    },
  })

  const rejectRequestMutation = useMutation({
    mutationFn: async ({ id, reviewNote }: { id: string; reviewNote?: string }) => {
      await api.post(`/partner/requests/${id}/reject`, { reviewNote })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-requests'] })
      queryClient.invalidateQueries({ queryKey: ['partner-requests-pending'] })
      setRejectingId(null)
      setRejectNote('')
    },
  })

  const revokeAccessMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/partner/active/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-active'] })
      queryClient.invalidateQueries({ queryKey: ['partner-requests'] })
    },
  })

  const approveSuggestionMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/partner/suggestions/${id}/approve`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-suggestions'] })
      queryClient.invalidateQueries({ queryKey: ['partner-suggestions-pending'] })
      queryClient.invalidateQueries({ queryKey: ['family-contacts'] })
      queryClient.invalidateQueries({ queryKey: ['map-annotations'] })
    },
  })

  const rejectSuggestionMutation = useMutation({
    mutationFn: async ({ id, reviewNote }: { id: string; reviewNote?: string }) => {
      await api.post(`/partner/suggestions/${id}/reject`, { reviewNote })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-suggestions'] })
      queryClient.invalidateQueries({ queryKey: ['partner-suggestions-pending'] })
      setRejectingId(null)
      setRejectNote('')
    },
  })

  // Permission mutations
  const grantPermissionMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.post(`/partner/permissions/${userId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-permissions'] })
      setSelectedUserId('')
    },
  })

  const revokePermissionMutation = useMutation({
    mutationFn: async (userId: string) => {
      await api.delete(`/partner/permissions/${userId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['partner-permissions'] })
    },
  })

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">Ausstehend</span>
      case 'APPROVED':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30">Genehmigt</span>
      case 'REJECTED':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400 border border-red-500/30">Abgelehnt</span>
      default:
        return null
    }
  }

  const getFamilyStatusBadge = (status?: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">Aktiv</span>
      case 'ENDANGERED':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-yellow-500/20 text-yellow-400">Gefährdet</span>
      case 'DISSOLVED':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">Aufgelöst</span>
      default:
        return <span className="px-2 py-0.5 text-xs rounded-full bg-gray-500/20 text-gray-400">Unbekannt</span>
    }
  }

  const getSuggestionTypeBadge = (type: string) => {
    switch (type) {
      case 'CREATE':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400">Neu</span>
      case 'UPDATE':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-blue-500/20 text-blue-400">Änderung</span>
      case 'DELETE':
        return <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/20 text-red-400">Löschung</span>
      default:
        return null
    }
  }

  // Zur Karte navigieren mit Koordinaten
  const navigateToMap = (mapName: string, x?: number, y?: number) => {
    const mapUrl = `/karte?map=${mapName}${x !== undefined && y !== undefined ? `&x=${x}&y=${y}` : ''}`
    navigate(mapUrl)
  }

  // Benutzer die noch keine Berechtigung haben
  const usersWithoutPermission = availableUsers.filter(u => 
    !permissions.some(p => p.userId === u.id) &&
    !LEADERSHIP_ROLES.includes(u.role) &&
    !u.role.includes('PARTNER')
  )

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Users className="h-8 w-8 text-amber-500" />
            Partner-Verwaltung
          </h1>
          <p className="text-muted-foreground mt-1">
            Verwalte Partner-Zugänge und -Vorschläge
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-4 py-2 rounded-t-lg transition-colors ${
            activeTab === 'requests'
              ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Anfragen
            {pendingRequests.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-amber-500 text-black">
                {pendingRequests.length}
              </span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('partners')}
          className={`px-4 py-2 rounded-t-lg transition-colors ${
            activeTab === 'partners'
              ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Aktive Partner
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-gray-700 text-gray-300">
              {activePartners.length}
            </span>
          </div>
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`px-4 py-2 rounded-t-lg transition-colors ${
            activeTab === 'suggestions'
              ? 'bg-amber-500/20 text-amber-400 border-b-2 border-amber-500'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Vorschläge
            {pendingSuggestions.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-amber-500 text-black">
                {pendingSuggestions.length}
              </span>
            )}
          </div>
        </button>
        {isElPatron && (
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

      {/* Content */}
      {activeTab === 'requests' && (
        <div className="space-y-4">
          {/* Pending Requests */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-amber-500" />
                Ausstehende Anfragen
              </CardTitle>
              <CardDescription>
                Diese Partner warten auf Genehmigung
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingRequests ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Check className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Keine ausstehenden Anfragen</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50"
                    >
                      <div className="flex items-center gap-3">
                        {request.avatarUrl ? (
                          <img
                            src={request.avatarUrl}
                            alt={request.username}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                            <Users className="h-5 w-5 text-gray-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-white">{request.username}</p>
                          <p className="text-xs text-gray-500">
                            Angefragt am {formatDate(request.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {rejectingId === request.id ? (
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Ablehnungsgrund (optional)"
                              value={rejectNote}
                              onChange={(e) => setRejectNote(e.target.value)}
                              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectRequestMutation.mutate({ id: request.id, reviewNote: rejectNote })}
                              disabled={rejectRequestMutation.isPending}
                            >
                              {rejectRequestMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Ablehnen'
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRejectingId(null)
                                setRejectNote('')
                              }}
                            >
                              Abbrechen
                            </Button>
                          </div>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                              onClick={() => approveRequestMutation.mutate(request.id)}
                              disabled={approveRequestMutation.isPending}
                            >
                              {approveRequestMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <>
                                  <Check className="h-4 w-4 mr-1" />
                                  Genehmigen
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => setRejectingId(request.id)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Ablehnen
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Requests History */}
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5 text-gray-500" />
                Anfragen-Verlauf
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingAllRequests ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                </div>
              ) : (
                <div className="space-y-2">
                  {allRequests.filter(r => r.status !== 'PENDING').map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-3 bg-gray-800/30 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                          <Users className="h-4 w-4 text-gray-400" />
                        </div>
                        <div>
                          <p className="text-sm text-white">{request.username}</p>
                          <p className="text-xs text-gray-500">
                            {request.reviewedAt && formatDate(request.reviewedAt)}
                            {request.reviewedBy && ` von ${request.reviewedBy.icFirstName || request.reviewedBy.username}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(request.status)}
                        {request.reviewNote && (
                          <span className="text-xs text-gray-500 max-w-48 truncate" title={request.reviewNote}>
                            {request.reviewNote}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'partners' && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              Aktive Partner
            </CardTitle>
            <CardDescription>
              Diese Partner haben aktiven Zugang zum System
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPartners ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              </div>
            ) : activePartners.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Keine aktiven Partner</p>
              </div>
            ) : (
              <div className="space-y-3">
                {activePartners.map((partner) => (
                  <div
                    key={partner.id}
                    className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50"
                  >
                    <div className="flex items-center gap-3">
                      {partner.avatarUrl ? (
                        <img
                          src={partner.avatarUrl}
                          alt={partner.username}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
                          <Users className="h-5 w-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-white">{partner.username}</p>
                        <p className="text-xs text-gray-500">
                          Partner seit {formatDate(partner.createdAt)}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      onClick={() => {
                        if (confirm(`Möchtest du den Partner-Zugang für ${partner.username} wirklich widerrufen?`)) {
                          revokeAccessMutation.mutate(partner.id)
                        }
                      }}
                      disabled={revokeAccessMutation.isPending}
                    >
                      {revokeAccessMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <UserMinus className="h-4 w-4 mr-1" />
                          Zugang entziehen
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'suggestions' && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-500" />
              Partner-Vorschläge
            </CardTitle>
            <CardDescription>
              Von Partnern vorgeschlagene Familienkontakte, Änderungen und Löschungen
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingSuggestions ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
              </div>
            ) : pendingSuggestions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Check className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>Keine ausstehenden Vorschläge</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingSuggestions.map((suggestion) => (
                  <div
                    key={suggestion.id}
                    className="bg-gray-800/50 rounded-lg border border-gray-700/50 overflow-hidden"
                  >
                    <div
                      className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/70 transition-colors"
                      onClick={() => setExpandedSuggestion(expandedSuggestion === suggestion.id ? null : suggestion.id)}
                    >
                      <div className="flex items-center gap-3">
                        {expandedSuggestion === suggestion.id ? (
                          <ChevronDown className="h-4 w-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white">{suggestion.familyName}</p>
                            {getSuggestionTypeBadge(suggestion.type)}
                            {suggestion.type !== 'DELETE' && getFamilyStatusBadge(suggestion.familyStatus)}
                          </div>
                          <p className="text-xs text-gray-500">
                            Von {suggestion.createdBy.username} • {formatDate(suggestion.createdAt)}
                            {suggestion.mapName && (
                              <span className="ml-2 text-amber-400">• Hat Kartenstandort</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {rejectingId === suggestion.id ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              placeholder="Ablehnungsgrund (optional)"
                              value={rejectNote}
                              onChange={(e) => setRejectNote(e.target.value)}
                              className="px-3 py-1.5 bg-gray-700 border border-gray-600 rounded text-sm text-white"
                            />
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectSuggestionMutation.mutate({ id: suggestion.id, reviewNote: rejectNote })}
                              disabled={rejectSuggestionMutation.isPending}
                            >
                              Ablehnen
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setRejectingId(null)
                                setRejectNote('')
                              }}
                            >
                              Abbrechen
                            </Button>
                          </div>
                        ) : (
                          <div onClick={(e) => e.stopPropagation()}>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                              onClick={() => approveSuggestionMutation.mutate(suggestion.id)}
                              disabled={approveSuggestionMutation.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Annehmen
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                              onClick={() => setRejectingId(suggestion.id)}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Ablehnen
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {expandedSuggestion === suggestion.id && (
                      <div className="px-4 pb-4 pt-2 border-t border-gray-700/50 space-y-3">
                        {suggestion.type === 'DELETE' && (
                          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                            <div className="flex items-center gap-2 text-red-400">
                              <Trash2 className="h-4 w-4" />
                              <span className="font-medium">Löschvorschlag</span>
                            </div>
                            <p className="text-sm text-gray-400 mt-1">
                              Der Partner schlägt vor, diesen Eintrag zu löschen.
                            </p>
                          </div>
                        )}
                        
                        {suggestion.propertyZip && (
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            <span className="text-gray-400">PLZ:</span>
                            <span className="text-white">{suggestion.propertyZip}</span>
                          </div>
                        )}
                        
                        {/* Map-Daten: Bei DELETE-Vorschlägen aus der existierenden MapAnnotation laden */}
                        {(() => {
                          // Bei DELETE: Koordinaten aus der verbundenen Familie laden
                          const mapAnnotation = suggestion.type === 'DELETE' && suggestion.familyContact?.mapAnnotations?.[0]
                            ? suggestion.familyContact.mapAnnotations[0]
                            : null
                          const displayMapName = mapAnnotation?.mapName || suggestion.mapName
                          const displayMapX = mapAnnotation?.x ?? suggestion.mapX
                          const displayMapY = mapAnnotation?.y ?? suggestion.mapY
                          // Koordinaten sind normalisiert (0.0-1.0), also prüfen ob sie vorhanden sind
                          const hasValidCoords = displayMapX !== undefined && displayMapY !== undefined && displayMapX !== null && displayMapY !== null
                          
                          if (!displayMapName && !mapAnnotation) return null
                          
                          return (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-amber-400" />
                              <span className="text-gray-400">Karte:</span>
                              <span className="text-white">
                                {(displayMapName || 'Unbekannt').replace('_', ' ')}
                              </span>
                              {hasValidCoords && displayMapName && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-6 px-2 text-amber-400 hover:text-amber-300"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigateToMap(displayMapName, displayMapX, displayMapY)
                                  }}
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Zur Karte
                                </Button>
                              )}
                            </div>
                          )
                        })()}

                        {/* Kontaktdaten (nur für Leadership) */}
                        {(suggestion.contact1FirstName || suggestion.contact1Phone || suggestion.contact2FirstName || suggestion.contact2Phone) && (
                          <div className="p-3 bg-gray-900/50 rounded-lg space-y-2">
                            <div className="flex items-center gap-2 text-sm font-medium text-gray-300">
                              <Phone className="h-4 w-4 text-gray-500" />
                              Kontaktdaten
                            </div>
                            {(suggestion.contact1FirstName || suggestion.contact1LastName || suggestion.contact1Phone) && (
                              <div className="flex items-center gap-2 text-sm pl-6">
                                <User className="h-3 w-3 text-gray-500" />
                                <span className="text-gray-400">Kontakt 1:</span>
                                <span className="text-white">
                                  {[suggestion.contact1FirstName, suggestion.contact1LastName].filter(Boolean).join(' ')}
                                  {suggestion.contact1Phone && ` - ${suggestion.contact1Phone}`}
                                </span>
                              </div>
                            )}
                            {(suggestion.contact2FirstName || suggestion.contact2LastName || suggestion.contact2Phone) && (
                              <div className="flex items-center gap-2 text-sm pl-6">
                                <User className="h-3 w-3 text-gray-500" />
                                <span className="text-gray-400">Kontakt 2:</span>
                                <span className="text-white">
                                  {[suggestion.contact2FirstName, suggestion.contact2LastName].filter(Boolean).join(' ')}
                                  {suggestion.contact2Phone && ` - ${suggestion.contact2Phone}`}
                                </span>
                              </div>
                            )}
                          </div>
                        )}

                        {suggestion.notes && (
                          <div className="text-sm">
                            <span className="text-gray-400">Notizen:</span>
                            <p className="text-white mt-1 bg-gray-900/50 p-2 rounded">
                              {suggestion.notes}
                            </p>
                          </div>
                        )}
                        
                        {(suggestion.type === 'UPDATE' || suggestion.type === 'DELETE') && suggestion.familyContact && (
                          <div className="text-sm">
                            <span className="text-gray-400">Bezieht sich auf:</span>
                            <p className="text-white">{suggestion.familyContact.familyName}</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Berechtigungen Tab (nur El Patron) */}
      {activeTab === 'permissions' && isElPatron && (
        <div className="space-y-4">
          <Card className="bg-gray-900/50 border-gray-800">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-amber-500" />
                Partner-Verwaltungs-Berechtigungen
              </CardTitle>
              <CardDescription>
                Bestimme welche Mitglieder Partner-Anfragen und Vorschläge verwalten dürfen.
                Leadership (Patron, Don, Asesor) hat automatisch Zugriff.
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
              {loadingPermissions ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-amber-500" />
                </div>
              ) : permissions.length === 0 ? (
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
                          Berechtigt von {permission.grantedBy.icFirstName || permission.grantedBy.username} 
                          {' • '}{formatDate(permission.createdAt)}
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
                  <li>Leadership (El Patron, Don Capitán, Don Comandante, El Mano Derecha) hat automatisch Zugriff</li>
                  <li>Berechtigte Mitglieder können Partner-Anfragen annehmen/ablehnen</li>
                  <li>Berechtigte Mitglieder können Partner-Vorschläge prüfen</li>
                  <li>Nur El Patron kann diese Berechtigungen vergeben</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

