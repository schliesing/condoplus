const { getCondoPool } = require('../config/database');

/**
 * Obter preferências de notificação do morador
 */
async function getUserNotificationPrefs(condoSchema, moradorId) {
  const pool = getCondoPool(condoSchema);

  try {
    let result = await pool.query(
      'SELECT * FROM notification_prefs WHERE morador_id = $1',
      [moradorId]
    );

    // Se não existir, criar com valores padrão
    if (result.rows.length === 0) {
      result = await pool.query(
        `INSERT INTO notification_prefs (morador_id)
         VALUES ($1)
         RETURNING *`,
        [moradorId]
      );
    }

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Atualizar preferências de notificação
 */
async function updateNotificationPrefs(condoSchema, moradorId, prefs) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      `UPDATE notification_prefs
       SET votacoes_ativas = COALESCE($1, votacoes_ativas),
           periodo_sugestoes = COALESCE($2, periodo_sugestoes),
           pauta_definida = COALESCE($3, pauta_definida),
           agendamento_confirmacao = COALESCE($4, agendamento_confirmacao),
           agendamento_lembrete = COALESCE($5, agendamento_lembrete),
           comunicados = COALESCE($6, comunicados)
       WHERE morador_id = $7
       RETURNING *`,
      [
        prefs.votacoes_ativas,
        prefs.periodo_sugestoes,
        prefs.pauta_definida,
        prefs.agendamento_confirmacao,
        prefs.agendamento_lembrete,
        prefs.comunicados,
        moradorId,
      ]
    );

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Enfileirar notificação para envio
 */
async function queueNotification(condoSchema, moradorId, tipo, mensagem, canal = 'whatsapp') {
  const pool = getCondoPool(condoSchema);

  try {
    // Verificar preferências do morador
    const prefs = await getUserNotificationPrefs(condoSchema, moradorId);

    // Verificar se morador quer receber este tipo de notificação
    const tipoMapa = {
      'votacao_nova': 'votacoes_ativas',
      'periodo_sugestoes': 'periodo_sugestoes',
      'pauta_definida': 'pauta_definida',
      'agendamento_confirmacao': 'agendamento_confirmacao',
      'agendamento_lembrete': 'agendamento_lembrete',
      'comunicado': 'comunicados',
    };

    const prefKey = tipoMapa[tipo];
    if (prefKey && !prefs[prefKey]) {
      // Morador desativou este tipo de notificação
      await pool.end();
      return null;
    }

    // Enfileirar notificação
    const result = await pool.query(
      `INSERT INTO notification_queue
       (morador_id, tipo, mensagem, canal)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [moradorId, tipo, mensagem, canal]
    );

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Enviar notificação (WhatsApp ou Email)
 * TODO: Integrar com Twilio e SendGrid
 */
async function sendNotification(notification, userPhone, userEmail) {
  try {
    if (notification.canal === 'whatsapp') {
      // TODO: Integrar com Twilio
      // const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      // await twilio.messages.create({
      //   body: notification.mensagem,
      //   from: process.env.TWILIO_PHONE_NUMBER,
      //   to: userPhone,
      // });
      console.log(`[WhatsApp] Para: ${userPhone} | ${notification.mensagem}`);
    } else if (notification.canal === 'email') {
      // TODO: Integrar com SendGrid ou Gmail
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      // await sgMail.send({
      //   to: userEmail,
      //   from: process.env.GMAIL_USER,
      //   subject: 'CondoPlus - Notificação',
      //   text: notification.mensagem,
      // });
      console.log(`[Email] Para: ${userEmail} | ${notification.mensagem}`);
    }

    return { success: true };
  } catch (error) {
    console.error(`Erro ao enviar notificação (${notification.canal}):`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Atualizar status da notificação
 */
async function updateNotificationStatus(condoSchema, notificationId, status, errorMessage = null) {
  const pool = getCondoPool(condoSchema);

  try {
    await pool.query(
      `UPDATE notification_queue
       SET status = $1, enviado_em = NOW()
       WHERE id = $2`,
      [status, notificationId]
    );

    await pool.end();
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Listar notificações do usuário com paginação
 */
async function getUserNotifications(condoSchema, moradorId, options = {}) {
  const pool = getCondoPool(condoSchema);

  try {
    const { limit = 20, offset = 0, status = null } = options;

    let query = `SELECT id, tipo, mensagem, status, lido_em, criado_em
                 FROM notification_queue
                 WHERE morador_id = $1`;
    const params = [moradorId];

    if (status) {
      query += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    // Contar total
    const countResult = await pool.query(
      `SELECT COUNT(*) as total FROM notification_queue WHERE morador_id = $1 ${
        status ? `AND status = $2` : ''
      }`,
      status ? [moradorId, status] : [moradorId]
    );
    const total = parseInt(countResult.rows[0].total);

    // Buscar com paginação
    query += ` ORDER BY criado_em DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    await pool.end();

    return {
      notifications: result.rows,
      total,
      limit,
      offset,
    };
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Contar notificações não lidas
 */
async function getUnreadCount(condoSchema, moradorId) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      `SELECT COUNT(*) as count FROM notification_queue
       WHERE morador_id = $1 AND lido_em IS NULL`,
      [moradorId]
    );

    await pool.end();
    return parseInt(result.rows[0].count);
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Marcar notificação como lida
 */
async function markAsRead(condoSchema, notificationId, moradorId) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      `UPDATE notification_queue
       SET lido_em = NOW()
       WHERE id = $1 AND morador_id = $2
       RETURNING *`,
      [notificationId, moradorId]
    );

    if (result.rows.length === 0) {
      throw new Error('Notificação não encontrada');
    }

    await pool.end();
    return result.rows[0];
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Marcar todas as notificações como lidas
 */
async function markAllAsRead(condoSchema, moradorId) {
  const pool = getCondoPool(condoSchema);

  try {
    await pool.query(
      `UPDATE notification_queue
       SET lido_em = NOW()
       WHERE morador_id = $1 AND lido_em IS NULL`,
      [moradorId]
    );

    await pool.end();
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Deletar notificação
 */
async function deleteNotification(condoSchema, notificationId, moradorId) {
  const pool = getCondoPool(condoSchema);

  try {
    const result = await pool.query(
      `DELETE FROM notification_queue
       WHERE id = $1 AND morador_id = $2`,
      [notificationId, moradorId]
    );

    if (result.rowCount === 0) {
      throw new Error('Notificação não encontrada');
    }

    await pool.end();
  } catch (error) {
    await pool.end();
    throw error;
  }
}

module.exports = {
  getUserNotificationPrefs,
  updateNotificationPrefs,
  queueNotification,
  sendNotification,
  updateNotificationStatus,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};
