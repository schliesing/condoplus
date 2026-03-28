import { useAuth } from '../hooks/useAuth';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.logo}>CondoPlus</h1>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Sair
          </button>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.card}>
          <h2>Bem-vindo, {user?.email}!</h2>
          <p>Role: {user?.role}</p>
          <p style={{ marginTop: '16px', color: '#6b7280' }}>
            Você está logado no condomínio: <strong>{user?.condo_schema}</strong>
          </p>
        </div>

        <div style={styles.grid}>
          <NavCard
            title="Votações"
            description="Participar de votações"
            icon="🗳️"
            onClick={() => navigate('/votings')}
          />
          <NavCard
            title="Agendamentos"
            description="Reservar áreas"
            icon="📅"
            onClick={() => navigate('/scheduling')}
          />
          <NavCard
            title="Fornecedores"
            description="Ver fornecedores"
            icon="🏢"
            onClick={() => navigate('/suppliers')}
          />
          <NavCard
            title="Notificações"
            description="Gerenciar notificações"
            icon="🔔"
            onClick={() => navigate('/notifications')}
          />
        </div>

        {user?.role === 'admin' && (
          <div style={styles.adminSection}>
            <h3>Painel do Administrador</h3>
            <div style={styles.grid}>
              <NavCard
                title="Gerenciamento"
                description="Gerenciar usuários e config"
                icon="👥"
                onClick={() => navigate('/admin')}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function NavCard({ title, description, icon, onClick }) {
  return (
    <button onClick={onClick} style={{ ...styles.navCard, background: 'none', cursor: 'pointer' }}>
      <div style={styles.icon}>{icon}</div>
      <h4 style={styles.cardTitle}>{title}</h4>
      <p style={styles.cardDescription}>{description}</p>
    </button>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: 'white',
    borderBottom: '1px solid #e5e7eb',
    padding: '16px 0',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    position: 'sticky',
    top: 0,
    zIndex: 100,
  },
  headerContent: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '0 16px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#2563eb',
  },
  logoutBtn: {
    padding: '8px 16px',
    backgroundColor: '#ef4444',
    color: 'white',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  main: {
    maxWidth: '1280px',
    margin: '0 auto',
    padding: '32px 16px',
  },
  card: {
    backgroundColor: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '32px',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '16px',
    marginBottom: '32px',
  },
  navCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
    backgroundColor: 'white',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
    textDecoration: 'none',
    color: 'inherit',
    transition: 'all 150ms ease',
    cursor: 'pointer',
  },
  icon: {
    fontSize: '40px',
    marginBottom: '12px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '4px',
    textAlign: 'center',
  },
  cardDescription: {
    fontSize: '13px',
    color: '#6b7280',
    textAlign: 'center',
  },
  adminSection: {
    marginTop: '40px',
    paddingTop: '32px',
    borderTop: '2px solid #e5e7eb',
  },
};
