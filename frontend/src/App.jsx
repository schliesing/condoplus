import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth.jsx';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import VotacoesPage from './pages/VotacoesPage';
import VotacaoDetailPage from './pages/VotacaoDetailPage';
import AgendamentosPage from './pages/AgendamentosPage';
import NovoAgendamentoPage from './pages/NovoAgendamentoPage';
import FornecedoresPage from './pages/FornecedoresPage';
import FornecedorDetailPage from './pages/FornecedorDetailPage';
import Notifications from './pages/Notifications';
import AdminPanel from './pages/AdminPanel';
import './styles/globals.css';

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Carregando...</div>;
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/votacoes"
        element={
          <ProtectedRoute>
            <VotacoesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/votacoes/:id"
        element={
          <ProtectedRoute>
            <VotacaoDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/agendamentos"
        element={
          <ProtectedRoute>
            <AgendamentosPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/agendamentos/nova"
        element={
          <ProtectedRoute>
            <NovoAgendamentoPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/fornecedores"
        element={
          <ProtectedRoute>
            <FornecedoresPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/fornecedores/:id"
        element={
          <ProtectedRoute>
            <FornecedorDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/notifications"
        element={
          <ProtectedRoute>
            <Notifications />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminPanel />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={isAuthenticated ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} />
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </Router>
  );
}
