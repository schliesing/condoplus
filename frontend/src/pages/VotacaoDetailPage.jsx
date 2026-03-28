import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';

export default function VotacaoDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [votacao, setVotacao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedOpcao, setSelectedOpcao] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [votoRegistrado, setVotoRegistrado] = useState(false);

  useEffect(() => {
    fetchVotacao();
  }, [id]);

  const fetchVotacao = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/votings/${id}`);
      setVotacao(response.data.data);
      setError(null);

      // Check if user already voted
      if (response.data.data.usuario_voto_id) {
        setSelectedOpcao(response.data.data.usuario_voto_opcao);
        setVotoRegistrado(true);
      }
    } catch (err) {
      console.error('Erro ao carregar votação:', err);
      setError(err.response?.data?.error || 'Erro ao carregar votação');
    } finally {
      setLoading(false);
    }
  };

  const handleVoto = async () => {
    if (!selectedOpcao) {
      alert('Selecione uma opção para votar');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/votings/${id}/votar`, { opcao: selectedOpcao });
      setVotoRegistrado(true);
      await fetchVotacao();
    } catch (err) {
      console.error('Erro ao registrar voto:', err);
      setError(err.response?.data?.error || 'Erro ao registrar voto');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAtualizarVoto = async () => {
    if (!selectedOpcao) return;
    try {
      setSubmitting(true);
      await api.put(`/votings/${id}/voto`, { opcao: selectedOpcao });
      await fetchVotacao();
    } catch (err) {
      console.error('Erro ao atualizar voto:', err);
      setError(err.response?.data?.error || 'Erro ao atualizar voto');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={styles.loading}>Carregando votação...</div>;
  if (error) return <div style={styles.error}>❌ {error}</div>;
  if (!votacao) return <div style={styles.error}>Votação não encontrada</div>;

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/votacoes')} style={styles.btnBack}>
        ← Voltar
      </button>

      <div style={styles.header}>
        <div>
          <h1>{votacao.titulo}</h1>
          <p style={styles.descricao}>{votacao.descricao}</p>
        </div>
        <span style={{ ...styles.status, backgroundColor: getStatusColor(votacao.status) }}>
          {getStatusLabel(votacao.status)}
        </span>
      </div>

      <div style={styles.grid}>
        <div style={styles.mainContent}>
          {/* Votação */}
          {votacao.status === 'votando' && (
            <div style={styles.section}>
              <h2>Suas Opções</h2>
              <div style={styles.opcoes}>
                {votacao.opcoes?.map(opcao => (
                  <label key={opcao} style={styles.opcaoLabel}>
                    <input
                      type="radio"
                      name="voto"
                      value={opcao}
                      checked={selectedOpcao === opcao}
                      onChange={(e) => setSelectedOpcao(e.target.value)}
                      disabled={submitting}
                    />
                    <span style={styles.opcaoText}>{opcao}</span>
                  </label>
                ))}
              </div>

              {votoRegistrado && votacao.status === 'votando' && (
                <button
                  onClick={handleAtualizarVoto}
                  style={styles.btnSecondary}
                  disabled={submitting}
                >
                  {submitting ? 'Atualizando...' : 'Atualizar Voto'}
                </button>
              )}

              {!votoRegistrado && (
                <button
                  onClick={handleVoto}
                  style={styles.btnPrimary}
                  disabled={submitting || !selectedOpcao}
                >
                  {submitting ? 'Registrando...' : 'Registrar Voto'}
                </button>
              )}
            </div>
          )}

          {/* Resultados */}
          {(votacao.status === 'encerrada' || votacao.resultados) && (
            <div style={styles.section}>
              <h2>Resultados</h2>
              <div style={styles.resultados}>
                {votacao.resultados?.map((resultado, idx) => (
                  <div key={idx} style={styles.resultado}>
                    <div style={styles.resultadoHeader}>
                      <span>{resultado.opcao}</span>
                      <span style={styles.percentual}>{resultado.percentual?.toFixed(1)}%</span>
                    </div>
                    <div style={styles.barraContainer}>
                      <div
                        style={{
                          ...styles.barra,
                          width: `${resultado.percentual || 0}%`
                        }}
                      />
                    </div>
                    <span style={styles.votos}>{resultado.total_votos} votos</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {votacao.status === 'encerrada' && (
            <div style={styles.stats}>
              <div style={styles.stat}>
                <span style={styles.statLabel}>Total de Votos</span>
                <span style={styles.statValue}>{votacao.total_votos || 0}</span>
              </div>
              <div style={styles.stat}>
                <span style={styles.statLabel}>Quórum</span>
                <span style={styles.statValue}>
                  {votacao.quorum_atingido ? '✓ Atingido' : '✗ Não atingido'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.infoCard}>
            <h3>Informações</h3>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Início:</span>
              <span>{new Date(votacao.data_inicio).toLocaleDateString('pt-BR')}</span>
            </div>
            {votacao.data_fim && (
              <div style={styles.infoItem}>
                <span style={styles.infoLabel}>Fim:</span>
                <span>{new Date(votacao.data_fim).toLocaleDateString('pt-BR')}</span>
              </div>
            )}
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Status do Voto:</span>
              <span>{votoRegistrado ? '✓ Registrado' : '○ Não votou'}</span>
            </div>
          </div>

          {votacao.status === 'encerrada' && votacao.assinatura_status && (
            <div style={styles.infoCard}>
              <h3>Assinatura Digital</h3>
              <p style={styles.assinaturaBadge}>
                {votacao.assinatura_status === 'assinado' ? '✓ Assinado' : 'Pendente'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

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

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1200px',
    margin: '0 auto'
  },
  btnBack: {
    background: 'none',
    border: 'none',
    color: 'var(--color-primary)',
    fontSize: '16px',
    cursor: 'pointer',
    marginBottom: '20px',
    fontWeight: '500'
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px',
    gap: '20px'
  },
  status: {
    padding: '8px 16px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '600',
    whiteSpace: 'nowrap'
  },
  descricao: {
    color: 'var(--color-gray-600)',
    fontSize: '16px',
    marginTop: '8px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: '32px'
  },
  mainContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  section: {
    background: 'white',
    border: '1px solid var(--color-gray-200)',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: 'var(--shadow-sm)'
  },
  opcoes: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '20px'
  },
  opcaoLabel: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    border: '1px solid var(--color-gray-200)',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  opcaoText: {
    marginLeft: '12px',
    fontSize: '16px'
  },
  resultados: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  resultado: {
    marginBottom: '16px'
  },
  resultadoHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500'
  },
  percentual: {
    color: 'var(--color-primary)',
    fontWeight: '600'
  },
  barraContainer: {
    width: '100%',
    height: '24px',
    background: 'var(--color-gray-100)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '4px'
  },
  barra: {
    height: '100%',
    background: 'var(--color-primary)',
    transition: 'width 0.3s'
  },
  votos: {
    fontSize: '12px',
    color: 'var(--color-gray-500)'
  },
  stats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px'
  },
  stat: {
    background: 'var(--color-primary-light)',
    padding: '16px',
    borderRadius: '8px',
    textAlign: 'center'
  },
  statLabel: {
    display: 'block',
    fontSize: '13px',
    color: 'var(--color-gray-600)',
    marginBottom: '8px'
  },
  statValue: {
    display: 'block',
    fontSize: '20px',
    fontWeight: '600',
    color: 'var(--color-primary)'
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  infoCard: {
    background: 'white',
    border: '1px solid var(--color-gray-200)',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: 'var(--shadow-sm)'
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
    fontSize: '14px',
    borderBottom: '1px solid var(--color-gray-100)'
  },
  infoLabel: {
    color: 'var(--color-gray-600)',
    fontWeight: '500'
  },
  assinaturaBadge: {
    background: 'var(--color-success-light)',
    color: 'var(--color-success)',
    padding: '8px',
    borderRadius: '4px',
    textAlign: 'center',
    fontWeight: '600',
    margin: '8px 0'
  },
  btnPrimary: {
    width: '100%',
    padding: '12px',
    background: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px'
  },
  btnSecondary: {
    width: '100%',
    padding: '12px',
    background: 'var(--color-secondary)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px'
  },
  loading: {
    textAlign: 'center',
    padding: '40px',
    fontSize: '16px',
    color: 'var(--color-gray-500)'
  },
  error: {
    background: 'var(--color-danger-light)',
    color: 'var(--color-danger)',
    padding: '16px',
    borderRadius: '6px',
    marginTop: '20px'
  }
};
