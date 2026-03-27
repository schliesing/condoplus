import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';

export default function VotacoesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [votacoes, setVotacoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState('todas');

  useEffect(() => {
    fetchVotacoes();
  }, [filter]);

  const fetchVotacoes = async () => {
    try {
      setLoading(true);
      const response = await api.get('/votings');
      let data = response.data.data || [];

      if (filter !== 'todas') {
        data = data.filter(v => v.status === filter);
      }

      setVotacoes(data);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar votações:', err);
      setError(err.response?.data?.error || 'Erro ao carregar votações');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      sugestoes: 'var(--color-warning)',
      pauta_definida: 'var(--color-info)',
      votando: 'var(--color-primary)',
      encerrada: 'var(--color-success)'
    };
    return colors[status] || 'var(--color-gray-400)';
  };

  const getStatusLabel = (status) => {
    const labels = {
      sugestoes: 'Sugestões',
      pauta_definida: 'Pauta Definida',
      votando: 'Votando',
      encerrada: 'Encerrada'
    };
    return labels[status] || status;
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Votações</h1>
        {user?.role === 'admin' && (
          <button
            onClick={() => navigate('/votacoes/nova')}
            style={styles.btnPrimary}
          >
            + Nova Votação
          </button>
        )}
      </div>

      <div style={styles.filterBar}>
        {['todas', 'pauta_definida', 'votando', 'encerrada'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              ...styles.filterBtn,
              ...(filter === f && styles.filterBtnActive)
            }}
          >
            {f === 'todas' ? 'Todas' : getStatusLabel(f)}
          </button>
        ))}
      </div>

      {loading && <div style={styles.loading}>Carregando votações...</div>}

      {error && <div style={styles.error}>❌ {error}</div>}

      {!loading && votacoes.length === 0 && (
        <div style={styles.empty}>📋 Nenhuma votação encontrada</div>
      )}

      <div style={styles.grid}>
        {votacoes.map(votacao => (
          <div
            key={votacao.id}
            style={styles.card}
            onClick={() => navigate(`/votacoes/${votacao.id}`)}
          >
            <div style={styles.cardHeader}>
              <h3>{votacao.titulo}</h3>
              <span style={{ ...styles.status, backgroundColor: getStatusColor(votacao.status) }}>
                {getStatusLabel(votacao.status)}
              </span>
            </div>

            <p style={styles.cardDesc}>{votacao.descricao}</p>

            <div style={styles.cardMeta}>
              <span>📅 {new Date(votacao.data_inicio).toLocaleDateString('pt-BR')}</span>
              <span>👥 {votacao.total_votos || 0} votos</span>
            </div>

            {votacao.status === 'votando' && !votacao.usuario_ja_votou && (
              <button
                style={styles.btnVotar}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/votacoes/${votacao.id}/votar`);
                }}
              >
                Votar Agora
              </button>
            )}

            {votacao.usuario_ja_votou && (
              <div style={styles.badgeVotou}>✓ Você já votou</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '32px'
  },
  filterBar: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    flexWrap: 'wrap'
  },
  filterBtn: {
    padding: '8px 16px',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '6px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  filterBtnActive: {
    background: 'var(--color-primary)',
    color: 'white',
    borderColor: 'var(--color-primary)'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    color: 'var(--color-gray-500)',
    fontSize: '16px'
  },
  error: {
    background: 'var(--color-danger-light)',
    color: 'var(--color-danger)',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px'
  },
  empty: {
    textAlign: 'center',
    padding: '40px',
    color: 'var(--color-gray-400)',
    fontSize: '16px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
    gap: '20px'
  },
  card: {
    background: 'white',
    border: '1px solid var(--color-gray-200)',
    borderRadius: '8px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    boxShadow: 'var(--shadow-sm)',
    ':hover': {
      boxShadow: 'var(--shadow-md)'
    }
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    gap: '12px'
  },
  status: {
    padding: '4px 12px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap'
  },
  cardDesc: {
    color: 'var(--color-gray-600)',
    fontSize: '14px',
    marginBottom: '12px',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  cardMeta: {
    display: 'flex',
    gap: '20px',
    fontSize: '13px',
    color: 'var(--color-gray-500)',
    marginBottom: '12px',
    borderTop: '1px solid var(--color-gray-100)',
    paddingTop: '12px'
  },
  btnPrimary: {
    padding: '10px 20px',
    background: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    transition: 'all 0.2s'
  },
  btnVotar: {
    width: '100%',
    padding: '10px',
    background: 'var(--color-success)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    marginTop: '12px'
  },
  badgeVotou: {
    marginTop: '12px',
    padding: '8px 12px',
    background: 'var(--color-success-light)',
    color: 'var(--color-success)',
    borderRadius: '4px',
    fontSize: '13px',
    textAlign: 'center'
  }
};
