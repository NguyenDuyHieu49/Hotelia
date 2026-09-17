import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/auth/AuthContext';
import { Layout } from './components/layout/Layout';

// Pages
import { SimpleLogin } from './features/auth/SimpleLogin';
import { OwnerDashboard } from './features/owner/OwnerDashboard';
import { OwnerHotels } from './features/owner/OwnerHotels';
import { OwnerBookings } from './features/owner/OwnerBookings';
import { OwnerReviews } from './features/owner/OwnerReviews';
import { AdminDashboard } from './features/admin/AdminDashboard';
import { AdminUsers } from './features/admin/AdminUsers';
import { AdminOwners } from './features/admin/AdminOwners';
import { AdminHotels } from './features/admin/AdminHotels';
import { AdminBookings } from './features/admin/AdminBookings';

function PrivateRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  console.log('PrivateRoute: isLoading=', isLoading, 'isAuthenticated=', isAuthenticated, 'user=', user?.role);

  if (isLoading) {
    return <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh'}}>
      <h2>Loading...</h2>
    </div>;
  }

  if (!isAuthenticated) {
    console.log('PrivateRoute: Redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    console.log('PrivateRoute: User role not allowed:', user.role, 'Allowed:', allowedRoles);
    return <Navigate to="/login" replace />;
  }

  console.log('PrivateRoute: Rendering children');
  return <>{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<SimpleLogin />} />
          
          {/* Owner Routes */}
          <Route
            path="/owner/*"
            element={
              <PrivateRoute allowedRoles={['OWNER', 'ADMIN']}>
                <Layout type="owner">
                  <Routes>
                    <Route path="dashboard" element={<OwnerDashboard />} />
                    <Route path="hotels" element={<OwnerHotels />} />
                    <Route path="bookings" element={<OwnerBookings />} />
                    <Route path="reviews" element={<OwnerReviews />} />
                    <Route path="*" element={<Navigate to="/owner/dashboard" replace />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />
          
          {/* Admin Routes */}
          <Route
            path="/admin/*"
            element={
              <PrivateRoute allowedRoles={['ADMIN']}>
                <Layout type="admin">
                  <Routes>
                    <Route path="dashboard" element={<AdminDashboard />} />
                    <Route path="users" element={<AdminUsers />} />
                    <Route path="owners" element={<AdminOwners />} />
                    <Route path="hotels" element={<AdminHotels />} />
                    <Route path="bookings" element={<AdminBookings />} />
                    <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
                  </Routes>
                </Layout>
              </PrivateRoute>
            }
          />
          
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
