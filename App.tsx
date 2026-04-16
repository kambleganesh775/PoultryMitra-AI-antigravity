import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ChicksManager from './components/ChicksManager';
import ResourceManager from './components/ResourceManager';
import Transactions from './components/Transactions';
import HealthScheduler from './components/HealthScheduler';
import BreedAnalytics from './components/BreedAnalytics';
import SalesProfitCalculator from './components/SalesProfitCalculator';
import BusinessPlanner from './components/BusinessPlanner';
import AIChat from './components/AIChat';
import SmartScanner from './components/SmartScanner';
import GuidesSection from './components/GuidesSection';
import TrashBin from './components/TrashBin';
import InvoiceManager from './components/InvoiceManager';
import Login from './components/Login';
import Register from './components/Register';
import FarmSetup from './components/FarmSetup';
import { authService } from './services/db';
import { useData } from './hooks/useData';

// Error Boundary Component
interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen flex items-center justify-center bg-gray-100 p-4">
          <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-6">
              {this.state.error?.message.startsWith('{') 
                ? "A database error occurred. Please check your connection." 
                : "An unexpected error occurred."}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 transition"
            >
              Reload Application
            </button>
            {import.meta.env.MODE === 'development' && (
              <pre className="mt-4 text-xs text-left bg-gray-50 p-2 rounded overflow-auto max-h-40">
                {this.state.error?.message}
              </pre>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const App: React.FC = () => {
  const { user, isLoading: isDataLoading } = useData();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = authService.onAuthChange((user) => {
      setIsAuthenticated(!!user);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await authService.logout();
    setIsAuthenticated(false);
  };

  if (isLoading || (isAuthenticated && isDataLoading)) {
    return <div className="h-screen flex items-center justify-center bg-gray-100">Loading...</div>;
  }

  return (
    <ErrorBoundary>
      <HashRouter>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={!isAuthenticated ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!isAuthenticated ? <Register /> : <Navigate to="/" />} />
          <Route path="/setup" element={isAuthenticated ? (user?.farmName ? <Navigate to="/" /> : <FarmSetup />) : <Navigate to="/login" />} />

          {/* Protected Routes wrapped in Layout */}
          <Route
            path="*"
            element={
              isAuthenticated ? (
                !user?.farmName ? (
                  <Navigate to="/setup" replace />
                ) : (
                  <Layout onLogout={handleLogout}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/scanner" element={<SmartScanner />} />
                      <Route path="/planning" element={<BusinessPlanner />} />
                      <Route path="/chicks" element={<ChicksManager />} />
                      <Route path="/resources" element={<ResourceManager />} />
                      <Route path="/transactions" element={<Transactions />} />
                      <Route path="/invoices" element={<InvoiceManager />} />
                      <Route path="/health" element={<HealthScheduler />} />
                      <Route path="/guides" element={<GuidesSection />} />
                      <Route path="/analytics" element={<BreedAnalytics />} />
                      <Route path="/sales" element={<SalesProfitCalculator />} />
                      <Route path="/ai-expert" element={<AIChat />} />
                      <Route path="/trash" element={<TrashBin />} />
                    </Routes>
                  </Layout>
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
};

export default App;
