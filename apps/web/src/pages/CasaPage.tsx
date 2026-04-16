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
import { Home, MapPin, Loader2, Mountain, Shield, Key, Info, Sparkles } from 'lucide-react'
import { hasRole } from '../lib/utils'

interface CasaInfo {
  postalCode: string | null
  additionalInfo: string | null
}

const CASA_IMAGES = [
  { id: '1', filename: 'einfahrt-rundfahrt.png', alt: 'Einfahrt zu La Fuente Blanca' },
  { id: '2', filename: 'blood-pool.png', alt: 'Blood Pool' },
  { id: '3', filename: 'bar-pool.png', alt: 'Outdoor-Bar am Pool' },
  { id: '4', filename: 'wohnzimmer.png', alt: 'Wohnzimmer' },
  { id: '5', filename: 'besprechungs-circulo.png', alt: 'Besprechungs-Circulo' },
]

export default function CasaPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [postalCode, setPostalCode] = useState('')
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [isEditing, setIsEditing] = useState(false)

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
      setIsEditing(false)
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

  const handleCancel = () => {
    setPostalCode(casaInfo?.postalCode || '')
    setAdditionalInfo(casaInfo?.additionalInfo || '')
    setIsEditing(false)
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
            La Fuente Blanca – Der weiße Brunnen in den Vinewood Hills
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
              An der Senora Road in den Vinewood Hills liegt unser Anwesen – La Fuente Blanca, der weiße Brunnen. 
              Ein legendärer Ort, der einst Organizazia als Hauptquartier diente. Heute gehört er uns – 
              La Santa Calavera.
            </p>
            <p className="text-gray-300 leading-relaxed flex items-start gap-2">
              <Shield className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <span>
                Das weitläufige Gelände bietet alles, was ein Kartell braucht: Der ikonische weiße Brunnen am Eingang 
                markiert den Weg zu unserem Reich. Der Blood Pool – rot wie das Blut unserer Feinde – ist das Herzstück 
                des Anwesens. Umgeben von Palmen und bewacht von unserem Adler.
              </span>
            </p>
            <p className="text-gray-300 leading-relaxed flex items-start gap-2">
              <Key className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <span>
                Der Besprechungs-Circulo mit dem eingebrannten Calavera-Logo ist der Ort, an dem Entscheidungen 
                getroffen werden. Die überdachte Outdoor-Bar lädt zu Verhandlungen bei einem kühlen Drink ein. 
                Im eleganten Wohnzimmer werden Geschäfte besiegelt und Allianzen geschmiedet.
              </span>
            </p>
            <p className="text-gray-300 leading-relaxed italic text-sm border-l-2 border-primary/50 pl-4 mt-4">
              "La Fuente Blanca – wo der weiße Brunnen das Blut unserer Feinde wäscht."
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Standort */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-primary">
                <MapPin className="h-5 w-5" />
                Standort
              </CardTitle>
              <CardDescription>
                Lokalisierung der Casa
              </CardDescription>
            </div>
            {isLeadership && !isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                variant="outline"
                size="sm"
                className="text-primary border-primary hover:bg-primary/10"
              >
                Bearbeiten
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLeadership && isEditing ? (
            <>
              <div className="mb-4 p-3 bg-blue-900/20 border border-blue-700/50 rounded-lg flex items-start gap-2">
                <Info className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-blue-200">
                  Diese Informationen sind für alle Mitglieder sichtbar.
                </p>
              </div>
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
              <div className="flex gap-2">
                <Button
                  onClick={handleSaveLocation}
                  disabled={updateLocationMutation.isPending}
                  className="lasanta-button-primary flex-1"
                >
                  {updateLocationMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Wird gespeichert...
                    </>
                  ) : (
                    'Speichern'
                  )}
                </Button>
                <Button
                  onClick={handleCancel}
                  variant="outline"
                  disabled={updateLocationMutation.isPending}
                  className="flex-1"
                >
                  Abbrechen
                </Button>
              </div>
            </>
          ) : (
            <div className="space-y-4">
              {(casaInfo?.postalCode || casaInfo?.additionalInfo) ? (
                <>
                  {casaInfo?.postalCode && (
                    <div className="flex items-start gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                      <MapPin className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-400">Postleitzahl</p>
                        <p className="text-lg font-semibold text-white">{casaInfo.postalCode}</p>
                      </div>
                    </div>
                  )}
                  {casaInfo?.additionalInfo && (
                    <div className="flex items-start gap-3 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                      <Info className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-sm text-gray-400">Zusätzliche Informationen</p>
                        <p className="text-white leading-relaxed">{casaInfo.additionalInfo}</p>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8">
                  <MapPin className="h-12 w-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400 italic">Noch keine Standort-Informationen hinterlegt.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tagging Information */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            Tor-Tagging
          </CardTitle>
          <CardDescription>
            Informationen zum Markieren der Tore
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-gray-800/50 rounded-lg border border-gray-700">
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-white mb-2">Spray-Informationen</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Farbcode:</span>
                      <code className="px-2 py-1 bg-gray-900 border border-gray-700 rounded text-primary font-mono">
                        #cfb997
                      </code>
                      <div 
                        className="w-8 h-8 rounded border-2 border-gray-700" 
                        style={{ backgroundColor: '#cfb997' }}
                        title="Spray-Farbe"
                      />
                    </div>
                    <div className="flex items-start gap-2 mt-3">
                      <span className="text-gray-400">Position:</span>
                      <span className="text-white">Rechte Seite des Tores</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <span className="text-gray-400">Text:</span>
                      <span className="text-white font-bold text-lg">LSC</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-3 bg-amber-900/20 border border-amber-700/50 rounded-lg flex items-start gap-2">
              <Info className="h-5 w-5 text-amber-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-amber-200">
                Falls die Graffitis oder Sprays entfernt wurden, bitte auf der rechten Seite des Tores mit dem Kürzel <strong>"LSC"</strong> in der Farbe <strong>#cfb997</strong> und der dritten Schrift neu sprayen.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bildergalerie */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-primary">Impressionen</CardTitle>
          <CardDescription>
            Bilder von La Fuente Blanca
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {CASA_IMAGES.map((image, index) => {
              const isLastAndOdd = index === CASA_IMAGES.length - 1 && CASA_IMAGES.length % 2 === 1
              return (
                <div 
                  key={image.id} 
                  className={`relative group ${isLastAndOdd ? 'md:col-span-2' : ''}`}
                >
                  <img
                    src={`/casa/${image.filename}`}
                    alt={image.alt}
                    className={`w-full object-cover rounded-lg border border-gray-700 hover:border-primary/50 transition-colors ${isLastAndOdd ? 'h-[28rem]' : 'h-96'}`}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 rounded-b-lg">
                    <p className="text-white text-sm font-medium">{image.alt}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
