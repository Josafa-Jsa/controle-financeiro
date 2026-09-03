// src/pages/Uniformes/ControleUniformesPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  listarEstoqueUniformes,
  listarMovimentacoesUniformes,
  cadastrarEntradaUniforme,
  cadastrarSaidaUniforme,
  cadastrarEnvioEmMassaUniforme,
  getListaDepartamentos,
  TAMANHOS_PADRAO,
  FABRICANTES_PADRAO,
  getTamanhosPorDepartamento,
} from '../../services/uniformesService';
import ModalEntradaUniforme from '../../components/Modais/ModalEntradaUniforme';
import ModalDepartamentosUniformes from '../../components/Modais/ModalDepartamentosUniformes';
import ModalEntregaUniforme from '../../components/Modais/ModalEntregaUniforme';
import ModalEnvioEmMassa from '../../components/Modais/ModalEnvioEmMassa';
import ModalSaidaUniformeDescarte from '../../components/Modais/ModalSaidaUniformeDescarte';
import { getUser, isAdmin } from '../../auth/auth';
import './uniformes.css';

export default function ControleUniformesPage() {
  const [estoque, setEstoque] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [modalEntradaAberto, setModalEntradaAberto] = useState(false);
  const [modalEntregaAberto, setModalEntregaAberto] = useState(false);
  const [modalSaidaDescarteAberto, setModalSaidaDescarteAberto] = useState(false);
  const [modalEnvioEmMassaAberto, setModalEnvioEmMassaAberto] = useState(false);
  const [modalDepartamentosAberto, setModalDepartamentosAberto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('consolidado'); // 'consolidado', 'novos', 'usados', 'movimentacoes'
  const [modoVisual, setModoVisual] = useState('dashboard'); // 'dashboard' (grade de containers) ou 'tabela'

  const [busca, setBusca] = useState('');
  const [filtroDepartamento, setFiltroDepartamento] = useState('');
  const [filtroTamanho, setFiltroTamanho] = useState('');
  const [filtroFabricante, setFiltroFabricante] = useState('');

  const usuario = getUser();
  const isUserAdmin = isAdmin(usuario);

  const carregarDados = async () => {
    try {
      const [dadosEstoque, dadosMovs] = await Promise.all([
        listarEstoqueUniformes(),
        listarMovimentacoesUniformes(),
      ]);
      setEstoque(dadosEstoque || []);
      setMovimentacoes(dadosMovs || []);
    } catch (e) {
      console.error('Erro ao carregar dados de uniformes:', e);
    }
  };

  useEffect(() => {
    carregarDados();
    const interval = setInterval(carregarDados, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleSalvarEntrada = async (dados) => {
    await cadastrarEntradaUniforme(dados);
    await carregarDados();
  };

  const handleSalvarEntrega = async (dados) => {
    await cadastrarSaidaUniforme(dados);
    await carregarDados();
  };

  const handleSalvarBaixaDescarte = async (dados) => {
    await cadastrarSaidaUniforme(dados);
    await carregarDados();
  };

  const handleSalvarEnvioEmMassa = async (dados) => {
    await cadastrarEnvioEmMassaUniforme(dados);
    await carregarDados();
  };

  // Cálculos de Métricas
  const totalGeral = useMemo(() => {
    return estoque.reduce((acc, item) => acc + (Number(item.total_qtd) || 0), 0);
  }, [estoque]);

  const totalNovos = useMemo(() => {
    return estoque.reduce((acc, item) => acc + (Number(item.estado_novo_qtd) || 0), 0);
  }, [estoque]);

  const totalUsados = useMemo(() => {
    return estoque.reduce((acc, item) => acc + (Number(item.estado_usado_qtd) || 0), 0);
  }, [estoque]);

  const totalDepartamentos = useMemo(() => {
    const deps = new Set(estoque.map((i) => i.departamento).filter(Boolean));
    return deps.size || getListaDepartamentos().length;
  }, [estoque]);

  // Ícones e cores para cada setor
  const getIconeDepartamento = (dep) => {
    const d = String(dep || '').toLowerCase();
    if (d.includes('hortifruti')) return { icon: '🥦', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' };
    if (d.includes('caixa')) return { icon: '💳', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' };
    if (d.includes('pacote')) return { icon: '🛍️', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' };
    if (d.includes('padaria')) return { icon: '🍞', color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)' };
    if (d.includes('lanchonete')) return { icon: '🍔', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' };
    if (d.includes('mercearia')) return { icon: '🛒', color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' };
    if (d.includes('frios')) return { icon: '❄️', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' };
    if (d.includes('açougue') || d.includes('acougue')) return { icon: '🥩', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' };
    if (d.includes('cozinha')) return { icon: '🍳', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' };
    if (d.includes('confeitaria')) return { icon: '🎂', color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' };
    if (d.includes('deposito')) return { icon: '📦', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' };
    if (d.includes('recebimento')) return { icon: '🚚', color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.15)' };
    if (d.includes('manutenção') || d.includes('eletrica') || d.includes('manutencao')) return { icon: '🛠️', color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' };
    if (d.includes('administrativo')) return { icon: '💼', color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' };
    if (d.includes('ti')) return { icon: '💻', color: '#00d2ff', bg: 'rgba(0, 210, 255, 0.15)' };
    if (d.includes('prevenção') || d.includes('prevencao')) return { icon: '🛡️', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' };
    return { icon: '👔', color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' };
  };

  // Agrupamento em Tempo Real por Departamentos (Dashboard Containers)
  const resumoPorDepartamento = useMemo(() => {
    const map = {};
    const listaDepsOficiais = getListaDepartamentos();

    // Inicializa todos os departamentos oficiais
    listaDepsOficiais.forEach((dep) => {
      map[dep] = {
        departamento: dep,
        totalNovos: 0,
        totalUsados: 0,
        totalGeral: 0,
        tamanhos: {},
      };
    });

    // Popula com dados reais do estoque em tempo real
    estoque.forEach((item) => {
      const dep = item.departamento || 'Outro';
      if (!map[dep]) {
        map[dep] = {
          departamento: dep,
          totalNovos: 0,
          totalUsados: 0,
          totalGeral: 0,
          tamanhos: {},
        };
      }

      const novos = Number(item.estado_novo_qtd) || 0;
      const usados = Number(item.estado_usado_qtd) || 0;
      const total = Number(item.total_qtd) || (novos + usados);

      map[dep].totalNovos += novos;
      map[dep].totalUsados += usados;
      map[dep].totalGeral += total;

      if (total > 0 || novos > 0 || usados > 0) {
        map[dep].tamanhos[item.tamanho] = {
          novos,
          usados,
          total,
        };
      }
    });

    let lista = Object.values(map);

    // Filtros
    if (filtroDepartamento) {
      lista = lista.filter((d) => d.departamento === filtroDepartamento);
    }

    if (busca.trim()) {
      const term = busca.toLowerCase();
      lista = lista.filter((d) =>
        d.departamento.toLowerCase().includes(term) ||
        Object.keys(d.tamanhos).some((t) => t.toLowerCase().includes(term))
      );
    }

    if (abaAtiva === 'novos') {
      lista = lista.filter((d) => d.totalNovos > 0);
    } else if (abaAtiva === 'usados') {
      lista = lista.filter((d) => d.totalUsados > 0);
    }

    return lista;
  }, [estoque, filtroDepartamento, busca, abaAtiva]);

  // Filtros aplicados no Estoque
  const estoqueFiltrado = useMemo(() => {
    return estoque.filter((item) => {
      const term = busca.toLowerCase();
      const matchBusca =
        !term ||
        item.departamento?.toLowerCase().includes(term) ||
        item.tamanho?.toLowerCase().includes(term) ||
        item.fabricante_principal?.toLowerCase().includes(term);

      const matchDep = !filtroDepartamento || item.departamento === filtroDepartamento;
      const matchTam = !filtroTamanho || item.tamanho === filtroTamanho;
      const matchFab = !filtroFabricante || item.fabricante_principal === filtroFabricante;

      if (abaAtiva === 'novos' && (!item.estado_novo_qtd || item.estado_novo_qtd <= 0)) {
        return false;
      }
      if (abaAtiva === 'usados' && (!item.estado_usado_qtd || item.estado_usado_qtd <= 0)) {
        return false;
      }

      return matchBusca && matchDep && matchTam && matchFab;
    });
  }, [estoque, busca, filtroDepartamento, filtroTamanho, filtroFabricante, abaAtiva]);

  // Filtros aplicados no Histórico de Movimentações
  const movimentacoesFiltradas = useMemo(() => {
    return movimentacoes.filter((mov) => {
      const term = busca.toLowerCase();
      const matchBusca =
        !term ||
        mov.departamento?.toLowerCase().includes(term) ||
        mov.tamanho?.toLowerCase().includes(term) ||
        mov.fabricante?.toLowerCase().includes(term) ||
        mov.responsavel?.toLowerCase().includes(term);

      const matchDep = !filtroDepartamento || mov.departamento === filtroDepartamento;
      const matchTam = !filtroTamanho || mov.tamanho === filtroTamanho;
      const matchFab = !filtroFabricante || mov.fabricante === filtroFabricante;

      return matchBusca && matchDep && matchTam && matchFab;
    });
  }, [movimentacoes, busca, filtroDepartamento, filtroTamanho, filtroFabricante]);

  return (
    <div className="uniformes-container">
      {/* Cabeçalho */}
      <div className="uniformes-header">
        <div className="uniformes-header-title">
          <span style={{ fontSize: '34px' }}>👔</span>
          <div>
            <h1>Controle de Uniformes • Big Master</h1>
            <p>Gerenciamento de estoque de uniformes novos e usados por departamento, entradas, entregas e transferências.</p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn-departamentos-uniforme"
            onClick={() => setModalDepartamentosAberto(true)}
            style={{
              background: '#0f172a',
              color: '#38bdf8',
              border: '1px solid #38bdf8',
              padding: '10px 18px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.2s ease',
            }}
          >
            <span>🏢</span> Departamentos
          </button>

          <button
            type="button"
            className="btn-cadastrar-uniforme"
            onClick={() => setModalEntradaAberto(true)}
          >
            <span>➕</span> Cadastrar Entrada de Uniforme
          </button>

          <button
            type="button"
            className="btn-entrega-uniforme"
            onClick={() => setModalEntregaAberto(true)}
            style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff',
              border: '1px solid #34d399',
              padding: '10px 18px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.25s ease',
              boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
            }}
          >
            <span>📦</span> Entrega de Uniforme
          </button>

          <button
            type="button"
            className="btn-saida-descarte-uniforme"
            onClick={() => setModalSaidaDescarteAberto(true)}
            style={{
              background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              color: '#ffffff',
              border: '1px solid #f87171',
              padding: '10px 18px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.25s ease',
              boxShadow: '0 4px 14px rgba(220, 38, 38, 0.35)',
            }}
          >
            <span>🗑️</span> Saída de Uniforme
          </button>

          <button
            type="button"
            className="btn-envio-massa-uniforme"
            onClick={() => setModalEnvioEmMassaAberto(true)}
            style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
              color: '#ffffff',
              border: '1px solid #a78bfa',
              padding: '10px 18px',
              borderRadius: '8px',
              fontSize: '13.5px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'all 0.25s ease',
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
            }}
          >
            <span>🚚</span> Envio de Uniformes em Massa
          </button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="uniformes-stats-grid">
        <div className="uniformes-stat-card">
          <div className="uniformes-stat-icon" style={{ background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8' }}>
            👔
          </div>
          <div className="uniformes-stat-info">
            <span className="uniformes-stat-title">Total em Estoque</span>
            <span className="uniformes-stat-value">{totalGeral} un</span>
          </div>
        </div>

        <div className="uniformes-stat-card">
          <div className="uniformes-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#34d399' }}>
            ✨
          </div>
          <div className="uniformes-stat-info">
            <span className="uniformes-stat-title">Uniformes Novos</span>
            <span className="uniformes-stat-value" style={{ color: '#34d399' }}>
              {totalNovos} un
            </span>
          </div>
        </div>

        <div className="uniformes-stat-card">
          <div className="uniformes-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24' }}>
            🔄
          </div>
          <div className="uniformes-stat-info">
            <span className="uniformes-stat-title">Uniformes Usados</span>
            <span className="uniformes-stat-value" style={{ color: '#fbbf24' }}>
              {totalUsados} un
            </span>
          </div>
        </div>

        <div className="uniformes-stat-card">
          <div className="uniformes-stat-icon" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa' }}>
            🏢
          </div>
          <div className="uniformes-stat-info">
            <span className="uniformes-stat-title">Departamentos Ativos</span>
            <span className="uniformes-stat-value">{totalDepartamentos}</span>
          </div>
        </div>
      </div>

      {/* Controles, Abas e Filtros */}
      <div className="uniformes-controls">
        {/* Linha Superior com Abas e Alternador de Visualização */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid #1e293b', paddingBottom: '12px' }}>
          <div className="uniformes-tabs" style={{ borderBottom: 'none', paddingBottom: 0, margin: 0 }}>
            <button
              type="button"
              className={`uniformes-tab-btn ${abaAtiva === 'consolidado' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('consolidado')}
            >
              📦 Visão Consolidada ({resumoPorDepartamento.length} setores)
            </button>
            <button
              type="button"
              className={`uniformes-tab-btn ${abaAtiva === 'novos' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('novos')}
            >
              ✨ Uniformes Novos ({totalNovos} un)
            </button>
            <button
              type="button"
              className={`uniformes-tab-btn ${abaAtiva === 'usados' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('usados')}
            >
              🔄 Uniformes Usados ({totalUsados} un)
            </button>
            <button
              type="button"
              className={`uniformes-tab-btn ${abaAtiva === 'movimentacoes' ? 'active' : ''}`}
              onClick={() => setAbaAtiva('movimentacoes')}
            >
              📥 Histórico de Entradas ({movimentacoes.length})
            </button>
          </div>

          {/* Alternador de Modo Visual (Dashboard de Containers vs Tabela) */}
          {abaAtiva !== 'movimentacoes' && (
            <div style={{ display: 'flex', background: '#0b0f19', padding: '4px', borderRadius: '8px', border: '1px solid #1e293b', gap: '6px' }}>
              <button
                type="button"
                onClick={() => setModoVisual('dashboard')}
                style={{
                  background: modoVisual === 'dashboard' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
                  color: modoVisual === 'dashboard' ? '#ffffff' : '#94a3b8',
                  border: modoVisual === 'dashboard' ? '1px solid #38bdf8' : '1px solid transparent',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  boxShadow: modoVisual === 'dashboard' ? '0 2px 10px rgba(56, 189, 248, 0.4)' : 'none',
                }}
              >
                <span>📊</span> Containers Dashboard
              </button>
              <button
                type="button"
                onClick={() => setModoVisual('tabela')}
                style={{
                  background: modoVisual === 'tabela' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
                  color: modoVisual === 'tabela' ? '#ffffff' : '#94a3b8',
                  border: modoVisual === 'tabela' ? '1px solid #38bdf8' : '1px solid transparent',
                  padding: '7px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease',
                  boxShadow: modoVisual === 'tabela' ? '0 2px 10px rgba(56, 189, 248, 0.4)' : 'none',
                }}
              >
                <span>📋</span> Tabela Detalhada
              </button>
            </div>
          )}
        </div>

        {/* Filtros */}
        <div className="uniformes-filters-row">
          <input
            type="text"
            className="uniformes-input"
            placeholder="🔍 Buscar por departamento, tamanho, fabricante..."
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
          />

          <select
            className="uniformes-select"
            value={filtroDepartamento}
            onChange={(e) => setFiltroDepartamento(e.target.value)}
          >
            <option value="">🏢 Todos os Departamentos</option>
            {getListaDepartamentos().map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            className="uniformes-select"
            value={filtroTamanho}
            onChange={(e) => setFiltroTamanho(e.target.value)}
          >
            <option value="">📏 Todos os Tamanhos</option>
            {getTamanhosPorDepartamento(filtroDepartamento).map((t) => (
              <option key={t} value={t}>
                {t.startsWith('Boné') ? '🧢 ' : ''}{t}
              </option>
            ))}
          </select>

          <select
            className="uniformes-select"
            value={filtroFabricante}
            onChange={(e) => setFiltroFabricante(e.target.value)}
          >
            <option value="">🏭 Todos os Fabricantes</option>
            {FABRICANTES_PADRAO.filter((f) => f !== 'Outro').map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Conteúdo das Abas */}
      {abaAtiva !== 'movimentacoes' ? (
        modoVisual === 'dashboard' ? (
          /* GRADE DE CONTAINERS INDIVIDUAIS DA DASHBOARD (CÁLCULO EM TEMPO REAL) */
          <div className="uniformes-dashboard-grid">
            {resumoPorDepartamento.length === 0 ? (
              <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '48px', color: '#94a3b8', background: '#0f172a', borderRadius: '12px', border: '1px solid #1e293b' }}>
                <span style={{ fontSize: '32px' }}>🔍</span>
                <p style={{ marginTop: '8px', fontSize: '14px' }}>Nenhum departamento ou uniforme encontrado para os filtros ativos.</p>
              </div>
            ) : (
              resumoPorDepartamento.map((depData) => {
                const info = getIconeDepartamento(depData.departamento);
                const temEstoque = depData.totalGeral > 0;
                const tamanhosEntries = Object.entries(depData.tamanhos);

                return (
                  <div key={depData.departamento} className="dep-container-card">
                    {/* Topo do Container */}
                    <div>
                      <div className="dep-container-header">
                        <div className="dep-container-title">
                          <div className="dep-container-icon" style={{ background: info.bg, color: info.color }}>
                            {info.icon}
                          </div>
                          <div>
                            <div className="dep-container-name">{depData.departamento}</div>
                            <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
                              {tamanhosEntries.length} tamanho(s) registrado(s)
                            </span>
                          </div>
                        </div>

                        <span
                          className="dep-container-status"
                          style={{
                            background: temEstoque ? (depData.totalGeral > 5 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)') : 'rgba(239, 68, 68, 0.15)',
                            color: temEstoque ? (depData.totalGeral > 5 ? '#34d399' : '#fbbf24') : '#f87171',
                            border: `1px solid ${temEstoque ? (depData.totalGeral > 5 ? '#10b981' : '#f59e0b') : '#ef4444'}`,
                          }}
                        >
                          {temEstoque ? (depData.totalGeral > 5 ? '● Saudável' : '⚠️ Estoque Baixo') : '○ Esgotado'}
                        </span>
                      </div>

                      {/* Métricas Reais em Tempo Real */}
                      <div className="dep-container-metrics">
                        <div className="dep-metric-item">
                          <span className="dep-metric-label">Total Geral</span>
                          <span className="dep-metric-val" style={{ color: temEstoque ? '#38bdf8' : '#64748b' }}>
                            {depData.totalGeral} un
                          </span>
                        </div>
                        <div className="dep-metric-item">
                          <span className="dep-metric-label">✨ Novos</span>
                          <span className="dep-metric-val" style={{ color: '#34d399' }}>
                            {depData.totalNovos} un
                          </span>
                        </div>
                        <div className="dep-metric-item">
                          <span className="dep-metric-label">🔄 Usados</span>
                          <span className="dep-metric-val" style={{ color: '#fbbf24' }}>
                            {depData.totalUsados} un
                          </span>
                        </div>
                      </div>

                      {/* Detalhamento de Tamanhos Disponíveis */}
                      <div className="dep-tamanhos-section">
                        <div className="dep-tamanhos-title">
                          <span>Disponibilidade por Tamanho:</span>
                          <span style={{ color: '#38bdf8' }}>{tamanhosEntries.length > 0 ? `${tamanhosEntries.length} variações` : 'Sem peças'}</span>
                        </div>
                        <div className="dep-tamanhos-chips">
                          {tamanhosEntries.length === 0 ? (
                            <span style={{ fontSize: '11.5px', color: '#64748b', fontStyle: 'italic' }}>
                              Nenhum tamanho com estoque atualmente.
                            </span>
                          ) : (
                            tamanhosEntries.map(([tam, dadosTam]) => (
                              <div key={tam} className="tamanho-chip" title={`Novos: ${dadosTam.novos} | Usados: ${dadosTam.usados}`}>
                                <span style={{ fontWeight: 700 }}>{tam.startsWith('Boné') ? '🧢 Boné' : tam}:</span>
                                <span className="tamanho-chip-qty">{dadosTam.total} un</span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Ações Rápidas por Departamento */}
                    <div className="dep-container-actions">
                      <button
                        type="button"
                        className="dep-action-btn entrada"
                        onClick={() => {
                          setFiltroDepartamento(depData.departamento);
                          setModalEntradaAberto(true);
                        }}
                        title={`Cadastrar entrada para ${depData.departamento}`}
                      >
                        <span>➕</span> Entrada
                      </button>

                      <button
                        type="button"
                        className="dep-action-btn entrega"
                        onClick={() => {
                          setFiltroDepartamento(depData.departamento);
                          setModalEntregaAberto(true);
                        }}
                        title={`Entregar uniforme de ${depData.departamento}`}
                      >
                        <span>📦</span> Entrega
                      </button>

                      <button
                        type="button"
                        className="dep-action-btn baixa"
                        onClick={() => {
                          setFiltroDepartamento(depData.departamento);
                          setModalSaidaDescarteAberto(true);
                        }}
                        title={`Dar baixa por avaria em ${depData.departamento}`}
                      >
                        <span>🗑️</span> Baixa
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : (
          /* TABELA DETALHADA */
          <div className="uniformes-table-container">
            <table className="uniformes-table">
              <thead>
                <tr>
                  <th>Departamento</th>
                  <th>Tamanho</th>
                  <th>Fabricante Principal</th>
                  <th style={{ textAlign: 'center' }}>✨ Qtd. Novos</th>
                  <th style={{ textAlign: 'center' }}>🔄 Qtd. Usados</th>
                  <th style={{ textAlign: 'center' }}>Total em Estoque</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {estoqueFiltrado.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                      Nenhum registro de uniforme encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  estoqueFiltrado.map((item) => (
                    <tr key={`${item.departamento}_${item.tamanho}`}>
                      <td>
                        <span className="badge-dep">{item.departamento}</span>
                      </td>
                      <td>
                        <span className="badge-tam">{item.tamanho}</span>
                      </td>
                      <td>{item.fabricante_principal || 'Jucicler'}</td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge-novo">{item.estado_novo_qtd || 0} un</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge-usado">{item.estado_usado_qtd || 0} un</span>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: 800, color: '#f8fafc', fontSize: '14px' }}>
                        {item.total_qtd || 0} un
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {(item.total_qtd || 0) > 0 ? (
                          <span style={{ color: '#34d399', fontSize: '12px', fontWeight: 700 }}>● Disponível</span>
                        ) : (
                          <span style={{ color: '#f87171', fontSize: '12px', fontWeight: 700 }}>○ Esgotado</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="uniformes-table-container">
          <table className="uniformes-table">
            <thead>
              <tr>
                <th>Data / Hora</th>
                <th>Tipo</th>
                <th>Departamento</th>
                <th>Tamanho</th>
                <th>Quantidade</th>
                <th>Estado</th>
                <th>Fabricante</th>
                <th>Responsável</th>
                <th>Observações</th>
              </tr>
            </thead>
            <tbody>
              {movimentacoesFiltradas.length === 0 ? (
                <tr>
                  <td colSpan="9" style={{ textAlign: 'center', padding: '32px', color: '#94a3b8' }}>
                    Nenhuma movimentação registrada até o momento.
                  </td>
                </tr>
              ) : (
                movimentacoesFiltradas.map((mov) => (
                  <tr key={mov.id}>
                    <td>{new Date(mov.created_at).toLocaleString('pt-BR')}</td>
                    <td>
                      <span style={{ color: mov.tipo === 'ENTRADA' ? '#34d399' : '#f87171', fontWeight: 700 }}>
                        {mov.tipo === 'ENTRADA' ? '📥 Entrada' : '📤 Saída'}
                      </span>
                    </td>
                    <td>
                      <span className="badge-dep">{mov.departamento}</span>
                    </td>
                    <td>
                      <span className="badge-tam">{mov.tamanho}</span>
                    </td>
                    <td style={{ fontWeight: 700, color: '#f8fafc' }}>{mov.quantidade} un</td>
                    <td>
                      <span className={mov.estado === 'Novo' ? 'badge-novo' : 'badge-usado'}>
                        {mov.estado}
                      </span>
                    </td>
                    <td>{mov.fabricante || 'Jucicler'}</td>
                    <td>{mov.responsavel || 'Operador'}</td>
                    <td style={{ color: '#94a3b8', fontSize: '12px' }}>{mov.observacoes || '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal de Entrada de Uniforme */}
      <ModalEntradaUniforme
        isOpen={modalEntradaAberto}
        onClose={() => setModalEntradaAberto(false)}
        onSave={handleSalvarEntrada}
      />

      {/* Modal de Entrega de Uniforme ao Colaborador */}
      <ModalEntregaUniforme
        isOpen={modalEntregaAberto}
        onClose={() => setModalEntregaAberto(false)}
        estoque={estoque}
        onSave={handleSalvarEntrega}
      />

      {/* Modal de Saída de Uniforme por Descarte / Avaria */}
      <ModalSaidaUniformeDescarte
        isOpen={modalSaidaDescarteAberto}
        onClose={() => setModalSaidaDescarteAberto(false)}
        estoque={estoque}
        onSalvarBaixa={handleSalvarBaixaDescarte}
      />

      {/* Modal de Envio de Uniformes em Massa para Filiais */}
      <ModalEnvioEmMassa
        isOpen={modalEnvioEmMassaAberto}
        onClose={() => setModalEnvioEmMassaAberto(false)}
        estoque={estoque}
        onConfirmarEnvio={handleSalvarEnvioEmMassa}
      />

      {/* Modal de Visão Geral por Departamentos */}
      <ModalDepartamentosUniformes
        isOpen={modalDepartamentosAberto}
        onClose={() => setModalDepartamentosAberto(false)}
        estoque={estoque}
        onSelecionarDepartamento={(dep) => {
          setFiltroDepartamento(dep);
          setAbaAtiva('consolidado');
        }}
        onDepartamentoCadastrado={() => {
          carregarDados();
        }}
      />
    </div>
  );
}
