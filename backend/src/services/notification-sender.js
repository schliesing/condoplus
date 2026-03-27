const twilio = require('twilio');
const sgMail = require('@sendgrid/mail');
const { getCondoPool } = require('./database');

class NotificationSender {
  constructor() {
    // Initialize Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      this.twilioClient = twilio(
        process.env.TWILIO_ACCOUNT_SID,
        process.env.TWILIO_AUTH_TOKEN
      );
    }

    // Initialize SendGrid
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    }
  }

  /**
   * Send notification via WhatsApp (Twilio)
   */
  async sendWhatsAppMessage(telefone, mensagem) {
    if (!this.twilioClient) {
      throw new Error('Twilio not configured');
    }

    try {
      const message = await this.twilioClient.messages.create({
        body: mensagem,
        from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
        to: `whatsapp:${telefone}`
      });

      return {
        success: true,
        provider: 'twilio',
        messageId: message.sid,
        status: 'sent'
      };
    } catch (error) {
      console.error('Error sending WhatsApp message:', error);
      return {
        success: false,
        provider: 'twilio',
        error: error.message,
        status: 'failed'
      };
    }
  }

  /**
   * Send notification via Email (SendGrid)
   */
  async sendEmailMessage(email, assunto, corpo) {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SendGrid not configured');
    }

    try {
      const msg = {
        to: email,
        from: process.env.SENDGRID_FROM_EMAIL || 'noreply@condoplus.com',
        subject: assunto,
        html: corpo
      };

      const response = await sgMail.send(msg);

      return {
        success: true,
        provider: 'sendgrid',
        messageId: response[0].headers['x-message-id'],
        status: 'sent'
      };
    } catch (error) {
      console.error('Error sending email:', error);
      return {
        success: false,
        provider: 'sendgrid',
        error: error.message,
        status: 'failed'
      };
    }
  }

  /**
   * Send SMS via Twilio
   */
  async sendSMSMessage(telefone, mensagem) {
    if (!this.twilioClient) {
      throw new Error('Twilio not configured');
    }

    try {
      const message = await this.twilioClient.messages.create({
        body: mensagem,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: telefone
      });

      return {
        success: true,
        provider: 'twilio',
        messageId: message.sid,
        status: 'sent'
      };
    } catch (error) {
      console.error('Error sending SMS:', error);
      return {
        success: false,
        provider: 'twilio',
        error: error.message,
        status: 'failed'
      };
    }
  }

  /**
   * Get notification template
   */
  getTemplate(tipo, dados) {
    const templates = {
      votacao_ativa: {
        titulo: 'Nova Votação',
        whatsapp: `🗳️ *Nova Votação: ${dados.titulo}*\n\n${dados.descricao}\n\nVote em CondoPlus!`,
        email: this.buildEmailTemplate({
          titulo: 'Nova Votação',
          conteudo: `<h2>${dados.titulo}</h2><p>${dados.descricao}</p>`,
          botao: { texto: 'Votar Agora', url: dados.votacaoUrl }
        }),
        sms: `Nova votação: ${dados.titulo}. Acesse CondoPlus para votar.`
      },
      agendamento_confirmado: {
        titulo: 'Agendamento Confirmado',
        whatsapp: `✅ *Agendamento Confirmado*\n\nÁrea: ${dados.areaNome}\nData: ${dados.data}\nHorário: ${dados.horario}`,
        email: this.buildEmailTemplate({
          titulo: 'Agendamento Confirmado',
          conteudo: `<p><strong>Área:</strong> ${dados.areaNome}</p><p><strong>Data:</strong> ${dados.data}</p><p><strong>Horário:</strong> ${dados.horario}</p>`,
          botao: { texto: 'Ver Detalhes', url: dados.agendamentoUrl }
        }),
        sms: `Agendamento confirmado: ${dados.areaNome} em ${dados.data} às ${dados.horario}`
      },
      agendamento_cancelado: {
        titulo: 'Agendamento Cancelado',
        whatsapp: `❌ *Seu Agendamento foi Cancelado*\n\nÁrea: ${dados.areaNome}\nData: ${dados.data}`,
        email: this.buildEmailTemplate({
          titulo: 'Agendamento Cancelado',
          conteudo: `<p>Seu agendamento para <strong>${dados.areaNome}</strong> em <strong>${dados.data}</strong> foi cancelado.</p>`,
          botao: { texto: 'Agendar Novamente', url: dados.agendamentoUrl }
        }),
        sms: `Agendamento cancelado: ${dados.areaNome} em ${dados.data}`
      },
      fornecedor_adicionado: {
        titulo: 'Novo Fornecedor Adicionado',
        whatsapp: `👍 *Novo Fornecedor: ${dados.fornecedorNome}*\n\nCategoria: ${dados.categoria}`,
        email: this.buildEmailTemplate({
          titulo: 'Novo Fornecedor',
          conteudo: `<p><strong>${dados.fornecedorNome}</strong></p><p>Categoria: ${dados.categoria}</p>`,
          botao: { texto: 'Ver Fornecedor', url: dados.fornecedorUrl }
        }),
        sms: `Novo fornecedor: ${dados.fornecedorNome}`
      },
      notificacao_sistema: {
        titulo: 'Notificação do Sistema',
        whatsapp: `📢 ${dados.mensagem}`,
        email: this.buildEmailTemplate({
          titulo: dados.titulo,
          conteudo: `<p>${dados.mensagem}</p>`,
          botao: null
        }),
        sms: dados.mensagem.substring(0, 160)
      }
    };

    return templates[tipo] || templates.notificacao_sistema;
  }

  /**
   * Build HTML email template
   */
  buildEmailTemplate({ titulo, conteudo, botao }) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 20px; }
          .footer { background-color: #f5f5f5; padding: 10px; text-align: center; font-size: 12px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background-color: #2563eb; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; margin-top: 10px; }
          .button:hover { background-color: #1d4ed8; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${titulo}</h1>
          </div>
          <div class="content">
            ${conteudo}
            ${botao ? `<a href="${botao.url}" class="button">${botao.texto}</a>` : ''}
          </div>
          <div class="footer">
            <p>CondoPlus - Gerenciamento de Condomínios</p>
            <p>© 2026 Todos os direitos reservados</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Process notification queue
   */
  async processNotificationQueue(condoSchema, batchSize = 10) {
    const pool = getCondoPool();

    const notifications = await pool.query(
      `SELECT nq.*, u.email, u.telefone
       FROM ${condoSchema}.notification_queue nq
       JOIN ${condoSchema}.users u ON nq.usuario_id = u.id
       WHERE nq.status = 'pending'
       LIMIT $1`,
      [batchSize]
    );

    const results = [];

    for (const notif of notifications.rows) {
      try {
        const template = this.getTemplate(notif.tipo, JSON.parse(notif.metadados || '{}'));
        let sendResult = { success: false };

        // Check user preferences
        const prefsResult = await pool.query(
          `SELECT preferencias FROM ${condoSchema}.notification_prefs WHERE usuario_id = $1`,
          [notif.usuario_id]
        );

        const prefs = prefsResult.rows.length > 0
          ? JSON.parse(prefsResult.rows[0].preferencias)
          : {};

        // Send via enabled channels
        if (prefs[notif.tipo]?.whatsapp !== false && notif.usuario_id) {
          // Send WhatsApp if enabled
          if (notif.usuario_id && template.whatsapp) {
            sendResult = await this.sendWhatsAppMessage(
              notif.usuario_id,
              template.whatsapp
            );
          }
        }

        if (prefs[notif.tipo]?.email !== false && notif.usuario_id) {
          // Send email if enabled
          if (notif.usuario_id && template.email) {
            sendResult = await this.sendEmailMessage(
              notif.usuario_id,
              template.titulo,
              template.email
            );
          }
        }

        // Update notification status
        await pool.query(
          `UPDATE ${condoSchema}.notification_queue
           SET status = $1, provider = $2, updated_at = NOW()
           WHERE id = $3`,
          [sendResult.success ? 'sent' : 'failed', sendResult.provider, notif.id]
        );

        results.push({
          notificacao_id: notif.id,
          status: sendResult.success ? 'sent' : 'failed',
          provider: sendResult.provider,
          messageId: sendResult.messageId
        });
      } catch (error) {
        console.error(`Error processing notification ${notif.id}:`, error);

        // Mark as failed
        await pool.query(
          `UPDATE ${condoSchema}.notification_queue
           SET status = 'failed', updated_at = NOW()
           WHERE id = $1`,
          [notif.id]
        );

        results.push({
          notificacao_id: notif.id,
          status: 'failed',
          error: error.message
        });
      }
    }

    return results;
  }
}

module.exports = new NotificationSender();
