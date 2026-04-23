import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/auth'
import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import LagerPage from './pages/LagerPage'
import LagerMovementsPage from './pages/LagerMovementsPage'
import KassePage from './pages/KassePage'
import PackagesPage from './pages/PackagesPage'
import AuditPage from './pages/AuditPage'
import SettingsPage from './pages/SettingsPage'
import AufstellungenPage from './pages/AufstellungenPage'
import AbmeldungenPage from './pages/AbmeldungenPage'
import BloodListPage from './pages/BloodListPage'
import FamiliensammelnPage from './pages/FamiliensammelnPage'
import DiscordErrorPage from './pages/DiscordErrorPage'
import TickerPage from './pages/TickerPage'
import WeeklyDeliveryPage from './pages/WeeklyDeliveryPage'
import SanctionsPage from './pages/SanctionsPage'
import UserManagementPage from './pages/UserManagementPage'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import IcNameModal from './components/IcNameModal'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useVersionCheck } from './hooks/useVersionCheck'
import OrganigrammPage from './pages/OrganigrammPage'
import ClothingManagementPage from './pages/ClothingManagementPage'
import ClothingPage from './pages/ClothingPage'
import CommunicationPage from './pages/CommunicationPage'
import MemberFilesPage from './pages/MemberFilesPage'
import VehicleTuningPage from './pages/VehicleTuningPage'
import CasaPage from './pages/CasaPage'
import BotschaftPage from './pages/BotschaftPage'
import SicarioPage from './pages/SicarioPage'
import ListenfuehrungPage from './pages/ListenfuehrungPage'
import KartePage from './pages/KartePage'
import AttendancePage from './pages/AttendancePage'
import SlangPage from './pages/SlangPage'
import PartnerPendingPage from './pages/PartnerPendingPage'
import PartnerRequestedPage from './pages/PartnerRequestedPage'
import PartnerRequestPage from './pages/PartnerRequestPage'
import PartnerManagementPage from './pages/PartnerManagementPage'
import PartnerDashboardPage from './pages/PartnerDashboardPage'
import TafelrundePage from './pages/TafelrundePage'
import TaxiKeyPage from './pages/TaxiKeyPage'
import TaxiDashboardPage from './pages/TaxiDashboardPage'
import EquipmentPage from './pages/EquipmentPage'

// Wrapper to show Listenführung - Partner haben jetzt vollen Zugang
function ListenfuehrungWrapper() {
  // Partner haben jetzt vollen Zugang zur normalen Listenführung
  return <ListenfuehrungPage />
}

function App() {
  const { checkAuth, isLoading, user, isAuthenticated, setQueryClient } = useAuthStore()
  const queryClient = useQueryClient()
  const [showIcNameModal, setShowIcNameModal] = useState(false)
  
  // Version checking with toast notifications
  useVersionCheck()

  // Set the query client in the auth store
  useEffect(() => {
    setQueryClient(queryClient)
  }, [queryClient, setQueryClient])

  useEffect(() => {
    // Don't check auth on error pages, login page, or partner/taxi request pages
    const path = window.location.pathname;
    const unprotectedPaths = ['/discord-error', '/login', '/partner-request', '/partner-pending', '/partner-requested', '/taxi-key'];
    
    if (!unprotectedPaths.includes(path)) {
      checkAuth();
    } else {
      // Set loading to false for unprotected routes
      useAuthStore.setState({ isLoading: false });
    }
  }, [checkAuth])


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
  // Don't show for partners - they don't need IC names
  useEffect(() => {
    if (user && !user.icFirstName && !user.icLastName && !user.isPartner) {
      setShowIcNameModal(true)
    }
  }, [user])
  
  // Redirect partners to partner area if they try to access main app
  useEffect(() => {
    if (user?.isPartner && window.location.pathname === '/app') {
      window.location.href = '/app/partner'
    }
  }, [user])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <Routes>
        {/* Unprotected Routes - always accessible */}
        <Route path="/discord-error" element={<DiscordErrorPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/partner-pending" element={<PartnerPendingPage />} />
        <Route path="/partner-requested" element={<PartnerRequestedPage />} />
        <Route path="/partner-request" element={<PartnerRequestPage />} />
        <Route path="/taxi-key" element={<TaxiKeyPage />} />
        <Route path="/taxi" element={
          <ProtectedRoute>
            <Layout>
              <TaxiDashboardPage />
            </Layout>
          </ProtectedRoute>
        } />
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
        <Route path="/packages" element={
          <ProtectedRoute>
            <Layout>
              <PackagesPage />
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
        <Route path="/aufstellungen" element={
          <ProtectedRoute>
            <Layout>
              <AufstellungenPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/abmeldungen" element={
          <ProtectedRoute>
            <Layout>
              <AbmeldungenPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/bloodlist" element={
          <ProtectedRoute>
            <Layout>
              <BloodListPage />
            </Layout>
          </ProtectedRoute>
        } />
        {/* hidden - /familiensammeln
        <Route path="/familiensammeln" element={
          <ProtectedRoute>
            <Layout>
              <FamiliensammelnPage />
            </Layout>
          </ProtectedRoute>
        } />
        */}
        {/* hidden - /organigramm
        <Route path="/organigramm" element={
          <ProtectedRoute>
            <Layout>
              <OrganigrammPage />
            </Layout>
          </ProtectedRoute>
        } />
        */}
        <Route path="/clothing-management" element={
          <ProtectedRoute>
            <Layout>
              <ClothingManagementPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/clothing" element={
          <ProtectedRoute>
            <Layout>
              <ClothingPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/communication" element={
          <ProtectedRoute>
            <Layout>
              <CommunicationPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/member-files" element={
          <ProtectedRoute>
            <Layout>
              <MemberFilesPage />
            </Layout>
          </ProtectedRoute>
        } />
        {/* hidden - /vehicle-tuning
        <Route path="/vehicle-tuning" element={
          <ProtectedRoute>
            <Layout>
              <VehicleTuningPage />
            </Layout>
          </ProtectedRoute>
        } />
        */}
        <Route path="/la-casa" element={
          <ProtectedRoute>
            <Layout>
              <CasaPage />
            </Layout>
          </ProtectedRoute>
        } />
        {/* hidden - /botschaft
        <Route path="/botschaft" element={
          <ProtectedRoute>
            <Layout>
              <BotschaftPage />
            </Layout>
          </ProtectedRoute>
        } />
        */}
        <Route path="/sicario" element={
          <ProtectedRoute>
            <Layout>
              <SicarioPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/listenfuehrung" element={
          <ProtectedRoute>
            <Layout>
              <ListenfuehrungWrapper />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/tafelrunde" element={
          <ProtectedRoute>
            <Layout>
              <TafelrundePage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/karte" element={
          <ProtectedRoute>
            <Layout>
              <KartePage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/anwesenheit" element={
          <ProtectedRoute>
            <Layout>
              <AttendancePage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/slang" element={
          <ProtectedRoute>
            <Layout>
              <SlangPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/partner-management" element={
          <ProtectedRoute>
            <Layout>
              <PartnerManagementPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/app/partner" element={
          <ProtectedRoute>
            <Layout>
              <PartnerDashboardPage />
            </Layout>
          </ProtectedRoute>
        } />
        <Route path="/equipment" element={
          <ProtectedRoute>
            <Layout>
              <EquipmentPage />
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
