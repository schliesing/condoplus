import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import '../styles/pages.css';

export default function Notifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('notifications');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [notifRes, prefRes] = await Promise.all([
        api.get('/notifications'),
        api.get('/notifications/preferences'),
      ]);
      setNotifications(notifRes.data.notifications || []);
      setPreferences(prefRes.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(
        notifications.map((n) =>
          n.id === notificationId ? { ...n, lido_em: new Date() } : n
        )
      );
    } catch (err) {
      console.error('Erro ao marcar como lida:', err);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      await api.delete(`/notifications/${notificationId}`);
      setNotifications(notifications.filter((n) => n.id !== notificationId));
    } catch (err) {
      alert('Erro ao deletar notificação');
    }
  };

  const handlePreferenceChange = async (chave, valor) => {
    try {
      const updateData = { [chave]: valor };
      const response = await api.put('/notifications/preferences', updateData);
      setPreferences(response.data);
    } catch (err) {
      alert('Erro ao atualizar preferência');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Central de Notificações</h1>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="tabs">
        <button
          className={`tab ${selectedTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setSelectedTab('notifications')}
        >
          Notificações
        </button>
        <button
          className={`tab ${selectedTab === 'preferences' ? 'active' : ''}`}
          onClick={() => setSelectedTab('preferences')}
        >
          Preferências
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner">Carregando...</div>
      ) : selectedTab === 'notifications' ? (
        <div className="notifications-list">
          {notifications.length === 0 ? (
            <div className="empty-state">Você não tem notificações</div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${notification.lido_em ? 'read' : 'unread'}`}
              >
                <div className="notification-content">
                  <p className="notification-message">{notification.mensagem}</p>
                  <small className="notification-date">{formatDate(notification.criado_em)}</small>
                </div>

                <div className="notification-actions">
                  {!notification.lido_em && (
                    <button
                      className="btn btn-sm btn-secondary"
                      onClick={() => markAsRead(notification.id)}
                    >
                      Marcar como lida
                    </button>
                  )}
                  <button
                    className="btn btn-sm btn-danger"
                    onClick={() => deleteNotification(notification.id)}
                  >
                    Remover
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : preferences ? (
        <div className="preferences-form">
          <h2>Preferências de Notificação</h2>
          <p className="section-description">
            Customize como e quando você deseja receber notificações
          </p>

          <div className="preferences-section">
            <h3>Tipos de Notificação</h3>

            <div className="preference-group">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.votacoes_ativas || false}
                  onChange={(e) => handlePreferenceChange('votacoes_ativas', e.target.checked)}
                />
                Votações Ativas
              </label>
              <small>Receba notificações sobre novas votações</small>
            </div>

            <div className="preference-group">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.agendamento_confirmacao || false}
                  onChange={(e) =>
                    handlePreferenceChange('agendamento_confirmacao', e.target.checked)
                  }
                />
                Confirmação de Agendamento
              </label>
              <small>Receba confirmação quando agendar uma área</small>
            </div>

            <div className="preference-group">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.agendamento_cancelado || false}
                  onChange={(e) =>
                    handlePreferenceChange('agendamento_cancelado', e.target.checked)
                  }
                />
                Cancelamento de Agendamento
              </label>
              <small>Receba notificação quando cancelar uma reserva</small>
            </div>

            <div className="preference-group">
              <label>
                <input
                  type="checkbox"
                  checked={preferences.votacao_resultado || false}
                  onChange={(e) => handlePreferenceChange('votacao_resultado', e.target.checked)}
                />
                Resultado de Votação
              </label>
              <small>Receba notificação com resultados das votações</small>
            </div>
          </div>

          <div className="preferences-section">
            <h3>Canal de Entrega</h3>

            <div className="preference-group">
              <label>
                <input
                  type="radio"
                  name="canal"
                  value="email"
                  checked={preferences.canal === 'email'}
                  onChange={(e) => handlePreferenceChange('canal', e.target.value)}
                />
                Email
              </label>
            </div>

            <div className="preference-group">
              <label>
                <input
                  type="radio"
                  name="canal"
                  value="whatsapp"
                  checked={preferences.canal === 'whatsapp'}
                  onChange={(e) => handlePreferenceChange('canal', e.target.value)}
                />
                WhatsApp
              </label>
            </div>

            <div className="preference-group">
              <label>
                <input
                  type="radio"
                  name="canal"
                  value="ambos"
                  checked={preferences.canal === 'ambos'}
                  onChange={(e) => handlePreferenceChange('canal', e.target.value)}
                />
                Ambos
              </label>
            </div>
          </div>

          <p className="preferences-note">As preferências são salvas automaticamente.</p>
        </div>
      ) : (
        <div className="empty-state">Erro ao carregar preferências</div>
      )}
    </div>
  );
}
