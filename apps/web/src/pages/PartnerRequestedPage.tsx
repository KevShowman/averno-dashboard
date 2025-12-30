import { Link } from 'react-router-dom'
import { CheckCircle, ArrowLeft, Shield } from 'lucide-react'
import { usePageTitle } from '../hooks/usePageTitle'

export default function PartnerRequestedPage() {
  usePageTitle('Partner-Anfrage gesendet')

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-green-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(251,191,36,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.3) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-gray-950/50 to-gray-950" />
      </div>

      {/* Main Content */}
      <div className="relative w-full max-w-lg">
        <div className="absolute -inset-4 bg-gradient-to-r from-green-500/10 via-amber-500/10 to-green-500/10 rounded-3xl blur-2xl opacity-60 pointer-events-none" />
        
        <div className="relative bg-gradient-to-br from-gray-900/90 via-gray-900/95 to-gray-950/90 backdrop-blur-xl rounded-3xl border border-gray-700/30 shadow-2xl overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-green-500/50 to-transparent" />
          
          <div className="p-8 md:p-12">
            {/* Icon */}
            <div className="flex justify-center mb-8">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
                <div className="relative p-6 bg-gradient-to-br from-green-500/20 to-green-600/10 rounded-full border border-green-500/30">
                  <CheckCircle className="h-12 w-12 text-green-400" />
                </div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-2xl md:text-3xl font-bold text-white text-center mb-4">
              Anfrage gesendet!
            </h1>

            {/* Description */}
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4 mb-8">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-green-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-gray-300 text-sm">
                    Deine Partner-Zugangsanfrage wurde erfolgreich gesendet. Ein Mitglied der Führung wird deine Anfrage prüfen.
                  </p>
                  <p className="text-gray-500 text-xs mt-2">
                    Du erhältst Zugang zur interaktiven Karte und Listenführung, sobald deine Anfrage genehmigt wurde.
                  </p>
                </div>
              </div>
            </div>

            {/* What's Next */}
            <div className="space-y-3 mb-8">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider">Was passiert jetzt?</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 bg-amber-500 rounded-full" />
                  <span>Deine Anfrage wird von der Führung geprüft</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 bg-amber-500 rounded-full" />
                  <span>Bei Genehmigung erhältst du eingeschränkten Zugang</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 bg-amber-500 rounded-full" />
                  <span>Du kannst dann Familien auf der Karte sehen und Vorschläge machen</span>
                </li>
              </ul>
            </div>

            {/* Back to Login */}
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 py-3 px-4 text-gray-400 hover:text-white transition-colors"
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

