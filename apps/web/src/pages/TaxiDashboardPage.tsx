import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { usePageTitle } from '../hooks/usePageTitle'
import { toast } from 'sonner'
import {
  Car,
  MapPin,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  Navigation,
  Phone,
  ChevronRight,
  Loader2,
  Key,
  Plus,
  Copy,
  Trash2,
  AlertCircle,
  RefreshCw,
  Crown,
  Map,
  ChevronDown,
  User,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select'
import { Badge } from '../components/ui/badge'
import { Textarea } from '../components/ui/textarea'

// Map imports
import {
  MapContainer,
  ImageOverlay,
  Marker,
  Popup,
  Tooltip,
  useMap,
} from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

interface TaxiAssignment {
  id: string
  status: 'PENDING' | 'ASSIGNED' | 'EN_ROUTE' | 'PICKED_UP' | 'DELIVERED' | 'CANCELLED'
  pickupNotes?: string
  pickupTime?: string
  completedAt?: string
  tafelrunde: {
    id: string
    title: string
    date: string
    location?: string
    meetingPointMapName?: string
    meetingPointX?: number
    meetingPointY?: number
    pickupStartTime?: string
    arrivalDeadline?: string
  }
  familyContact: {
    id: string
    familyName: string
    propertyZip?: string
    contact1FirstName?: string
    contact1LastName?: string
    contact1Phone?: string
    mapAnnotations?: Array<{
      id: string
      mapName: string
      x: number
      y: number
      icon: string
    }>
  }
  driver?: {
    id: string
    username: string
    icFirstName?: string
  }
}

interface Tafelrunde {
  id: string
  title: string
  date: string
  location?: string
  meetingPointMapName?: string
  meetingPointX?: number
  meetingPointY?: number
  pickupStartTime?: string
  arrivalDeadline?: string
  status: string
  families: Array<{
    familyContact: {
      id: string
      familyName: string
      propertyZip?: string
      mapAnnotations?: Array<{
        id: string
        mapName: string
        x: number
        y: number
      }>
    }
  }>
  taxiAssignments: TaxiAssignment[]
  _count?: {
    families: number
    taxiAssignments: number
  }
}

interface TaxiKey {
  id: string
  key: string
  type: 'SINGLE_USE' | 'MULTI_USE' | 'PERMANENT'
  isMasterKey: boolean
  status: 'ACTIVE' | 'USED' | 'REVOKED' | 'EXPIRED'
  usedAt?: string
  expiresAt?: string
  note?: string
  createdBy: {
    id: string
    username: string
    icFirstName?: string
  }
  usedBy?: {
    id: string
    username: string
    icFirstName?: string
  }
  createdAt: string
}

interface Driver {
  id: string
  username: string
  icFirstName?: string
  icLastName?: string
  isTaxiLead: boolean
}

const MAP_CONFIG = {
  NARCO_CITY: { name: 'Narco City', width: 6144, height: 9216, file: 'narco-city' },
  ROXWOOD: { name: 'Roxwood', width: 3415, height: 2362, file: 'roxwood' },
  CAYO_PERICO: { name: 'Cayo Perico', width: 1819, height: 1773, file: 'cayo-perico' },
}

const STATUS_CONFIG = {
  PENDING: { label: 'Ausstehend', color: 'bg-gray-500', textColor: 'text-gray-400' },
  ASSIGNED: { label: 'Zugewiesen', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
  EN_ROUTE: { label: 'Unterwegs', color: 'bg-orange-600', textColor: 'text-orange-400' },
  PICKED_UP: { label: 'Abgeholt', color: 'bg-purple-500', textColor: 'text-purple-400' },
  DELIVERED: { label: 'Abgeliefert', color: 'bg-green-500', textColor: 'text-green-400' },
  CANCELLED: { label: 'Abgesagt', color: 'bg-red-500', textColor: 'text-red-400' },
}

// FitBounds component - only fits on initial mount, not on data updates
function FitBounds({ bounds, mapKey }: { bounds: L.LatLngBoundsExpression; mapKey: string }) {
  const map = useMap()
  const hasFittedRef = useRef<string | null>(null)
  
  useEffect(() => {
    // Only fit bounds when the map changes, not on data refresh
    if (hasFittedRef.current !== mapKey) {
      map.fitBounds(bounds)
      hasFittedRef.current = mapKey
    }
  }, [map, bounds, mapKey])
  
  return null
}

export default function TaxiDashboardPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  usePageTitle('Taxi-Dashboard')

  // Leadership Rollen die vollen Taxi-Zugang haben (MUSS VOR useState sein!)
  const LEADERSHIP_ROLES = ['PATRON', 'DON', 'CAPO']
  const isLeadership = user?.role && LEADERSHIP_ROLES.includes(user.role)
  const isTaxiLead = user?.isTaxiLead || isLeadership
  const isTaxiUser = user?.isTaxi

  // Default-Tab: Für Taxi-User "Meine Fahrten", für Leadership "Tafelrunden"
  const defaultTab = isTaxiUser ? 'assignments' : 'tafelrunden'
  const [activeTab, setActiveTab] = useState<'assignments' | 'tafelrunden' | 'keys'>(defaultTab)
  const [selectedTafelrunde, setSelectedTafelrunde] = useState<string | null>(null)
  const [selectedMapName, setSelectedMapName] = useState<keyof typeof MAP_CONFIG>('NARCO_CITY')
  const [driverSelectedMap, setDriverSelectedMap] = useState<keyof typeof MAP_CONFIG | null>(null)
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false)
  const [isKeyDialogOpen, setIsKeyDialogOpen] = useState(false)
  const [selectedFamily, setSelectedFamily] = useState<any>(null)
  const [editingAssignment, setEditingAssignment] = useState<TaxiAssignment | null>(null)
  const [assignmentData, setAssignmentData] = useState({
    driverId: '',
    pickupNotes: '',
    pickupTime: '',
  })
  const [newKeyData, setNewKeyData] = useState({
    isMasterKey: false,
    type: 'SINGLE_USE' as 'SINGLE_USE' | 'MULTI_USE' | 'PERMANENT',
    note: '',
  })

  // Queries
  const { data: permissions } = useQuery({
    queryKey: ['taxi-permissions'],
    queryFn: () => api.get('/taxi/can-manage').then(res => res.data),
  })

  const { data: myAssignments = [], isLoading: assignmentsLoading } = useQuery<TaxiAssignment[]>({
    queryKey: ['taxi-my-assignments'],
    queryFn: () => api.get('/taxi/my-assignments').then(res => res.data),
    enabled: !!isTaxiUser, // Nur für echte Taxi-Fahrer
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })

  const { data: tafelrunden = [], isLoading: tafelrundenLoading } = useQuery<Tafelrunde[]>({
    queryKey: ['taxi-tafelrunden'],
    queryFn: () => api.get('/taxi/tafelrunden').then(res => res.data),
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })

  const { data: drivers = [], isLoading: driversLoading } = useQuery<Driver[]>({
    queryKey: ['taxi-drivers'],
    queryFn: () => api.get('/taxi/drivers').then(res => res.data),
    enabled: isTaxiLead || isLeadership,
  })

  // Debug logging
  console.log('[TaxiDashboard] Drivers query:', { 
    drivers, 
    driversLoading, 
    enabled: isTaxiLead || isLeadership,
    isTaxiLead,
    isLeadership 
  })

  const { data: keys = [], isLoading: keysLoading } = useQuery<TaxiKey[]>({
    queryKey: ['taxi-keys'],
    queryFn: () => api.get('/taxi/keys').then(res => res.data),
    enabled: permissions?.canCreateKeys,
  })

  const { data: tafelrundeDetails } = useQuery<Tafelrunde>({
    queryKey: ['taxi-tafelrunde', selectedTafelrunde],
    queryFn: () => api.get(`/taxi/tafelrunden/${selectedTafelrunde}`).then(res => res.data),
    enabled: !!selectedTafelrunde,
    refetchInterval: 30000, // Auto-refresh every 30 seconds
  })

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/taxi/assignments/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxi-my-assignments'] })
      queryClient.invalidateQueries({ queryKey: ['taxi-tafelrunde'] })
      toast.success('Status aktualisiert')
    },
    onError: () => toast.error('Fehler beim Aktualisieren'),
  })

  const assignDriverMutation = useMutation({
    mutationFn: (data: any) => api.post('/taxi/assignments', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxi-tafelrunde'] })
      queryClient.invalidateQueries({ queryKey: ['taxi-tafelrunden'] })
      setIsAssignDialogOpen(false)
      setSelectedFamily(null)
      setAssignmentData({ driverId: '', pickupNotes: '', pickupTime: '' })
      toast.success('Zuweisung gespeichert')
    },
    onError: () => toast.error('Fehler beim Zuweisen'),
  })

  const createKeyMutation = useMutation({
    mutationFn: (data: any) => api.post('/taxi/keys', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxi-keys'] })
      setIsKeyDialogOpen(false)
      setNewKeyData({ isMasterKey: false, type: 'SINGLE_USE', note: '' })
      toast.success('Key erstellt')
    },
    onError: () => toast.error('Fehler beim Erstellen'),
  })

  const revokeKeyMutation = useMutation({
    mutationFn: (id: string) => api.post(`/taxi/keys/${id}/revoke`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxi-keys'] })
      toast.success('Key widerrufen')
    },
    onError: () => toast.error('Fehler beim Widerrufen'),
  })

  // Zuweisung entfernen (Leitung)
  const removeAssignmentMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/taxi/assignments/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxi-tafelrunde'] })
      queryClient.invalidateQueries({ queryKey: ['taxi-tafelrunden'] })
      toast.success('Zuweisung entfernt')
    },
    onError: () => toast.error('Fehler beim Entfernen'),
  })

  // Zuweisung bearbeiten (Leitung)
  const updateAssignmentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => 
      api.patch(`/taxi/assignments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['taxi-tafelrunde'] })
      queryClient.invalidateQueries({ queryKey: ['taxi-tafelrunden'] })
      setIsAssignDialogOpen(false)
      setSelectedFamily(null)
      setAssignmentData({ driverId: '', pickupNotes: '', pickupTime: '' })
      toast.success('Zuweisung aktualisiert')
    },
    onError: () => toast.error('Fehler beim Aktualisieren'),
  })

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success('Key kopiert!')
  }

  // Get next status for a given status
  const getNextStatus = (currentStatus: string): string | null => {
    const flow = ['ASSIGNED', 'EN_ROUTE', 'PICKED_UP', 'DELIVERED']
    const currentIndex = flow.indexOf(currentStatus)
    if (currentIndex >= 0 && currentIndex < flow.length - 1) {
      return flow[currentIndex + 1]
    }
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Car className="h-8 w-8 text-yellow-400" />
            Taxi-System
          </h1>
          <p className="text-gray-400 mt-1">
            {isLeadership 
              ? 'Management-Zugang' 
              : (isTaxiLead ? 'Taxi-Leitung' : 'Fahrer')
            } • {user?.icFirstName || user?.username}
          </p>
        </div>
        
        {(isTaxiLead || isLeadership) && (
          <Badge variant="outline" className={isLeadership 
            ? "border-amber-500/50 text-amber-400" 
            : "border-yellow-500/50 text-yellow-400"
          }>
            <Crown className="h-3 w-3 mr-1" />
            {isLeadership ? 'Leadership' : 'Leitungsebene'}
          </Badge>
        )}
      </div>

      {/* Tabs - Normale Fahrer sehen nur "Meine Fahrten" */}
      <div className="flex gap-2 border-b border-gray-700 pb-2">
        {/* "Meine Fahrten" für Taxi-User */}
        {isTaxiUser && (
          <button
            onClick={() => setActiveTab('assignments')}
            className={`px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === 'assignments'
                ? 'bg-yellow-500/20 text-yellow-400 border-b-2 border-yellow-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Navigation className="h-4 w-4 inline mr-2" />
            Meine Fahrten
          </button>
        )}
        {/* Tafelrunden nur für Leitung/Leadership */}
        {(isTaxiLead || isLeadership) && (
          <button
            onClick={() => setActiveTab('tafelrunden')}
            className={`px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === 'tafelrunden'
                ? 'bg-yellow-500/20 text-yellow-400 border-b-2 border-yellow-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Calendar className="h-4 w-4 inline mr-2" />
            Tafelrunden
          </button>
        )}
        {permissions?.canCreateKeys && (
          <button
            onClick={() => setActiveTab('keys')}
            className={`px-4 py-2 rounded-t-lg transition-colors ${
              activeTab === 'keys'
                ? 'bg-yellow-500/20 text-yellow-400 border-b-2 border-yellow-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Key className="h-4 w-4 inline mr-2" />
            Zugangsschlüssel
          </button>
        )}
      </div>

      {/* My Assignments Tab - für Taxi-User mit Karte */}
      {activeTab === 'assignments' && isTaxiUser && (
        <div className="space-y-4">
          {assignmentsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-yellow-400" />
            </div>
          ) : myAssignments.length === 0 ? (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="py-12 text-center">
                <Car className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                <p className="text-gray-400">Keine Fahrten zugewiesen</p>
                <p className="text-gray-500 text-sm mt-1">
                  Deine zugewiesenen Abholungen erscheinen hier
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-3 gap-4">
              {/* Karte mit allen Abholungen - 2/3 */}
              <div className="lg:col-span-2">
                <Card className="bg-gray-800/30 border-gray-700/50 overflow-hidden">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Map className="h-4 w-4 text-yellow-400" />
                      Deine Abholungen
                      <span className="text-sm font-normal text-gray-500">
                        ({myAssignments.filter(a => a.status !== 'DELIVERED' && a.status !== 'CANCELLED').length} offen)
                      </span>
                    </CardTitle>
                    {/* Zeige Zeitinfos aus der ersten Zuweisung */}
                    {myAssignments[0]?.tafelrunde && (myAssignments[0].tafelrunde.pickupStartTime || myAssignments[0].tafelrunde.arrivalDeadline) && (
                      <div className="flex flex-wrap items-center gap-4 mt-2 text-xs">
                        {myAssignments[0].tafelrunde.pickupStartTime && (
                          <span className="flex items-center gap-1.5 text-yellow-300 bg-yellow-500/10 px-2 py-1 rounded">
                            <Clock className="h-3 w-3" />
                            Abholung ab: <strong>{myAssignments[0].tafelrunde.pickupStartTime}</strong>
                          </span>
                        )}
                        {myAssignments[0].tafelrunde.arrivalDeadline && (
                          <span className="flex items-center gap-1.5 text-amber-300 bg-amber-500/10 px-2 py-1 rounded">
                            <MapPin className="h-3 w-3" />
                            Alle am Treffpunkt bis: <strong>{myAssignments[0].tafelrunde.arrivalDeadline}</strong>
                          </span>
                        )}
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-0">
                    {(() => {
                      // Sammle alle Karten-Annotations der zugewiesenen Familien
                      const allAnnotations = myAssignments
                        .filter(a => a.familyContact.mapAnnotations && a.familyContact.mapAnnotations.length > 0)
                        .map(a => ({
                          ...a,
                          annotation: a.familyContact.mapAnnotations![0]
                        }))

                      // Gruppiere nach Karte
                      const mapGroups = allAnnotations.reduce((acc, item) => {
                        const mapName = item.annotation.mapName as keyof typeof MAP_CONFIG
                        if (!acc[mapName]) acc[mapName] = []
                        acc[mapName].push(item)
                        return acc
                      }, {} as Record<keyof typeof MAP_CONFIG, typeof allAnnotations>)

                      // Finde die Karte mit den meisten Einträgen als Default
                      const defaultMap = Object.entries(mapGroups).sort((a, b) => b[1].length - a[1].length)[0]?.[0] as keyof typeof MAP_CONFIG || 'NARCO_CITY'
                      // Verwende ausgewählte Karte oder Default
                      const activeMap = driverSelectedMap && mapGroups[driverSelectedMap] ? driverSelectedMap : defaultMap
                      const config = MAP_CONFIG[activeMap]
                      const aspectRatio = config.width / config.height
                      const mapHeight = 450
                      const mapWidth = mapHeight * aspectRatio
                      const bounds: L.LatLngBoundsExpression = [[0, 0], [mapHeight, mapWidth]]
                      
                      const toMapCoords = (x: number, y: number): [number, number] => {
                        return [mapHeight - (y * mapHeight), x * mapWidth]
                      }

                      const currentMapAnnotations = mapGroups[activeMap] || []

                      return (
                        <>
                          {/* Karten-Tabs wenn es mehrere Karten gibt - jetzt klickbar */}
                          {Object.keys(mapGroups).length > 1 && (
                            <div className="px-4 py-2 bg-gray-900/50 border-b border-gray-700/50 flex gap-2">
                              {Object.entries(mapGroups).map(([mapName, items]) => (
                                <button
                                  key={mapName}
                                  onClick={() => setDriverSelectedMap(mapName as keyof typeof MAP_CONFIG)}
                                  className={`px-3 py-1.5 rounded text-xs font-medium transition-all ${
                                    mapName === activeMap 
                                      ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' 
                                      : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600/50 hover:text-gray-300'
                                  }`}
                                >
                                  {MAP_CONFIG[mapName as keyof typeof MAP_CONFIG]?.name}: {items.length}
                                </button>
                              ))}
                            </div>
                          )}
                          <MapContainer
                            key={activeMap}
                            center={[mapHeight / 2, mapWidth / 2]}
                            zoom={0}
                            minZoom={-1}
                            maxZoom={3}
                            crs={L.CRS.Simple}
                            style={{ height: '450px', width: '100%', background: '#111827' }}
                            attributionControl={false}
                          >
                            <FitBounds bounds={bounds} mapKey={`driver-${activeMap}`} />
                            <ImageOverlay
                              url={`/map-tiles/${config.file}/metadata.json`}
                              bounds={bounds}
                              opacity={0}
                            />
                            <ImageOverlay
                              url={`/map-tiles/${config.file}/full.png`}
                              bounds={bounds}
                              errorOverlayUrl={`/map-sources/${config.file}.png`}
                            />
                            
                            {currentMapAnnotations.map((item) => {
                              const statusConfig = STATUS_CONFIG[item.status]
                              const isCompleted = item.status === 'DELIVERED'
                              
                              return (
                                <Marker
                                  key={item.id}
                                  position={toMapCoords(item.annotation.x, item.annotation.y)}
                                  icon={L.divIcon({
                                    html: `
                                      <div style="
                                        width: 40px;
                                        height: 40px;
                                        background: ${item.status === 'DELIVERED' ? '#22c55e' : item.status === 'PICKED_UP' ? '#a855f7' : item.status === 'EN_ROUTE' ? '#ea580c' : item.status === 'ASSIGNED' ? '#eab308' : '#6b7280'};
                                        border: 3px solid white;
                                        border-radius: 50%;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                                      ">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="22" height="22">
                                          <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                                        </svg>
                                      </div>
                                    `,
                                    className: 'taxi-marker',
                                    iconSize: [40, 40],
                                    iconAnchor: [20, 20],
                                  })}
                                >
                                  <Popup>
                                    <div className="min-w-[200px] p-2">
                                      <div className="font-bold text-lg mb-1">{item.familyContact.familyName}</div>
                                      <div className={`text-sm font-medium ${statusConfig.textColor} mb-2`}>
                                        {statusConfig.label}
                                      </div>
                                      {item.familyContact.propertyZip && (
                                        <div className="text-sm text-gray-500">PLZ: {item.familyContact.propertyZip}</div>
                                      )}
                                      {item.familyContact.contact1Phone && (
                                        <div className="text-sm text-gray-500 mt-1">
                                          📞 {item.familyContact.contact1Phone}
                                        </div>
                                      )}
                                      {item.pickupNotes && (
                                        <div className="mt-2 p-2 bg-yellow-500/10 rounded text-sm text-yellow-400">
                                          💡 {item.pickupNotes}
                                        </div>
                                      )}
                                    </div>
                                  </Popup>
                                  <Tooltip direction="top" offset={[0, -24]} permanent={false}>
                                    {item.familyContact.familyName}
                                  </Tooltip>
                                </Marker>
                              )
                            })}
                            
                            {/* Treffpunkt/Zielort Marker für Fahrer */}
                            {(() => {
                              // Sammle eindeutige Treffpunkte aus den Zuweisungen
                              interface MeetingPoint { id: string; title: string; location?: string; x: number; y: number }
                              const meetingPointsObj: Record<string, MeetingPoint> = {}
                              
                              myAssignments
                                .filter(a => 
                                  a.tafelrunde?.meetingPointMapName === activeMap && 
                                  a.tafelrunde?.meetingPointX != null && 
                                  a.tafelrunde?.meetingPointY != null
                                )
                                .forEach(a => {
                                  const key = a.tafelrunde.id
                                  if (!meetingPointsObj[key]) {
                                    meetingPointsObj[key] = {
                                      id: a.tafelrunde.id,
                                      title: a.tafelrunde.title,
                                      location: a.tafelrunde.location,
                                      x: a.tafelrunde.meetingPointX!,
                                      y: a.tafelrunde.meetingPointY!,
                                    }
                                  }
                                })
                              
                              const meetingPoints: MeetingPoint[] = Object.values(meetingPointsObj)
                              
                              return meetingPoints.map((mp) => (
                                <Marker
                                  key={`meeting-${mp.id}`}
                                  position={toMapCoords(mp.x, mp.y)}
                                  icon={L.divIcon({
                                    html: `
                                      <div style="
                                        width: 48px;
                                        height: 48px;
                                        background: linear-gradient(135deg, #10b981, #059669);
                                        border: 4px solid white;
                                        border-radius: 50%;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        box-shadow: 0 4px 16px rgba(0,0,0,0.6), 0 0 20px rgba(16, 185, 129, 0.4);
                                        animation: pulse 2s infinite;
                                      ">
                                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="28" height="28">
                                          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                        </svg>
                                      </div>
                                    `,
                                    className: 'meeting-point-marker',
                                    iconSize: [48, 48],
                                    iconAnchor: [24, 24],
                                  })}
                                >
                                  <Popup>
                                    <div className="min-w-[180px] p-2">
                                      <div className="font-bold text-lg mb-1 text-green-600">🎯 ZIEL: {mp.title}</div>
                                      <div className="text-sm text-gray-600 mb-2">
                                        Hier alle Familien hinbringen!
                                      </div>
                                      {mp.location && (
                                        <div className="text-sm text-gray-500">
                                          📍 {mp.location}
                                        </div>
                                      )}
                                    </div>
                                  </Popup>
                                  <Tooltip direction="top" offset={[0, -26]} permanent>
                                    <span className="font-bold">🎯 ZIEL</span>
                                  </Tooltip>
                                </Marker>
                              ))
                            })()}
                          </MapContainer>
                          {/* Legende */}
                          <div className="px-4 py-2 bg-gray-900/80 border-t border-gray-700/50 flex flex-wrap items-center gap-4 text-xs">
                            <span className="text-gray-500">Status:</span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-yellow-500" />
                              <span className="text-gray-400">Zugewiesen</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-orange-600" />
                              <span className="text-gray-400">Unterwegs</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-purple-500" />
                              <span className="text-gray-400">Abgeholt</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-green-500" />
                              <span className="text-gray-400">Abgeliefert</span>
                            </div>
                            <span className="text-gray-600">|</span>
                            <div className="flex items-center gap-1.5">
                              <div className="w-4 h-4 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 border border-white" />
                              <span className="text-emerald-400 font-medium">🎯 Treffpunkt</span>
                            </div>
                          </div>
                        </>
                      )
                    })()}
                  </CardContent>
                </Card>
              </div>

              {/* Fahrten-Liste - 1/3 */}
              <div className="lg:col-span-1 space-y-3">
                <h3 className="text-sm font-medium text-gray-400 flex items-center gap-2">
                  <Navigation className="h-4 w-4" />
                  Fahrten-Liste
                </h3>
                {myAssignments.map((assignment) => {
                  const statusConfig = STATUS_CONFIG[assignment.status]
                  const nextStatus = getNextStatus(assignment.status)
                  const annotation = assignment.familyContact.mapAnnotations?.[0]
                  
                  return (
                    <Card key={assignment.id} className="bg-gray-800/50 border-gray-700">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color} text-white`}>
                                {statusConfig.label}
                              </span>
                            </div>
                            
                            <h3 className="font-semibold text-white truncate">
                              {assignment.familyContact.familyName}
                            </h3>
                            
                            <div className="mt-1 space-y-0.5 text-xs text-gray-400">
                              {assignment.familyContact.propertyZip && (
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  PLZ: {assignment.familyContact.propertyZip}
                                </div>
                              )}
                              {assignment.familyContact.contact1Phone && (
                                <div className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {assignment.familyContact.contact1Phone}
                                </div>
                              )}
                              {assignment.pickupTime && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {assignment.pickupTime}
                                </div>
                              )}
                            </div>
                            
                            {assignment.pickupNotes && (
                              <div className="mt-2 p-2 bg-yellow-500/10 rounded text-xs text-yellow-400">
                                💡 {assignment.pickupNotes}
                              </div>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex flex-col gap-1">
                            {nextStatus && (
                              <Button
                                size="sm"
                                onClick={() => updateStatusMutation.mutate({
                                  id: assignment.id,
                                  status: nextStatus,
                                })}
                                disabled={updateStatusMutation.isPending}
                                className="h-8 px-2 text-xs bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30"
                              >
                                {updateStatusMutation.isPending ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <ChevronRight className="h-3 w-3" />
                                    {STATUS_CONFIG[nextStatus as keyof typeof STATUS_CONFIG].label}
                                  </>
                                )}
                              </Button>
                            )}
                            {assignment.status === 'DELIVERED' && (
                              <div className="flex items-center gap-1 text-green-400 text-xs">
                                <CheckCircle className="h-3 w-3" />
                                Fertig
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tafelrunden Tab */}
      {activeTab === 'tafelrunden' && (
        <div className="space-y-4">
          {/* Top Bar: Tafelrunde Selector + Map Switcher */}
          <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
            {/* Tafelrunde Dropdown */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-gray-400">
                <Calendar className="h-5 w-5 text-yellow-400" />
                <span className="text-sm font-medium">Tafelrunde:</span>
              </div>
              {tafelrundenLoading ? (
                <div className="px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
                  <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />
                </div>
              ) : (
                <select
                  value={selectedTafelrunde || ''}
                  onChange={(e) => setSelectedTafelrunde(e.target.value || null)}
                  className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/20 min-w-[200px]"
                >
                  <option value="">Tafelrunde wählen...</option>
                  {tafelrunden.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({new Date(t.date).toLocaleDateString('de-DE', { day: 'numeric', month: 'short' })})
                    </option>
                  ))}
                </select>
              )}
              {selectedTafelrunde && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['taxi-tafelrunde'] })}
                  className="text-gray-400 hover:text-white"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
              
              {/* Zeitinfo aus Tafelrunde */}
              {tafelrundeDetails && (tafelrundeDetails.pickupStartTime || tafelrundeDetails.arrivalDeadline) && (
                <div className="flex items-center gap-4 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-lg text-sm">
                  {tafelrundeDetails.pickupStartTime && (
                    <span className="flex items-center gap-1.5 text-yellow-300">
                      <Clock className="h-3.5 w-3.5" />
                      Abholung ab: <strong>{tafelrundeDetails.pickupStartTime}</strong>
                    </span>
                  )}
                  {tafelrundeDetails.arrivalDeadline && (
                    <span className="flex items-center gap-1.5 text-amber-300">
                      <MapPin className="h-3.5 w-3.5" />
                      Spätestens da: <strong>{tafelrundeDetails.arrivalDeadline}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Map Switcher */}
            <div className="flex items-center gap-2 bg-gray-800/50 p-1 rounded-lg border border-gray-700">
              {(Object.entries(MAP_CONFIG) as [keyof typeof MAP_CONFIG, typeof MAP_CONFIG[keyof typeof MAP_CONFIG]][]).map(([key, config]) => {
                // Zähle Familien auf dieser Karte
                const familiesOnMap = tafelrundeDetails?.families.filter(tf => 
                  tf.familyContact.mapAnnotations?.some(a => a.mapName === key)
                ).length || 0
                
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedMapName(key)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                      selectedMapName === key
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30'
                        : 'text-gray-400 hover:text-white hover:bg-gray-700/50'
                    }`}
                  >
                    <Map className="h-4 w-4" />
                    {config.name}
                    {familiesOnMap > 0 && (
                      <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                        selectedMapName === key ? 'bg-yellow-500/30' : 'bg-gray-700'
                      }`}>
                        {familiesOnMap}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Main Content */}
          {!selectedTafelrunde ? (
            <Card className="bg-gray-800/30 border-gray-700/50">
              <CardContent className="py-16 text-center">
                <div className="relative inline-block mb-4">
                  <div className="absolute inset-0 bg-yellow-500/20 rounded-full blur-xl" />
                  <Calendar className="h-16 w-16 text-gray-500 relative" />
                </div>
                <h3 className="text-xl font-semibold text-gray-300 mb-2">Keine Tafelrunde ausgewählt</h3>
                <p className="text-gray-500">Wähle oben eine Tafelrunde aus, um die Abholungen zu sehen</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid lg:grid-cols-4 gap-4">
              {/* Map - 3/4 width */}
              <div className="lg:col-span-3">
                <Card className="bg-gray-800/30 border-gray-700/50 overflow-hidden">
                  <CardContent className="p-0">
                    {(() => {
                      const config = MAP_CONFIG[selectedMapName]
                      const aspectRatio = config.width / config.height
                      const mapHeight = 500
                      const mapWidth = mapHeight * aspectRatio
                      const bounds: L.LatLngBoundsExpression = [[0, 0], [mapHeight, mapWidth]]
                      
                      const toMapCoords = (x: number, y: number): [number, number] => {
                        return [mapHeight - (y * mapHeight), x * mapWidth]
                      }

                      // Filter annotations for selected map
                      const mapAnnotations = tafelrundeDetails?.families
                        .filter(tf => tf.familyContact.mapAnnotations?.some(a => a.mapName === selectedMapName))
                        .map(tf => {
                          const annotation = tf.familyContact.mapAnnotations?.find(a => a.mapName === selectedMapName)
                          const assignment = tafelrundeDetails.taxiAssignments.find(
                            a => a.familyContact?.id === tf.familyContact.id
                          )
                          return {
                            familyId: tf.familyContact.id,
                            familyName: tf.familyContact.familyName,
                            x: annotation?.x || 0,
                            y: annotation?.y || 0,
                            assignment,
                          }
                        }) || []

                      return (
                        <MapContainer
                          key={selectedMapName}
                          center={[mapHeight / 2, mapWidth / 2]}
                          zoom={0}
                          minZoom={-1}
                          maxZoom={3}
                          crs={L.CRS.Simple}
                          style={{ height: '500px', width: '100%', background: '#111827' }}
                          attributionControl={false}
                        >
                          <FitBounds bounds={bounds} mapKey={`management-${selectedMapName}`} />
                          {/* Map Image - same as KartePage */}
                          <ImageOverlay
                            url={`/map-tiles/${config.file}/metadata.json`}
                            bounds={bounds}
                            opacity={0}
                          />
                          <ImageOverlay
                            url={`/map-tiles/${config.file}/full.png`}
                            bounds={bounds}
                            errorOverlayUrl={`/map-sources/${config.file}.png`}
                          />
                          
                          {mapAnnotations.map((annotation) => {
                            const status = annotation.assignment?.status || 'PENDING'
                            const statusConfig = STATUS_CONFIG[status]
                            const isMyAssignment = annotation.assignment?.driver?.id === user?.id
                            
                            return (
                              <Marker
                                key={annotation.familyId}
                                position={toMapCoords(annotation.x, annotation.y)}
                                icon={L.divIcon({
                                  html: `
                                    <div style="
                                      width: 36px;
                                      height: 36px;
                                      background: ${status === 'DELIVERED' ? '#22c55e' : status === 'PICKED_UP' ? '#a855f7' : status === 'EN_ROUTE' ? '#ea580c' : status === 'ASSIGNED' ? '#eab308' : '#6b7280'};
                                      border: 3px solid white;
                                      border-radius: 50%;
                                      display: flex;
                                      align-items: center;
                                      justify-content: center;
                                      box-shadow: 0 4px 12px rgba(0,0,0,0.5);
                                      transition: transform 0.2s;
                                    ">
                                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="20" height="20">
                                        <path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/>
                                      </svg>
                                    </div>
                                  `,
                                  className: 'taxi-marker',
                                  iconSize: [36, 36],
                                  iconAnchor: [18, 18],
                                })}
                              >
                                <Popup>
                                  <div className="min-w-[200px] p-2">
                                    <div className="font-bold text-lg mb-1">{annotation.familyName}</div>
                                    <div className={`text-sm font-medium ${statusConfig.textColor} mb-2`}>
                                      {statusConfig.label}
                                    </div>
                                    {annotation.assignment?.driver && (
                                      <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                                        <User className="h-4 w-4" />
                                        {annotation.assignment.driver.icFirstName || annotation.assignment.driver.username}
                                      </div>
                                    )}
                                    {/* Leitung kann Fahrer zuweisen oder ändern */}
                                    {isTaxiLead && (
                                      <button
                                        onClick={() => {
                                          if (annotation.assignment) {
                                            // Bearbeiten einer bestehenden Zuweisung
                                            setEditingAssignment(annotation.assignment)
                                            setAssignmentData({
                                              driverId: annotation.assignment.driver?.id || '',
                                              pickupTime: annotation.assignment.pickupTime || '',
                                              pickupNotes: annotation.assignment.pickupNotes || '',
                                            })
                                          } else {
                                            // Neue Zuweisung
                                            setEditingAssignment(null)
                                            setAssignmentData({
                                              driverId: '',
                                              pickupTime: tafelrundeDetails?.pickupStartTime || '',
                                              pickupNotes: '',
                                            })
                                          }
                                          setSelectedFamily({
                                            familyId: annotation.familyId,
                                            familyName: annotation.familyName,
                                            tafelrundeId: tafelrundeDetails?.id,
                                          })
                                          setIsAssignDialogOpen(true)
                                        }}
                                        className={`w-full mt-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                          annotation.assignment?.driver
                                            ? 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 border border-blue-500/30'
                                            : 'bg-yellow-500 text-gray-900 hover:bg-yellow-400'
                                        }`}
                                      >
                                        {annotation.assignment?.driver ? 'Fahrer ändern' : 'Fahrer zuweisen'}
                                      </button>
                                    )}
                                  </div>
                                </Popup>
                                <Tooltip direction="top" offset={[0, -22]} permanent={false}>
                                  {annotation.familyName}
                                </Tooltip>
                              </Marker>
                            )
                          })}
                          
                          {/* Treffpunkt/Zielort Marker */}
                          {tafelrundeDetails?.meetingPointMapName === selectedMapName && 
                           tafelrundeDetails?.meetingPointX != null && 
                           tafelrundeDetails?.meetingPointY != null && (
                            <Marker
                              position={toMapCoords(tafelrundeDetails.meetingPointX, tafelrundeDetails.meetingPointY)}
                              icon={L.divIcon({
                                html: `
                                  <div style="
                                    width: 48px;
                                    height: 48px;
                                    background: linear-gradient(135deg, #10b981, #059669);
                                    border: 4px solid white;
                                    border-radius: 50%;
                                    display: flex;
                                    align-items: center;
                                    justify-content: center;
                                    box-shadow: 0 4px 16px rgba(0,0,0,0.6), 0 0 20px rgba(16, 185, 129, 0.4);
                                    animation: pulse 2s infinite;
                                  ">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="28" height="28">
                                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                                    </svg>
                                  </div>
                                `,
                                className: 'meeting-point-marker',
                                iconSize: [48, 48],
                                iconAnchor: [24, 24],
                              })}
                            >
                              <Popup>
                                <div className="min-w-[180px] p-2">
                                  <div className="font-bold text-lg mb-1 text-green-600">🎯 Treffpunkt</div>
                                  <div className="text-sm text-gray-600 mb-2">
                                    Hier werden alle Familien hingebracht.
                                  </div>
                                  {tafelrundeDetails?.location && (
                                    <div className="text-sm text-gray-500">
                                      {tafelrundeDetails.location}
                                    </div>
                                  )}
                                </div>
                              </Popup>
                              <Tooltip direction="top" offset={[0, -26]} permanent>
                                <span className="font-bold">🎯 ZIEL</span>
                              </Tooltip>
                            </Marker>
                          )}
                        </MapContainer>
                      )
                    })()}
                    
                    {/* Map Legend */}
                    <div className="px-4 py-3 bg-gray-900/80 border-t border-gray-700/50 flex flex-wrap items-center gap-4 text-xs">
                      <span className="text-gray-500 font-medium">Legende:</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-gray-500" />
                        <span className="text-gray-400">Ausstehend</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-yellow-500" />
                        <span className="text-gray-400">Zugewiesen</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-orange-600" />
                        <span className="text-gray-400">Unterwegs</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-purple-500" />
                        <span className="text-gray-400">Abgeholt</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-full bg-green-500" />
                        <span className="text-gray-400">Abgeliefert</span>
                      </div>
                      <span className="text-gray-600">|</span>
                      <div className="flex items-center gap-1.5">
                        <div className="w-4 h-4 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 border border-white" />
                        <span className="text-emerald-400 font-medium">🎯 Treffpunkt</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Family List - 1/4 width */}
              <div className="lg:col-span-1">
                <Card className="bg-gray-800/30 border-gray-700/50 h-full">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-yellow-400" />
                        Familien
                      </span>
                      <span className="text-sm font-normal text-gray-500">
                        {tafelrundeDetails?.families.length || 0}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 max-h-[450px] overflow-y-auto">
                    <div className="space-y-2">
                      {tafelrundeDetails?.families.map((tf) => {
                        const family = tf.familyContact
                        const assignment = tafelrundeDetails.taxiAssignments.find(
                          a => a.familyContact?.id === family.id
                        )
                        const status = assignment?.status || 'PENDING'
                        const statusConfig = STATUS_CONFIG[status]
                        const hasMapAnnotation = family.mapAnnotations && family.mapAnnotations.length > 0
                        const isOnCurrentMap = family.mapAnnotations?.some(a => a.mapName === selectedMapName)
                        
                        return (
                          <div
                            key={family.id}
                            className={`p-3 rounded-lg border transition-all ${
                              isOnCurrentMap 
                                ? 'bg-yellow-500/5 border-yellow-500/20' 
                                : 'bg-gray-900/30 border-gray-700/50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-white text-sm truncate">
                                  {family.familyName}
                                </div>
                                {assignment?.driver && (
                                  <div className="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
                                    <User className="h-3 w-3" />
                                    {assignment.driver.icFirstName || assignment.driver.username}
                                  </div>
                                )}
                                {!hasMapAnnotation && (
                                  <div className="flex items-center gap-1 text-xs text-orange-400 mt-0.5">
                                    <AlertCircle className="h-3 w-3" />
                                    Kein POI
                                  </div>
                                )}
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusConfig.color} text-white`}>
                                  {statusConfig.label}
                                </span>
                                {isTaxiLead && !assignment?.driver && (
                                  <button
                                    onClick={() => {
                                      setEditingAssignment(null)
                                      setSelectedFamily({
                                        familyId: family.id,
                                        familyName: family.familyName,
                                        tafelrundeId: tafelrundeDetails.id,
                                      })
                                      setAssignmentData({
                                        driverId: '',
                                        pickupTime: tafelrundeDetails?.pickupStartTime || '',
                                        pickupNotes: '',
                                      })
                                      setIsAssignDialogOpen(true)
                                    }}
                                    className="text-xs text-yellow-400 hover:text-yellow-300"
                                  >
                                    Zuweisen
                                  </button>
                                )}
                                {/* Bearbeiten/Entfernen für Leitung bei bestehenden Zuweisungen */}
                                {isTaxiLead && assignment?.driver && (
                                  <div className="flex gap-1 mt-1">
                                    <button
                                      onClick={() => {
                                        setEditingAssignment(assignment)
                                        setSelectedFamily({
                                          familyId: family.id,
                                          familyName: family.familyName,
                                          tafelrundeId: tafelrundeDetails.id,
                                        })
                                        setAssignmentData({
                                          driverId: assignment.driver?.id || '',
                                          pickupTime: assignment.pickupTime || '',
                                          pickupNotes: assignment.pickupNotes || '',
                                        })
                                        setIsAssignDialogOpen(true)
                                      }}
                                      className="text-xs text-blue-400 hover:text-blue-300"
                                    >
                                      Bearbeiten
                                    </button>
                                    <span className="text-gray-600">|</span>
                                    <button
                                      onClick={() => {
                                        if (confirm('Zuweisung wirklich entfernen?')) {
                                          removeAssignmentMutation.mutate(assignment.id)
                                        }
                                      }}
                                      disabled={removeAssignmentMutation.isPending}
                                      className="text-xs text-red-400 hover:text-red-300"
                                    >
                                      Entfernen
                                    </button>
                                  </div>
                                )}
                                {/* Status ändern für Leitung */}
                                {isTaxiLead && assignment && assignment.status !== 'DELIVERED' && assignment.status !== 'CANCELLED' && (
                                  <select
                                    value={assignment.status}
                                    onChange={(e) => {
                                      updateStatusMutation.mutate({
                                        id: assignment.id,
                                        status: e.target.value,
                                      })
                                    }}
                                    disabled={updateStatusMutation.isPending}
                                    className="mt-1 text-xs bg-gray-800 border border-gray-600 rounded px-1 py-0.5 text-gray-300"
                                  >
                                    <option value="PENDING">Ausstehend</option>
                                    <option value="ASSIGNED">Zugewiesen</option>
                                    <option value="EN_ROUTE">Unterwegs</option>
                                    <option value="PICKED_UP">Abgeholt</option>
                                    <option value="DELIVERED">Abgeliefert</option>
                                    <option value="CANCELLED">Abgesagt</option>
                                  </select>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                      
                      {(!tafelrundeDetails?.families || tafelrundeDetails.families.length === 0) && (
                        <div className="text-center py-8 text-gray-500 text-sm">
                          Keine Familien zugesagt
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Keys Tab */}
      {activeTab === 'keys' && permissions?.canCreateKeys && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Zugangsschlüssel verwalten</h3>
            <Button
              onClick={() => setIsKeyDialogOpen(true)}
              className="bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30 border border-yellow-500/30"
            >
              <Plus className="h-4 w-4 mr-2" />
              Neuen Key erstellen
            </Button>
          </div>

          {keysLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-yellow-400" />
            </div>
          ) : keys.length === 0 ? (
            <Card className="bg-gray-800/50 border-gray-700">
              <CardContent className="py-12 text-center">
                <Key className="h-12 w-12 mx-auto mb-4 text-gray-500" />
                <p className="text-gray-400">Keine Zugangsschlüssel erstellt</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {keys.map((key) => (
                <Card key={key.id} className="bg-gray-800/50 border-gray-700">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <code className="text-lg font-mono text-yellow-400">{key.key}</code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => copyKey(key.key)}
                            className="h-6 w-6 p-0"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          {key.isMasterKey && (
                            <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30">
                              <Crown className="h-3 w-3 mr-1" />
                              Master
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span className={`px-2 py-0.5 rounded ${
                            key.status === 'ACTIVE' ? 'bg-green-500/20 text-green-400' :
                            key.status === 'USED' ? 'bg-blue-500/20 text-blue-400' :
                            key.status === 'REVOKED' ? 'bg-red-500/20 text-red-400' :
                            'bg-gray-500/20 text-gray-400'
                          }`}>
                            {key.status}
                          </span>
                          <span>{key.type.replace('_', ' ')}</span>
                          {key.note && <span>• {key.note}</span>}
                        </div>
                        {key.usedBy && (
                          <div className="text-xs text-gray-500 mt-1">
                            Verwendet von: {key.usedBy.icFirstName || key.usedBy.username}
                          </div>
                        )}
                      </div>
                      {key.status === 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => revokeKeyMutation.mutate(key.id)}
                          disabled={revokeKeyMutation.isPending}
                          className="text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Assign/Edit Driver Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={(open) => {
        setIsAssignDialogOpen(open)
        if (!open) {
          setEditingAssignment(null)
          setSelectedFamily(null)
        }
      }}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">
              {editingAssignment ? 'Zuweisung bearbeiten' : 'Fahrer zuweisen'}
            </DialogTitle>
            <DialogDescription>
              Familie: {selectedFamily?.familyName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="driver-select">Fahrer auswählen ({drivers.length} verfügbar)</Label>
              {/* Native select to avoid Radix Portal issues in Dialog */}
              <select
                id="driver-select"
                value={assignmentData.driverId}
                onChange={(e) => setAssignmentData({ ...assignmentData, driverId: e.target.value })}
                className="flex h-10 w-full items-center justify-between rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">
                  {driversLoading ? "Lädt..." : "Fahrer wählen..."}
                </option>
                {drivers.map((driver) => (
                  <option key={driver.id} value={driver.id}>
                    {driver.icFirstName || driver.username}
                    {driver.isTaxiLead ? ' (Leitung)' : ''}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <Label>Abholzeit (optional)</Label>
              <Input
                value={assignmentData.pickupTime}
                onChange={(e) => setAssignmentData({ ...assignmentData, pickupTime: e.target.value })}
                placeholder="z.B. 18:30"
                className="bg-gray-800 border-gray-700"
              />
            </div>
            
            <div>
              <Label>Notizen (optional)</Label>
              <Textarea
                value={assignmentData.pickupNotes}
                onChange={(e) => setAssignmentData({ ...assignmentData, pickupNotes: e.target.value })}
                placeholder="Hinweise zur Abholung..."
                className="bg-gray-800 border-gray-700"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => {
              setIsAssignDialogOpen(false)
              setEditingAssignment(null)
              setSelectedFamily(null)
            }}>
              Abbrechen
            </Button>
            <Button
              onClick={() => {
                if (editingAssignment) {
                  // Bearbeiten
                  updateAssignmentMutation.mutate({
                    id: editingAssignment.id,
                    data: {
                      driverId: assignmentData.driverId || null,
                      pickupNotes: assignmentData.pickupNotes,
                      pickupTime: assignmentData.pickupTime,
                    },
                  })
                } else if (selectedFamily && assignmentData.driverId) {
                  // Neu erstellen
                  assignDriverMutation.mutate({
                    tafelrundeId: selectedFamily.tafelrundeId,
                    familyContactId: selectedFamily.familyId,
                    ...assignmentData,
                  })
                }
              }}
              disabled={(editingAssignment ? false : !assignmentData.driverId) || assignDriverMutation.isPending || updateAssignmentMutation.isPending}
              className="bg-yellow-500 text-gray-900 hover:bg-yellow-400"
            >
              {(assignDriverMutation.isPending || updateAssignmentMutation.isPending) && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingAssignment ? 'Speichern' : 'Zuweisen'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Key Dialog */}
      <Dialog open={isKeyDialogOpen} onOpenChange={setIsKeyDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-yellow-400">Neuen Zugangsschlüssel erstellen</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="key-type-select">Key-Typ</Label>
              {/* Native select to avoid Radix Portal issues in Dialog */}
              <select
                id="key-type-select"
                value={newKeyData.type}
                onChange={(e) => setNewKeyData({ ...newKeyData, type: e.target.value as any })}
                className="flex h-10 w-full items-center justify-between rounded-md border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500"
              >
                <option value="SINGLE_USE">Einmalig</option>
                <option value="MULTI_USE">Mehrfach</option>
                <option value="PERMANENT">Permanent</option>
              </select>
            </div>
            
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="masterKey"
                checked={newKeyData.isMasterKey}
                onChange={(e) => setNewKeyData({ ...newKeyData, isMasterKey: e.target.checked })}
                className="rounded border-gray-700"
              />
              <Label htmlFor="masterKey" className="flex items-center gap-2">
                <Crown className="h-4 w-4 text-purple-400" />
                Master Key (Leitungsebene)
              </Label>
            </div>
            
            <div>
              <Label>Notiz (optional)</Label>
              <Input
                value={newKeyData.note}
                onChange={(e) => setNewKeyData({ ...newKeyData, note: e.target.value })}
                placeholder="z.B. Für Max Mustermann"
                className="bg-gray-800 border-gray-700"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsKeyDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button
              onClick={() => createKeyMutation.mutate(newKeyData)}
              disabled={createKeyMutation.isPending}
              className="bg-yellow-500 text-gray-900 hover:bg-yellow-400"
            >
              {createKeyMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Key erstellen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

