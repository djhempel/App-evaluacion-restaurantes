import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'
import { Spinner } from './components/Spinner'
import { Layout } from './components/Layout'
import { ErrorBoundary } from './components/ErrorBoundary'
import { Login } from './pages/Login'
import { NotConfigured } from './pages/NotConfigured'
import { Home } from './pages/Home'
import { Evaluate } from './pages/Evaluate'
import { RestaurantList } from './pages/RestaurantList'
import { RestaurantForm } from './pages/RestaurantForm'
import { RestaurantDetail } from './pages/RestaurantDetail'
import { EvaluationDetail } from './pages/EvaluationDetail'
import { PublicEvaluation } from './pages/PublicEvaluation'
import { Ranking } from './pages/Ranking'
import { Discover } from './pages/Discover'
import { Wishlist } from './pages/Wishlist'
import { Stats } from './pages/Stats'
import { Profile } from './pages/Profile'
import { Groups } from './pages/Groups'
import { GroupDetail } from './pages/GroupDetail'
import { JoinGroup } from './pages/JoinGroup'
import { Friends } from './pages/Friends'
import { PublicProfile } from './pages/PublicProfile'
import { Notifications } from './pages/Notifications'
import type { ReactNode } from 'react'

function Protected({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  if (loading) return <Spinner label="Cargando…" />
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { configured } = useAuth()

  if (!configured) return <NotConfigured />

  return (
    <ToastProvider>
      <ErrorBoundary>
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/e/:id" element={<PublicEvaluation />} />
        <Route
          path="/grupos/unirse/:code"
          element={
            <Protected>
              <JoinGroup />
            </Protected>
          }
        />

        {/* Privadas con navegación */}
        <Route
          element={
            <Protected>
              <Layout />
            </Protected>
          }
        >
          <Route path="/" element={<Home />} />
          <Route path="/restaurantes" element={<RestaurantList />} />
          <Route path="/descubrir" element={<Discover />} />
          <Route path="/explorar" element={<Navigate to="/descubrir" replace />} />
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/mapa" element={<Navigate to="/descubrir" replace />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/estadisticas" element={<Stats />} />
          <Route path="/grupos" element={<Groups />} />
          <Route path="/grupos/:id" element={<GroupDetail />} />
          <Route path="/amigos" element={<Friends />} />
          <Route path="/notificaciones" element={<Notifications />} />
        </Route>

        {/* Privadas sin barra inferior (pantallas de detalle/formularios) */}
        <Route
          path="/evaluar"
          element={
            <Protected>
              <Evaluate />
            </Protected>
          }
        />
        <Route
          path="/evaluacion/:id/editar"
          element={
            <Protected>
              <Evaluate />
            </Protected>
          }
        />
        <Route
          path="/evaluacion/:id"
          element={
            <Protected>
              <EvaluationDetail />
            </Protected>
          }
        />
        <Route
          path="/restaurantes/nuevo"
          element={
            <Protected>
              <RestaurantForm />
            </Protected>
          }
        />
        <Route
          path="/restaurantes/:id/editar"
          element={
            <Protected>
              <RestaurantForm />
            </Protected>
          }
        />
        <Route
          path="/restaurantes/:id"
          element={
            <Protected>
              <RestaurantDetail />
            </Protected>
          }
        />
        <Route
          path="/u/:uid"
          element={
            <Protected>
              <PublicProfile />
            </Protected>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
    </ToastProvider>
  )
}
