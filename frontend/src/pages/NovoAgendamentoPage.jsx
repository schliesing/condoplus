import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';

export default function NovoAgendamentoPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const areaIdParam = searchParams.get('areaId');
  const dataParam = searchParams.get('data');

  const [areas, setAreas] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [formData, setFormData] = useState({
    area_id: areaIdParam || '',
    data_inicio: dataParam || '',
    data_fim: '',
    descricao: ''
  });

  const [slotsLoading, setSlotsLoading] = useState(false);

  useEffect(() => {
    fetchAreas();
  }, []);

  const fetchAreas = async () => {
    try {
      const response = await api.get('/scheduling/areas');
      setAreas(response.data.data || []);
    } catch (err) {
      console.error('Erro ao carregar áreas:', err);
    }
  };

  const fetchAvailableSlots = async (areaId, data) => {
    if (!areaId || !data) return;

    try {
      setSlotsLoading(true);
      const response = await api.get('/scheduling/areas', {
        params: { areaId, data }
      });
      setSlots(response.data.data || []);
    } catch (err) {
      console.error('Erro ao buscar horários:', err);
      // Fallback: gerar horários padrão
      const horariosDefault = [];
      for (let hora = 8; hora < 22; hora++) {
        for (let min = 0; min < 60; min += 30) {
          horariosDefault.push(
            `${String(hora).padStart(2, '0')}:${String(min).padStart(2, '0')}`
          );
        }
      }
      setSlots(horariosDefault.map(h => ({ horario: h })));
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleAreaChange = (e) => {
    const areaId = e.target.value;
    setFormData({ ...formData, area_id: areaId });
    if (formData.data_inicio) {
      fetchAvailableSlots(areaId, formData.data_inicio);
    }
  };

  const handleDataChange = (e) => {
    const data = e.target.value;
    setFormData({ ...formData, data_inicio: data });
    if (formData.area_id) {
      fetchAvailableSlots(formData.area_id, data);
    }
  };

  const handleHorarioChange = (horarioInicio) => {
    // Assumir 1 hora de duração
    const [hora, min] = horarioInicio.split(':');
    const dataInicio = new Date(formData.data_inicio);
    dataInicio.setHours(parseInt(hora), parseInt(min), 0);

    const dataFim = new Date(dataInicio);
    dataFim.setHours(dataFim.getHours() + 1);

    setFormData({
      ...formData,
      data_inicio: dataInicio.toISOString().slice(0, 16),
      data_fim: dataFim.toISOString().slice(0, 16)
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.area_id || !formData.data_inicio || !formData.data_fim) {
      setError('Preencha todos os campos obrigatórios');
      return;
    }

    try {
      setLoading(true);
      await api.post('/scheduling/agendar', {
        area_id: formData.area_id,
        data_inicio: new Date(formData.data_inicio).toISOString(),
        data_fim: new Date(formData.data_fim).toISOString(),
        descricao: formData.descricao || null
      });
      alert('✓ Agendamento realizado com sucesso!');
      navigate('/agendamentos');
    } catch (err) {
      console.error('Erro ao agendar:', err);
      setError(err.response?.data?.error || 'Erro ao realizar agendamento');
    } finally {
      setLoading(false);
    }
  };

  const getAreaNome = () => {
    const area = areas.find(a => a.id === parseInt(formData.area_id));
    return area?.nome || '';
  };

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/agendamentos')} style={styles.btnBack}>
        ← Voltar
      </button>

      <div style={styles.header}>
        <h1>Novo Agendamento</h1>
        <p>Reserve uma área do condomínio</p>
      </div>

      {error && <div style={styles.error}>❌ {error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.grid}>
          {/* Coluna 1: Seleção */}
          <div style={styles.section}>
            <h2>1. Selecione uma Área</h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>Área *</label>
              <select
                value={formData.area_id}
                onChange={handleAreaChange}
                style={styles.select}
                required
              >
                <option value="">-- Selecione uma área --</option>
                {areas.map(area => (
                  <option key={area.id} value={area.id}>
                    {area.nome} (Cap: {area.capacidade_maxima})
                  </option>
                ))}
              </select>
            </div>

            {formData.area_id && (
              <div style={styles.areaInfo}>
                <p>
                  <strong>Área selecionada:</strong> {getAreaNome()}
                </p>
              </div>
            )}
          </div>

          {/* Coluna 2: Data e Horário */}
          {formData.area_id && (
            <div style={styles.section}>
              <h2>2. Selecione Data e Horário</h2>

              <div style={styles.formGroup}>
                <label style={styles.label}>Data *</label>
                <input
                  type="date"
                  value={formData.data_inicio.split('T')[0]}
                  onChange={(e) => {
                    const novaData = e.target.value;
                    handleDataChange({ target: { value: novaData } });
                  }}
                  style={styles.input}
                  required
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>

              {slotsLoading && <div style={styles.loading}>Carregando horários...</div>}

              {formData.data_inicio && !slotsLoading && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Horário de Início *</label>
                  <div style={styles.horariosGrid}>
                    {slots.map((slot, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleHorarioChange(slot.horario || slot)}
                        style={{
                          ...styles.horarioBtn,
                          ...(formData.data_inicio.includes(
                            slot.horario || slot
                          ) && styles.horarioBtnSelected)
                        }}
                      >
                        {slot.horario || slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {formData.data_inicio && formData.data_fim && (
                <div style={styles.resumoHorario}>
                  <strong>Resumo:</strong> <br />
                  De{' '}
                  {new Date(formData.data_inicio).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}{' '}
                  a{' '}
                  {new Date(formData.data_fim).toLocaleTimeString('pt-BR', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Observações */}
        {formData.area_id && (
          <div style={styles.section}>
            <h3>Observações (opcional)</h3>
            <textarea
              value={formData.descricao}
              onChange={(e) =>
                setFormData({ ...formData, descricao: e.target.value })
              }
              placeholder="Adicione detalhes sobre seu agendamento..."
              style={styles.textarea}
              maxLength={500}
            />
          </div>
        )}

        {/* Botões de Ação */}
        <div style={styles.actions}>
          <button
            type="button"
            onClick={() => navigate('/agendamentos')}
            style={styles.btnSecondary}
          >
            Cancelar
          </button>
          <button
            type="submit"
            style={styles.btnPrimary}
            disabled={loading || !formData.area_id || !formData.data_fim}
          >
            {loading ? 'Agendando...' : 'Confirmar Agendamento'}
          </button>
        </div>
      </form>

      {/* Info Box */}
      <div style={styles.infoBox}>
        <h3>ℹ️ Informações Importantes</h3>
        <ul>
          <li>Você pode cancelar até 24 horas antes do agendamento</li>
          <li>Agendamentos são confirmados automaticamente</li>
          <li>O horário é de até 1 hora por padrão</li>
          <li>Respeite a capacidade máxima da área</li>
        </ul>
      </div>
    </div>
  );
}

const styles = {
  container: {
    padding: '24px',
    maxWidth: '900px',
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
    marginBottom: '32px'
  },
  error: {
    background: 'var(--color-danger-light)',
    color: 'var(--color-danger)',
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '20px'
  },
  form: {
    background: 'white',
    border: '1px solid var(--color-gray-200)',
    borderRadius: '8px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: 'var(--shadow-sm)'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '32px',
    marginBottom: '24px'
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px'
  },
  label: {
    fontWeight: '600',
    color: 'var(--color-gray-700)',
    fontSize: '14px'
  },
  select: {
    padding: '10px',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  input: {
    padding: '10px',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '6px',
    fontSize: '14px'
  },
  areaInfo: {
    padding: '12px',
    background: 'var(--color-primary-light)',
    borderRadius: '6px',
    fontSize: '14px',
    color: 'var(--color-primary)'
  },
  loading: {
    textAlign: 'center',
    padding: '20px',
    color: 'var(--color-gray-500)'
  },
  horariosGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '8px'
  },
  horarioBtn: {
    padding: '8px',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '6px',
    background: 'white',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: '500',
    transition: 'all 0.2s'
  },
  horarioBtnSelected: {
    background: 'var(--color-primary)',
    color: 'white',
    borderColor: 'var(--color-primary)'
  },
  resumoHorario: {
    padding: '12px',
    background: 'var(--color-success-light)',
    color: 'var(--color-success)',
    borderRadius: '6px',
    fontSize: '14px'
  },
  textarea: {
    padding: '10px',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '80px'
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid var(--color-gray-200)'
  },
  btnSecondary: {
    padding: '10px 24px',
    border: '1px solid var(--color-gray-300)',
    background: 'white',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px'
  },
  btnPrimary: {
    padding: '10px 24px',
    background: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px'
  },
  infoBox: {
    background: 'var(--color-info-light)',
    border: '1px solid var(--color-info)',
    borderRadius: '8px',
    padding: '16px',
    color: 'var(--color-info)'
  }
};
