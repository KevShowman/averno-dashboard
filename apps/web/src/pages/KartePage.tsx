import { useState, useEffect, useRef, useMemo } from 'react'
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
} from 'lucide-react'

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

// Create custom marker icon
const createMarkerIcon = (iconName: string, status?: FamilyContactStatus) => {
  const statusColor = status ? statusConfig[status].color : '#f59e0b'
  
  const iconSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="32" height="32">
      <circle cx="12" cy="12" r="11" fill="${statusColor}" stroke="#1f2937" stroke-width="2"/>
      <g fill="white" transform="translate(4, 4) scale(0.67)">
        ${getIconPath(iconName)}
      </g>
    </svg>
  `
  
  return L.divIcon({
    html: iconSvg,
    className: 'custom-marker-icon',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
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
  canEdit 
}: { 
  onRightClick: (x: number, y: number) => void
  canEdit: boolean 
}) {
  const map = useMap()
  
  useMapEvents({
    contextmenu: (e) => {
      if (!canEdit) return
      
      const bounds = map.getBounds()
      const mapSize = map.getSize()
      
      // Convert click position to normalized coordinates (0-1)
      const x = (e.latlng.lng - bounds.getWest()) / (bounds.getEast() - bounds.getWest())
      const y = (bounds.getNorth() - e.latlng.lat) / (bounds.getNorth() - bounds.getSouth())
      
      onRightClick(Math.max(0, Math.min(1, x)), Math.max(0, Math.min(1, y)))
    },
  })
  
  return null
}

// Fit bounds component
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap()
  
  useEffect(() => {
    map.fitBounds(bounds)
  }, [map, bounds])
  
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
  
  // Form state
  const [formData, setFormData] = useState({
    icon: 'home',
    label: '',
    familyContactId: '',
  })
  
  // Permission check
  const canManage = hasRole(user, [
    'EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA',
    'CONTACTO', 'INTELLIGENCIA'
  ])
  
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
    mutationFn: ({ id, data }: { id: string; data: Partial<typeof formData> }) =>
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
  
  // Handle create submit
  const handleCreate = () => {
    if (!newMarkerPosition) return
    
    createMutation.mutate({
      mapName: activeMap,
      x: newMarkerPosition.x,
      y: newMarkerPosition.y,
      icon: formData.icon,
      label: formData.label || undefined,
      familyContactId: formData.familyContactId || undefined,
    })
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
        
        {/* Instructions */}
        {canManage && (
          <div className="mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm flex items-center gap-2">
            <Plus className="h-4 w-4" />
            <span>Rechtsklick auf die Karte, um eine neue Markierung zu setzen</span>
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
              <MapClickHandler onRightClick={handleMapRightClick} canEdit={canManage} />
              
              {/* Markers */}
              {annotations.map((annotation: MapAnnotation) => (
                <Marker
                  key={annotation.id}
                  position={toMapCoords(annotation.x, annotation.y)}
                  icon={createMarkerIcon(annotation.icon, annotation.familyContact?.status)}
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
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-lg">{annotation.familyContact.familyName}</span>
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
                          
                          {annotation.familyContact.propertyZip && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <MapPin className="h-3 w-3" />
                              PLZ: {annotation.familyContact.propertyZip}
                            </div>
                          )}
                          
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
              <Plus className="h-5 w-5" />
              Neue Markierung
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Position: X: {newMarkerPosition?.x.toFixed(3)}, Y: {newMarkerPosition?.y.toFixed(3)}
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
              disabled={createMutation.isPending}
              className="bg-amber-500 hover:bg-amber-600 text-black"
            >
              {createMutation.isPending ? 'Erstelle...' : 'Erstellen'}
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
      `}</style>
    </div>
  )
}

