import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../stores/auth'

interface ProtectedRouteProps {
  children: React.ReactNode
}

// Routes that partners are allowed to access
const PARTNER_ALLOWED_ROUTES = [
  '/app/partner',
  '/karte',
  '/listenfuehrung',
  '/tafelrunde',
]

// Routes that taxi users are allowed to access
const TAXI_ALLOWED_ROUTES = [
  '/taxi',
]

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, user } = useAuthStore()
  const location = useLocation()

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />
  }

  // Taxi access restriction (only taxi routes allowed)
  if (user.isTaxi && !user.isTaxiLead) {
    const isAllowed = TAXI_ALLOWED_ROUTES.some(route => 
      location.pathname === route || location.pathname.startsWith(route + '/')
    )
    
    if (!isAllowed) {
      return <Navigate to="/taxi" replace />
    }
  }

  // Partner access restriction
  if (user.isPartner && !user.isTaxi) {
    const isAllowed = PARTNER_ALLOWED_ROUTES.some(route => 
      location.pathname === route || location.pathname.startsWith(route + '/')
    )
    
    if (!isAllowed) {
      return <Navigate to="/app/partner" replace />
    }
  }

  return <>{children}</>
}

