import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';

export default function AgendamentosPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [areas, setAreas] = useState([]);
  const [meuAgendamentos, setMeuAgendamentos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tab, setTab] = useState('meus'); // 'meus' ou 'areas'
  const [selectedArea, setSelectedArea] = useState(null);
  const [areaSchedule, setAreaSchedule] = useState(null);
  const [scheduleLoading, setScheduleLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [areasRes, agendamentosRes] = await Promise.all([
        api.get('/scheduling/areas'),
        api.get('/scheduling/meus-agendamentos')
      ]);
      setAreas(areasRes.data.data || []);
      setMeuAgendamentos(agendamentosRes.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar agendamentos:', err);
      setError(err.response?.data?.error || 'Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const fetchAreaSchedule = async (areaId) => {
    try {
      setScheduleLoading(true);
      const response = await api.get(`/scheduling/areas/${areaId}/schedule`);
      setAreaSchedule(response.data.data);
      setSelectedArea(areaId);
    } catch (err) {
      console.error('Erro ao carregar calendário:', err);
      setError(err.response?.data?.error || 'Erro ao carregar calendário');
    } finally {
      setScheduleLoading(false);
    }
  };

  const handleCancelarAgendamento = async (agendamentoId) => {
    if (!window.confirm('Tem certeza que deseja cancelar este agendamento?')) return;

    try {
      await api.delete(`/scheduling/agendamentos/${agendamentoId}`);
      setMeuAgendamentos(meuAgendamentos.filter(a => a.id !== agendamentoId));
      alert('✓ Agendamento cancelado com sucesso');
    } catch (err) {
      console.error('Erro ao cancelar:', err);
      alert(err.response?.data?.error || 'Erro ao cancelar agendamento');
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      confirmado: 'var(--color-success)',
      pendente: 'var(--color-warning)',
      cancelado: 'var(--color-danger)'
    };
    return colors[status] || 'var(--color-gray-400)';
  };

  const canCancelAgendamento = (agendamento) => {
    const dataAgendamento = new Date(agendamento.data_inicio);
    const agora = new Date();
    const horasRestantes = (dataAgendamento - agora) / (1000 * 60 * 60);
    return horasRestantes > 24 && agendamento.status === 'confirmado';
  };

  if (loading) return <div style={styles.loading}>Carregando agendamentos...</div>;
  if (error) return <div style={styles.error}>❌ {error}</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1>Agendamentos</h1>
      </div>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setTab('meus')}
          style={{ ...styles.tab, ...(tab === 'meus' && styles.tabActive) }}
        >
          📅 Meus Agendamentos ({meuAgendamentos.length})
        </button>
        <button
          onClick={() => setTab('areas')}
          style={{ ...styles.tab, ...(tab === 'areas' && styles.tabActive) }}
        >
          🏢 Agendar Área
        </button>
      </div>

      {/* Tab: Meus Agendamentos */}
      {tab === 'meus' && (
        <div>
          {meuAgendamentos.length === 0 ? (
            <div style={styles.empty}>
              📋 Você não tem agendamentos. <br />
              <button
                onClick={() => setTab('areas')}
                style={styles.linkBtn}
              >
                Agendar uma área
              </button>
            </div>
          ) : (
            <div style={styles.listaPessoal}>
              {meuAgendamentos.map(agendamento => (
                <div key={agendamento.id} style={styles.cardAgendamento}>
                  <div style={styles.cardHeader}>
                    <div>
                      <h3>{agendamento.area_nome}</h3>
                      <p style={styles.cardDesc}>{agendamento.descricao}</p>
                    </div>
                    <span
                      style={{
                        ...styles.status,
                        backgroundColor: getStatusColor(agendamento.status)
                      }}
                    >
                      {agendamento.status}
                    </span>
                  </div>

                  <div style={styles.cardMeta}>
                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>📅 Data:</span>
                      <span>
                        {new Date(agendamento.data_inicio).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                    <div style={styles.metaItem}>
                      <span style={styles.metaLabel}>⏰ Horário:</span>
                      <span>
                        {new Date(agendamento.data_inicio).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}{' '}
                        a{' '}
                        {new Date(agendamento.data_fim).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>

                  {canCancelAgendamento(agendamento) && (
                    <button
                      onClick={() => handleCancelarAgendamento(agendamento.id)}
                      style={styles.btnCancelar}
                    >
                      ✕ Cancelar
                    </button>
                  )}

                  {!canCancelAgendamento(agendamento) && (
                    <div style={styles.aviso}>
                      ⚠️ Cancelamento não permitido (menos de 24 horas)
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab: Agendar Área */}
      {tab === 'areas' && (
        <div style={styles.areasSection}>
          <div style={styles.gridAreas}>
            {areas.map(area => (
              <div
                key={area.id}
                style={{
                  ...styles.areaCard,
                  cursor: 'pointer',
                  ...(selectedArea === area.id && styles.areaCardSelected)
                }}
                onClick={() => fetchAreaSchedule(area.id)}
              >
                <h3>{area.nome}</h3>
                <p style={styles.areaDesc}>{area.descricao}</p>
                <div style={styles.areaInfo}>
                  <span>📍 {area.endereco}</span>
                  <span>👥 Cap: {area.capacidade_maxima}</span>
                </div>
                {selectedArea === area.id && (
                  <div style={styles.areaSelected}>✓ Selecionada</div>
                )}
              </div>
            ))}
          </div>

          {selectedArea && scheduleLoading && (
            <div style={styles.loading}>Carregando calendário...</div>
          )}

          {selectedArea && areaSchedule && !scheduleLoading && (
            <div style={styles.scheduleSection}>
              <h2>Calendário de {areaSchedule.area_nome}</h2>

              <div style={styles.calendarGrid}>
                {areaSchedule.datas_disponiveis?.map(data => (
                  <div key={data} style={styles.dataCard}>
                    <button
                      onClick={() =>
                        navigate(`/agendamentos/nova?areaId=${selectedArea}&data=${data}`)
                      }
                      style={styles.btnAgendar}
                    >
                      {new Date(data).toLocaleDateString('pt-BR', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </button>
                  </div>
                ))}
              </div>

              {areaSchedule.datas_bloqueadas && (
                <div style={styles.aviso}>
                  ℹ️ Algumas datas estão bloqueadas para manutenção
                </div>
              )}

              <button
                onClick={() =>
                  navigate(`/agendamentos/nova?areaId=${selectedArea}`)
                }
                style={styles.btnAgendar2}
              >
                Agendar Esta Área
              </button>
            </div>
          )}
        </div>
      )}
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
    marginBottom: '32px'
  },
  tabs: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
    borderBottom: '2px solid var(--color-gray-200)',
    paddingBottom: '12px'
  },
  tab: {
    padding: '8px 16px',
    background: 'none',
    border: 'none',
    color: 'var(--color-gray-600)',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: '500',
    borderBottom: '3px solid transparent',
    transition: 'all 0.2s'
  },
  tabActive: {
    color: 'var(--color-primary)',
    borderBottomColor: 'var(--color-primary)'
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
    padding: '16px',
    borderRadius: '6px',
    marginBottom: '20px'
  },
  empty: {
    textAlign: 'center',
    padding: '60px 20px',
    color: 'var(--color-gray-400)',
    fontSize: '16px'
  },
  linkBtn: {
    background: 'none',
    border: 'none',
    color: 'var(--color-primary)',
    cursor: 'pointer',
    textDecoration: 'underline',
    fontSize: '16px',
    marginTop: '12px'
  },
  listaPessoal: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  cardAgendamento: {
    background: 'white',
    border: '1px solid var(--color-gray-200)',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: 'var(--shadow-sm)'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '16px'
  },
  cardDesc: {
    color: 'var(--color-gray-600)',
    fontSize: '14px',
    marginTop: '4px'
  },
  status: {
    padding: '4px 12px',
    borderRadius: '20px',
    color: 'white',
    fontSize: '12px',
    fontWeight: '600',
    whiteSpace: 'nowrap'
  },
  cardMeta: {
    display: 'flex',
    gap: '24px',
    fontSize: '14px',
    marginBottom: '16px',
    paddingTop: '12px',
    borderTop: '1px solid var(--color-gray-100)'
  },
  metaItem: {
    display: 'flex',
    gap: '8px',
    alignItems: 'center'
  },
  metaLabel: {
    color: 'var(--color-gray-600)',
    fontWeight: '500'
  },
  aviso: {
    background: 'var(--color-warning-light)',
    color: 'var(--color-warning)',
    padding: '12px',
    borderRadius: '6px',
    fontSize: '13px',
    textAlign: 'center'
  },
  btnCancelar: {
    width: '100%',
    padding: '10px',
    background: 'var(--color-danger)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    marginTop: '12px'
  },
  areasSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px'
  },
  gridAreas: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px'
  },
  areaCard: {
    background: 'white',
    border: '2px solid var(--color-gray-200)',
    borderRadius: '8px',
    padding: '20px',
    boxShadow: 'var(--shadow-sm)',
    transition: 'all 0.2s'
  },
  areaCardSelected: {
    borderColor: 'var(--color-primary)',
    boxShadow: 'var(--shadow-md)',
    backgroundColor: 'var(--color-primary-light)'
  },
  areaDesc: {
    color: 'var(--color-gray-600)',
    fontSize: '14px',
    marginTop: '8px',
    marginBottom: '12px'
  },
  areaInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    fontSize: '13px',
    color: 'var(--color-gray-500)'
  },
  areaSelected: {
    marginTop: '12px',
    padding: '8px',
    background: 'var(--color-success-light)',
    color: 'var(--color-success)',
    borderRadius: '4px',
    fontSize: '13px',
    textAlign: 'center',
    fontWeight: '600'
  },
  scheduleSection: {
    background: 'white',
    border: '1px solid var(--color-gray-200)',
    borderRadius: '8px',
    padding: '24px'
  },
  calendarGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))',
    gap: '12px',
    marginBottom: '24px'
  },
  dataCard: {
    textAlign: 'center'
  },
  btnAgendar: {
    width: '100%',
    padding: '12px 8px',
    background: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '13px',
    transition: 'all 0.2s'
  },
  btnAgendar2: {
    width: '100%',
    padding: '12px',
    background: 'var(--color-success)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px'
  }
};
