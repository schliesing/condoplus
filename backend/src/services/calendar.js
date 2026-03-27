const { google } = require('googleapis');
const { getCondoPool } = require('./database');

class CalendarService {
  constructor() {
    this.oauth2Client = null;
  }

  initializeOAuth2Client(credentials) {
    const { clientId, clientSecret, redirectUrl } = credentials;
    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUrl);
    return this.oauth2Client;
  }

  getAuthorizationUrl() {
    if (!this.oauth2Client) throw new Error('OAuth2 client not initialized');
    const scopes = [
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events'
    ];
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async exchangeCodeForTokens(code) {
    if (!this.oauth2Client) throw new Error('OAuth2 client not initialized');
    const { tokens } = await this.oauth2Client.getToken(code);
    this.oauth2Client.setCredentials(tokens);
    return tokens;
  }

  async saveCalendarCredentials(condoSchema, userId, tokens) {
    const pool = getCondoPool();
    const existingResult = await pool.query(
      `SELECT id FROM ${condoSchema}.calendario_credenciais WHERE usuario_id = $1`,
      [userId]
    );
    const tokenString = JSON.stringify(tokens);
    if (existingResult.rows.length > 0) {
      await pool.query(
        `UPDATE ${condoSchema}.calendario_credenciais SET tokens = $1, updated_at = NOW() WHERE usuario_id = $2`,
        [tokenString, userId]
      );
    } else {
      await pool.query(
        `INSERT INTO ${condoSchema}.calendario_credenciais (usuario_id, tokens, created_at, updated_at) VALUES ($1, $2, NOW(), NOW())`,
        [userId, tokenString]
      );
    }
    return { success: true };
  }

  async getCalendarCredentials(condoSchema, userId) {
    const pool = getCondoPool();
    const result = await pool.query(
      `SELECT tokens FROM ${condoSchema}.calendario_credenciais WHERE usuario_id = $1`,
      [userId]
    );
    if (result.rows.length === 0) return null;
    return JSON.parse(result.rows[0].tokens);
  }

  async createCalendarEvent(condoSchema, userId, agendamento) {
    const tokens = await this.getCalendarCredentials(condoSchema, userId);
    if (!tokens) throw new Error('Credenciais do Google Calendar não encontradas');
    this.oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const event = {
      summary: `Agendamento: ${agendamento.area_nome}`,
      description: agendamento.descricao || 'Reserva de área do condomínio',
      start: {
        dateTime: new Date(agendamento.data_inicio).toISOString(),
        timeZone: 'America/Sao_Paulo'
      },
      end: {
        dateTime: new Date(agendamento.data_fim).toISOString(),
        timeZone: 'America/Sao_Paulo'
      },
      location: agendamento.area_endereco || '',
      extendedProperties: {
        private: {
          agendamento_id: agendamento.id.toString(),
          area_id: agendamento.area_id.toString()
        }
      }
    };
    const response = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
      conferenceDataVersion: 0
    });
    return response.data;
  }

  async updateCalendarEvent(condoSchema, userId, eventId, agendamento) {
    const tokens = await this.getCalendarCredentials(condoSchema, userId);
    if (!tokens) throw new Error('Credenciais do Google Calendar não encontradas');
    this.oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const event = {
      summary: `Agendamento: ${agendamento.area_nome}`,
      description: agendamento.descricao || 'Reserva de área do condomínio',
      start: {
        dateTime: new Date(agendamento.data_inicio).toISOString(),
        timeZone: 'America/Sao_Paulo'
      },
      end: {
        dateTime: new Date(agendamento.data_fim).toISOString(),
        timeZone: 'America/Sao_Paulo'
      },
      location: agendamento.area_endereco || ''
    };
    const response = await calendar.events.update({
      calendarId: 'primary',
      eventId: eventId,
      resource: event
    });
    return response.data;
  }

  async deleteCalendarEvent(condoSchema, userId, eventId) {
    const tokens = await this.getCalendarCredentials(condoSchema, userId);
    if (!tokens) throw new Error('Credenciais do Google Calendar não encontradas');
    this.oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: eventId
    });
    return { success: true };
  }

  async syncAgendamentosToCalendar(condoSchema, userId) {
    const pool = getCondoPool();
    const result = await pool.query(
      `SELECT a.id, a.area_id, a.usuario_id, a.data_inicio, a.data_fim, a.descricao, a.google_event_id,
              ar.nome as area_nome, ar.endereco as area_endereco
       FROM ${condoSchema}.agendamentos a
       JOIN ${condoSchema}.areas_agendamento ar ON a.area_id = ar.id
       WHERE a.usuario_id = $1 AND a.status = 'confirmado'
       ORDER BY a.data_inicio`,
      [userId]
    );
    const syncResults = [];
    for (const agendamento of result.rows) {
      try {
        if (!agendamento.google_event_id) {
          const calendarEvent = await this.createCalendarEvent(condoSchema, userId, agendamento);
          await pool.query(
            `UPDATE ${condoSchema}.agendamentos SET google_event_id = $1, updated_at = NOW() WHERE id = $2`,
            [calendarEvent.id, agendamento.id]
          );
          syncResults.push({
            agendamento_id: agendamento.id,
            status: 'created',
            google_event_id: calendarEvent.id
          });
        } else {
          await this.updateCalendarEvent(condoSchema, userId, agendamento.google_event_id, agendamento);
          syncResults.push({
            agendamento_id: agendamento.id,
            status: 'updated',
            google_event_id: agendamento.google_event_id
          });
        }
      } catch (error) {
        console.error(`Error syncing agendamento ${agendamento.id}:`, error);
        syncResults.push({
          agendamento_id: agendamento.id,
          status: 'error',
          error: error.message
        });
      }
    }
    return syncResults;
  }

  async getAvailableSlots(condoSchema, userId, areaId, data, duracaoMinutos) {
    const tokens = await this.getCalendarCredentials(condoSchema, userId);
    if (!tokens) {
      return [{ inicio: `${data}T08:00:00`, fim: `${data}T22:00:00` }];
    }
    this.oauth2Client.setCredentials(tokens);
    const calendar = google.calendar({ version: 'v3', auth: this.oauth2Client });
    const startDate = new Date(data);
    const endDate = new Date(data);
    endDate.setDate(endDate.getDate() + 1);
    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    });
    const busyTimes = response.data.items || [];
    const availableSlots = [];
    let currentTime = new Date(startDate);
    currentTime.setHours(8, 0, 0);
    const endTime = new Date(startDate);
    endTime.setHours(22, 0, 0);
    while (currentTime < endTime) {
      const slotEnd = new Date(currentTime);
      slotEnd.setMinutes(slotEnd.getMinutes() + duracaoMinutos);
      const isAvailable = !busyTimes.some(event => {
        const eventStart = new Date(event.start.dateTime);
        const eventEnd = new Date(event.end.dateTime);
        return (currentTime < eventEnd && slotEnd > eventStart);
      });
      if (isAvailable) {
        availableSlots.push({ inicio: currentTime.toISOString(), fim: slotEnd.toISOString() });
      }
      currentTime.setMinutes(currentTime.getMinutes() + 30);
    }
    return availableSlots;
  }

  async revokeCalendarAccess(condoSchema, userId) {
    const pool = getCondoPool();
    const result = await pool.query(
      `SELECT tokens FROM ${condoSchema}.calendario_credenciais WHERE usuario_id = $1`,
      [userId]
    );
    if (result.rows.length === 0) {
      return { success: false, error: 'No calendar credentials found' };
    }
    const tokens = JSON.parse(result.rows[0].tokens);
    this.oauth2Client.setCredentials(tokens);
    try {
      await this.oauth2Client.revokeCredentials();
    } catch (error) {
      console.error('Error revoking credentials:', error);
    }
    await pool.query(
      `DELETE FROM ${condoSchema}.calendario_credenciais WHERE usuario_id = $1`,
      [userId]
    );
    return { success: true };
  }
}

module.exports = new CalendarService();
