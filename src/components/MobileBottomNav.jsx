// src/components/MobileBottomNav.jsx
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getUser, logout } from '../auth/auth';
import { toast } from 'react-toastify';
import './Visual/mobileMode.css';

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const path = location.pathname;
  const user = getUser();
  const email = String(user?.email || '').toLowerCase().trim();
  const name = String(user?.name || user?.nome || '').trim();
  const role = String(user?.role || '').toUpperCase();

  const isAdmin =
    email === 'jsa@jsa.com' ||
    email === 'josafa.santos.jss@gmail.com' ||
    name === 'JSA Admin' ||
    role === 'ADMIN' ||
    user?.isAdmin === true;

  const [perms, setPerms] = useState(() => {
    let p = Array.isArray(user?.permissions || user?.permissoes)
      ? (user.permissions || user.permissoes)
      : [];
    try {
      const rawUsers = JSON.parse(localStorage.getItem('users') || '[]');
      const matched = rawUsers.find((u) => String(u?.email || '').toLowerCase().trim() === email);
      if (matched && Array.isArray(matched.permissions)) {
        p = matched.permissions;
      }
    } catch {}
    return isAdmin ? p : p.filter((k) => k !== '*');
  });

  React.useEffect(() => {
    const handlePerms = (e) => {
      const targetEmail = e.detail?.email;
      const newPerms = e.detail?.permissions;
      if (!targetEmail || targetEmail.toLowerCase() === email) {
        if (Array.isArray(newPerms)) {
          setPerms(isAdmin ? newPerms : newPerms.filter((k) => k !== '*'));
        }
      }
    };
    window.addEventListener('permissoes_alteradas_evento', handlePerms);
    return () => window.removeEventListener('permissoes_alteradas_evento', handlePerms);
  }, [email, isAdmin]);

  const isPrevencaoUser =
    perms.includes('prevencao') ||
    perms.includes('uniformes') ||
    perms.includes('controle-uniformes') ||
    perms.includes('controle-notas');

  const canAccess = (key) => {
    if (isAdmin) return true;
    if (key === 'chamados' || key === 'atendimento') return true;
    if (key === 'ordem-servico' || key === 'os') {
      return perms.includes('ordem-servico') || perms.includes('os');
    }
    return perms.includes(key);
  };

  const handleNav = (targetPath, label) => {
    setDrawerOpen(false);
    if (path === targetPath) return;
    toast.info(`📱 Acessando: ${label}`);
    navigate(targetPath);
  };

  const handleLogout = () => {
    setDrawerOpen(false);
    toast.warn('Encerrando sessão...');
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* DRAWER MENU SUSPENSO */}
      {drawerOpen && (
        <div className="mobile-drawer-overlay" onClick={() => setDrawerOpen(false)}>
          <div className="mobile-drawer-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-drawer-header">
              <div className="mobile-drawer-user">
                <span className="mobile-user-icon">{isPrevencaoUser ? '🛒' : '👤'}</span>
                <div>
                  <h4>{user?.name || user?.nome || 'Usuário'}</h4>
                  <small style={{ color: isPrevencaoUser ? '#38bdf8' : '#94a3b8' }}>
                    {isPrevencaoUser ? 'Big Master Supermercados' : email || 'Acesso Mobile'}
                  </small>
                </div>
              </div>
              <button
                type="button"
                className="mobile-drawer-close"
                onClick={() => setDrawerOpen(false)}
              >
                ✕
              </button>
            </div>

            <div className="mobile-drawer-links">
              {canAccess('dashboard') && (
                <button
                  type="button"
                  className={`mobile-drawer-item ${path === '/dashboard' ? 'active' : ''}`}
                  onClick={() => handleNav('/dashboard', 'Dashboard Geral')}
                >
                  <span>📊</span> Dashboard Geral
                </button>
              )}

              {canAccess('contas') && (
                <button
                  type="button"
                  className={`mobile-drawer-item ${path === '/contas' ? 'active' : ''}`}
                  onClick={() => handleNav('/contas', 'Gestão de Contas')}
                >
                  <span>💳</span> Gestão de Contas
                </button>
              )}

              {canAccess('fluxo') && (
                <button
                  type="button"
                  className={`mobile-drawer-item ${path === '/fluxo' ? 'active' : ''}`}
                  onClick={() => handleNav('/fluxo', 'Fluxo de Caixa')}
                >
                  <span>📈</span> Fluxo de Caixa
                </button>
              )}

              {canAccess('simulador') && (
                <button
                  type="button"
                  className={`mobile-drawer-item ${path === '/simulador' ? 'active' : ''}`}
                  onClick={() => handleNav('/simulador', 'Simulador de Créditos')}
                >
                  <span>🧮</span> Simulador de Créditos
                </button>
              )}

              {canAccess('notas') && (
                <button
                  type="button"
                  className={`mobile-drawer-item ${path === '/notas' ? 'active' : ''}`}
                  onClick={() => handleNav('/notas', 'Notas Fiscais')}
                >
                  <span>📑</span> Notas Fiscais
                </button>
              )}

              {(canAccess('controle-notas') || canAccess('notas')) && (
                <button
                  type="button"
                  className={`mobile-drawer-item ${path === '/controle-notas' ? 'active' : ''}`}
                  onClick={() => handleNav('/controle-notas', 'Controle de Notas')}
                >
                  <span>📋</span> Controle de Notas
                </button>
              )}

              {canAccess('ordem-servico') && (
                <button
                  type="button"
                  className={`mobile-drawer-item ${path === '/ordem-servico' ? 'active' : ''}`}
                  onClick={() => handleNav('/ordem-servico', 'Ordem de Serviço (O.S)')}
                >
                  <span>🛠️</span> Ordem de Serviço
                </button>
              )}

              {canAccess('estoque') && (
                <button
                  type="button"
                  className={`mobile-drawer-item ${path === '/estoque' ? 'active' : ''}`}
                  onClick={() => handleNav('/estoque', 'Gestão de Estoque')}
                >
                  <span>📦</span> Estoque
                </button>
              )}

              {canAccess('contratos') && (
                <button
                  type="button"
                  className={`mobile-drawer-item ${path === '/contratos' ? 'active' : ''}`}
                  onClick={() => handleNav('/contratos', 'Contratos')}
                >
                  <span>📝</span> Contratos
                </button>
              )}

              {canAccess('contrato-internet') && (
                <button
                  type="button"
                  className={`mobile-drawer-item ${path === '/contrato-internet' ? 'active' : ''}`}
                  onClick={() => handleNav('/contrato-internet', 'Contrato de Internet')}
                >
                  <span>🌐</span> Contrato Internet
                </button>
              )}

              {canAccess('prevencao') && (
                <button
                  type="button"
                  className={`mobile-drawer-item ${path === '/prevencao' ? 'active' : ''}`}
                  onClick={() => handleNav('/prevencao', 'Prevenção de Perdas')}
                >
                  <span>🛡️</span> Prevenção
                </button>
              )}

              {canAccess('uniformes') && (
                <button
                  type="button"
                  className={`mobile-drawer-item ${path === '/uniformes' ? 'active' : ''}`}
                  onClick={() => handleNav('/uniformes', 'Controle de Uniformes')}
                >
                  <span>👔</span> Uniformes
                </button>
              )}

              <button
                type="button"
                className={`mobile-drawer-item ${path === '/chamados' ? 'active' : ''}`}
                onClick={() => handleNav('/chamados', 'Atendimentos & Chamados')}
              >
                <span>🎧</span> Atendimento & Chamados
              </button>

              {isAdmin && (
                <>
                  <div className="mobile-drawer-divider" />
                  <span className="mobile-drawer-subtitle">Administração</span>
                  
                  <button
                    type="button"
                    className={`mobile-drawer-item ${path === '/admin/users' ? 'active' : ''}`}
                    onClick={() => handleNav('/admin/users', 'Gerenciamento de Usuários')}
                  >
                    <span>👥</span> Usuários
                  </button>

                  <button
                    type="button"
                    className={`mobile-drawer-item ${path === '/admin/log' ? 'active' : ''}`}
                    onClick={() => handleNav('/admin/log', 'Logs do Sistema')}
                  >
                    <span>📜</span> Logs do Sistema
                  </button>
                </>
              )}

              <div className="mobile-drawer-divider" />

              <button
                type="button"
                className="mobile-drawer-item logout"
                onClick={handleLogout}
              >
                <span>🚪</span> Sair da Conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BARRA INFERIOR DE NAVEGAÇÃO MOBILE */}
      <nav className="mobile-bottom-nav">
        {canAccess('dashboard') && (
          <button
            type="button"
            className={`mobile-nav-btn ${path === '/dashboard' ? 'active' : ''}`}
            onClick={() => handleNav('/dashboard', 'Dashboard')}
          >
            <span className="mobile-nav-icon">📈</span>
            <span className="mobile-nav-label">Dash</span>
          </button>
        )}

        {canAccess('prevencao') && (
          <button
            type="button"
            className={`mobile-nav-btn ${path === '/prevencao' ? 'active' : ''}`}
            onClick={() => handleNav('/prevencao', 'Prevenção')}
          >
            <span className="mobile-nav-icon">🛡️</span>
            <span className="mobile-nav-label">Prevenção</span>
          </button>
        )}

        {canAccess('contas') && (
          <button
            type="button"
            className={`mobile-nav-btn ${path === '/contas' || path === '/' ? 'active' : ''}`}
            onClick={() => handleNav('/contas', 'Gestão de Contas')}
          >
            <span className="mobile-nav-icon">📊</span>
            <span className="mobile-nav-label">Contas</span>
          </button>
        )}

        {canAccess('notas') && (
          <button
            type="button"
            className={`mobile-nav-btn ${path === '/notas' ? 'active' : ''}`}
            onClick={() => handleNav('/notas', 'Notas Fiscais')}
          >
            <span className="mobile-nav-icon">🧾</span>
            <span className="mobile-nav-label">Notas</span>
          </button>
        )}

        {canAccess('ordem-servico') && (
          <button
            type="button"
            className={`mobile-nav-btn ${path === '/ordem-servico' ? 'active' : ''}`}
            onClick={() => handleNav('/ordem-servico', 'Ordem de Serviço')}
          >
            <span className="mobile-nav-icon">🛠️</span>
            <span className="mobile-nav-label">O.S</span>
          </button>
        )}

        <button
          type="button"
          className={`mobile-nav-btn ${path === '/chamados' ? 'active' : ''}`}
          onClick={() => handleNav('/chamados', 'Atendimentos')}
        >
          <span className="mobile-nav-icon">💬</span>
          <span className="mobile-nav-label">Chamados</span>
        </button>

        <button
          type="button"
          className={`mobile-nav-btn ${drawerOpen ? 'active' : ''}`}
          onClick={() => setDrawerOpen((prev) => !prev)}
        >
          <span className="mobile-nav-icon">☰</span>
          <span className="mobile-nav-label">Menu</span>
        </button>
      </nav>
    </>
  );
}
