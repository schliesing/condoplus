import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import '../styles/pages.css';

export default function Suppliers() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    categoria: '',
    email: '',
    telefone: '',
  });

  useEffect(() => {
    loadSuppliers();
  }, []);

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      const response = await api.get('/suppliers');
      setSuppliers(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar fornecedores');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.nome || !formData.categoria) {
      alert('Nome e categoria são obrigatórios');
      return;
    }

    try {
      const response = await api.post('/suppliers', formData);
      setSuppliers([...suppliers, response.data]);
      setFormData({ nome: '', categoria: '', email: '', telefone: '' });
      setShowForm(false);
      alert('Fornecedor sugerido com sucesso');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao sugerir fornecedor');
    }
  };

  const handleRemoveSupplier = async (supplierId) => {
    if (!window.confirm('Deseja remover este fornecedor?')) return;

    try {
      await api.delete(`/suppliers/${supplierId}`);
      setSuppliers(suppliers.filter((s) => s.id !== supplierId));
      alert('Fornecedor removido com sucesso');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao remover fornecedor');
    }
  };

  const categories = ['Manutenção', 'Limpeza', 'Segurança', 'Paisagismo', 'Tecnologia', 'Outro'];

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Fornecedores</h1>
        {!showForm && (
          <button className="btn btn-primary" onClick={() => setShowForm(true)}>
            + Sugerir Fornecedor
          </button>
        )}
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {showForm && (
        <div className="form-container">
          <h2>Sugerir Novo Fornecedor</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Nome *</label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleInputChange}
                placeholder="Nome do fornecedor"
                required
              />
            </div>

            <div className="form-group">
              <label>Categoria *</label>
              <select
                name="categoria"
                value={formData.categoria}
                onChange={handleInputChange}
                required
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="email@example.com"
              />
            </div>

            <div className="form-group">
              <label>Telefone</label>
              <input
                type="tel"
                name="telefone"
                value={formData.telefone}
                onChange={handleInputChange}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary">
                Enviar Sugestão
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowForm(false)}
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="loading-spinner">Carregando fornecedores...</div>
      ) : suppliers.length === 0 ? (
        <div className="empty-state">Nenhum fornecedor cadastrado</div>
      ) : (
        <div className="suppliers-grid">
          {suppliers.map((supplier) => (
            <div key={supplier.id} className="supplier-card">
              <div className="supplier-header">
                <h3>{supplier.nome}</h3>
                <span className="category-badge">{supplier.categoria}</span>
              </div>

              <div className="supplier-details">
                {supplier.email && (
                  <p>
                    <strong>Email:</strong> {supplier.email}
                  </p>
                )}
                {supplier.telefone && (
                  <p>
                    <strong>Telefone:</strong> {supplier.telefone}
                  </p>
                )}
                {supplier.sugerido_por && (
                  <p className="suggested-by">
                    Sugerido por: <small>ID {supplier.sugerido_por}</small>
                  </p>
                )}
              </div>

              <div className="supplier-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => setSelectedSupplier(supplier.id)}
                >
                  Ver Notas Fiscais
                </button>
                {user?.role === 'admin' && (
                  <button
                    className="btn btn-danger"
                    onClick={() => handleRemoveSupplier(supplier.id)}
                  >
                    Remover
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
