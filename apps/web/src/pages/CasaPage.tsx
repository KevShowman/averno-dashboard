import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'
import { toast } from 'sonner'
import { Home, MapPin, Loader2, Mountain, Shield, Key } from 'lucide-react'
import { hasRole } from '../lib/utils'

interface CasaInfo {
  postalCode: string | null
  additionalInfo: string | null
}

const CASA_IMAGES = [
  { id: '1', filename: 'default-aussen-einfahrt.png', alt: 'Außen - Einfahrt' },
  { id: '2', filename: 'default-aussen-terasseundpool.png', alt: 'Außen - Terrasse und Pool' },
  { id: '3', filename: 'default-innen-barbereich.png', alt: 'Innen - Bar-Bereich' },
  { id: '4', filename: 'default-innen-wohnzimmer.png', alt: 'Innen - Wohnzimmer' },
]

export default function CasaPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [postalCode, setPostalCode] = useState('')
  const [additionalInfo, setAdditionalInfo] = useState('')

  const isLeadership = hasRole(user, ['EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA'])

  // Query Casa Info
  const { data: casaInfo, isLoading } = useQuery<CasaInfo>({
    queryKey: ['casa-info'],
    queryFn: () => api.get('/casa').then(res => res.data),
  })

  // Set initial values when data loads
  useEffect(() => {
    if (casaInfo) {
      setPostalCode(casaInfo.postalCode || '')
      setAdditionalInfo(casaInfo.additionalInfo || '')
    }
  }, [casaInfo])

  // Update Location Mutation
  const updateLocationMutation = useMutation({
    mutationFn: (data: { postalCode: string; additionalInfo: string }) =>
      api.put('/casa/location', data),
    onSuccess: () => {
      toast.success('Standort erfolgreich aktualisiert')
      queryClient.invalidateQueries({ queryKey: ['casa-info'] })
    },
    onError: () => {
      toast.error('Fehler beim Aktualisieren des Standorts')
    },
  })

  const handleSaveLocation = () => {
    updateLocationMutation.mutate({
      postalCode,
      additionalInfo,
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Home className="h-8 w-8 text-primary" />
            La Casa
          </h1>
          <p className="text-muted-foreground mt-1">
            Unsere Villa in Grapeseed – Ein Ort der Sicherheit und Macht
          </p>
        </div>
      </div>

      {/* RP Beschreibung */}
      <Card className="bg-gradient-to-br from-gray-900 to-gray-800 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Mountain className="h-5 w-5" />
            Über La Casa
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="prose prose-invert max-w-none">
            <p className="text-gray-300 leading-relaxed">
              Hoch in den Bergen von Grapeseed, fernab der neugierigen Blicke der Stadt, thront unsere Villa – 
              La Casa de La Santa Calavera. Ein Ort, der Sicherheit und Macht vereint.
            </p>
            <p className="text-gray-300 leading-relaxed flex items-start gap-2">
              <Shield className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <span>
                Die abgelegene Lage bietet uns natürlichen Schutz. Umgeben von steilen Hängen und dichten Wäldern 
                ist die Zufahrt leicht zu kontrollieren. Nur wer eingeladen ist, findet den Weg zu uns.
              </span>
            </p>
            <p className="text-gray-300 leading-relaxed flex items-start gap-2">
              <Key className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <span>
                Die Villa selbst ist modern und geräumig – mit großzügigen Wohn- und Geschäftsbereichen, 
                einer voll ausgestatteten Bar für wichtige Gespräche und einem Pool-Bereich für die ruhigen Momente. 
                Hier werden Entscheidungen getroffen, Strategien geschmiedet und Loyalität belohnt.
              </span>
            </p>
            <p className="text-gray-300 leading-relaxed italic text-sm border-l-2 border-primary/50 pl-4 mt-4">
              "In den Bergen geboren, durch Blut verbunden – La Santa Calavera."
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Standort */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <MapPin className="h-5 w-5" />
            Standort
          </CardTitle>
          <CardDescription>
            {isLeadership 
              ? 'Lokalisierung der Casa (nur für Leadership sichtbar und editierbar)'
              : 'Standort-Informationen'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLeadership ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="postalCode" className="text-white">PLZ</Label>
                <Input
                  id="postalCode"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  placeholder="z.B. 12345"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="additionalInfo" className="text-white">Zusätzliche Informationen</Label>
                <Textarea
                  id="additionalInfo"
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="z.B. Berge, abgelegen, sichere Zufahrt..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                />
              </div>
              <Button
                onClick={handleSaveLocation}
                disabled={updateLocationMutation.isPending}
                className="lasanta-button-primary w-full"
              >
                {updateLocationMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wird gespeichert...
                  </>
                ) : (
                  'Standort speichern'
                )}
              </Button>
            </>
          ) : (
            <div className="space-y-2 text-white">
              {casaInfo?.postalCode && (
                <div>
                  <span className="font-semibold text-primary">PLZ: </span>
                  <span>{casaInfo.postalCode}</span>
                </div>
              )}
              {casaInfo?.additionalInfo && (
                <div>
                  <span className="font-semibold text-primary">Info: </span>
                  <span>{casaInfo.additionalInfo}</span>
                </div>
              )}
              {!casaInfo?.postalCode && !casaInfo?.additionalInfo && (
                <p className="text-gray-400 italic">Noch keine Standort-Informationen hinterlegt.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bildergalerie */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-primary">Impressionen</CardTitle>
          <CardDescription>
            Bilder unserer Casa in Grapeseed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CASA_IMAGES.map((image) => (
              <div key={image.id} className="relative group">
                <img
                  src={`/casa/${image.filename}`}
                  alt={image.alt}
                  className="w-full h-64 object-cover rounded-lg border border-gray-700 hover:border-primary/50 transition-colors"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 rounded-b-lg">
                  <p className="text-white text-sm font-medium">{image.alt}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
