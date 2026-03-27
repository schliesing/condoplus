import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api from '../api/client';

export default function FornecedoresPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [fornecedores, setFornecedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busca, setBusca] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [categorias, setCategorias] = useState([]);

  useEffect(() => {
    fetchFornecedores();
  }, []);

  const fetchFornecedores = async () => {
    try {
      setLoading(true);
      const response = await api.get('/suppliers');
      const data = response.data.data || [];
      setFornecedores(data);

      // Extrair categorias únicas
      const categoriasUnicas = [...new Set(data.map(f => f.categoria))];
      setCategorias(categoriasUnicas);
      setError(null);
    } catch (err) {
      console.error('Erro ao carregar fornecedores:', err);
      setError(err.response?.data?.error || 'Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  const fornecedoresFiltrados = fornecedores.filter(f => {
    const correspondeBusca =
      !busca ||
      f.nome.toLowerCase().includes(busca.toLowerCase()) ||
      f.descricao?.toLowerCase().includes(busca.toLowerCase());

    const correspondeCategoria = !filtroCategoria || f.categoria === filtroCategoria;

    return correspondeBusca && correspondeCategoria;
  });

  if (loading) return <div style={styles.loading}>Carregando fornecedores...</div>;
  if (error) return <div style={styles.error}>❌ {error}</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1>Fornecedores</h1>
          <p style={styles.subtitulo}>Diretório de fornecedores recomendados</p>
        </div>
        {user?.role === 'morador' && (
          <button
            onClick={() => navigate('/fornecedores/sugerir')}
            style={styles.btnSugerir}
          >
            + Sugerir Fornecedor
          </button>
        )}
      </div>

      {/* Barra de Busca */}
      <div style={styles.searchBar}>
        <input
          type="text"
          placeholder="🔍 Buscar fornecedor..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          style={styles.searchInput}
        />
        <div style={styles.filtros}>
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            style={styles.select}
          >
            <option value="">Todas as categorias</option>
            {categorias.map(cat => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <span style={styles.resultados}>
            {fornecedoresFiltrados.length} fornecedor{fornecedoresFiltrados.length !== 1 ? 'es' : ''}
          </span>
        </div>
      </div>

      {fornecedoresFiltrados.length === 0 ? (
        <div style={styles.empty}>
          📋 Nenhum fornecedor encontrado
          {user?.role === 'morador' && (
            <>
              <br />
              <button
                onClick={() => navigate('/fornecedores/sugerir')}
                style={styles.linkBtn}
              >
                Sugerir um novo fornecedor
              </button>
            </>
          )}
        </div>
      ) : (
        <div style={styles.grid}>
          {fornecedoresFiltrados.map(fornecedor => (
            <div
              key={fornecedor.id}
              style={styles.card}
              onClick={() => navigate(`/fornecedores/${fornecedor.id}`)}
            >
              <div style={styles.cardHeader}>
                <h3>{fornecedor.nome}</h3>
                <span style={styles.categoria}>{fornecedor.categoria}</span>
              </div>

              <p style={styles.descricao}>{fornecedor.descricao || '---'}</p>

              <div style={styles.cardInfo}>
                {fornecedor.telefone && (
                  <div style={styles.infoItem}>
                    <span style={styles.infoIcon}>📞</span>
                    <span>{fornecedor.telefone}</span>
                  </div>
                )}

                {fornecedor.email && (
                  <div style={styles.infoItem}>
                    <span style={styles.infoIcon}>📧</span>
                    <span>{fornecedor.email}</span>
                  </div>
                )}

                {fornecedor.endereco && (
                  <div style={styles.infoItem}>
                    <span style={styles.infoIcon}>📍</span>
                    <span>{fornecedor.endereco}</span>
                  </div>
                )}
              </div>

              <div style={styles.cardFooter}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/fornecedores/${fornecedor.id}`);
                  }}
                  style={styles.btnDetalhes}
                >
                  Ver Detalhes
                </button>
              </div>
            </div>
          ))}
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
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '32px'
  },
  subtitulo: {
    color: 'var(--color-gray-600)',
    fontSize: '16px',
    marginTop: '8px'
  },
  btnSugerir: {
    padding: '10px 20px',
    background: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    whiteSpace: 'nowrap'
  },
  searchBar: {
    background: 'white',
    border: '1px solid var(--color-gray-200)',
    borderRadius: '8px',
    padding: '20px',
    marginBottom: '24px',
    display: 'flex',
    gap: '16px',
    alignItems: 'flex-end'
  },
  searchInput: {
    flex: 1,
    padding: '10px 12px',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '6px',
    fontSize: '14px'
  },
  filtros: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center'
  },
  select: {
    padding: '10px 12px',
    border: '1px solid var(--color-gray-300)',
    borderRadius: '6px',
    fontSize: '14px',
    fontFamily: 'inherit'
  },
  resultados: {
    fontSize: '13px',
    color: 'var(--color-gray-600)',
    fontWeight: '500',
    whiteSpace: 'nowrap'
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
    display: 'flex',
    flexDirection: 'column'
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '12px',
    gap: '12px'
  },
  categoria: {
    padding: '4px 12px',
    background: 'var(--color-primary)',
    color: 'white',
    borderRadius: '20px',
    fontSize: '11px',
    fontWeight: '600',
    whiteSpace: 'nowrap'
  },
  descricao: {
    color: 'var(--color-gray-600)',
    fontSize: '14px',
    marginBottom: '12px',
    flex: 1,
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden'
  },
  cardInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '12px',
    paddingTop: '12px',
    borderTop: '1px solid var(--color-gray-100)',
    fontSize: '13px',
    color: 'var(--color-gray-600)'
  },
  infoItem: {
    display: 'flex',
    gap: '8px',
    alignItems: 'flex-start'
  },
  infoIcon: {
    minWidth: '16px'
  },
  cardFooter: {
    marginTop: 'auto'
  },
  btnDetalhes: {
    width: '100%',
    padding: '10px',
    background: 'var(--color-primary)',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px'
  }
};
