import { Link } from 'react-router-dom'
import { Map, List, Users, Shield } from 'lucide-react'
import { usePageTitle } from '../hooks/usePageTitle'
import { useAuthStore } from '../stores/auth'

export default function PartnerDashboardPage() {
  const { user } = useAuthStore()
  usePageTitle('Partner-Bereich')

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-600/5 to-transparent rounded-2xl border border-amber-500/20 p-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-amber-500/20 rounded-xl">
            <Shield className="h-8 w-8 text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Willkommen, {user?.username}!
            </h1>
            <p className="text-gray-400 mt-1">
              Partner-Bereich mit eingeschränktem Zugang
            </p>
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Users className="h-5 w-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-gray-300 text-sm">
              Als Partner hast du Zugang zur interaktiven Karte und zur Listenführung. 
              Du kannst Familien-Standorte einsehen und Änderungsvorschläge einreichen, 
              die von der Leadership geprüft werden.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Access Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Interactive Map */}
        <Link 
          to="/karte"
          className="group bg-gray-800/50 hover:bg-gray-800/70 rounded-2xl border border-gray-700/50 hover:border-amber-500/30 p-6 transition-all duration-300"
        >
          <div className="flex items-start gap-4">
            <div className="p-4 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 rounded-xl group-hover:from-emerald-500/30 group-hover:to-emerald-600/20 transition-all">
              <Map className="h-8 w-8 text-emerald-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white group-hover:text-amber-400 transition-colors">
                Interaktive Karte
              </h2>
              <p className="text-gray-400 text-sm mt-2">
                Sieh dir die Standorte aller bekannten Familien auf der Karte an. 
                Du kannst neue Standorte vorschlagen oder bestehende aktualisieren.
              </p>
              <div className="mt-4 flex items-center gap-2 text-amber-400 text-sm font-medium">
                <span>Zur Karte</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </div>
        </Link>

        {/* List Management */}
        <Link 
          to="/listenfuehrung"
          className="group bg-gray-800/50 hover:bg-gray-800/70 rounded-2xl border border-gray-700/50 hover:border-amber-500/30 p-6 transition-all duration-300"
        >
          <div className="flex items-start gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl group-hover:from-blue-500/30 group-hover:to-blue-600/20 transition-all">
              <List className="h-8 w-8 text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-white group-hover:text-amber-400 transition-colors">
                Listenführung
              </h2>
              <p className="text-gray-400 text-sm mt-2">
                Verwalte Familien-Kontakte und deren Informationen. 
                Schlage neue Einträge vor oder aktualisiere bestehende Daten.
              </p>
              <div className="mt-4 flex items-center gap-2 text-amber-400 text-sm font-medium">
                <span>Zur Listenführung</span>
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Guidelines */}
      <div className="bg-gray-800/30 rounded-2xl border border-gray-700/50 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Richtlinien für Partner</h3>
        <ul className="space-y-3 text-gray-400 text-sm">
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-1">•</span>
            <span>Alle deine Änderungen müssen von der Leadership genehmigt werden</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-1">•</span>
            <span>Du kannst keine Einträge direkt löschen - nur Löschvorschläge einreichen</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-1">•</span>
            <span>Stammdaten und interne Informationen sind nicht sichtbar</span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-amber-400 mt-1">•</span>
            <span>Bei Fragen wende dich an die Leadership</span>
          </li>
        </ul>
      </div>
    </div>
  )
}

