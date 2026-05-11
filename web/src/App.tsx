import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { StockProvider } from './context/StockContext'
import ProtectedRoute, { ProtectedSupplierRoute } from './components/ProtectedRoute'
import Layout from './components/Layout'
import SupplierLayout from './components/SupplierLayout'

import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import RegisterSupplierPage from './pages/RegisterSupplierPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import AddBottlePage from './pages/AddBottlePage'
import EditBottlePage from './pages/EditBottlePage'
import RestockPage from './pages/RestockPage'
import OrdersPage from './pages/OrdersPage'
import SuppliersPage from './pages/SuppliersPage'
import ProfilePage from './pages/ProfilePage'
import MovementsPage from './pages/MovementsPage'
import SupplierOrdersPage from './pages/SupplierOrdersPage'
import SupplierProfilePage from './pages/SupplierProfilePage'
import SupplierCatalogPage from './pages/SupplierCatalogPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
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
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
