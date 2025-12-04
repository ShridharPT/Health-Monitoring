import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider } from "next-themes";

// Pages
import Login from "./pages/Login";
import Index from "./pages/Index";
import Patients from "./pages/Patients";
import PatientDetails from "./pages/PatientDetails";
import Monitoring from "./pages/Monitoring";
import Alerts from "./pages/Alerts";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/AdminDashboard";
import DoctorDashboard from "./pages/DoctorDashboard";
import NurseDashboard from "./pages/NurseDashboard";
import StaffManagement from "./pages/StaffManagement";
import DeviceManagement from "./pages/DeviceManagement";
import AssignmentManagement from "./pages/AssignmentManagement";
import Prescriptions from "./pages/Prescriptions";
import Chat from "./pages/Chat";
import Reports from "./pages/Reports";

const queryClient = new QueryClient();

// Protected route wrapper
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user, isLoading } = useAuth();

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}

// Role-based dashboard redirect
function DashboardRedirect() {
  const { user } = useAuth();

  if (!user) return <Index />;

  switch (user.role) {
    case 'admin':
      return <AdminDashboard />;
    case 'doctor':
      return <DoctorDashboard />;
    case 'nurse':
      return <NurseDashboard />;
    default:
      return <Index />;
  }
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} />

      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Index /></ProtectedRoute>} />
      <Route path="/patients" element={<ProtectedRoute><Patients /></ProtectedRoute>} />
      <Route path="/patient/:patientId" element={<ProtectedRoute><PatientDetails /></ProtectedRoute>} />
      <Route path="/monitoring" element={<ProtectedRoute><Monitoring /></ProtectedRoute>} />
      <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
      <Route path="/prescriptions" element={<ProtectedRoute><Prescriptions /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><Chat /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />

      {/* Admin routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/staff" element={<ProtectedRoute allowedRoles={['admin']}><StaffManagement /></ProtectedRoute>} />
      <Route path="/admin/devices" element={<ProtectedRoute allowedRoles={['admin']}><DeviceManagement /></ProtectedRoute>} />
      <Route path="/admin/assignments" element={<ProtectedRoute allowedRoles={['admin']}><AssignmentManagement /></ProtectedRoute>} />

      {/* Catch all */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
