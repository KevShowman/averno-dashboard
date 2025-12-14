import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { usePageTitle } from '../hooks/usePageTitle'
import { hasRole } from '../lib/utils'
import { toast } from 'sonner'
import {
  MapContainer,
  ImageOverlay,
  Marker,
  Popup,
  Tooltip,
  Polygon,
  useMapEvents,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Map as MapIcon,
  Plus,
  Pencil,
  Trash2,
  Home,
  Building2,
  Warehouse,
  Skull,
  AlertTriangle,
  Users,
  Crown,
  MapPin,
  Phone,
  X,
  CheckCircle,
  XCircle,
  AlertCircle,
  HelpCircle,
  Hexagon,
  Palette,
  Check,
  RotateCcw,
  Lightbulb,
  Loader2,
  MessageSquare,
} from 'lucide-react'
import { Textarea } from '../components/ui/textarea'
import { Badge } from '../components/ui/badge'

// Map Types
type MapName = 'NARCO_CITY' | 'ROXWOOD' | 'CAYO_PERICO'
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
  isKeyFamily?: boolean
  isOutdated?: boolean
}

interface MapAnnotation {
  id: string
  mapName: MapName
  x: number
  y: number
  icon: string
  label?: string
  familyContactId?: string
  familyContact?: FamilyContact
  createdBy: {
    id: string
    username: string
    icFirstName?: string
    icLastName?: string
  }
  createdAt: string
}

interface MapSuggestion {
  id: string
  mapName: MapName
  x: number
  y: number
  icon: string
  label?: string
  familyContactId?: string
  familyContact?: FamilyContact
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reviewNote?: string
  createdBy: {
    id: string
    username: string
    icFirstName?: string
    icLastName?: string
  }
  reviewedBy?: {
    id: string
    username: string
    icFirstName?: string
    icLastName?: string
  }
  reviewedAt?: string
  createdAt: string
}

interface MapArea {
  id: string
  mapName: MapName
  points: { x: number; y: number }[]
  label: string
  color: string
  createdBy: {
    id: string
    username: string
    icFirstName?: string
    icLastName?: string
  }
  createdAt: string
}

// Verfügbare Farben für Gebiete
const AREA_COLORS = [
  { value: '#f59e0b', label: 'Gold' },
  { value: '#ef4444', label: 'Rot' },
  { value: '#22c55e', label: 'Grün' },
  { value: '#3b82f6', label: 'Blau' },
  { value: '#8b5cf6', label: 'Violett' },
  { value: '#ec4899', label: 'Pink' },
  { value: '#06b6d4', label: 'Cyan' },
  { value: '#f97316', label: 'Orange' },
]

// Map Configuration
const MAP_CONFIG: Record<MapName, { name: string; width: number; height: number; file: string }> = {
  NARCO_CITY: { name: 'Narco City', width: 6144, height: 9216, file: 'narco-city' },
  ROXWOOD: { name: 'Roxwood', width: 3415, height: 2362, file: 'roxwood' },
  CAYO_PERICO: { name: 'Cayo Perico', width: 1819, height: 1773, file: 'cayo-perico' },
}

// Available Icons
const ICON_OPTIONS = [
  { value: 'home', label: 'Haus', icon: Home },
  { value: 'building', label: 'Gebäude', icon: Building2 },
  { value: 'warehouse', label: 'Lager', icon: Warehouse },
  { value: 'skull', label: 'Gefahr', icon: Skull },
  { value: 'warning', label: 'Warnung', icon: AlertTriangle },
  { value: 'users', label: 'Gruppe', icon: Users },
  { value: 'crown', label: 'Führung', icon: Crown },
  { value: 'pin', label: 'Markierung', icon: MapPin },
]

// Status Config
const statusConfig: Record<FamilyContactStatus, { label: string; color: string; icon: typeof CheckCircle }> = {
  UNKNOWN: { label: 'Unbekannt', color: '#9ca3af', icon: HelpCircle },
  ACTIVE: { label: 'Aktiv', color: '#22c55e', icon: CheckCircle },
  ENDANGERED: { label: 'Gefährdet', color: '#eab308', icon: AlertCircle },
  DISSOLVED: { label: 'Aufgelöst', color: '#ef4444', icon: XCircle },
}

// Create custom marker icon with optional secondary badges (supports both key and outdated)
const createMarkerIcon = (iconName: string, status?: FamilyContactStatus, isKeyFamily?: boolean, isOutdated?: boolean) => {
  const statusColor = status ? statusConfig[status].color : '#f59e0b'
  
  // Build badges - can have both Key and Clock
  const badges: string[] = []
  let badgeCount = 0
  
  if (isKeyFamily) {
    // Key icon for Schlüsselfamilie - gold background
    badges.push(`
      <g transform="translate(${14 + badgeCount * 16}, 0)">
        <circle cx="8" cy="8" r="9" fill="#f59e0b" stroke="#ffffff" stroke-width="2"/>
        <g fill="none" stroke="#1f2937" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(3, 3) scale(0.42)">
          <path d="m21 2-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>
        </g>
      </g>
    `)
    badgeCount++
  }
  
  if (isOutdated) {
    // Clock icon for veraltet - RED background
    badges.push(`
      <g transform="translate(${14 + badgeCount * 16}, 0)">
        <circle cx="8" cy="8" r="9" fill="#ef4444" stroke="#ffffff" stroke-width="2"/>
        <g fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" transform="translate(3, 3) scale(0.42)">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12,6 12,12 16,14"/>
        </g>
      </g>
    `)
    badgeCount++
  }
  
  const hasBadges = badgeCount > 0
  const totalWidth = 24 + (badgeCount * 16) + (hasBadges ? 2 : 0)
  
  const iconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalWidth} 24" width="${hasBadges ? totalWidth - 4 : 20}" height="24" style="overflow: visible;">
      <circle cx="12" cy="12" r="11" fill="${statusColor}" stroke="#1f2937" stroke-width="2"/>
      <g fill="white" transform="translate(5, 5) scale(0.58)">
        ${getIconPath(iconName)}
      </g>
      ${badges.join('')}
    </svg>
  `
  
  return L.divIcon({
    html: iconSvg,
    className: 'custom-marker-icon',
    iconSize: [hasBadges ? totalWidth - 4 : 20, 24],
    iconAnchor: [10, 12],
    popupAnchor: [0, -12],
  })
}

// Get SVG path for icon
const getIconPath = (iconName: string): string => {
  const paths: Record<string, string> = {
    home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    building: '<rect width="16" height="20" x="4" y="2" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>',
    warehouse: '<path d="M22 8.35V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8.35A2 2 0 0 1 3.26 6.5l8-3.2a2 2 0 0 1 1.48 0l8 3.2A2 2 0 0 1 22 8.35Z"/><path d="M6 18h12"/><path d="M6 14h12"/><rect width="12" height="12" x="6" y="10"/>',
    skull: '<circle cx="9" cy="12" r="1"/><circle cx="15" cy="12" r="1"/><path d="M8 20v2h8v-2"/><path d="m12.5 17-.5-1-.5 1h1z"/><path d="M16 20a2 2 0 0 0 1.56-3.25 8 8 0 1 0-11.12 0A2 2 0 0 0 8 20"/>',
    warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    crown: '<path d="M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z"/><path d="M5 21h14"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
  }
  return paths[iconName] || paths.pin
}

// Map click handler component
function MapClickHandler({ 
  onRightClick,
  onLeftClick,
  canEdit,
  mapBounds,
  isDrawingMode,
}: { 
  onRightClick: (x: number, y: number) => void
  onLeftClick?: (x: number, y: number) => void
  canEdit: boolean
  mapBounds: L.LatLngBoundsExpression
  isDrawingMode?: boolean
}) {
  const map = useMap()
  
  useMapEvents({
    click: (e) => {
      if (!isDrawingMode || !onLeftClick) return
      
      const boundsArray = mapBounds as [[number, number], [number, number]]
      const mapHeight = boundsArray[1][0]
      const mapWidth = boundsArray[1][1]
      
      const x = e.latlng.lng / mapWidth
      const y = 1 - (e.latlng.lat / mapHeight)
      
      onLeftClick(Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y)))
    },
    contextmenu: (e) => {
      // Prevent default context menu
      e.originalEvent.preventDefault()
      e.originalEvent.stopPropagation()
      
      // Block right-click only in drawing mode, but allow for all users (they can submit suggestions)
      if (isDrawingMode) return
      
      // Use the known map bounds for calculation (not current view bounds)
      const boundsArray = mapBounds as [[number, number], [number, number]]
      const mapHeight = boundsArray[1][0]
      const mapWidth = boundsArray[1][1]
      
      // Convert click position to normalized coordinates (0-1)
      const x = e.latlng.lng / mapWidth
      const y = 1 - (e.latlng.lat / mapHeight)
      
      onRightClick(Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y)))
    },
  })
  
  return null
}

// Fit bounds component - only runs once on mount
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap()
  const hasInitialized = useRef(false)
  
  useEffect(() => {
    if (!hasInitialized.current) {
      map.fitBounds(bounds)
      hasInitialized.current = true
    }
  }, [map, bounds])
  
  return null
}

// Component to capture map ref
function MapRefSetter({ mapRef }: { mapRef: React.MutableRefObject<L.Map | null> }) {
  const map = useMap()
  
  useEffect(() => {
    mapRef.current = map
  }, [map, mapRef])
  
  return null
}

export default function KartePage() {
  const { user } = useAuthStore()
  usePageTitle('Interaktive Karte')
  const queryClient = useQueryClient()
  
  const [activeMap, setActiveMap] = useState<MapName>('NARCO_CITY')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [selectedAnnotation, setSelectedAnnotation] = useState<MapAnnotation | null>(null)
  const [newMarkerPosition, setNewMarkerPosition] = useState<{ x: number; y: number } | null>(null)
  
  // Area (Gebiet) state
  const [isDrawingMode, setIsDrawingMode] = useState(false)
  const [drawingPoints, setDrawingPoints] = useState<{ x: number; y: number }[]>([])
  const [isAreaDialogOpen, setIsAreaDialogOpen] = useState(false)
  const [isEditAreaDialogOpen, setIsEditAreaDialogOpen] = useState(false)
  const [isDeleteAreaDialogOpen, setIsDeleteAreaDialogOpen] = useState(false)
  const [selectedArea, setSelectedArea] = useState<MapArea | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    icon: 'home',
    label: '',
    familyContactId: '',
  })
  
  // Area form state
  const [areaFormData, setAreaFormData] = useState({
    label: '',
    color: '#f59e0b',
  })

  // Suggestion state
  const [isSuggestionsPanelOpen, setIsSuggestionsPanelOpen] = useState(false)
  const [rejectNote, setRejectNote] = useState('')
  const [rejectingSuggestionId, setRejectingSuggestionId] = useState<string | null>(null)
  const [previewSuggestion, setPreviewSuggestion] = useState<MapSuggestion | null>(null)
  const mapRef = useRef<L.Map | null>(null)
  
  // Permission check
  const isLeadership = hasRole(user, ['EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA'])
  const isContacto = hasRole(user, ['CONTACTO'])
  const isInteligencia = hasRole(user, ['INTELIGENCIA'])
  const canManage = isLeadership || isContacto || isInteligencia
  
  // Users who can view family contact details (Leadership, Contacto, or with ListPermission)
  const { data: listPermissions = [] } = useQuery({
    queryKey: ['list-permissions-check'],
    queryFn: () => api.get('/family-contacts/permissions/list').then(res => res.data),
  })
  const hasListPermission = listPermissions.some((p: any) => p.userId === user?.id)
  const canViewContactDetails = isLeadership || isContacto || hasListPermission
  
  // Fetch annotations for current map
  const { data: annotations = [], isLoading } = useQuery({
    queryKey: ['map-annotations', activeMap],
    queryFn: () => api.get(`/map-annotations?map=${activeMap}`).then(res => res.data),
  })
  
  // Fetch available family contacts for dropdown
  const { data: familyContacts = [] } = useQuery({
    queryKey: ['map-annotations-family-contacts'],
    queryFn: () => api.get('/map-annotations/family-contacts').then(res => res.data),
  })
  
  // Fetch areas for current map
  const { data: areas = [] } = useQuery({
    queryKey: ['map-areas', activeMap],
    queryFn: () => api.get(`/map-annotations/areas/list?map=${activeMap}`).then(res => res.data),
  })

  // Fetch pending suggestions count
  const { data: pendingSuggestionsCount = 0 } = useQuery({
    queryKey: ['map-suggestions-count'],
    queryFn: () => api.get('/map-annotations/suggestions/pending-count').then(res => res.data),
    enabled: canManage,
  })

  // Fetch suggestions for current map
  const { data: suggestions = [], isLoading: suggestionsLoading } = useQuery<MapSuggestion[]>({
    queryKey: ['map-suggestions', activeMap],
    queryFn: () => api.get(`/map-annotations/suggestions?map=${activeMap}`).then(res => res.data),
    enabled: canManage && isSuggestionsPanelOpen,
  })
  
  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: { mapName: MapName; x: number; y: number; icon: string; label?: string; familyContactId?: string }) =>
      api.post('/map-annotations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-annotations'] })
      setIsCreateDialogOpen(false)
      setNewMarkerPosition(null)
      resetForm()
      toast.success('Markierung erstellt')
    },
    onError: () => {
      toast.error('Fehler beim Erstellen der Markierung')
    },
  })
  
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { icon?: string; label?: string; familyContactId?: string | null } }) =>
      api.put(`/map-annotations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-annotations'] })
      setIsEditDialogOpen(false)
      setSelectedAnnotation(null)
      resetForm()
      toast.success('Markierung aktualisiert')
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren')
    },
  })
  
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/map-annotations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-annotations'] })
      setIsDeleteDialogOpen(false)
      setSelectedAnnotation(null)
      toast.success('Markierung gelöscht')
    },
    onError: () => {
      toast.error('Fehler beim Löschen')
    },
  })
  
  const resetForm = () => {
    setFormData({ icon: 'home', label: '', familyContactId: '' })
  }
  
  const resetAreaForm = () => {
    setAreaFormData({ label: '', color: '#f59e0b' })
    setDrawingPoints([])
  }
  
  // Area Mutations
  const createAreaMutation = useMutation({
    mutationFn: (data: { mapName: MapName; points: { x: number; y: number }[]; label: string; color: string }) =>
      api.post('/map-annotations/areas', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-areas'] })
      setIsAreaDialogOpen(false)
      setIsDrawingMode(false)
      resetAreaForm()
      toast.success('Gebiet erstellt')
    },
    onError: () => {
      toast.error('Fehler beim Erstellen des Gebiets')
    },
  })
  
  const updateAreaMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { label?: string; color?: string } }) =>
      api.put(`/map-annotations/areas/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-areas'] })
      setIsEditAreaDialogOpen(false)
      setSelectedArea(null)
      toast.success('Gebiet aktualisiert')
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren')
    },
  })
  
  const deleteAreaMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/map-annotations/areas/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-areas'] })
      setIsDeleteAreaDialogOpen(false)
      setSelectedArea(null)
      toast.success('Gebiet gelöscht')
    },
    onError: () => {
      toast.error('Fehler beim Löschen')
    },
  })

  // Suggestion Mutations
  const createSuggestionMutation = useMutation({
    mutationFn: (data: { mapName: MapName; x: number; y: number; icon: string; label?: string; familyContactId?: string }) =>
      api.post('/map-annotations/suggestions', data),
    onSuccess: () => {
      setIsCreateDialogOpen(false)
      setNewMarkerPosition(null)
      resetForm()
      toast.success('Vorschlag eingereicht! Er wird von einem Berechtigten überprüft.')
    },
    onError: () => {
      toast.error('Fehler beim Einreichen des Vorschlags')
    },
  })

  const approveSuggestionMutation = useMutation({
    mutationFn: (id: string) => api.post(`/map-annotations/suggestions/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-annotations'] })
      queryClient.invalidateQueries({ queryKey: ['map-suggestions'] })
      queryClient.invalidateQueries({ queryKey: ['map-suggestions-count'] })
      setPreviewSuggestion(null)
      toast.success('Vorschlag genehmigt und Markierung erstellt')
    },
    onError: () => {
      toast.error('Fehler beim Genehmigen')
    },
  })

  const rejectSuggestionMutation = useMutation({
    mutationFn: ({ id, reviewNote }: { id: string; reviewNote?: string }) => 
      api.post(`/map-annotations/suggestions/${id}/reject`, { reviewNote }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['map-suggestions'] })
      queryClient.invalidateQueries({ queryKey: ['map-suggestions-count'] })
      setRejectingSuggestionId(null)
      setRejectNote('')
      setPreviewSuggestion(null)
      toast.success('Vorschlag abgelehnt')
    },
    onError: () => {
      toast.error('Fehler beim Ablehnen')
    },
  })
  
  // Handle drawing mode
  const handleStartDrawing = () => {
    setIsDrawingMode(true)
    setDrawingPoints([])
  }
  
  const handleAddPoint = (x: number, y: number) => {
    setDrawingPoints(prev => [...prev, { x, y }])
  }
  
  const handleUndoPoint = () => {
    setDrawingPoints(prev => prev.slice(0, -1))
  }
  
  const handleFinishDrawing = () => {
    if (drawingPoints.length >= 3) {
      setIsAreaDialogOpen(true)
    } else {
      toast.error('Ein Gebiet benötigt mindestens 3 Punkte')
    }
  }
  
  const handleCancelDrawing = () => {
    setIsDrawingMode(false)
    resetAreaForm()
  }
  
  const handleCreateArea = () => {
    if (drawingPoints.length < 3) return
    
    createAreaMutation.mutate({
      mapName: activeMap,
      points: drawingPoints,
      label: areaFormData.label,
      color: areaFormData.color,
    })
  }
  
  // Handle right-click to create new marker
  const handleMapRightClick = (x: number, y: number) => {
    setNewMarkerPosition({ x, y })
    resetForm()
    setIsCreateDialogOpen(true)
  }
  
  // Handle marker click for edit
  const handleMarkerClick = (annotation: MapAnnotation) => {
    if (!canManage) return
    setSelectedAnnotation(annotation)
    setFormData({
      icon: annotation.icon,
      label: annotation.label || '',
      familyContactId: annotation.familyContactId || '',
    })
  }
  
  // Handle create submit - creates annotation if user can manage, otherwise creates suggestion
  const handleCreate = () => {
    if (!newMarkerPosition) return
    
    const data = {
      mapName: activeMap,
      x: newMarkerPosition.x,
      y: newMarkerPosition.y,
      icon: formData.icon,
      label: formData.label || undefined,
      familyContactId: formData.familyContactId || undefined,
    }

    if (canManage) {
      createMutation.mutate(data)
    } else {
      createSuggestionMutation.mutate(data)
    }
  }
  
  // Handle update submit
  const handleUpdate = () => {
    if (!selectedAnnotation) return
    
    updateMutation.mutate({
      id: selectedAnnotation.id,
      data: {
        icon: formData.icon,
        label: formData.label || undefined,
        familyContactId: formData.familyContactId || null,
      },
    })
  }
  
  // Calculate map bounds
  const mapConfig = MAP_CONFIG[activeMap]
  const aspectRatio = mapConfig.width / mapConfig.height
  const mapHeight = 1000 // Arbitrary units for Leaflet
  const mapWidth = mapHeight * aspectRatio
  const bounds: L.LatLngBoundsExpression = [[0, 0], [mapHeight, mapWidth]]
  
  // Convert normalized coordinates to map coordinates
  const toMapCoords = (x: number, y: number): [number, number] => {
    return [mapHeight - (y * mapHeight), x * mapWidth]
  }

  // Preview a suggestion by focusing on its location
  const handlePreviewSuggestion = (suggestion: MapSuggestion) => {
    setPreviewSuggestion(suggestion)
    
    // Focus the map on the suggestion location
    if (mapRef.current) {
      const coords = toMapCoords(suggestion.x, suggestion.y)
      mapRef.current.setView(coords, 2, { animate: true })
    }
  }

  // Clear preview when closing panel
  const handleCloseSuggestionsPanel = () => {
    setIsSuggestionsPanelOpen(false)
    setPreviewSuggestion(null)
    setRejectingSuggestionId(null)
    setRejectNote('')
  }
  
  return (
    <div className="min-h-screen bg-gray-900 p-4 md:p-6">
      {/* Background Glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-600/5 rounded-full blur-3xl" />
      </div>
      
      <div className="relative max-w-[1800px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/20">
              <MapIcon className="h-7 w-7 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white">Interaktive Karte</h1>
              <p className="text-gray-400 text-sm">Territorien und Familien-Standorte</p>
            </div>
          </div>
          
          {/* Map Tabs */}
          <div className="flex gap-2 bg-gray-800/50 p-1 rounded-lg border border-gray-700">
            {(Object.entries(MAP_CONFIG) as [MapName, typeof MAP_CONFIG[MapName]][]).map(([key, config]) => (
              <button
                key={key}
                onClick={() => setActiveMap(key)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  activeMap === key
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                }`}
              >
                {config.name}
              </button>
            ))}
          </div>
        </div>
        
        {/* Instructions & Drawing Tools */}
        <div className="mb-4 flex flex-wrap gap-3">
          {canManage && isDrawingMode ? (
            <>
              <div className="flex-1 p-3 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-300 text-sm flex items-center gap-2">
                <Hexagon className="h-4 w-4" />
                <span>
                  Klicke auf die Karte um Punkte zu setzen ({drawingPoints.length} Punkte)
                  {drawingPoints.length >= 3 && ' - Bereit zum Abschließen'}
                </span>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleUndoPoint}
                  disabled={drawingPoints.length === 0}
                  variant="outline"
                  className="border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Rückgängig
                </Button>
                <Button
                  onClick={handleFinishDrawing}
                  disabled={drawingPoints.length < 3}
                  className="bg-green-500/20 border border-green-500/30 text-green-300 hover:bg-green-500/30"
                >
                  <Check className="h-4 w-4 mr-1" />
                  Fertig
                </Button>
                <Button
                  onClick={handleCancelDrawing}
                  variant="outline"
                  className="border-red-500/30 text-red-400 hover:bg-red-500/20"
                >
                  <X className="h-4 w-4 mr-1" />
                  Abbrechen
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="flex-1 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm flex items-center gap-2">
                <Plus className="h-4 w-4" />
                <span>
                  {canManage 
                    ? 'Rechtsklick auf die Karte, um eine neue Markierung zu setzen'
                    : 'Rechtsklick auf die Karte, um einen Vorschlag einzureichen'}
                </span>
              </div>
              {canManage && (
                <>
                  <Button
                    onClick={handleStartDrawing}
                    className="bg-violet-500/20 border border-violet-500/30 text-violet-300 hover:bg-violet-500/30"
                  >
                    <Hexagon className="h-4 w-4 mr-2" />
                    Gebiet zeichnen
                  </Button>
                  <Button
                    onClick={() => setIsSuggestionsPanelOpen(!isSuggestionsPanelOpen)}
                    className="bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30 relative"
                  >
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Vorschläge
                    {pendingSuggestionsCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 bg-red-500 text-white text-xs px-1.5 py-0.5 min-w-[20px] h-5">
                        {pendingSuggestionsCount}
                      </Badge>
                    )}
                  </Button>
                </>
              )}
            </>
          )}
        </div>
        
        {/* Suggestions Panel */}
        {isSuggestionsPanelOpen && canManage && (
          <div className="mb-4 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-cyan-300 flex items-center gap-2">
                <Lightbulb className="h-5 w-5" />
                Offene Vorschläge ({suggestions.filter((s: MapSuggestion) => s.status === 'PENDING').length})
              </h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCloseSuggestionsPanel}
                className="text-cyan-400 hover:text-cyan-300"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            {suggestionsLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
              </div>
            ) : suggestions.filter((s: MapSuggestion) => s.status === 'PENDING').length === 0 ? (
              <p className="text-cyan-400/70 text-center py-4">Keine offenen Vorschläge</p>
            ) : (
              <div className="space-y-3 max-h-[300px] overflow-y-auto">
                {suggestions.filter((s: MapSuggestion) => s.status === 'PENDING').map((suggestion: MapSuggestion) => (
                  <div 
                    key={suggestion.id} 
                    className={`p-3 rounded-lg border transition-all ${
                      previewSuggestion?.id === suggestion.id 
                        ? 'bg-cyan-500/20 border-cyan-500' 
                        : 'bg-gray-800/50 border-gray-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div 
                        className="flex-1 cursor-pointer hover:opacity-80"
                        onClick={() => handlePreviewSuggestion(suggestion)}
                        title="Klicken um Position auf Karte anzuzeigen"
                      >
                        <p className="text-white font-medium">
                          {ICON_OPTIONS.find(i => i.value === suggestion.icon)?.label || suggestion.icon}
                          {suggestion.label && `: ${suggestion.label}`}
                        </p>
                        {suggestion.familyContact && (
                          <p className="text-amber-400 text-sm">→ {suggestion.familyContact.familyName}</p>
                        )}
                        <p className="text-gray-500 text-xs mt-1">
                          von {suggestion.createdBy.icFirstName || suggestion.createdBy.username}
                          {' • '}
                          {new Date(suggestion.createdAt).toLocaleDateString('de-DE')}
                        </p>
                        <p className="text-cyan-400/60 text-xs mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          Klicken für Vorschau
                        </p>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handlePreviewSuggestion(suggestion)}
                          className={`${previewSuggestion?.id === suggestion.id ? 'bg-cyan-500 text-white' : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'}`}
                          title="Position anzeigen"
                        >
                          <MapPin className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => approveSuggestionMutation.mutate(suggestion.id)}
                          disabled={approveSuggestionMutation.isPending}
                          className="bg-green-500/20 text-green-400 hover:bg-green-500/30"
                          title="Genehmigen"
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        {rejectingSuggestionId === suggestion.id ? (
                          <div className="flex gap-1">
                            <Input
                              placeholder="Grund"
                              value={rejectNote}
                              onChange={(e) => setRejectNote(e.target.value)}
                              className="h-8 w-24 bg-gray-700 border-gray-600 text-sm"
                            />
                            <Button
                              size="sm"
                              onClick={() => rejectSuggestionMutation.mutate({ id: suggestion.id, reviewNote: rejectNote || undefined })}
                              disabled={rejectSuggestionMutation.isPending}
                              className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setRejectingSuggestionId(null); setRejectNote(''); }}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => setRejectingSuggestionId(suggestion.id)}
                            className="bg-red-500/20 text-red-400 hover:bg-red-500/30"
                            title="Ablehnen"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Map Container */}
        <div className="rounded-xl overflow-hidden border border-gray-700 bg-gray-800/50 shadow-2xl" style={{ height: 'calc(100vh - 240px)' }}>
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-400" />
            </div>
          ) : (
            <MapContainer
              key={activeMap} // Force remount on map change
              center={[mapHeight / 2, mapWidth / 2]}
              zoom={0}
              minZoom={-2}
              maxZoom={4}
              crs={L.CRS.Simple}
              style={{ height: '100%', width: '100%', background: '#1f2937' }}
              attributionControl={false}
              // Smooth scrolling & zooming
              zoomSnap={0.25}
              zoomDelta={0.5}
              wheelPxPerZoomLevel={120}
              inertia={true}
              inertiaDeceleration={3000}
              easeLinearity={0.25}
            >
              <FitBounds bounds={bounds} />
              <MapRefSetter mapRef={mapRef} />
              
              {/* Map Image - Using tile URL pattern */}
              <ImageOverlay
                url={`/map-tiles/${mapConfig.file}/metadata.json`}
                bounds={bounds}
                opacity={0}
              />
              
              {/* Fallback: Full image if tiles not available */}
              <ImageOverlay
                url={`/map-tiles/${mapConfig.file}/full.png`}
                bounds={bounds}
                errorOverlayUrl={`/map-sources/${mapConfig.file}.png`}
              />
              
              {/* Click Handler */}
              <MapClickHandler 
                onRightClick={handleMapRightClick} 
                onLeftClick={handleAddPoint}
                canEdit={canManage} 
                mapBounds={bounds}
                isDrawingMode={isDrawingMode}
              />
              
              {/* Areas (Gebiete) */}
              {areas.map((area: MapArea) => (
                <Polygon
                  key={area.id}
                  positions={area.points.map((p: { x: number; y: number }) => toMapCoords(p.x, p.y))}
                  pathOptions={{
                    color: area.color,
                    fillColor: area.color,
                    fillOpacity: 0.2,
                    weight: 2,
                  }}
                  eventHandlers={{
                    click: () => {
                      if (canManage && !isDrawingMode) {
                        setSelectedArea(area)
                        setAreaFormData({ label: area.label, color: area.color })
                        setIsEditAreaDialogOpen(true)
                      }
                    },
                  }}
                >
                  <Tooltip direction="center" permanent className="area-label">
                    <span style={{ color: area.color, fontWeight: 'bold' }}>{area.label}</span>
                  </Tooltip>
                </Polygon>
              ))}
              
              {/* Current Drawing Polygon */}
              {isDrawingMode && drawingPoints.length > 0 && (
                <>
                  <Polygon
                    positions={drawingPoints.map(p => toMapCoords(p.x, p.y))}
                    pathOptions={{
                      color: areaFormData.color,
                      fillColor: areaFormData.color,
                      fillOpacity: 0.3,
                      weight: 2,
                      dashArray: '5, 10',
                    }}
                  />
                  {/* Draw points as small circles */}
                  {drawingPoints.map((point, index) => (
                    <Marker
                      key={`drawing-point-${index}`}
                      position={toMapCoords(point.x, point.y)}
                      icon={L.divIcon({
                        html: `<div style="width: 10px; height: 10px; background: ${areaFormData.color}; border: 2px solid white; border-radius: 50%;"></div>`,
                        className: 'drawing-point',
                        iconSize: [10, 10],
                        iconAnchor: [5, 5],
                      })}
                    />
                  ))}
                </>
              )}
              
              {/* Ghost Marker for Preview Suggestion */}
              {previewSuggestion && (
                <Marker
                  position={toMapCoords(previewSuggestion.x, previewSuggestion.y)}
                  icon={L.divIcon({
                    html: `
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40" style="overflow: visible; filter: drop-shadow(0 0 8px #22d3ee);">
                        <circle cx="16" cy="16" r="14" fill="#22d3ee" fill-opacity="0.4" stroke="#22d3ee" stroke-width="3" stroke-dasharray="4 2">
                          <animate attributeName="stroke-dashoffset" values="0;12" dur="1s" repeatCount="indefinite"/>
                        </circle>
                        <circle cx="16" cy="16" r="6" fill="#22d3ee"/>
                        <path d="M16 30 L16 38" stroke="#22d3ee" stroke-width="2"/>
                        <circle cx="16" cy="40" r="2" fill="#22d3ee"/>
                      </svg>
                    `,
                    className: 'preview-marker-icon',
                    iconSize: [32, 40],
                    iconAnchor: [16, 40],
                  })}
                >
                  <Tooltip direction="top" offset={[0, -40]} opacity={1} permanent>
                    <div className="text-sm font-bold text-cyan-500">
                      📍 Vorschlag: {ICON_OPTIONS.find(i => i.value === previewSuggestion.icon)?.label || previewSuggestion.icon}
                      {previewSuggestion.label && ` - ${previewSuggestion.label}`}
                    </div>
                  </Tooltip>
                </Marker>
              )}

              {/* Markers */}
              {annotations.map((annotation: MapAnnotation) => (
                <Marker
                  key={annotation.id}
                  position={toMapCoords(annotation.x, annotation.y)}
                  icon={createMarkerIcon(
                    annotation.icon, 
                    annotation.familyContact?.status,
                    annotation.familyContact?.isKeyFamily,
                    annotation.familyContact?.isOutdated
                  )}
                  eventHandlers={{
                    click: () => handleMarkerClick(annotation),
                  }}
                >
                  {/* Hover Tooltip */}
                  <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
                    <div className="text-sm">
                      <div className="font-bold text-amber-500">
                        {annotation.familyContact?.familyName || annotation.label || 'Unbenannt'}
                      </div>
                      {annotation.familyContact && (
                        <div className="text-xs text-gray-400">
                          {statusConfig[annotation.familyContact.status].label}
                        </div>
                      )}
                      {annotation.createdBy && (
                        <div className="text-xs text-gray-500 mt-1">
                          von {annotation.createdBy.icFirstName || annotation.createdBy.username}
                        </div>
                      )}
                    </div>
                  </Tooltip>
                  
                  {/* Click Popup */}
                  <Popup>
                    <div className="min-w-[200px] p-2">
                      {annotation.familyContact ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-bold text-lg">{annotation.familyContact.familyName}</span>
                            <div className="flex items-center gap-1">
                              {annotation.familyContact.isKeyFamily && (
                                <span 
                                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                                  style={{ backgroundColor: '#f59e0b20', color: '#f59e0b' }}
                                  title="Schlüsselfamilie"
                                >
                                  🔑
                                </span>
                              )}
                              {annotation.familyContact.isOutdated && (
                                <span 
                                  className="px-2 py-0.5 rounded-full text-xs font-medium"
                                  style={{ backgroundColor: '#ef444420', color: '#ef4444' }}
                                  title="Information veraltet"
                                >
                                  ⏰
                                </span>
                              )}
                              <span 
                                className="px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ 
                                  backgroundColor: `${statusConfig[annotation.familyContact.status].color}20`,
                                  color: statusConfig[annotation.familyContact.status].color
                                }}
                              >
                                {statusConfig[annotation.familyContact.status].label}
                              </span>
                            </div>
                          </div>
                          
                          {annotation.familyContact.propertyZip && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <MapPin className="h-3 w-3" />
                              PLZ: {annotation.familyContact.propertyZip}
                            </div>
                          )}
                          
                          {/* Contact details only for authorized users */}
                          {canViewContactDetails ? (
                            <>
                              {(annotation.familyContact.contact1FirstName || annotation.familyContact.contact1Phone) && (
                                <div className="border-t pt-2 mt-2">
                                  <div className="text-xs text-gray-500 mb-1">Ansprechpartner 1:</div>
                                  <div className="text-sm">
                                    {annotation.familyContact.contact1FirstName} {annotation.familyContact.contact1LastName}
                                  </div>
                                  {annotation.familyContact.contact1Phone && (
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                      <Phone className="h-3 w-3" />
                                      {annotation.familyContact.contact1Phone}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {(annotation.familyContact.contact2FirstName || annotation.familyContact.contact2Phone) && (
                                <div className="border-t pt-2">
                                  <div className="text-xs text-gray-500 mb-1">Ansprechpartner 2:</div>
                                  <div className="text-sm">
                                    {annotation.familyContact.contact2FirstName} {annotation.familyContact.contact2LastName}
                                  </div>
                                  {annotation.familyContact.contact2Phone && (
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                      <Phone className="h-3 w-3" />
                                      {annotation.familyContact.contact2Phone}
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {annotation.familyContact.leadershipInfo && (
                                <div className="border-t pt-2">
                                  <div className="text-xs text-gray-500 mb-1">Führung:</div>
                                  <div className="text-sm flex items-center gap-1">
                                    <Crown className="h-3 w-3 text-amber-500" />
                                    {annotation.familyContact.leadershipInfo}
                                  </div>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="border-t pt-2 mt-2 text-xs text-gray-500 italic">
                              Kontaktdetails nur für Berechtigte sichtbar
                            </div>
                          )}
                        </div>
                      ) : (
                        <div>
                          <div className="font-bold">{annotation.label || 'Unbenannte Markierung'}</div>
                          <div className="text-xs text-gray-500 mt-1">
                            Erstellt von {annotation.createdBy?.icFirstName || annotation.createdBy?.username}
                          </div>
                        </div>
                      )}
                      
                      {canManage && (
                        <div className="flex gap-2 mt-3 pt-3 border-t">
                          <button
                            onClick={() => {
                              setSelectedAnnotation(annotation)
                              setFormData({
                                icon: annotation.icon,
                                label: annotation.label || '',
                                familyContactId: annotation.familyContactId || '',
                              })
                              setIsEditDialogOpen(true)
                            }}
                            className="flex-1 px-2 py-1 text-xs bg-amber-500/20 text-amber-500 rounded hover:bg-amber-500/30 flex items-center justify-center gap-1"
                          >
                            <Pencil className="h-3 w-3" />
                            Bearbeiten
                          </button>
                          <button
                            onClick={() => {
                              setSelectedAnnotation(annotation)
                              setIsDeleteDialogOpen(true)
                            }}
                            className="flex-1 px-2 py-1 text-xs bg-red-500/20 text-red-500 rounded hover:bg-red-500/30 flex items-center justify-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            Löschen
                          </button>
                        </div>
                      )}
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 justify-center text-sm text-gray-400">
          <span className="font-medium text-gray-300">Status:</span>
          {(Object.entries(statusConfig) as [FamilyContactStatus, typeof statusConfig[FamilyContactStatus]][]).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: config.color }} />
              <span>{config.label}</span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Create Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              {canManage ? <Plus className="h-5 w-5" /> : <Lightbulb className="h-5 w-5" />}
              {canManage ? 'Neue Markierung' : 'Vorschlag einreichen'}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {canManage 
                ? `Position: X: ${newMarkerPosition?.x.toFixed(3)}, Y: ${newMarkerPosition?.y.toFixed(3)}`
                : 'Dein Vorschlag wird von einem Berechtigten überprüft.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Icon Selection */}
            <div>
              <Label className="text-gray-300">Icon</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {ICON_OPTIONS.map(option => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.value}
                      onClick={() => setFormData({ ...formData, icon: option.value })}
                      className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${
                        formData.icon === option.value
                          ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                          : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs">{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            
            {/* Label */}
            <div>
              <Label className="text-gray-300">Beschriftung (optional)</Label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="z.B. Hauptquartier"
                className="mt-1 bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            {/* Family Contact Link */}
            <div>
              <Label className="text-gray-300">Mit Familie verknüpfen (optional)</Label>
              <select
                value={formData.familyContactId}
                onChange={(e) => setFormData({ ...formData, familyContactId: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Keine Verknüpfung</option>
                {familyContacts.map((contact: FamilyContact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.familyName} ({statusConfig[contact.status].label})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false)
                setNewMarkerPosition(null)
                resetForm()
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || createSuggestionMutation.isPending}
              className={canManage ? "bg-amber-500 hover:bg-amber-600 text-black" : "bg-cyan-500 hover:bg-cyan-600 text-black"}
            >
              {(createMutation.isPending || createSuggestionMutation.isPending) 
                ? (canManage ? 'Erstelle...' : 'Sende...') 
                : (canManage ? 'Erstellen' : 'Vorschlag senden')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <Pencil className="h-5 w-5" />
              Markierung bearbeiten
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Icon Selection */}
            <div>
              <Label className="text-gray-300">Icon</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {ICON_OPTIONS.map(option => {
                  const Icon = option.icon
                  return (
                    <button
                      key={option.value}
                      onClick={() => setFormData({ ...formData, icon: option.value })}
                      className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${
                        formData.icon === option.value
                          ? 'border-amber-500 bg-amber-500/20 text-amber-400'
                          : 'border-gray-600 bg-gray-700/50 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-xs">{option.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>
            
            {/* Label */}
            <div>
              <Label className="text-gray-300">Beschriftung</Label>
              <Input
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                placeholder="z.B. Hauptquartier"
                className="mt-1 bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            {/* Family Contact Link */}
            <div>
              <Label className="text-gray-300">Mit Familie verknüpfen</Label>
              <select
                value={formData.familyContactId}
                onChange={(e) => setFormData({ ...formData, familyContactId: e.target.value })}
                className="mt-1 w-full px-3 py-2 rounded-md bg-gray-700 border border-gray-600 text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
              >
                <option value="">Keine Verknüpfung</option>
                {familyContacts.map((contact: FamilyContact) => (
                  <option key={contact.id} value={contact.id}>
                    {contact.familyName} ({statusConfig[contact.status].label})
                  </option>
                ))}
              </select>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false)
                setSelectedAnnotation(null)
                resetForm()
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={updateMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {updateMutation.isPending ? 'Speichere...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="h-5 w-5" />
              Markierung löschen
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Bist du sicher, dass du diese Markierung löschen möchtest?
              {selectedAnnotation?.familyContact && (
                <span className="block mt-2 text-amber-400">
                  Verknüpft mit: {selectedAnnotation.familyContact.familyName}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteDialogOpen(false)
                setSelectedAnnotation(null)
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Abbrechen
            </Button>
            <Button
              onClick={() => selectedAnnotation && deleteMutation.mutate(selectedAnnotation.id)}
              disabled={deleteMutation.isPending}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleteMutation.isPending ? 'Lösche...' : 'Löschen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Create Area Dialog */}
      <Dialog open={isAreaDialogOpen} onOpenChange={setIsAreaDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-violet-400">
              <Hexagon className="h-5 w-5" />
              Neues Gebiet
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              {drawingPoints.length} Punkte gezeichnet
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Label */}
            <div>
              <Label className="text-gray-300">Gebietsname *</Label>
              <Input
                value={areaFormData.label}
                onChange={(e) => setAreaFormData({ ...areaFormData, label: e.target.value })}
                placeholder="z.B. Territorium Nord"
                className="mt-1 bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            {/* Color Selection */}
            <div>
              <Label className="text-gray-300">Farbe</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {AREA_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setAreaFormData({ ...areaFormData, color: color.value })}
                    className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${
                      areaFormData.color === color.value
                        ? 'border-white bg-white/10'
                        : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                    }`}
                  >
                    <div 
                      className="w-6 h-6 rounded-full" 
                      style={{ backgroundColor: color.value }}
                    />
                    <span className="text-xs text-gray-300">{color.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsAreaDialogOpen(false)
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Abbrechen
            </Button>
            <Button
              onClick={handleCreateArea}
              disabled={createAreaMutation.isPending || !areaFormData.label}
              className="bg-violet-500 hover:bg-violet-600 text-white"
            >
              {createAreaMutation.isPending ? 'Erstelle...' : 'Erstellen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Edit Area Dialog */}
      <Dialog open={isEditAreaDialogOpen} onOpenChange={setIsEditAreaDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-violet-400">
              <Pencil className="h-5 w-5" />
              Gebiet bearbeiten
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Label */}
            <div>
              <Label className="text-gray-300">Gebietsname</Label>
              <Input
                value={areaFormData.label}
                onChange={(e) => setAreaFormData({ ...areaFormData, label: e.target.value })}
                placeholder="z.B. Territorium Nord"
                className="mt-1 bg-gray-700 border-gray-600 text-white"
              />
            </div>
            
            {/* Color Selection */}
            <div>
              <Label className="text-gray-300">Farbe</Label>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {AREA_COLORS.map(color => (
                  <button
                    key={color.value}
                    onClick={() => setAreaFormData({ ...areaFormData, color: color.value })}
                    className={`p-3 rounded-lg border transition-all flex flex-col items-center gap-1 ${
                      areaFormData.color === color.value
                        ? 'border-white bg-white/10'
                        : 'border-gray-600 bg-gray-700/50 hover:border-gray-500'
                    }`}
                  >
                    <div 
                      className="w-6 h-6 rounded-full" 
                      style={{ backgroundColor: color.value }}
                    />
                    <span className="text-xs text-gray-300">{color.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsEditAreaDialogOpen(false)
                setIsDeleteAreaDialogOpen(true)
              }}
              className="border-red-500/30 text-red-400 hover:bg-red-500/20 mr-auto"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Löschen
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditAreaDialogOpen(false)
                setSelectedArea(null)
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                if (!selectedArea) return
                updateAreaMutation.mutate({
                  id: selectedArea.id,
                  data: {
                    label: areaFormData.label,
                    color: areaFormData.color,
                  },
                })
              }}
              disabled={updateAreaMutation.isPending || !areaFormData.label}
              className="bg-violet-500 hover:bg-violet-600 text-white"
            >
              {updateAreaMutation.isPending ? 'Speichere...' : 'Speichern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Area Confirmation Dialog */}
      <Dialog open={isDeleteAreaDialogOpen} onOpenChange={setIsDeleteAreaDialogOpen}>
        <DialogContent className="bg-gray-800 border-gray-700 text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="h-5 w-5" />
              Gebiet löschen
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Bist du sicher, dass du das Gebiet "{selectedArea?.label}" löschen möchtest?
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setIsDeleteAreaDialogOpen(false)
                setSelectedArea(null)
              }}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              Abbrechen
            </Button>
            <Button
              onClick={() => selectedArea && deleteAreaMutation.mutate(selectedArea.id)}
              disabled={deleteAreaMutation.isPending}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              {deleteAreaMutation.isPending ? 'Lösche...' : 'Löschen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Custom Leaflet Styles */}
      <style>{`
        .custom-marker-icon {
          background: none !important;
          border: none !important;
        }
        .leaflet-popup-content-wrapper {
          background: #1f2937;
          color: white;
          border-radius: 0.75rem;
          border: 1px solid #374151;
        }
        .leaflet-popup-tip {
          background: #1f2937;
          border-color: #374151;
        }
        .leaflet-popup-close-button {
          color: #9ca3af !important;
        }
        .leaflet-popup-close-button:hover {
          color: #f59e0b !important;
        }
        .leaflet-tooltip {
          background: #1f2937;
          color: white;
          border: 1px solid #374151;
          border-radius: 0.5rem;
          padding: 0.5rem 0.75rem;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5);
        }
        .leaflet-tooltip::before {
          border-top-color: #1f2937;
        }
        .leaflet-container {
          font-family: inherit;
        }
        .area-label {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          font-weight: bold;
          text-shadow: 0 0 3px rgba(0,0,0,0.8), 0 0 6px rgba(0,0,0,0.5);
        }
        .area-label::before {
          display: none !important;
        }
        .drawing-point {
          background: none !important;
          border: none !important;
        }
      `}</style>
    </div>
  )
}

