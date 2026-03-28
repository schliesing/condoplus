const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const calendarService = require('../services/calendar');

const router = express.Router();

// GET /api/calendar/auth-url - Get Google Calendar authorization URL
router.get('/auth-url', authenticateToken, (req, res) => {
  try {
    const credentials = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUrl: process.env.GOOGLE_REDIRECT_URL || 'http://localhost:3000/api/calendar/oauth2callback'
    };

    calendarService.initializeOAuth2Client(credentials);
    const authUrl = calendarService.getAuthorizationUrl();

    res.json({ success: true, authUrl });
  } catch (error) {
    console.error('Error generating auth URL:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/calendar/oauth2callback - Handle OAuth2 callback
router.get('/oauth2callback', authenticateToken, async (req, res) => {
  try {
    const { code } = req.query;
    const { condoSchema, user } = req;

    if (!code) {
      return res.status(400).json({ success: false, error: 'Authorization code not provided' });
    }

    const credentials = {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      redirectUrl: process.env.GOOGLE_REDIRECT_URL || 'http://localhost:3000/api/calendar/oauth2callback'
    };

    calendarService.initializeOAuth2Client(credentials);
    const tokens = await calendarService.exchangeCodeForTokens(code);
    await calendarService.saveCalendarCredentials(condoSchema, user.id, tokens);

    res.json({
      success: true,
      message: 'Google Calendar connected successfully'
    });
  } catch (error) {
    console.error('Error handling OAuth2 callback:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/calendar/sync - Sync agendamentos to Google Calendar
router.post('/sync', authenticateToken, async (req, res) => {
  try {
    const { condoSchema, user } = req;

    const syncResults = await calendarService.syncAgendamentosToCalendar(condoSchema, user.id);

    res.json({
      success: true,
      data: syncResults,
      message: 'Agendamentos sincronizados com Google Calendar'
    });
  } catch (error) {
    console.error('Error syncing to calendar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET /api/calendar/available-slots - Get available time slots
router.get('/available-slots', authenticateToken, async (req, res) => {
  try {
    const { condoSchema, user } = req;
    const { areaId, data, duracaoMinutos = 60 } = req.query;

    if (!areaId || !data) {
      return res.status(400).json({
        success: false,
        error: 'Area ID and date are required'
      });
    }

    const slots = await calendarService.getAvailableSlots(
      condoSchema,
      user.id,
      areaId,
      data,
      parseInt(duracaoMinutos)
    );

    res.json({
      success: true,
      data: slots
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST /api/calendar/disconnect - Disconnect Google Calendar
router.post('/disconnect', authenticateToken, async (req, res) => {
  try {
    const { condoSchema, user } = req;

    const result = await calendarService.revokeCalendarAccess(condoSchema, user.id);

    res.json({
      success: true,
      message: 'Google Calendar desconectado com sucesso'
    });
  } catch (error) {
    console.error('Error disconnecting calendar:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
