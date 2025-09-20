import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import { useEffect, useState } from 'react'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LagerPage from './pages/LagerPage'
import LagerMovementsPage from './pages/LagerMovementsPage'
import KassePage from './pages/KassePage'
import KokainPage from './pages/KokainPage'
import AuditPage from './pages/AuditPage'
import SettingsPage from './pages/SettingsPage'
import TickerPage from './pages/TickerPage'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import IcNameModal from './components/IcNameModal'

function App() {
  const { checkAuth, isLoading, user } = useAuthStore()
  const [showIcNameModal, setShowIcNameModal] = useState(false)

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

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
    <>
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
    </>
  )
}

export default App
