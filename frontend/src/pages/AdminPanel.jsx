import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import '../styles/pages.css';

export default function AdminPanel() {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState('users');
  const [users, setUsers] = useState([]);
  const [config, setConfig] = useState({});
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, [selectedTab]);

  const loadData = async () => {
    try {
      setLoading(true);

      if (selectedTab === 'users') {
        const response = await api.get('/users');
        setUsers(response.data);
      } else if (selectedTab === 'config') {
        const response = await api.get('/config');
        setConfig(response.data);
      } else if (selectedTab === 'audit') {
        const response = await api.get('/audit-logs?limit=50');
        setAuditLogs(response.data.logs || []);
      }

      setError(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId, newRole) => {
    try {
      await api.put(`/users/${userId}/role`, { role: newRole });
      loadData();
      alert('Role atualizado com sucesso');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao atualizar role');
    }
  };

  const updateUserStatus = async (userId, newStatus) => {
    try {
      await api.put(`/users/${userId}/status`, { status: newStatus });
      loadData();
      alert('Status atualizado com sucesso');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao atualizar status');
    }
  };

  const removeUser = async (userId) => {
    if (!window.confirm('Deseja remover este usuário?')) return;

    try {
      await api.delete(`/users/${userId}`);
      loadData();
      alert('Usuário removido com sucesso');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao remover usuário');
    }
  };

  const updateConfig = async (chave, novoValor) => {
    try {
      await api.put(`/config/${chave}`, { valor: novoValor });
      loadData();
      alert('Configuração atualizada');
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao atualizar configuração');
    }
  };

  const downloadAuditLogs = async () => {
    try {
      const response = await api.get('/audit-logs/export/csv', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'audit-logs.csv');
      document.body.appendChild(link);
      link.click();
    } catch (err) {
      alert('Erro ao baixar logs');
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="page-container">
        <div className="alert alert-danger">Acesso negado. Apenas administradores.</div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Painel Administrativo</h1>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="tabs">
        <button
          className={`tab ${selectedTab === 'users' ? 'active' : ''}`}
          onClick={() => setSelectedTab('users')}
        >
          Usuários
        </button>
        <button
          className={`tab ${selectedTab === 'config' ? 'active' : ''}`}
          onClick={() => setSelectedTab('config')}
        >
          Configurações
        </button>
        <button
          className={`tab ${selectedTab === 'audit' ? 'active' : ''}`}
          onClick={() => setSelectedTab('audit')}
        >
          Logs de Auditoria
        </button>
      </div>

      {loading ? (
        <div className="loading-spinner">Carregando...</div>
      ) : selectedTab === 'users' ? (
        <div className="admin-section">
          <h2>Gerenciamento de Usuários</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nome</th>
                <th>Role</th>
                <th>Status</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.nome}</td>
                  <td>
                    <select
                      value={u.role}
                      onChange={(e) => updateUserRole(u.id, e.target.value)}
                    >
                      <option value="morador">Morador</option>
                      <option value="admin">Admin</option>
                    </select>
                  </td>
                  <td>
                    <select
                      value={u.status}
                      onChange={(e) => updateUserStatus(u.id, e.target.value)}
                    >
                      <option value="ativo">Ativo</option>
                      <option value="inativo">Inativo</option>
                    </select>
                  </td>
                  <td>
                    <button
                      className="btn btn-sm btn-danger"
                      onClick={() => removeUser(u.id)}
                    >
                      Remover
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : selectedTab === 'config' ? (
        <div className="admin-section">
          <h2>Configurações do Condomínio</h2>
          <div className="config-grid">
            {Object.entries(config).map(([chave, dados]) => (
              <div key={chave} className="config-item">
                <label>{dados.descricao || chave}</label>
                {dados.tipo === 'numero' ? (
                  <input
                    type="number"
                    defaultValue={dados.valor}
                    onBlur={(e) => {
                      if (e.target.value !== String(dados.valor)) {
                        updateConfig(chave, e.target.value);
                      }
                    }}
                  />
                ) : dados.tipo === 'booleano' ? (
                  <input
                    type="checkbox"
                    defaultChecked={dados.valor}
                    onChange={(e) => updateConfig(chave, e.target.checked)}
                  />
                ) : (
                  <input
                    type="text"
                    defaultValue={dados.valor}
                    onBlur={(e) => {
                      if (e.target.value !== String(dados.valor)) {
                        updateConfig(chave, e.target.value);
                      }
                    }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="admin-section">
          <div className="audit-header">
            <h2>Logs de Auditoria</h2>
            <button className="btn btn-primary" onClick={downloadAuditLogs}>
              ⬇ Exportar CSV
            </button>
          </div>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Data</th>
                <th>Usuário</th>
                <th>Ação</th>
                <th>Tabela</th>
                <th>Registro</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((log) => (
                <tr key={log.id}>
                  <td>{new Date(log.criado_em).toLocaleString('pt-BR')}</td>
                  <td>{log.usuario_id}</td>
                  <td>{log.acao}</td>
                  <td>{log.tabela}</td>
                  <td>{log.registro_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
