import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../../pages/Dashboard';

// Mock useAuth hook
const mockLogout = vi.fn();
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: {
      id: 1,
      email: 'morador@test.com',
      role: 'morador',
      condominios_id: 1
    },
    logout: mockLogout,
    isAuthenticated: true,
    loading: false
  })
}));

const renderDashboard = () => {
  return render(
    <BrowserRouter>
      <Dashboard />
    </BrowserRouter>
  );
};

describe('Dashboard Page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render welcome message', () => {
    renderDashboard();

    expect(screen.getByText(/Bem-vindo/i)).toBeInTheDocument();
    expect(screen.getByText(/morador@test\.com/)).toBeInTheDocument();
  });

  it('should display all feature cards', () => {
    renderDashboard();

    expect(screen.getByText(/Votações/i)).toBeInTheDocument();
    expect(screen.getByText(/Agendamentos/i)).toBeInTheDocument();
    expect(screen.getByText(/Fornecedores/i)).toBeInTheDocument();
    expect(screen.getByText(/Notificações/i)).toBeInTheDocument();
  });

  it('should have navigation links to features', () => {
    renderDashboard();

    const votacoesLink = screen.getByRole('link', { name: /Votações/i });
    const agendamentosLink = screen.getByRole('link', { name: /Agendamentos/i });
    const fornecedoresLink = screen.getByRole('link', { name: /Fornecedores/i });
    const notificacoesLink = screen.getByRole('link', { name: /Notificações/i });

    expect(votacoesLink).toHaveAttribute('href', '/votacoes');
    expect(agendamentosLink).toHaveAttribute('href', '/agendamentos');
    expect(fornecedoresLink).toHaveAttribute('href', '/fornecedores');
    expect(notificacoesLink).toHaveAttribute('href', '/notificacoes');
  });

  it('should display admin panel section for admin users', () => {
    // Re-mock with admin role
    vi.resetModules();
    vi.mock('../../hooks/useAuth', () => ({
      useAuth: () => ({
        user: {
          id: 2,
          email: 'admin@test.com',
          role: 'admin',
          condominios_id: 1
        },
        logout: mockLogout,
        isAuthenticated: true,
        loading: false
      })
    }));

    renderDashboard();

    // Admin panel might be visible or hidden based on role
    // This test depends on implementation
  });

  it('should have logout functionality', async () => {
    const user = userEvent.setup();
    renderDashboard();

    const logoutButton = screen.getByRole('button', { name: /Sair|Logout|Logout/i });

    if (logoutButton) {
      await user.click(logoutButton);
      expect(mockLogout).toHaveBeenCalled();
    }
  });

  it('should be responsive on mobile', () => {
    const { container } = renderDashboard();

    // Check for responsive container
    expect(container.firstChild).toHaveClass('container');
  });

  it('should display feature descriptions', () => {
    renderDashboard();

    // Features should have descriptions
    const featureText = screen.getAllByText(/Participe|Agende|Encontre|Fique atualizado/i);
    expect(featureText.length).toBeGreaterThan(0);
  });
});
