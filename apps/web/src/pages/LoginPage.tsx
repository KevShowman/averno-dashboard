import { Navigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuthStore } from '../stores/auth'
import { Button } from '../components/ui/button'
import { Shield, Lock, Sparkles, Car, Users } from 'lucide-react'
import { usePageTitle } from '../hooks/usePageTitle'

export default function LoginPage() {
  const { isAuthenticated, login, partnerLogin, taxiLogin } = useAuthStore()
  const [rememberMe, setRememberMe] = useState(true)
  const [isHovering, setIsHovering] = useState(false)
  const [isPartnerHovering, setIsPartnerHovering] = useState(false)
  const [isTaxiHovering, setIsTaxiHovering] = useState(false)
  
  usePageTitle('Anmelden')

  if (isAuthenticated) {
    return <Navigate to="/app" replace />
  }

  const handleLogin = () => {
    localStorage.setItem('rememberMe', rememberMe ? 'true' : 'false')
    login()
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated Background */}
      <div className="absolute inset-0">
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 -left-20 w-96 h-96 bg-orange-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-red-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-orange-600/10 rounded-full blur-3xl" />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(251,191,36,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(251,191,36,0.3) 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
        
        {/* Radial Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-zinc-950/50 to-zinc-950" />
      </div>

      {/* Main Content */}
      <div className="relative w-full max-w-lg">
        {/* Glow Behind Card */}
        <div className="absolute -inset-4 bg-gradient-to-r from-orange-500/20 via-orange-500/10 to-red-500/20 rounded-3xl blur-2xl opacity-60 pointer-events-none" />
        
        {/* Card */}
        <div className="relative bg-gradient-to-br from-zinc-900/90 via-zinc-900/95 to-zinc-950/90 backdrop-blur-xl rounded-3xl border border-orange-500/20 shadow-2xl shadow-orange-500/10 overflow-hidden">
          {/* Decorative Top Border */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-500 to-transparent" />
          
          {/* Corner Decorations */}
          <div className="absolute top-4 left-4 w-8 h-8 border-l-2 border-t-2 border-orange-500/30 rounded-tl-lg" />
          <div className="absolute top-4 right-4 w-8 h-8 border-r-2 border-t-2 border-orange-500/30 rounded-tr-lg" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-l-2 border-b-2 border-orange-500/30 rounded-bl-lg" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-r-2 border-b-2 border-orange-500/30 rounded-br-lg" />

          <div className="p-8 md:p-12">
            {/* Logo Section */}
            <div className="flex flex-col items-center mb-10">
              <div className="relative mb-6">
                {/* Animated Glow Rings */}
                <div className="absolute inset-0 scale-150">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/30 to-red-500/20 rounded-full blur-2xl animate-pulse" />
                </div>
                <div className="absolute -inset-4 border-2 border-orange-500/20 rounded-full animate-[spin_20s_linear_infinite]" />
                <div className="absolute -inset-8 border border-orange-500/10 rounded-full animate-[spin_30s_linear_infinite_reverse]" />
                
                {/* Logo */}
                <div className="relative">
                  <img 
                    src="/logo.png" 
                    alt="El Averno Cartel" 
                    className="h-32 w-32 object-contain drop-shadow-[0_0_30px_rgba(251,191,36,0.6)] transition-transform duration-500 hover:scale-110"
                  />
                </div>
              </div>

              {/* Title */}
              <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-300 to-orange-400 tracking-tight text-center">
                El Averno Cartel
              </h1>
              <div className="flex items-center gap-2 mt-3">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-orange-500/50" />
                <Sparkles className="h-4 w-4 text-orange-500/70" />
                <span className="text-orange-500/70 text-sm font-medium tracking-widest uppercase">
                  Familia Management
                </span>
                <Sparkles className="h-4 w-4 text-orange-500/70" />
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-orange-500/50" />
              </div>
            </div>

            {/* Info Banner */}
            <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-4 mb-8">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Shield className="h-5 w-5 text-orange-400" />
                </div>
                <p className="text-zinc-300 text-sm">
                  Melde dich mit Discord an, um Zugang zum Kartell-Dashboard zu erhalten.
                </p>
              </div>
            </div>

            {/* Discord Login Button */}
            <button
              onClick={handleLogin}
              onMouseEnter={() => setIsHovering(true)}
              onMouseLeave={() => setIsHovering(false)}
              className="group relative w-full overflow-hidden rounded-xl transition-all duration-300"
            >
              {/* Button Background */}
              <div className={`absolute inset-0 bg-gradient-to-r from-[#5865F2] via-[#6B74F7] to-[#5865F2] transition-opacity duration-300 ${isHovering ? 'opacity-100' : 'opacity-90'}`} />
              <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full transition-transform duration-700 ${isHovering ? 'translate-x-full' : ''}`} />
              
              {/* Button Content */}
              <div className="relative flex items-center justify-center gap-3 py-4 px-6 text-white font-semibold text-lg">
                <svg className={`w-7 h-7 transition-transform duration-300 ${isHovering ? 'scale-110' : ''}`} viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                </svg>
                <span>Mit Discord anmelden</span>
              </div>
              
              {/* Glow Effect */}
              <div className={`absolute -inset-1 bg-[#5865F2]/50 blur-xl transition-opacity duration-300 -z-10 pointer-events-none ${isHovering ? 'opacity-50' : 'opacity-0'}`} />
            </button>

            {/* Remember Me - Modern Toggle */}
            <div className="mt-6">
              <button 
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className="group w-full flex items-center justify-between py-4 px-5 bg-zinc-800/30 hover:bg-zinc-800/50 rounded-xl border border-zinc-700/50 hover:border-orange-500/30 cursor-pointer transition-all duration-300"
              >
                <div className="flex items-center gap-3">
                  <Lock className="h-4 w-4 text-zinc-500 group-hover:text-orange-400 transition-colors" />
                  <span className="text-sm font-medium text-zinc-300 group-hover:text-white transition-colors">
                    Eingeloggt bleiben (7 Tage)
                  </span>
                </div>
                
                {/* Modern Toggle Switch */}
                <div className={`relative w-12 h-6 rounded-full transition-all duration-300 ${
                  rememberMe 
                    ? 'bg-gradient-to-r from-orange-500 to-orange-500 shadow-lg shadow-orange-500/30' 
                    : 'bg-zinc-700'
                }`}>
                  <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 ${
                    rememberMe ? 'left-7' : 'left-1'
                  }`} />
                </div>
              </button>
            </div>

            {/* Footer */}
            <div className="mt-10 pt-6 border-t border-zinc-800/50">
              <div className="flex flex-col items-center gap-3">
                <p className="text-zinc-500 text-sm text-center">
                  Nur autorisierte Kartell-Mitglieder haben Zugang.
                </p>
                <div className="flex items-center gap-3 text-orange-500/60">
                  <div className="h-px w-8 bg-gradient-to-r from-transparent to-orange-500/30" />
                  <span className="text-sm font-medium tracking-wider">VIVA LA SANTA</span>
                  <div className="h-px w-8 bg-gradient-to-l from-transparent to-orange-500/30" />
                </div>
              </div>
            </div>

            {/* Partner & Taxi Login Split */}
            <div className="mt-6 pt-4 border-t border-zinc-800/30">
              <div className="flex gap-2">
                {/* Partner Login - Left */}
                <button
                  onClick={partnerLogin}
                  onMouseEnter={() => setIsPartnerHovering(true)}
                  onMouseLeave={() => setIsPartnerHovering(false)}
                  className="group relative flex-1 overflow-hidden rounded-lg transition-all duration-300"
                >
                  {/* Button Background */}
                  <div className={`absolute inset-0 bg-gradient-to-r from-zinc-700 via-zinc-600 to-zinc-700 transition-opacity duration-300 ${isPartnerHovering ? 'opacity-100' : 'opacity-80'}`} />
                  <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full transition-transform duration-700 ${isPartnerHovering ? 'translate-x-full' : ''}`} />
                  
                  {/* Button Content */}
                  <div className="relative flex items-center justify-center gap-2 py-3 px-3 text-zinc-200 font-medium text-sm">
                    <Users className={`w-4 h-4 transition-transform duration-300 ${isPartnerHovering ? 'scale-110' : ''}`} />
                    <span>Partner</span>
                  </div>
                </button>

                {/* Taxi Login - Right (Yellow) */}
                <button
                  onClick={taxiLogin}
                  onMouseEnter={() => setIsTaxiHovering(true)}
                  onMouseLeave={() => setIsTaxiHovering(false)}
                  className="group relative flex-1 overflow-hidden rounded-lg transition-all duration-300"
                >
                  {/* Button Background - Yellow/Gold */}
                  <div className={`absolute inset-0 bg-gradient-to-r from-orange-600 via-orange-500 to-orange-600 transition-opacity duration-300 ${isTaxiHovering ? 'opacity-100' : 'opacity-80'}`} />
                  <div className={`absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full transition-transform duration-700 ${isTaxiHovering ? 'translate-x-full' : ''}`} />
                  
                  {/* Button Content */}
                  <div className="relative flex items-center justify-center gap-2 py-3 px-3 text-zinc-900 font-semibold text-sm">
                    <Car className={`w-4 h-4 transition-transform duration-300 ${isTaxiHovering ? 'scale-110' : ''}`} />
                    <span>Taxi</span>
                  </div>
                  
                  {/* Glow Effect */}
                  <div className={`absolute -inset-1 bg-orange-500/40 blur-lg transition-opacity duration-300 -z-10 pointer-events-none ${isTaxiHovering ? 'opacity-50' : 'opacity-0'}`} />
                </button>
              </div>
              <p className="text-zinc-600 text-xs text-center mt-2">
                Partner-Familien • Taxi-Fahrer (mit Zugangsschlüssel)
              </p>
            </div>
          </div>
        </div>

        {/* Version Badge */}
        <div className="absolute -bottom-12 left-1/2 -translate-x-1/2">
          <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900/80 backdrop-blur-sm rounded-full border border-zinc-800">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-xs text-zinc-500">El Averno System v1.0</span>
          </div>
        </div>
      </div>
    </div>
  )
}
