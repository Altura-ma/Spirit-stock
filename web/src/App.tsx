import { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { StockProvider } from './context/StockContext'
import ProtectedRoute, { ProtectedSupplierRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import SupplierLayout from './components/SupplierLayout'
import AppLoadingSkeleton from './components/AppLoadingSkeleton'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const RegisterSupplierPage = lazy(() => import('./pages/RegisterSupplierPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const InventoryPage = lazy(() => import('./pages/InventoryPage'))
const AddBottlePage = lazy(() => import('./pages/AddBottlePage'))
const EditBottlePage = lazy(() => import('./pages/EditBottlePage'))
const RestockPage = lazy(() => import('./pages/RestockPage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const SuppliersPage = lazy(() => import('./pages/SuppliersPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const MovementsPage = lazy(() => import('./pages/MovementsPage'))
const PosConnectionsPage = lazy(() => import('./pages/PosConnectionsPage'))
const SupplierOrdersPage = lazy(() => import('./pages/SupplierOrdersPage'))
const SupplierProfilePage = lazy(() => import('./pages/SupplierProfilePage'))
const SupplierCatalogPage = lazy(() => import('./pages/SupplierCatalogPage'))

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Suspense fallback={<AppLoadingSkeleton />}>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/register-fournisseur" element={<RegisterSupplierPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Supplier interface */}
            <Route path="/supplier" element={
              <ProtectedSupplierRoute>
                <SupplierLayout />
              </ProtectedSupplierRoute>
            }>
              <Route index element={<SupplierOrdersPage />} />
              <Route path="catalog" element={<SupplierCatalogPage />} />
              <Route path="profile" element={<SupplierProfilePage />} />
            </Route>

            {/* Restaurant interface */}
            <Route path="/" element={
              <ProtectedRoute>
                <StockProvider>
                  <Layout />
                </StockProvider>
              </ProtectedRoute>
            }>
              <Route index element={<DashboardPage />} />
              <Route path="inventory" element={<InventoryPage />} />
              <Route path="inventory/add" element={<AddBottlePage />} />
              <Route path="inventory/edit/:id" element={<EditBottlePage />} />
              <Route path="restock" element={<RestockPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="suppliers" element={<SuppliersPage />} />
              <Route path="profile" element={<ProfilePage />} />
              <Route path="history" element={<MovementsPage />} />
              <Route path="pos" element={<PosConnectionsPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
