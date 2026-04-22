import { useState, useEffect } from 'react'
import { MapContainer, ImageOverlay, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Button } from './ui/button'
import { MapPin, Check, X } from 'lucide-react'

const MAP_CONFIG = {
  NARCO_CITY: {
    name: 'Narco City',
    file: 'narco-city',
    width: 6144,
    height: 9216,
  },
  ROXWOOD: {
    name: 'Roxwood',
    file: 'roxwood',
    width: 3415,
    height: 2362,
  },
  CAYO_PERICO: {
    name: 'Cayo Perico',
    file: 'cayo-perico',
    width: 1819,
    height: 1773,
  },
}

type MapName = keyof typeof MAP_CONFIG

interface MeetingPointPickerProps {
  value?: {
    mapName: MapName
    x: number
    y: number
  }
  onChange: (value: { mapName: MapName; x: number; y: number }) => void
  onCancel?: () => void
}

// Komponente zum Setzen des Markers bei Klick
function MapClickHandler({ 
  onSelect, 
  mapHeight, 
  mapWidth 
}: { 
  onSelect: (x: number, y: number) => void
  mapHeight: number
  mapWidth: number
}) {
  useMapEvents({
    click: (e) => {
      // Konvertiere Leaflet-Koordinaten zu normalisierten Koordinaten (0-1)
      const x = e.latlng.lng / mapWidth
      const y = 1 - (e.latlng.lat / mapHeight)
      onSelect(x, y)
    },
  })
  return null
}

// Komponente zum Anpassen der Kartenansicht
function FitBounds({ bounds }: { bounds: L.LatLngBoundsExpression }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(bounds)
  }, [map, bounds])
  return null
}

export function MeetingPointPicker({ value, onChange, onCancel }: MeetingPointPickerProps) {
  const [selectedMap, setSelectedMap] = useState<MapName>(value?.mapName || 'NARCO_CITY')
  const [selectedPoint, setSelectedPoint] = useState<{ x: number; y: number } | null>(
    value ? { x: value.x, y: value.y } : null
  )

  const config = MAP_CONFIG[selectedMap]
  const aspectRatio = config.width / config.height
  const mapHeight = config.height
  const mapWidth = config.width
  const bounds: L.LatLngBoundsExpression = [[0, 0], [mapHeight, mapWidth]]

  const handlePointSelect = (x: number, y: number) => {
    // Stelle sicher, dass die Koordinaten im gültigen Bereich liegen
    const clampedX = Math.max(0, Math.min(1, x))
    const clampedY = Math.max(0, Math.min(1, y))
    setSelectedPoint({ x: clampedX, y: clampedY })
  }

  const handleConfirm = () => {
    if (selectedPoint) {
      onChange({
        mapName: selectedMap,
        x: selectedPoint.x,
        y: selectedPoint.y,
      })
    }
  }

  // Konvertiere normalisierte Koordinaten zu Leaflet-Position
  const toLeafletCoords = (x: number, y: number): [number, number] => {
    return [(1 - y) * mapHeight, x * mapWidth]
  }

  return (
    <div className="space-y-4">
      {/* Karten-Auswahl */}
      <div className="flex gap-2">
        {(Object.entries(MAP_CONFIG) as [MapName, typeof MAP_CONFIG[MapName]][]).map(([key, cfg]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setSelectedMap(key)
              setSelectedPoint(null) // Reset Punkt bei Kartenwechsel
            }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              selectedMap === key
                ? 'bg-orange-500 text-zinc-900'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {cfg.name}
          </button>
        ))}
      </div>

      {/* Anleitung */}
      <div className="flex items-center gap-2 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
        <MapPin className="h-5 w-5 text-orange-400 flex-shrink-0" />
        <p className="text-sm text-orange-200">
          <strong>Klicke auf die Karte</strong>, um den Treffpunkt festzulegen. 
          Alle Familien werden zu diesem Punkt gebracht.
        </p>
      </div>

      {/* Interaktive Karte */}
      <div className="rounded-lg overflow-hidden border-2 border-zinc-700" style={{ height: '450px' }}>
        <MapContainer
          key={selectedMap}
          center={[mapHeight / 2, mapWidth / 2]}
          zoom={0}
          minZoom={-1}
          maxZoom={3}
          crs={L.CRS.Simple}
          style={{ height: '100%', width: '100%', background: '#111827', cursor: 'crosshair' }}
          attributionControl={false}
        >
          <FitBounds bounds={bounds} />
          <ImageOverlay
            url={`/map-tiles/${config.file}/full.png`}
            bounds={bounds}
            errorOverlayUrl={`/map-sources/${config.file}.png`}
          />
          
          <MapClickHandler 
            onSelect={handlePointSelect} 
            mapHeight={mapHeight}
            mapWidth={mapWidth}
          />

          {selectedPoint && (
            <Marker
              position={toLeafletCoords(selectedPoint.x, selectedPoint.y)}
              icon={L.divIcon({
                html: `
                  <div style="
                    width: 56px;
                    height: 56px;
                    background: linear-gradient(135deg, #f59e0b, #d97706);
                    border: 4px solid white;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.6), 0 0 30px rgba(245, 158, 11, 0.5);
                    animation: bounce 0.5s ease-out;
                  ">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="32" height="32">
                      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                    </svg>
                  </div>
                `,
                className: 'meeting-point-marker-picker',
                iconSize: [56, 56],
                iconAnchor: [28, 28],
              })}
            />
          )}
        </MapContainer>
      </div>

      {/* Ausgewählter Punkt Info */}
      {selectedPoint && (
        <div className="flex items-center justify-between p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Check className="h-5 w-5 text-green-400" />
            <span className="text-green-200">
              Treffpunkt ausgewählt auf <strong>{MAP_CONFIG[selectedMap].name}</strong>
            </span>
          </div>
          <span className="text-xs text-green-400/70 font-mono">
            ({selectedPoint.x.toFixed(3)}, {selectedPoint.y.toFixed(3)})
          </span>
        </div>
      )}

      {/* Buttons */}
      <div className="flex justify-end gap-3">
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            <X className="h-4 w-4 mr-2" />
            Abbrechen
          </Button>
        )}
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={!selectedPoint}
          className="bg-orange-500 hover:bg-orange-600 text-zinc-900"
        >
          <Check className="h-4 w-4 mr-2" />
          Treffpunkt bestätigen
        </Button>
      </div>

      <style>{`
        @keyframes bounce {
          0% { transform: scale(0) translateY(-20px); opacity: 0; }
          50% { transform: scale(1.2) translateY(0); }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  )
}

