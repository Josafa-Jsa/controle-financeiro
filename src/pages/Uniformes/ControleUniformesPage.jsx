// src/pages/Uniformes/ControleUniformesPage.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { toast } from 'react-toastify';
import {
  listarEstoqueUniformes,
  listarMovimentacoesUniformes,
  cadastrarEntradaUniforme,
  DEPARTAMENTOS_PADRAO,
  TAMANHOS_PADRAO,
  FABRICANTES_PADRAO,
} from '../../services/uniformesService';
import ModalEntradaUniforme from '../../components/Modais/ModalEntradaUniforme';
import { getUser, isAdmin } from '../../auth/auth';
import './uniformes.css';

export default function ControleUniformesPage() {
  const [estoque, setEstoque] = useState([]);
  const [movimentacoes, setMovimentacoes] = useState([]);
  const [modalEntradaAberto, setModalEntradaAberto] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('consolidado'); // 'consolidado', 'novos', 'usados', 'movimentacoes'

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
    return deps.size;
  }, [estoque]);

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
          <div style={{ fontSize: '32px' }}>👔</div>
          <div>
            <h1>Controle de Estoque de Uniformes</h1>
            <p>Gerencie entradas, saídas, tamanhos, fabricantes e disponibilidade por departamento</p>
          </div>
        </div>

        <button
          type="button"
          className="btn-cadastrar-uniforme"
          onClick={() => setModalEntradaAberto(true)}
        >
          <span>➕</span> Cadastrar Entrada de Uniforme
        </button>
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
            <span className="uniformes-stat-title">Departamentos</span>
            <span className="uniformes-stat-value">{totalDepartamentos}</span>
          </div>
        </div>
      </div>

      {/* Controles, Abas e Filtros */}
      <div className="uniformes-controls">
        {/* Abas */}
        <div className="uniformes-tabs">
          <button
            type="button"
            className={`uniformes-tab-btn ${abaAtiva === 'consolidado' ? 'active' : ''}`}
            onClick={() => setAbaAtiva('consolidado')}
          >
            📦 Visão Consolidada ({estoque.length})
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
            {DEPARTAMENTOS_PADRAO.map((d) => (
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
            {TAMANHOS_PADRAO.map((t) => (
              <option key={t} value={t}>
                {t}
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
    </div>
  );
}
