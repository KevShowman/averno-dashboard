import { Link } from 'react-router-dom'
import { Clock, ArrowLeft, Shield } from 'lucide-react'
import { usePageTitle } from '../hooks/usePageTitle'

export default function PartnerPendingPage() {
  usePageTitle('Partner-Anfrage ausstehend')

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-zinc-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(251,191,36,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.3) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950" />
      </div>

      {/* Main Content */}
      <div className="relative w-full max-w-lg">
        <div className="absolute -inset-4 bg-gradient-to-r from-orange-500/10 via-zinc-500/10 to-orange-500/10 rounded-3xl blur-2xl opacity-60 pointer-events-none" />
        
        <div className="relative bg-gradient-to-br from-zinc-900/90 via-zinc-900/95 to-zinc-950/90 backdrop-blur-xl rounded-3xl border border-zinc-700/30 shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
          
          <div className="p-8 md:p-12">
            {/* Icon */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-orange-500/20 rounded-full blur-xl animate-pulse" />
                <div className="relative p-6 bg-gradient-to-br from-orange-500/20 to-orange-600/10 rounded-full border border-orange-500/30">
                  <Clock className="h-12 w-12 text-orange-400" />
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
              Anfrage ausstehend
            </h1>

            {/* Description */}
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 mb-8">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-orange-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-zinc-300 text-sm">
                    Deine Partner-Zugangsanfrage wird noch bearbeitet. Ein Mitglied der Führung wird deine Anfrage prüfen und genehmigen oder ablehnen.
                  </p>
                  <p className="text-zinc-500 text-xs mt-2">
                    Dies kann einige Zeit dauern. Du wirst benachrichtigt, sobald eine Entscheidung getroffen wurde.
                  </p>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="text-center space-y-4">
              <p className="text-zinc-400 text-sm">
                Du kannst diese Seite schließen. Versuche dich später erneut einzuloggen, um den Status deiner Anfrage zu prüfen.
              </p>
            </div>

            {/* Back to Login */}
            <Link
              to="/login"
              className="mt-8 flex items-center justify-center gap-2 py-3 px-4 text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Zurück zur Anmeldung</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

