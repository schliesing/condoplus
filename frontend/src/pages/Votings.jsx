import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import '../styles/pages.css';

export default function Votings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [votings, setVotings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadVotings();
  }, []);

  const loadVotings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/votings');
      setVotings(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar votações');
      console.error('Erro:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      sugestoes: { label: 'Sugestões', color: 'badge-info' },
      pauta_definida: { label: 'Pauta Definida', color: 'badge-warning' },
      votando: { label: 'Votando', color: 'badge-primary' },
      encerrada: { label: 'Encerrada', color: 'badge-secondary' },
    };
    const config = statusMap[status] || { label: status, color: 'badge-default' };
    return <span className={`badge ${config.color}`}>{config.label}</span>;
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Votações</h1>
        {user?.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => navigate('/votings/create')}>
            + Nova Votação
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {loading ? (
        <div className="loading-spinner">Carregando votações...</div>
      ) : votings.length === 0 ? (
        <div className="empty-state">
          <p>Nenhuma votação encontrada</p>
        </div>
      ) : (
        <div className="votings-grid">
          {votings.map((voting) => (
            <div key={voting.id} className="voting-card">
              <div className="voting-header">
                <h3>{voting.titulo}</h3>
                {getStatusBadge(voting.status)}
              </div>

              <div className="voting-info">
                <p className="voting-description">{voting.descricao}</p>

                <div className="voting-dates">
                  <div>
                    <label>Período de Sugestões</label>
                    <p>
                      {formatDate(voting.data_inicio_sugestoes)} a{' '}
                      {formatDate(voting.data_fim_sugestoes)}
                    </p>
                  </div>
                  <div>
                    <label>Período de Votação</label>
                    <p>
                      {formatDate(voting.data_inicio_votacao)} a{' '}
                      {formatDate(voting.data_fim_votacao)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="voting-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => navigate(`/votings/${voting.id}`)}
                >
                  Ver Detalhes
                </button>
                {voting.status === 'votando' && user?.role !== 'admin' && (
                  <button
                    className="btn btn-primary"
                    onClick={() => navigate(`/votings/${voting.id}/vote`)}
                  >
                    Votar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
