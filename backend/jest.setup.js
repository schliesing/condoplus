// Jest Setup - Global configuration

// Mock environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/condoplus_test';
process.env.JWT_SECRET = 'test-secret-key-for-tests';
process.env.PORT = '3001';

// Global timeout
jest.setTimeout(10000);

// Suppress console output during tests (optional)
// global.console = {
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };

// Global test utilities
global.testUtils = {
  generateToken: (userId, role = 'morador', condoId = 1) => {
    const jwt = require('jsonwebtoken');
    return jwt.sign(
      { id: userId, email: `user${userId}@test.com`, role, condoId },
      process.env.JWT_SECRET
    );
  },

  mockCondoPool: () => ({
    query: jest.fn().mockResolvedValue({ rows: [] }),
    connect: jest.fn(),
    end: jest.fn()
  })
};
