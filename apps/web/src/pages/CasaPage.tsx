import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useAuthStore } from '../stores/auth'
import { api } from '../lib/api'
import { toast } from 'sonner'
import { Home, MapPin, Upload, Loader2, Trash2, Mountain, Shield, Key } from 'lucide-react'
import { hasRole } from '../lib/utils'

interface CasaInfo {
  postalCode: string | null
  additionalInfo: string | null
  images: Array<{
    id: string
    filename: string
    url: string
    createdAt: string
  }>
}

export default function CasaPage() {
  const { user } = useAuthStore()
  const queryClient = useQueryClient()
  const [postalCode, setPostalCode] = useState('')
  const [additionalInfo, setAdditionalInfo] = useState('')
  const [uploadingImage, setUploadingImage] = useState(false)

  const isLeadership = hasRole(user, ['EL_PATRON', 'DON_CAPITAN', 'DON_COMANDANTE', 'EL_MANO_DERECHA'])

  // Query Casa Info
  const { data: casaInfo, isLoading } = useQuery<CasaInfo>({
    queryKey: ['casa-info'],
    queryFn: () => api.get('/casa').then(res => res.data),
  })

  // Set initial values when data loads
  useState(() => {
    if (casaInfo) {
      setPostalCode(casaInfo.postalCode || '')
      setAdditionalInfo(casaInfo.additionalInfo || '')
    }
  })

  // Update Location Mutation
  const updateLocationMutation = useMutation({
    mutationFn: (data: { postalCode: string; additionalInfo: string }) =>
      api.put('/casa/location', data),
    onSuccess: () => {
      toast.success('Lokalisierung erfolgreich aktualisiert!')
      queryClient.invalidateQueries({ queryKey: ['casa-info'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Aktualisieren')
    },
  })

  // Upload Image
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('image', file)

    setUploadingImage(true)
    try {
      await api.post('/casa/images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      toast.success('Bild erfolgreich hochgeladen!')
      queryClient.invalidateQueries({ queryKey: ['casa-info'] })
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Fehler beim Hochladen')
    } finally {
      setUploadingImage(false)
      e.target.value = ''
    }
  }

  // Delete Image Mutation
  const deleteImageMutation = useMutation({
    mutationFn: (imageId: string) => api.delete(`/casa/images/${imageId}`),
    onSuccess: () => {
      toast.success('Bild erfolgreich gelöscht!')
      queryClient.invalidateQueries({ queryKey: ['casa-info'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler beim Löschen')
    },
  })

  const handleLocationUpdate = () => {
    updateLocationMutation.mutate({ postalCode, additionalInfo })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <header className="space-y-2">
        <h1 className="text-3xl font-bold text-white flex items-center gap-3">
          <Home className="h-8 w-8 text-primary" />
          La Casa de LaSanta
        </h1>
        <p className="text-gray-400">
          Unsere Basis. Unser Refugio. Der Ort, wo die Familia zusammenkommt.
        </p>
      </header>

      {/* RP Description */}
      <Card className="lasanta-card border-primary/50">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Mountain className="h-5 w-5 text-primary" />
            El Refugio en las Montañas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-gray-300">
          <div className="bg-gradient-to-r from-primary/10 to-transparent p-4 rounded-lg border-l-4 border-primary">
            <p className="leading-relaxed">
              <span className="text-primary font-semibold">Hoch oben in den Bergen von Grapeseed</span>, weitab vom Lärm der Stadt und den neugierigen Blicken der Außenwelt, 
              steht unsere Villa – <span className="text-white font-medium">La Casa de LaSanta Calavera</span>. Ein Ort der Ruhe, der Sicherheit, des Respekts.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <Shield className="h-6 w-6 text-primary mb-2" />
              <h3 className="text-white font-semibold mb-1">Seguridad Total</h3>
              <p className="text-sm text-gray-400">
                Abgelegen, gesichert, überwacht. Niemand kommt hierher, ohne dass wir es wissen. Die Berge sind unsere Festung.
              </p>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <Home className="h-6 w-6 text-primary mb-2" />
              <h3 className="text-white font-semibold mb-1">Lujo y Espacio</h3>
              <p className="text-sm text-gray-400">
                Modern, hochwertig, weitläufig. Hier haben wir Platz zum Planen, zum Feiern, zum Leben. Clase pura.
              </p>
            </div>

            <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700">
              <Key className="h-6 w-6 text-primary mb-2" />
              <h3 className="text-white font-semibold mb-1">Privacidad</h3>
              <p className="text-sm text-gray-400">
                Was in der Casa geschieht, bleibt in der Casa. Hier sind wir unter uns – la familia, unidos.
              </p>
            </div>
          </div>

          <div className="bg-primary/10 p-4 rounded-lg border border-primary/30 text-center">
            <p className="text-sm italic text-gray-300">
              "Die Casa ist nicht nur ein Haus. Sie ist das Herz der Familia. Wer hier eintritt, tritt in unsere Welt ein – mit allem, was dazu gehört."
            </p>
            <p className="text-xs text-primary mt-2">– El Patrón</p>
          </div>
        </CardContent>
      </Card>

      {/* Location Information */}
      <Card className="lasanta-card">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            Lokalisierung
          </CardTitle>
          <CardDescription className="text-gray-400">
            {isLeadership ? 'Lege die Lokalisierung der Casa fest' : 'Informationen zur Casa-Lokalisierung'}
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
                <Label htmlFor="additionalInfo" className="text-white">Zusatzinformationen</Label>
                <Input
                  id="additionalInfo"
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="z.B. Grapeseed, Berge Nord-Ost"
                  className="bg-gray-800 border-gray-700 text-white"
                />
              </div>
              <Button
                onClick={handleLocationUpdate}
                disabled={updateLocationMutation.isPending}
                className="lasanta-button-primary w-full"
              >
                {updateLocationMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Lokalisierung speichern
              </Button>
            </>
          ) : (
            <div className="space-y-3">
              {casaInfo?.postalCode || casaInfo?.additionalInfo ? (
                <>
                  {casaInfo.postalCode && (
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">PLZ</p>
                      <p className="text-lg font-semibold text-white">{casaInfo.postalCode}</p>
                    </div>
                  )}
                  {casaInfo.additionalInfo && (
                    <div className="bg-gray-800/50 p-4 rounded-lg">
                      <p className="text-sm text-gray-400">Zusatzinformationen</p>
                      <p className="text-lg font-semibold text-white">{casaInfo.additionalInfo}</p>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Noch keine Lokalisierung festgelegt</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Images */}
      <Card className="lasanta-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-white">Bilder der Casa</CardTitle>
              <CardDescription className="text-gray-400">
                {isLeadership ? 'Verwalte die Bilder der Casa' : 'Impressionen unserer Basis'}
              </CardDescription>
            </div>
            {isLeadership && (
              <div>
                <input
                  type="file"
                  id="image-upload"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  disabled={uploadingImage}
                />
                <Button
                  onClick={() => document.getElementById('image-upload')?.click()}
                  disabled={uploadingImage}
                  className="lasanta-button-primary"
                >
                  {uploadingImage ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="mr-2 h-4 w-4" />
                  )}
                  Bild hochladen
                </Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {casaInfo?.images && casaInfo.images.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {casaInfo.images.map((image) => (
                <div key={image.id} className="relative group">
                  <img
                    src={image.url}
                    alt="Casa"
                    className="w-full h-64 object-cover rounded-lg border border-gray-700"
                  />
                  {isLeadership && (
                    <button
                      onClick={() => deleteImageMutation.mutate(image.id)}
                      disabled={deleteImageMutation.isPending}
                      className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <Home className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p>Noch keine Bilder hochgeladen</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

