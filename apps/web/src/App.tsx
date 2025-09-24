import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LagerPage from './pages/LagerPage'
import LagerMovementsPage from './pages/LagerMovementsPage'
import KassePage from './pages/KassePage'
import KokainPage from './pages/KokainPage'
import AuditPage from './pages/AuditPage'
import SettingsPage from './pages/SettingsPage'
import TickerPage from './pages/TickerPage'
import WeeklyDeliveryPage from './pages/WeeklyDeliveryPage'
import SanctionsPage from './pages/SanctionsPage'
import UserManagementPage from './pages/UserManagementPage'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import IcNameModal from './components/IcNameModal'
import { ErrorBoundary } from './components/ErrorBoundary'
import { setupVersionChecking } from './lib/versionCheck'

function App() {
  const { checkAuth, isLoading, user, isAuthenticated, setQueryClient } = useAuthStore()
  const queryClient = useQueryClient()
  const [showIcNameModal, setShowIcNameModal] = useState(false)

  // Set the query client in the auth store
  useEffect(() => {
    setQueryClient(queryClient)
  }, [queryClient, setQueryClient])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Setup version checking for cache busting
  useEffect(() => {
    setupVersionChecking()
  }, [])

  // Check for redirect URL after login and redirect if needed
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectUrl = localStorage.getItem('redirectUrl')
      if (redirectUrl && redirectUrl !== window.location.pathname) {
        localStorage.removeItem('redirectUrl')
        window.location.href = redirectUrl
      }
    }
  }, [isAuthenticated, user])

  // Show IC name modal if user is authenticated but has no IC name
  useEffect(() => {
    if (user && !user.icFirstName && !user.icLastName) {
      setShowIcNameModal(true)
    }
  }, [user])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/app" element={
          <ProtectedRoute>
            <Layout>
              <DashboardPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/lager" element={
          <ProtectedRoute>
            <Layout>
              <LagerPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/lager-movements" element={
          <ProtectedRoute>
            <Layout>
              <LagerMovementsPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/kasse" element={
          <ProtectedRoute>
            <Layout>
              <KassePage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/kokain" element={
          <ProtectedRoute>
            <Layout>
              <KokainPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/audit" element={
          <ProtectedRoute>
            <Layout>
              <AuditPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute>
            <Layout>
              <SettingsPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/ticker" element={
          <ProtectedRoute>
            <Layout>
              <TickerPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/weekly-delivery" element={
          <ProtectedRoute>
            <Layout>
              <WeeklyDeliveryPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/sanctions" element={
          <ProtectedRoute>
            <Layout>
              <SanctionsPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/user-management" element={
          <ProtectedRoute>
            <Layout>
              <UserManagementPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/" element={<Navigate to="/app" replace />} />
      </Routes>
      
      {/* IC Name Modal */}
      {user && (
        <IcNameModal
          isOpen={showIcNameModal}
          onClose={() => setShowIcNameModal(false)}
          username={user.username}
        />
      )}
    </ErrorBoundary>
  )
}

export default App
