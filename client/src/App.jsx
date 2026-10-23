import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import { PageLoader } from './components/LoadingSpinner';

// Layouts
import AdminLayout from './layouts/AdminLayout';
import StaffLayout from './layouts/StaffLayout';
import CustomerLayout from './layouts/CustomerLayout';

// Pages - Auth
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Pages - Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import CustomersPage from './pages/admin/CustomersPage';
import DeliveriesPage from './pages/admin/DeliveriesPage';
import StaffPage from './pages/admin/StaffPage';
import LiveMapPage from './pages/admin/LiveMapPage';
import ReturnsPage from './pages/admin/ReturnsPage';
import DamagesPage from './pages/admin/DamagesPage';
import RefillsPage from './pages/admin/RefillsPage';
import PaymentsPage from './pages/admin/PaymentsPage';
import AnalyticsPage from './pages/admin/AnalyticsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';

// Pages - Staff
import StaffDashboard from './pages/staff/StaffDashboard';
import StaffDeliveriesPage from './pages/staff/StaffDeliveriesPage';
import StaffLiveMapPage from './pages/staff/StaffLiveMapPage';
import StaffReturnsPage from './pages/staff/StaffReturnsPage';
import StaffDamagesPage from './pages/staff/StaffDamagesPage';
import StaffProfilePage from './pages/staff/StaffProfilePage';

// Pages - Customer
import CustomerDashboard from './pages/customer/CustomerDashboard';
import CustomerDeliveriesPage from './pages/customer/CustomerDeliveriesPage';
import TrackDeliveryPage from './pages/customer/TrackDeliveryPage';
import CustomerRefillsPage from './pages/customer/CustomerRefillsPage';
import CustomerReturnsPage from './pages/customer/CustomerReturnsPage';
import CustomerPaymentsPage from './pages/customer/CustomerPaymentsPage';
import CustomerProfilePage from './pages/customer/CustomerProfilePage';

// Shared
import NotificationsPage from './pages/NotificationsPage';

// Protected Route
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to proper dashboard
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'staff') return <Navigate to="/staff/dashboard" replace />;
    return <Navigate to="/customer/dashboard" replace />;
  }
  return children;
};

// Public Route (redirect if logged in)
const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (user) {
    if (user.role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (user.role === 'staff') return <Navigate to="/staff/dashboard" replace />;
    return <Navigate to="/customer/dashboard" replace />;
  }
  return children;
};



const AppRoutes = () => {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />

      {/* Role dashboard convenience aliases */}
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><Navigate to="/admin/dashboard" replace /></ProtectedRoute>} />
      <Route path="/staff-dashboard" element={<ProtectedRoute allowedRoles={['staff']}><Navigate to="/staff/dashboard" replace /></ProtectedRoute>} />
      <Route path="/customer-dashboard" element={<ProtectedRoute allowedRoles={['customer']}><Navigate to="/customer/dashboard" replace /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><Navigate to="/admin/dashboard" replace /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/dashboard" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminDashboard /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/customers" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><CustomersPage /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/customers/:id" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><CustomersPage /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/deliveries" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><DeliveriesPage /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/staff" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><StaffPage /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/live-map" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><LiveMapPage /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/returns" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><ReturnsPage /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/damages" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><DamagesPage /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/refills" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><RefillsPage /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/payments" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><PaymentsPage /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/analytics" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AnalyticsPage /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/notifications" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><NotificationsPage /></AdminLayout></ProtectedRoute>} />
      <Route path="/admin/settings" element={<ProtectedRoute allowedRoles={['admin']}><AdminLayout><AdminSettingsPage /></AdminLayout></ProtectedRoute>} />

      {/* Staff Routes */}
      <Route path="/staff/dashboard" element={<ProtectedRoute allowedRoles={['staff']}><StaffLayout><StaffDashboard /></StaffLayout></ProtectedRoute>} />
      <Route path="/staff/deliveries" element={<ProtectedRoute allowedRoles={['staff']}><StaffLayout><StaffDeliveriesPage /></StaffLayout></ProtectedRoute>} />
      <Route path="/staff/route" element={<ProtectedRoute allowedRoles={['staff']}><StaffLayout><StaffLiveMapPage /></StaffLayout></ProtectedRoute>} />
      <Route path="/staff/returns" element={<ProtectedRoute allowedRoles={['staff']}><StaffLayout><StaffReturnsPage /></StaffLayout></ProtectedRoute>} />
      <Route path="/staff/damages" element={<ProtectedRoute allowedRoles={['staff']}><StaffLayout><StaffDamagesPage /></StaffLayout></ProtectedRoute>} />
      <Route path="/staff/notifications" element={<ProtectedRoute allowedRoles={['staff']}><StaffLayout><NotificationsPage /></StaffLayout></ProtectedRoute>} />
      <Route path="/staff/profile" element={<ProtectedRoute allowedRoles={['staff']}><StaffLayout><StaffProfilePage /></StaffLayout></ProtectedRoute>} />

      {/* Customer Routes */}
      <Route path="/customer/dashboard" element={<ProtectedRoute allowedRoles={['customer']}><CustomerLayout><CustomerDashboard /></CustomerLayout></ProtectedRoute>} />
      <Route path="/customer/deliveries" element={<ProtectedRoute allowedRoles={['customer']}><CustomerLayout><CustomerDeliveriesPage /></CustomerLayout></ProtectedRoute>} />
      <Route path="/customer/track" element={<ProtectedRoute allowedRoles={['customer']}><CustomerLayout><TrackDeliveryPage /></CustomerLayout></ProtectedRoute>} />
      <Route path="/customer/refills" element={<ProtectedRoute allowedRoles={['customer']}><CustomerLayout><CustomerRefillsPage /></CustomerLayout></ProtectedRoute>} />
      <Route path="/customer/returns" element={<ProtectedRoute allowedRoles={['customer']}><CustomerLayout><CustomerReturnsPage /></CustomerLayout></ProtectedRoute>} />
      <Route path="/customer/payments" element={<ProtectedRoute allowedRoles={['customer']}><CustomerLayout><CustomerPaymentsPage /></CustomerLayout></ProtectedRoute>} />
      <Route path="/customer/receipts" element={<ProtectedRoute allowedRoles={['customer']}><CustomerLayout><CustomerDeliveriesPage /></CustomerLayout></ProtectedRoute>} />
      <Route path="/customer/notifications" element={<ProtectedRoute allowedRoles={['customer']}><CustomerLayout><NotificationsPage /></CustomerLayout></ProtectedRoute>} />
      <Route path="/customer/profile" element={<ProtectedRoute allowedRoles={['customer']}><CustomerLayout><CustomerProfilePage /></CustomerLayout></ProtectedRoute>} />

      {/* 404 */}
      <Route path="*" element={
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <p className="text-6xl font-bold text-gray-200 mb-4">404</p>
            <p className="text-xl font-bold text-dark mb-2">Page Not Found</p>
            <a href="/" className="btn-primary inline-flex">Go Home</a>
          </div>
        </div>
      } />
    </Routes>
  );
};

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                borderRadius: '12px',
                background: '#0F172A',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '500',
              },
              success: { iconTheme: { primary: '#10B981', secondary: '#fff' } },
              error: { iconTheme: { primary: '#EF4444', secondary: '#fff' } },
            }}
          />
        </SocketProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;
