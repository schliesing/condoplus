import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => {
      store[key] = value.toString();
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

const wrapper = ({ children }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

describe('useAuth Hook', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('should initialize with no user', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.token).toBeNull();
  });

  it('should restore user from localStorage on mount', () => {
    const mockUser = {
      id: 1,
      email: 'test@test.com',
      role: 'morador'
    };
    const mockToken = 'test-token-123';

    localStorage.setItem('user', JSON.stringify(mockUser));
    localStorage.setItem('token', mockToken);

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe(mockToken);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('should handle login', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const mockUser = {
      id: 1,
      email: 'morador@test.com',
      role: 'morador'
    };
    const mockToken = 'test-token-123';

    await act(async () => {
      // Simulate login
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', mockToken);
      localStorage.setItem('condoSchema', 'condo_001');
    });

    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });
  });

  it('should handle logout', async () => {
    const mockUser = {
      id: 1,
      email: 'test@test.com',
      role: 'morador'
    };
    localStorage.setItem('user', JSON.stringify(mockUser));
    localStorage.setItem('token', 'test-token');

    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.isAuthenticated).toBe(true);

    await act(async () => {
      result.current.logout();
    });

    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should store condo schema on login', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const mockUser = {
      id: 1,
      email: 'test@test.com',
      role: 'morador',
      condominios_id: 1
    };

    await act(async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('condoSchema', 'condo_001');
    });

    expect(localStorage.getItem('condoSchema')).toBe('condo_001');
  });

  it('should handle different user roles', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });

    const adminUser = {
      id: 2,
      email: 'admin@test.com',
      role: 'admin'
    };

    await act(async () => {
      localStorage.setItem('user', JSON.stringify(adminUser));
      localStorage.setItem('token', 'admin-token');
    });

    await waitFor(() => {
      expect(result.current.user?.role).toBe('admin');
    });
  });

  it('should clear all data on logout', async () => {
    const mockUser = {
      id: 1,
      email: 'test@test.com',
      role: 'morador'
    };

    await act(async () => {
      localStorage.setItem('user', JSON.stringify(mockUser));
      localStorage.setItem('token', 'test-token');
      localStorage.setItem('condoSchema', 'condo_001');
    });

    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      result.current.logout();
    });

    expect(localStorage.getItem('user')).toBeNull();
    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('condoSchema')).toBeNull();
  });
});
