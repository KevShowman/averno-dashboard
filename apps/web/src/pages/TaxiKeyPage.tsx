import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { api } from '../lib/api'
import { useAuthStore } from '../stores/auth'
import { usePageTitle } from '../hooks/usePageTitle'
import { toast } from 'sonner'
import { Car, Key, Loader2, CheckCircle, AlertCircle, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'

// Cookie lesen (mit URL-decoding)
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    const part = parts.pop()
    if (part) {
      const cookieValue = part.split(';').shift() || ''
      try {
        // URL-decode falls nötig
        return decodeURIComponent(cookieValue)
      } catch {
        return cookieValue
      }
    }
  }
  return null
}

// Cookie löschen
function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

interface TaxiRequestData {
  discordId: string
  username: string
  avatarUrl?: string
  email?: string
}

export default function TaxiKeyPage() {
  const navigate = useNavigate()
  const { checkAuth } = useAuthStore()
  const [keyInput, setKeyInput] = useState('')
  const [taxiData, setTaxiData] = useState<TaxiRequestData | null>(null)
  const [loading, setLoading] = useState(true)
  
  usePageTitle('Taxi-Zugang')

  // Taxi-Daten aus Cookie lesen (mit kleiner Verzögerung, falls Cookie noch nicht gesetzt)
  useEffect(() => {
    const readCookie = () => {
      const cookieData = getCookie('taxi_request_data')
      console.log('[TaxiKeyPage] Cookie data:', cookieData)
      console.log('[TaxiKeyPage] All cookies:', document.cookie)
      
      if (cookieData) {
        try {
          const parsed = JSON.parse(cookieData)
          console.log('[TaxiKeyPage] Parsed data:', parsed)
          setTaxiData(parsed)
          setLoading(false)
        } catch (e) {
          console.error('[TaxiKeyPage] Failed to parse cookie:', e)
          toast.error('Fehler beim Laden der Taxi-Daten')
          navigate('/login')
        }
      } else {
        console.log('[TaxiKeyPage] No taxi_request_data cookie found')
        // Warte kurz und versuche es nochmal - manchmal ist das Cookie noch nicht verfügbar
        setTimeout(() => {
          const retryData = getCookie('taxi_request_data')
          if (retryData) {
            try {
              const parsed = JSON.parse(retryData)
              setTaxiData(parsed)
              setLoading(false)
            } catch (e) {
              toast.error('Fehler beim Laden der Taxi-Daten')
              navigate('/login')
            }
          } else {
            toast.error('Keine Taxi-Daten gefunden. Bitte erneut einloggen.')
            navigate('/login')
          }
        }, 100)
      }
    }
    
    readCookie()
  }, [navigate])

  const validateKeyMutation = useMutation({
    mutationFn: (key: string) => {
      if (!taxiData) {
        throw new Error('Keine Taxi-Daten vorhanden')
      }
      // Neuen Endpoint verwenden der keine Authentifizierung benötigt
      return api.post('/taxi/keys/validate-new', { 
        key,
        discordId: taxiData.discordId,
        username: taxiData.username,
        avatarUrl: taxiData.avatarUrl,
        email: taxiData.email,
      })
    },
    onSuccess: async (response) => {
      const { valid, isMasterKey, message } = response.data
      
      if (valid) {
        toast.success(isMasterKey 
          ? 'Master-Key akzeptiert! Du hast Taxi-Leitungszugang.' 
          : 'Zugangsschlüssel akzeptiert! Du bist jetzt als Taxi-Fahrer registriert.'
        )
        
        // Cookie löschen
        deleteCookie('taxi_request_data')
        
        // Re-check auth to get updated user data (Tokens wurden vom Backend gesetzt)
        await checkAuth()
        
        // Redirect to taxi dashboard
        setTimeout(() => {
          navigate('/taxi')
        }, 1000)
      } else {
        toast.error(message || 'Ungültiger Zugangsschlüssel')
      }
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Fehler bei der Validierung')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (keyInput.trim() && taxiData) {
      validateKeyMutation.mutate(keyInput.trim())
    }
  }
  
  const handleBackToLogin = () => {
    // Wichtig: Cookie löschen beim Zurückgehen, um Sicherheitslücke zu verhindern
    deleteCookie('taxi_request_data')
    navigate('/login')
  }

  // Format key input as XXXX-XXXX-XXXX
  const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '')
    if (value.length > 12) value = value.slice(0, 12)
    
    // Add dashes
    if (value.length > 8) {
      value = `${value.slice(0, 4)}-${value.slice(4, 8)}-${value.slice(8)}`
    } else if (value.length > 4) {
      value = `${value.slice(0, 4)}-${value.slice(4)}`
    }
    
    setKeyInput(value)
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-orange-500 animate-spin" />
      </div>
    )
  }

  // Keine Taxi-Daten
  if (!taxiData) {
    return null // Navigation wird im useEffect ausgeführt
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Gradient Orbs - Yellow themed */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-orange-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-3xl" />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(234,179,8,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(234,179,8,0.3) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
        
        {/* Radial Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950" />
      </div>

      {/* Main Content */}
      <div className="relative w-full max-w-md">
        {/* Glow Behind Card */}
        <div className="absolute -inset-4 bg-gradient-to-r from-orange-500/20 via-orange-500/10 to-orange-500/20 rounded-3xl blur-2xl opacity-60 pointer-events-none" />
        
        {/* Card */}
        <div className="relative bg-gradient-to-br from-zinc-900/90 via-zinc-900/95 to-zinc-950/90 backdrop-blur-xl rounded-3xl border border-orange-500/20 shadow-2xl shadow-orange-500/10 overflow-hidden">
          {/* Decorative Top Border */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
          
          <div className="p-8">
            {/* Back Button */}
            <button
              onClick={handleBackToLogin}
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors mb-6"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm">Zurück zum Login</span>
            </button>

            {/* Header */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-4">
                <div className="absolute inset-0 bg-orange-500/30 rounded-full blur-xl animate-pulse" />
                <div className="relative p-4 bg-orange-500/20 rounded-full border border-orange-500/30">
                  <Car className="h-12 w-12 text-orange-400" />
                </div>
              </div>
              
              <h1 className="text-2xl font-bold text-white text-center">
                Taxi-Zugang
              </h1>
              <p className="text-zinc-400 text-sm text-center mt-2">
                Gib deinen Zugangsschlüssel ein
              </p>
              
              {taxiData && (
                <div className="mt-3 px-3 py-1.5 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
                  <span className="text-sm text-zinc-400">Discord: </span>
                  <span className="text-sm text-white font-medium">{taxiData.username}</span>
                </div>
              )}
            </div>

            {/* Key Input Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Zugangsschlüssel
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-orange-500/50" />
                  <Input
                    type="text"
                    value={keyInput}
                    onChange={handleKeyChange}
                    placeholder="XXXX-XXXX-XXXX"
                    className="pl-10 bg-zinc-800/50 border-zinc-700 text-white text-center text-lg tracking-widest font-mono placeholder:text-zinc-600 focus:border-orange-500/50 focus:ring-orange-500/20"
                    maxLength={14}
                    autoFocus
                  />
                </div>
                <p className="text-xs text-zinc-500 mt-2 text-center">
                  Erhalte deinen Schlüssel von der Taxi-Leitung
                </p>
              </div>

              <Button
                type="submit"
                disabled={keyInput.length < 14 || validateKeyMutation.isPending}
                className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-zinc-900 font-semibold py-3 transition-all duration-300"
              >
                {validateKeyMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Wird überprüft...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Zugang aktivieren
                  </>
                )}
              </Button>
            </form>

            {/* Info */}
            <div className="mt-8 p-4 bg-zinc-800/30 rounded-xl border border-zinc-700/50">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-zinc-400">
                  <p className="font-medium text-zinc-300 mb-1">Hinweis</p>
                  <p>
                    Nach Eingabe eines gültigen Schlüssels erhältst du Zugang zum Taxi-Dashboard 
                    und kannst deine zugewiesenen Abholungen einsehen.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

