import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '../components/ui/button'
import { Shield, Users, FileText, AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { usePageTitle } from '../hooks/usePageTitle'
import { api } from '../lib/api'

interface PartnerRequestData {
  discordId: string
  username: string
  avatarUrl?: string
  email?: string
  wasRejected?: boolean
  rejectionNote?: string
}

function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift()
    return cookieValue ? decodeURIComponent(cookieValue) : null
  }
  return null
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

export default function PartnerRequestPage() {
  const navigate = useNavigate()
  const [partnerData, setPartnerData] = useState<PartnerRequestData | null>(null)
  const [familyName, setFamilyName] = useState('')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [countdown, setCountdown] = useState(30)
  
  usePageTitle('Partner-Zugang anfordern')

  useEffect(() => {
    // Parse partner data from cookie
    console.log('[PartnerRequestPage] All cookies:', document.cookie)
    const cookieData = getCookie('partner_request_data')
    console.log('[PartnerRequestPage] Cookie data:', cookieData)
    
    if (cookieData) {
      try {
        const parsed = JSON.parse(cookieData)
        console.log('[PartnerRequestPage] Parsed data:', parsed)
        setPartnerData(parsed)
      } catch (e) {
        console.error('Failed to parse partner request data:', e)
        navigate('/login')
      }
    } else {
      console.log('[PartnerRequestPage] No cookie found, redirecting to login')
      // No partner data, redirect to login
      navigate('/login')
    }
  }, [navigate])

  useEffect(() => {
    // Countdown after successful submission
    if (success && countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1)
      }, 1000)
      return () => clearTimeout(timer)
    } else if (success && countdown === 0) {
      // Clear cookie and redirect
      deleteCookie('partner_request_data')
      navigate('/login')
    }
  }, [success, countdown, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!partnerData) return
    
    if (!familyName.trim()) {
      setError('Bitte gib den Namen deiner Familie an')
      return
    }
    
    if (!reason.trim()) {
      setError('Bitte gib eine Begründung für deinen Zugangsantrag an')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await api.post('/partner/submit-request', {
        discordId: partnerData.discordId,
        username: partnerData.username,
        avatarUrl: partnerData.avatarUrl,
        familyName: familyName.trim(),
        reason: reason.trim(),
      })
      
      setSuccess(true)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Fehler beim Einreichen der Anfrage')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    deleteCookie('partner_request_data')
    navigate('/login')
  }

  if (!partnerData) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 overflow-hidden relative">
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-green-500/20 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950" />
        </div>

        <div className="relative w-full max-w-md">
          <div className="absolute -inset-4 bg-gradient-to-r from-green-500/20 via-emerald-500/10 to-green-500/20 rounded-3xl blur-2xl opacity-60 pointer-events-none" />
          
          <div className="relative bg-gradient-to-br from-zinc-900/90 via-zinc-900/95 to-zinc-950/90 backdrop-blur-xl rounded-3xl border border-green-500/20 shadow-2xl shadow-green-500/10 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent" />
            
            <div className="p-8 text-center">
              <div className="mb-6">
                <div className="mx-auto w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                  <CheckCircle className="h-10 w-10 text-green-400" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Anfrage eingereicht!</h1>
                <p className="text-zinc-400">
                  Deine Partner-Zugangsanfrage wurde erfolgreich übermittelt und wird von der Leadership geprüft.
                </p>
              </div>

              <div className="bg-zinc-800/50 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3 text-zinc-300">
                  <Clock className="h-5 w-5 text-orange-400" />
                  <span>Du wirst in {countdown} Sekunden zur Login-Seite weitergeleitet</span>
                </div>
              </div>

              <Button
                onClick={handleCancel}
                variant="outline"
                className="w-full border-zinc-600 text-zinc-300 hover:bg-zinc-800"
              >
                Jetzt zur Login-Seite
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-red-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-3xl" />
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(251,191,36,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.3) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950" />
      </div>

      <div className="relative w-full max-w-lg">
        <div className="absolute -inset-4 bg-gradient-to-r from-orange-500/20 via-orange-500/10 to-red-500/20 rounded-3xl blur-2xl opacity-60 pointer-events-none" />
        
        <div className="relative bg-gradient-to-br from-zinc-900/90 via-zinc-900/95 to-zinc-950/90 backdrop-blur-xl rounded-3xl border border-orange-500/20 shadow-2xl shadow-orange-500/10 overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
          
          <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-orange-500/30 rounded-tl-lg" />
          <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-orange-500/30 rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-orange-500/30 rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-orange-500/30 rounded-br-lg" />

          <div className="p-8">
            {/* Header */}
            <div className="flex flex-col items-center mb-8">
              <div className="relative mb-4">
                <div className="absolute inset-0 scale-125">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 to-red-500/20 rounded-full blur-xl animate-pulse" />
                </div>
                <div className="relative w-20 h-20 bg-zinc-800 rounded-full flex items-center justify-center border-2 border-orange-500/30">
                  {partnerData.avatarUrl ? (
                    <img 
                      src={partnerData.avatarUrl} 
                      alt={partnerData.username}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <Users className="h-10 w-10 text-orange-400" />
                  )}
                </div>
              </div>

              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-400 text-center">
                Partner-Zugang anfordern
              </h1>
              <p className="text-zinc-400 text-sm mt-2">
                Willkommen, <span className="text-orange-400 font-medium">{partnerData.username}</span>
              </p>
            </div>

            {/* Rejection Warning */}
            {partnerData.wasRejected && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-300 font-medium text-sm">Deine vorherige Anfrage wurde abgelehnt</p>
                    {partnerData.rejectionNote && (
                      <p className="text-red-400/80 text-xs mt-1">{partnerData.rejectionNote}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Info Banner */}
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-zinc-300 text-sm">
                    Beantrage Zugang zum eingeschränkten Partner-Bereich. Deine Anfrage wird von der Leadership geprüft.
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  <Users className="inline h-4 w-4 mr-1.5 text-orange-400" />
                  Von welcher Familie bist du?
                </label>
                <input
                  type="text"
                  value={familyName}
                  onChange={(e) => setFamilyName(e.target.value)}
                  placeholder="z.B. Retro Cartel"
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all"
                  maxLength={100}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  <FileText className="inline h-4 w-4 mr-1.5 text-orange-400" />
                  Warum möchtest du Zugang?
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Erkläre kurz, warum du Partner-Zugang benötigst..."
                  rows={4}
                  className="w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all resize-none"
                  maxLength={500}
                />
                <p className="text-xs text-zinc-500 mt-1 text-right">{reason.length}/500</p>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  onClick={handleCancel}
                  variant="outline"
                  className="flex-1 border-zinc-600 text-zinc-300 hover:bg-zinc-800"
                >
                  Abbrechen
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                      Wird gesendet...
                    </>
                  ) : (
                    'Anfrage absenden'
                  )}
                </Button>
              </div>
            </form>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-zinc-800/50 text-center">
              <p className="text-zinc-500 text-xs">
                Mit dem Absenden stimmst du zu, dass deine Anfrage von der Leadership geprüft wird.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

