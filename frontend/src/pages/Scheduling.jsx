import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import '../styles/pages.css';

export default function Scheduling() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [areas, setAreas] = useState([]);
  const [myReservations, setMyReservations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTab, setSelectedTab] = useState('areas');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [areasRes, reservationsRes] = await Promise.all([
        api.get('/scheduling/areas'),
        api.get('/scheduling/meus-agendamentos'),
      ]);
      setAreas(areasRes.data);
      setMyReservations(reservationsRes.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar dados');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const formatDateTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const cancelReservation = async (reservationId) => {
    if (!window.confirm('Deseja cancelar esta reserva?')) return;

    try {
      await api.delete(`/scheduling/agendamentos/${reservationId}`);
      setMyReservations(myReservations.filter((r) => r.id !== reservationId));
      alert('Reserva cancelada com sucesso');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao cancelar reserva');
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Agendamentos</h1>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="tabs">
        <button
          className={`tab ${selectedTab === 'areas' ? 'active' : ''}`}
          onClick={() => setSelectedTab('areas')}
        >
          Áreas Disponíveis
        </button>
        <button
          className={`tab ${selectedTab === 'myReservations' ? 'active' : ''}`}
          onClick={() => setSelectedTab('myReservations')}
        >
          Minhas Reservas
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner">Carregando...</div>
      ) : selectedTab === 'areas' ? (
        <div className="areas-grid">
          {areas.length === 0 ? (
            <div className="empty-state">Nenhuma área disponível</div>
          ) : (
            areas.map((area) => (
              <div key={area.id} className="area-card">
                <h3>{area.nome}</h3>
                <p className="area-description">{area.descricao}</p>
                <div className="area-info">
                  <span className="capacity">
                    👥 Capacidade: {area.capacidade} pessoas
                  </span>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/scheduling/reserve/${area.id}`)}
                >
                  Agendar
                </button>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="reservations-list">
          {myReservations.length === 0 ? (
            <div className="empty-state">Você não tem reservas ativas</div>
          ) : (
            myReservations.map((reservation) => (
              <div key={reservation.id} className="reservation-item">
                <div className="reservation-header">
                  <h4>{reservation.area_nome}</h4>
                  <span className="status-badge">Confirmada</span>
                </div>

                <div className="reservation-details">
                  <div className="detail">
                    <label>Início:</label>
                    <p>{formatDateTime(reservation.data_inicio)}</p>
                  </div>
                  <div className="detail">
                    <label>Término:</label>
                    <p>{formatDateTime(reservation.data_fim)}</p>
                  </div>
                </div>

                <div className="reservation-actions">
                  <button
                    className="btn btn-danger"
                    onClick={() => cancelReservation(reservation.id)}
                  >
                    Cancelar Reserva
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
