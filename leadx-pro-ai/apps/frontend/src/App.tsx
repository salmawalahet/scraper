import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Jobs from './pages/Jobs';
import Leads from './pages/Leads';
import Analytics from './pages/Analytics';
import Exports from './pages/Exports';
import Settings from './pages/Settings';

import DashboardLayout from './layouts/DashboardLayout';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { useAuthStore } from './stores/auth.store';
import { useThemeStore } from './stores/theme.store';
import { Loader2 } from 'lucide-react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export default function App() {
  const { loadUser, isAuthenticated, isLoading } = useAuthStore();
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    // Apply dark mode on initial render
    document.documentElement.classList.toggle('dark', theme === 'dark');
    
    // Auto-load profile info if tokens exist
    if (isAuthenticated) {
      loadUser();
    }
  }, [theme, isAuthenticated, loadUser]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-sm font-semibold text-muted-foreground">Initializing platform...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected Dashboard Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/leads" element={<Leads />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/exports" element={<Exports />} />
              <Route path="/settings" element={<Settings />} />
            </Route>
          </Route>

          {/* Wildcard Fallback */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  );
}
