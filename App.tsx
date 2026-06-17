
import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { RealtimeProvider } from './context/RealtimeContext';
import { AgentProvider } from './features/agent-workspace/context/AgentContext';
import { SaleAlert } from './shared/components/SaleAlert';

// Feature Modules
import { AgentWorkspace } from './features/agent-workspace/AgentWorkspace';
import { Login } from './features/auth/Login';
import { Register } from './features/auth/Register';

// Loading Screen
const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin"></div>
      <p className="text-slate-500 font-medium animate-pulse">Initializing Portal...</p>
    </div>
  </div>
);

// Protected Route Wrapper
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  
  return <>{children}</>;
};

// Public Route Wrapper (for Login)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <LoadingScreen />;
  if (user) return <Navigate to="/" replace />;
  
  return <>{children}</>;
};

const AppRoutes: React.FC = () => {
    const { user } = useAuth();

    return (
        <Routes>
            {/* Login Route */}
            <Route path="/login" element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } />
            <Route path="/register" element={
              <PublicRoute>
                <Register />
              </PublicRoute>
            } />

            {/* 
               Routing Delegation Principle:
               The root determines which module to load based on URL prefix.
            */}

            {/* AGENT WORKSPACE (Default) */}
            <Route path="/*" element={
              <ProtectedRoute>
                <AgentWorkspace />
              </ProtectedRoute>
            } />
        </Routes>
    );
};

const AppContent: React.FC = () => {
  const { user } = useAuth();
  return (
    <>
      <AppRoutes />
      {user && <SaleAlert />}
    </>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AgentProvider>
        <RealtimeProvider>
          <HashRouter>
            <AppContent />
          </HashRouter>
        </RealtimeProvider>
      </AgentProvider>
    </AuthProvider>
  );
};

export default App;
