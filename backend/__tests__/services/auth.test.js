const authService = require('../../src/services/auth');
const jwt = require('jsonwebtoken');

// Mock database
jest.mock('../../src/services/database');

describe('Auth Service', () => {
  let mockPool;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool = global.testUtils.mockCondoPool();
  });

  describe('register', () => {
    it('should register a new user with hashed password', async () => {
      const email = 'newuser@test.com';
      const password = 'SecurePassword123!';
      const condoId = 1;

      // Mock DB query
      const { getGlobalPool } = require('../../src/services/database');
      getGlobalPool.mockReturnValue(mockPool);
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Check existing
      mockPool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] }); // Create user

      const result = await authService.register(email, password, condoId);

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(result).toHaveProperty('id');
      expect(result.email).toBe(email);
    });

    it('should reject duplicate email', async () => {
      const email = 'existing@test.com';
      const password = 'Password123!';

      const { getGlobalPool } = require('../../src/services/database');
      getGlobalPool.mockReturnValue(mockPool);
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, email }] // User already exists
      });

      await expect(authService.register(email, password, 1)).rejects.toThrow(
        'Email já cadastrado'
      );
    });

    it('should validate password strength', async () => {
      await expect(
        authService.register('test@test.com', 'weak', 1)
      ).rejects.toThrow('Senha fraca');
    });
  });

  describe('login', () => {
    it('should return JWT token on valid credentials', async () => {
      const email = 'user@test.com';
      const password = 'SecurePassword123!';
      const hashedPassword = '$2a$10$mock'; // Mock bcrypt hash

      const { getGlobalPool } = require('../../src/services/database');
      getGlobalPool.mockReturnValue(mockPool);
      mockPool.query.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            email,
            password: hashedPassword,
            condominios_id: 1,
            role: 'morador'
          }
        ]
      });

      // Mock bcrypt
      jest.mock('bcryptjs', () => ({
        compare: jest.fn().mockResolvedValue(true)
      }));

      const result = await authService.login(email, password);

      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user.email).toBe(email);
    });

    it('should reject invalid password', async () => {
      const email = 'user@test.com';

      const { getGlobalPool } = require('../../src/services/database');
      getGlobalPool.mockReturnValue(mockPool);
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, email, password: '$2a$10$mock' }]
      });

      jest.mock('bcryptjs', () => ({
        compare: jest.fn().mockResolvedValue(false)
      }));

      await expect(authService.login(email, 'wrongpassword')).rejects.toThrow(
        'Email ou senha inválidos'
      );
    });

    it('should reject non-existent user', async () => {
      const { getGlobalPool } = require('../../src/services/database');
      getGlobalPool.mockReturnValue(mockPool);
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // No user found

      await expect(authService.login('noone@test.com', 'password')).rejects.toThrow(
        'Email ou senha inválidos'
      );
    });
  });

  describe('verifyToken', () => {
    it('should verify valid JWT token', () => {
      const userId = 1;
      const token = global.testUtils.generateToken(userId, 'admin', 1);

      const decoded = authService.verifyToken(token);

      expect(decoded).toHaveProperty('id', userId);
      expect(decoded).toHaveProperty('role', 'admin');
    });

    it('should reject invalid token', () => {
      expect(() => authService.verifyToken('invalid.token.here')).toThrow();
    });

    it('should reject expired token', () => {
      const expiredToken = jwt.sign(
        { id: 1, email: 'test@test.com', role: 'morador' },
        process.env.JWT_SECRET,
        { expiresIn: '-1s' } // Already expired
      );

      expect(() => authService.verifyToken(expiredToken)).toThrow();
    });
  });

  describe('refreshToken', () => {
    it('should generate new token from valid refresh token', () => {
      const userId = 1;
      const refreshToken = global.testUtils.generateToken(userId, 'morador', 1);

      const newToken = authService.refreshToken(refreshToken);

      expect(newToken).toBeDefined();
      expect(() => authService.verifyToken(newToken)).not.toThrow();
    });
  });
});
