import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';

export default function FornecedorDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [fornecedor, setFornecedor] = useState(null);
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showFormNota, setShowFormNota] = useState(false);
  const [formNota, setFormNota] = useState({
    numero_nota: '',
    data_emissao: '',
    valor: '',
    descricao: ''
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchFornecedor();
  }, [id]);

  const fetchFornecedor = async () => {
    try {
      setLoading(true);
      const [fornecedorRes, notasRes] = await Promise.all([
        api.get(`/suppliers/${id}`),
        api.get(`/suppliers/${id}/notas`)
      ]);
      setFornecedor(fornecedorRes.data.data);
      setNotas(notasRes.data.data || []);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar fornecedor:', err);
      setError(err.response?.data?.error || 'Erro ao carregar fornecedor');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitNota = async (e) => {
    e.preventDefault();

    if (!formNota.numero_nota || !formNota.data_emissao || !formNota.valor) {
      alert('Preencha os campos obrigatórios');
      return;
    }

    try {
      setSubmitting(true);
      await api.post(`/suppliers/${id}/notas`, {
        numero_nota: formNota.numero_nota,
        data_emissao: formNota.data_emissao,
        valor: parseFloat(formNota.valor),
        descricao: formNota.descricao || null
      });

      alert('✓ Nota fiscal adicionada com sucesso');
      setFormNota({ numero_nota: '', data_emissao: '', valor: '', descricao: '' });
      setShowFormNota(false);
      fetchFornecedor();
    } catch (err) {
      console.error('Erro ao adicionar nota:', err);
      alert(err.response?.data?.error || 'Erro ao adicionar nota fiscal');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={styles.loading}>Carregando fornecedor...</div>;
  if (error) return <div style={styles.error}>❌ {error}</div>;
  if (!fornecedor) return <div style={styles.error}>Fornecedor não encontrado</div>;

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/fornecedores')} style={styles.btnBack}>
        ← Voltar
      </button>

      <div style={styles.header}>
        <div>
          <h1>{fornecedor.nome}</h1>
          <span style={styles.categoria}>{fornecedor.categoria}</span>
        </div>
      </div>

      {/* Informações Principais */}
      <div style={styles.grid}>
        <div style={styles.mainContent}>
          <div style={styles.section}>
            <h2>Informações</h2>
            <div style={styles.infoGrid}>
              {fornecedor.descricao && (
                <div style={styles.infoItem}>
                  <span style={styles.label}>Descrição:</span>
                  <span>{fornecedor.descricao}</span>
                </div>
              )}
              {fornecedor.telefone && (
                <div style={styles.infoItem}>
                  <span style={styles.label}>📞 Telefone:</span>
                  <a href={`tel:${fornecedor.telefone}`} style={styles.link}>
                    {fornecedor.telefone}
                  </a>
                </div>
              )}
              {fornecedor.email && (
                <div style={styles.infoItem}>
                  <span style={styles.label}>📧 Email:</span>
                  <a href={`mailto:${fornecedor.email}`} style={styles.link}>
                    {fornecedor.email}
                  </a>
                </div>
              )}
              {fornecedor.endereco && (
                <div style={styles.infoItem}>
                  <span style={styles.label}>📍 Endereço:</span>
                  <span>{fornecedor.endereco}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notas Fiscais */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2>Notas Fiscais</h2>
              {user?.role === 'admin' && (
                <button
                  onClick={() => setShowFormNota(!showFormNota)}
                  style={styles.btnAdd}
                >
                  {showFormNota ? '✕' : '+ Adicionar Nota'}
                </button>
              )}
            </div>

            {/* Formulário de Nova Nota */}
            {showFormNota && user?.role === 'admin' && (
              <form onSubmit={handleSubmitNota} style={styles.form}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Número da Nota *</label>
                    <input
                      type="text"
                      value={formNota.numero_nota}
                      onChange={(e) =>
                        setFormNota({ ...formNota, numero_nota: e.target.value })
                      }
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Data de Emissão *</label>
                    <input
                      type="date"
                      value={formNota.data_emissao}
                      onChange={(e) =>
                        setFormNota({ ...formNota, data_emissao: e.target.value })
                      }
                      style={styles.input}
                      required
                    />
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Valor (R$) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formNota.valor}
                      onChange={(e) =>
                        setFormNota({ ...formNota, valor: e.target.value })
                      }
                      style={styles.input}
                      required
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Descrição</label>
                  <textarea
                    value={formNota.descricao}
                    onChange={(e) =>
                      setFormNota({ ...formNota, descricao: e.target.value })
                    }
                    style={styles.textarea}
                    placeholder="Descrição opcional"
                  />
                </div>

                <div style={styles.formActions}>
                  <button type="submit" style={styles.btnSubmit} disabled={submitting}>
                    {submitting ? 'Adicionando...' : 'Adicionar Nota'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFormNota(false)}
                    style={styles.btnCancel}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* Lista de Notas */}
            {notas.length === 0 ? (
              <div style={styles.empty}>📋 Nenhuma nota fiscal registrada</div>
            ) : (
              <div style={styles.notasTable}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.th}>Nº Nota</th>
                      <th style={styles.th}>Data</th>
                      <th style={styles.th}>Valor</th>
                      <th style={styles.th}>Descrição</th>
                    </tr>
                  </thead>
                  <tbody>
                    {notas.map(nota => (
                      <tr key={nota.id} style={styles.tableRow}>
                        <td style={styles.td}>{nota.numero_nota}</td>
                        <td style={styles.td}>
                          {new Date(nota.data_emissao).toLocaleDateString('pt-BR')}
                        </td>
                        <td style={{ ...styles.td, fontWeight: '600' }}>
                          R$ {parseFloat(nota.valor).toFixed(2)}
                        </td>
                        <td style={styles.td}>{nota.descricao || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div style={styles.notasStats}>
                  <div style={styles.stat}>
                    <span style={styles.statLabel}>Total de Notas:</span>
                    <span style={styles.statValue}>{notas.length}</span>
                  </div>
                  <div style={styles.stat}>
                    <span style={styles.statLabel}>Valor Total:</span>
                    <span style={styles.statValue}>
                      R$ {notas.reduce((sum, n) => sum + parseFloat(n.valor), 0).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div style={styles.sidebar}>
          <div style={styles.sidebarCard}>
            <h3>Informações do Fornecedor</h3>
            <div style={styles.sidebarItem}>
              <span style={styles.sidebarLabel}>Categoria:</span>
              <span style={styles.sidebarValue}>{fornecedor.categoria}</span>
            </div>
            <div style={styles.sidebarItem}>
              <span style={styles.sidebarLabel}>Total de Notas:</span>
              <span style={styles.sidebarValue}>{notas.length}</span>
            </div>
            <div style={styles.sidebarItem}>
              <span style={styles.sidebarLabel}>Cadastrado em:</span>
              <span style={styles.sidebarValue}>
                {new Date(fornecedor.created_at).toLocaleDateString('pt-BR')}
              </span>
            </div>
          </div>

          {user?.role === 'admin' && (
            <div style={styles.sidebarCard}>
              <h3>Ações do Admin</h3>
              <button style={styles.btnDanger}>❌ Remover Fornecedor</button>
            </div>
          )}
        </div>
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
  categoria: {
    display: 'inline-block',
    padding: '6px 12px',
    background: 'var(--color-primary)',
    color: 'white',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: '600',
    marginTop: '8px'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 300px',
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
  sectionHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px'
  },
  btnAdd: {
    padding: '8px 16px',
    background: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px'
  },
  infoGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  infoItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '12px',
    borderBottom: '1px solid var(--color-gray-100)'
  },
  label: {
    fontWeight: '600',
    color: 'var(--color-gray-700)',
    minWidth: '120px'
  },
  link: {
    color: 'var(--color-primary)',
    textDecoration: 'none'
  },
  form: {
    background: 'var(--color-gray-50)',
    padding: '16px',
    borderRadius: '6px',
    marginBottom: '16px'
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '12px'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  input: {
    padding: '8px',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '4px',
    fontSize: '14px'
  },
  textarea: {
    padding: '8px',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '4px',
    fontSize: '14px',
    minHeight: '60px',
    fontFamily: 'inherit'
  },
  formActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end'
  },
  btnSubmit: {
    padding: '8px 16px',
    background: 'var(--color-success)',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px'
  },
  btnCancel: {
    padding: '8px 16px',
    background: 'var(--color-gray-300)',
    color: 'var(--color-gray-700)',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px'
  },
  empty: {
    textAlign: 'center',
    padding: '20px',
    color: 'var(--color-gray-400)',
    fontSize: '14px'
  },
  notasTable: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  tableHeader: {
    background: 'var(--color-gray-100)',
    borderBottom: '2px solid var(--color-gray-200)'
  },
  th: {
    padding: '12px',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: '13px',
    color: 'var(--color-gray-700)'
  },
  tableRow: {
    borderBottom: '1px solid var(--color-gray-200)',
    ':hover': {
      backgroundColor: 'var(--color-gray-50)'
    }
  },
  td: {
    padding: '12px',
    fontSize: '14px',
    color: 'var(--color-gray-600)'
  },
  notasStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '12px',
    paddingTop: '12px',
    borderTop: '1px solid var(--color-gray-200)'
  },
  stat: {
    background: 'var(--color-gray-50)',
    padding: '12px',
    borderRadius: '6px',
    textAlign: 'center'
  },
  statLabel: {
    display: 'block',
    fontSize: '12px',
    color: 'var(--color-gray-600)',
    marginBottom: '4px'
  },
  statValue: {
    display: 'block',
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--color-primary)'
  },
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  sidebarCard: {
    background: 'white',
    border: '1px solid var(--color-gray-200)',
    borderRadius: '8px',
    padding: '16px',
    boxShadow: 'var(--shadow-sm)'
  },
  sidebarItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '8px',
    borderBottom: '1px solid var(--color-gray-100)',
    fontSize: '13px'
  },
  sidebarLabel: {
    fontWeight: '600',
    color: 'var(--color-gray-700)'
  },
  sidebarValue: {
    color: 'var(--color-gray-600)'
  },
  btnDanger: {
    width: '100%',
    padding: '10px',
    background: 'var(--color-danger)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px'
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
    marginTop: '20px'
  }
};
