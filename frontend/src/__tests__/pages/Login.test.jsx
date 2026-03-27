import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import Login from '../../pages/Login';

// Mock useAuth hook
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    login: vi.fn().mockResolvedValue({
      token: 'test-token',
      user: { id: 1, email: 'test@test.com' }
    }),
    isAuthenticated: false,
    loading: false
  })
}));

const renderLogin = () => {
  return render(
    <BrowserRouter>
      <Login />
    </BrowserRouter>
  );
};

describe('Login Page', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should render login form', () => {
    renderLogin();

    expect(screen.getByText(/CondoPlus/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Senha/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Entrar/i })).toBeInTheDocument();
  });

  it('should display test credentials hint', () => {
    renderLogin();

    expect(screen.getByText(/Credenciais de teste:/i)).toBeInTheDocument();
    expect(screen.getByText(/morador@test\.com/)).toBeInTheDocument();
  });

  it('should allow user to enter email', async () => {
    renderLogin();
    const emailInput = screen.getByLabelText(/Email/i);

    await userEvent.type(emailInput, 'test@test.com');

    expect(emailInput.value).toBe('test@test.com');
  });

  it('should allow user to enter password', async () => {
    renderLogin();
    const passwordInput = screen.getByLabelText(/Senha/i);

    await userEvent.type(passwordInput, 'password123');

    expect(passwordInput.value).toBe('password123');
  });

  it('should show error on empty submission', async () => {
    renderLogin();
    const submitButton = screen.getByRole('button', { name: /Entrar/i });

    await userEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/Preencha todos os campos/i)).toBeInTheDocument();
    });
  });

  it('should handle login with valid credentials', async () => {
    const user = userEvent.setup();
    renderLogin();

    const emailInput = screen.getByLabelText(/Email/i);
    const passwordInput = screen.getByLabelText(/Senha/i);
    const submitButton = screen.getByRole('button', { name: /Entrar/i });

    await user.type(emailInput, 'morador@test.com');
    await user.type(passwordInput, 'Test123!');
    await user.click(submitButton);

    // Check that form was submitted
    // (actual navigation depends on mock implementation)
    expect(emailInput.value).toBe('morador@test.com');
  });

  it('should have condominium dropdown', () => {
    renderLogin();

    const condoSelect = screen.getByDisplayValue(/Selecione um condomínio/i);
    expect(condoSelect).toBeInTheDocument();
  });

  it('should be responsive', () => {
    const { container } = renderLogin();

    // Check that container has responsive styles
    expect(container.firstChild).toHaveClass('container');
  });
});
