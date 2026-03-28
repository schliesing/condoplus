const express = require('express');
const { body, validationResult } = require('express-validator');
const authService = require('../services/auth');
const { authenticateToken, injectCondoSchema } = require('../middleware/auth');

const router = express.Router();

/**
 * POST /api/auth/login
 * Login do morador
 */
router.post(
  '/login',
  injectCondoSchema,
  body('email').isEmail(),
  body('password').notEmpty(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { email, password } = req.body;
      const result = await authService.login(req.condoSchema, email, password);
      res.json(result);
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }
);

/**
 * POST /api/auth/logout
 * Logout do morador
 */
router.post('/logout', authenticateToken, injectCondoSchema, async (req, res) => {
  try {
    const token = req.headers['authorization'].split(' ')[1];
    await authService.logout(req.condoSchema, token);
    res.json({ message: 'Logout realizado com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auth/me
 * Obter dados do usuário autenticado
 */
router.get('/me', authenticateToken, (req, res) => {
  res.json({
    id: req.user.id,
    email: req.user.email,
    role: req.user.role,
    condo_schema: req.user.condo_schema,
  });
});

module.exports = router;
