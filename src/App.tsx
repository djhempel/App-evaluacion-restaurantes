import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import { ToastProvider } from './components/Toast'
import { Spinner } from './components/Spinner'
import { Layout } from './components/Layout'
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
import { MapView } from './pages/MapView'
import { Wishlist } from './pages/Wishlist'
import { Stats } from './pages/Stats'
import { Profile } from './pages/Profile'
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
      <Routes>
        {/* Públicas */}
        <Route path="/login" element={<Login />} />
        <Route path="/e/:id" element={<PublicEvaluation />} />

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
          <Route path="/ranking" element={<Ranking />} />
          <Route path="/mapa" element={<MapView />} />
          <Route path="/perfil" element={<Profile />} />
          <Route path="/wishlist" element={<Wishlist />} />
          <Route path="/estadisticas" element={<Stats />} />
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </ToastProvider>
  )
}
