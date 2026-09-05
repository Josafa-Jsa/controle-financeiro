// src/components/Modais/ModalRelatorioUniformes.jsx
import React, { useState, useMemo, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  gerarRelatorioUniformesPDF,
  gerarRelatorioUniformesBlob,
} from '../../utils/gerarRelatorioUniformesPDF';
import ModalVisualizadorDocumento from './ModalVisualizadorDocumento';
import { getUser } from '../../auth/auth';
import '../Visual/modal.css';

export default function ModalRelatorioUniformes({
  isOpen = false,
  onClose = () => {},
  estoque = [],
  movimentacoes = [],
}) {
  const [departamentoFiltro, setDepartamentoFiltro] = useState('Todos');
  const [busca, setBusca] = useState('');
  const [departamentoExpandido, setDepartamentoExpandido] = useState(null);

  const [modalVisualizadorAberto, setModalVisualizadorAberto] = useState(false);
  const [pdfBlob, setPdfBlob] = useState(null);

  const user = getUser();
  const responsavel = user?.name || user?.nome || 'Operador / Encarregado';

  // Fecha no Esc
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        if (modalVisualizadorAberto) {
          setModalVisualizadorAberto(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, modalVisualizadorAberto, onClose]);

  // Lista única de departamentos existentes
  const listaDepartamentos = useMemo(() => {
    const deps = new Set();
    estoque.forEach((i) => {
      if (i.departamento) deps.add(i.departamento);
    });
    movimentacoes.forEach((m) => {
      if (m.departamento) deps.add(m.departamento);
    });
    return Array.from(deps).sort((a, b) => a.localeCompare(b));
  }, [estoque, movimentacoes]);

  // Processamento e consolidação de dados por departamento e por tamanho
  const dadosConsolidados = useMemo(() => {
    const mapa = new Map();

    // 1. Inicializa com os departamentos conhecidos
    listaDepartamentos.forEach((dep) => {
      mapa.set(dep, {
        departamento: dep,
        estoqueAtualNovos: 0,
        estoqueAtualUsados: 0,
        estoqueAtualTotal: 0,
        entregues: 0,
        descartados: 0,
        tamanhos: {},
      });
    });

    // 2. Preenche o estoque atual (Novos e Usados)
    estoque.forEach((item) => {
      const dep = item.departamento || 'Geral';
      if (!mapa.has(dep)) {
        mapa.set(dep, {
          departamento: dep,
          estoqueAtualNovos: 0,
          estoqueAtualUsados: 0,
          estoqueAtualTotal: 0,
          entregues: 0,
          descartados: 0,
          tamanhos: {},
        });
      }

      const depObj = mapa.get(dep);
      const novos = Number(item.estado_novo_qtd) || 0;
      const usados = Number(item.estado_usado_qtd) || 0;
      const total = Number(item.total_qtd) || (novos + usados);

      depObj.estoqueAtualNovos += novos;
      depObj.estoqueAtualUsados += usados;
      depObj.estoqueAtualTotal += total;

      const tam = item.tamanho || 'Único';
      if (!depObj.tamanhos[tam]) {
        depObj.tamanhos[tam] = {
          tamanho: tam,
          novos: 0,
          usados: 0,
          total: 0,
          entregues: 0,
          descartados: 0,
        };
      }
      depObj.tamanhos[tam].novos += novos;
      depObj.tamanhos[tam].usados += usados;
      depObj.tamanhos[tam].total += total;
    });

    // 3. Processa movimentações (Entregas e Descartes)
    movimentacoes.forEach((mov) => {
      if (mov.tipo !== 'SAIDA') return;

      const dep = mov.departamento || 'Geral';
      if (!mapa.has(dep)) {
        mapa.set(dep, {
          departamento: dep,
          estoqueAtualNovos: 0,
          estoqueAtualUsados: 0,
          estoqueAtualTotal: 0,
          entregues: 0,
          descartados: 0,
          tamanhos: {},
        });
      }

      const depObj = mapa.get(dep);
      const qtd = Number(mov.quantidade) || 0;

      // Identifica se foi descarte ou entrega regular
      const obs = String(mov.observacoes || '').toLowerCase();
      const colab = String(mov.colaborador || '').toLowerCase();
      const motivo = String(mov.motivo || '').toLowerCase();

      const isDescarte =
        obs.includes('[baixa/descarte') ||
        obs.includes('descarte') ||
        colab.startsWith('baixa por') ||
        motivo.includes('baixa') ||
        motivo.includes('descarte');

      if (isDescarte) {
        depObj.descartados += qtd;
      } else {
        depObj.entregues += qtd;
      }

      const tam = mov.tamanho || 'Único';
      if (!depObj.tamanhos[tam]) {
        depObj.tamanhos[tam] = {
          tamanho: tam,
          novos: 0,
          usados: 0,
          total: 0,
          entregues: 0,
          descartados: 0,
        };
      }

      if (isDescarte) {
        depObj.tamanhos[tam].descartados += qtd;
      } else {
        depObj.tamanhos[tam].entregues += qtd;
      }
    });

    // 4. Calcula Estoque Anterior para cada departamento
    // Estoque Anterior = Estoque Atual + Entregues + Descartados
    const linhas = Array.from(mapa.values()).map((dep) => {
      const estoqueAnterior = dep.estoqueAtualTotal + dep.entregues + dep.descartados;
      return {
        ...dep,
        estoqueAnterior,
        novos: dep.estoqueAtualNovos,
        usados: dep.estoqueAtualUsados,
        estoqueAtual: dep.estoqueAtualTotal,
      };
    });

    return linhas.sort((a, b) => a.departamento.localeCompare(b.departamento));
  }, [estoque, movimentacoes, listaDepartamentos]);

  // Linhas filtradas para exibição
  const linhasFiltradas = useMemo(() => {
    return dadosConsolidados.filter((item) => {
      const matchDep =
        departamentoFiltro === 'Todos' ||
        item.departamento.toLowerCase() === departamentoFiltro.toLowerCase();

      const matchBusca =
        !busca ||
        item.departamento.toLowerCase().includes(busca.toLowerCase().trim());

      return matchDep && matchBusca;
    });
  }, [dadosConsolidados, departamentoFiltro, busca]);

  // Totais Gerais
  const totais = useMemo(() => {
    return linhasFiltradas.reduce(
      (acc, item) => {
        acc.estoqueAnterior += item.estoqueAnterior;
        acc.entregues += item.entregues;
        acc.descartados += item.descartados;
        acc.novos += item.novos;
        acc.usados += item.usados;
        acc.estoqueAtual += item.estoqueAtual;
        return acc;
      },
      {
        estoqueAnterior: 0,
        entregues: 0,
        descartados: 0,
        novos: 0,
        usados: 0,
        estoqueAtual: 0,
      }
    );
  }, [linhasFiltradas]);

  if (!isOpen) return null;

  // Ação de download direto do PDF
  const handleBaixarPDF = () => {
    try {
      gerarRelatorioUniformesPDF({
        linhasDepartamentos: linhasFiltradas,
        totais,
        departamentoFiltro,
        responsavel,
      });
      toast.success('Relatório de uniformes em PDF gerado com sucesso!');
    } catch (err) {
      console.error('Erro ao gerar relatório em PDF:', err);
      toast.error('Falha ao gerar o PDF do relatório.');
    }
  };

  // Ação de pré-visualização do PDF oficial em modal
  const handleVisualizarPDF = () => {
    try {
      const blob = gerarRelatorioUniformesBlob({
        linhasDepartamentos: linhasFiltradas,
        totais,
        departamentoFiltro,
        responsavel,
      });
      setPdfBlob(blob);
      setModalVisualizadorAberto(true);
    } catch (err) {
      console.error('Erro ao visualizar documento PDF:', err);
      toast.error('Falha ao abrir visualização do PDF.');
    }
  };

  const toggleExpandir = (dep) => {
    setDepartamentoExpandido((prev) => (prev === dep ? null : dep));
  };

  return (
    <>
      <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
        <div
          className="modal-box modal-xl"
          onClick={(e) => e.stopPropagation()}
          style={{
            maxWidth: '1100px',
            width: '95%',
            maxHeight: '92vh',
            display: 'flex',
            flexDirection: 'column',
            padding: 0,
            overflow: 'hidden',
            backgroundColor: '#0b1329',
            border: '1px solid #1e293b',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          }}
        >
          {/* Cabeçalho do Modal */}
          <div
            style={{
              padding: '18px 24px',
              borderBottom: '1px solid #1e293b',
              background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  background: 'rgba(59, 130, 246, 0.2)',
                  border: '1px solid #3b82f6',
                  borderRadius: '10px',
                  width: '42px',
                  height: '42px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '22px',
                }}
              >
                📋
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#f8fafc' }}>
                  Relatório de Uniformes por Departamento
                </h2>
                <p style={{ margin: '3px 0 0', fontSize: '12.5px', color: '#94a3b8' }}>
                  Consolidado de uniformes Novos, Usados, Descartados, Entregas e Posição de Estoque
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '6px',
                borderRadius: '6px',
                lineHeight: 1,
              }}
              title="Fechar"
            >
              ✕
            </button>
          </div>

          {/* Barra de Filtros e Ações Rápidas */}
          <div
            style={{
              padding: '14px 24px',
              background: '#0f172a',
              borderBottom: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', flex: 1 }}>
              {/* Filtro por Departamento */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#94a3b8' }}>🏢 Setor:</span>
                <select
                  value={departamentoFiltro}
                  onChange={(e) => setDepartamentoFiltro(e.target.value)}
                  style={{
                    background: '#1e293b',
                    color: '#f8fafc',
                    border: '1px solid #334155',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    fontSize: '12.5px',
                    outline: 'none',
                    fontWeight: 600,
                  }}
                >
                  <option value="Todos">Todos os Departamentos ({listaDepartamentos.length})</option>
                  {listaDepartamentos.map((dep) => (
                    <option key={dep} value={dep}>
                      {dep}
                    </option>
                  ))}
                </select>
              </div>

              {/* Busca rápida */}
              <input
                type="text"
                placeholder="Buscar departamento..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                style={{
                  background: '#1e293b',
                  color: '#f8fafc',
                  border: '1px solid #334155',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  outline: 'none',
                  minWidth: '180px',
                }}
              />

              {departamentoFiltro !== 'Todos' || busca ? (
                <button
                  type="button"
                  onClick={() => {
                    setDepartamentoFiltro('Todos');
                    setBusca('');
                  }}
                  style={{
                    background: 'rgba(239, 68, 68, 0.15)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    color: '#f87171',
                    padding: '5px 10px',
                    borderRadius: '6px',
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    fontWeight: 600,
                  }}
                >
                  Limpar Filtros ✕
                </button>
              ) : null}
            </div>

            {/* Ações de Impressão e PDF */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleVisualizarPDF}
                style={{
                  background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                  color: '#fff',
                  border: '1px solid #60a5fa',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(37, 99, 235, 0.3)',
                }}
                title="Imprimir documento oficial em PDF"
              >
                <span>🖨️</span> Imprimir PDF
              </button>

              <button
                type="button"
                onClick={handleBaixarPDF}
                style={{
                  background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                  color: '#fff',
                  border: '1px solid #34d399',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '12.5px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 8px rgba(5, 150, 105, 0.3)',
                }}
                title="Baixar arquivo PDF diretamente no computador"
              >
                <span>📥</span> Baixar PDF
              </button>
            </div>
          </div>

          {/* Cards de Métricas Consolidadas (KPIs) */}
          <div
            style={{
              padding: '14px 24px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '10px',
              background: '#090d1a',
              borderBottom: '1px solid #1e293b',
            }}
          >
            {/* 1. Estoque Anterior */}
            <div
              style={{
                background: '#111827',
                border: '1px solid #1e293b',
                borderRadius: '8px',
                padding: '10px 14px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 700 }}>📦 ESTOQUE ANTERIOR</div>
              <div style={{ fontSize: '19px', fontWeight: 800, color: '#f1f5f9', marginTop: '2px' }}>
                {totais.estoqueAnterior} <span style={{ fontSize: '11px', color: '#64748b' }}>un</span>
              </div>
            </div>

            {/* 2. Entregues */}
            <div
              style={{
                background: 'rgba(16, 185, 129, 0.08)',
                border: '1px solid rgba(16, 185, 129, 0.25)',
                borderRadius: '8px',
                padding: '10px 14px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#34d399', fontWeight: 700 }}>🚚 ENTREGUES (-)</div>
              <div style={{ fontSize: '19px', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>
                {totais.entregues} <span style={{ fontSize: '11px', color: '#059669' }}>un</span>
              </div>
            </div>

            {/* 3. Descartados */}
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.08)',
                border: '1px solid rgba(239, 68, 68, 0.25)',
                borderRadius: '8px',
                padding: '10px 14px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#f87171', fontWeight: 700 }}>🗑️ DESCARTADOS (-)</div>
              <div style={{ fontSize: '19px', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>
                {totais.descartados} <span style={{ fontSize: '11px', color: '#dc2626' }}>un</span>
              </div>
            </div>

            {/* 4. Novos */}
            <div
              style={{
                background: 'rgba(56, 189, 248, 0.08)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '8px',
                padding: '10px 14px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#38bdf8', fontWeight: 700 }}>✨ NOVOS (ATUAL)</div>
              <div style={{ fontSize: '19px', fontWeight: 800, color: '#0284c7', marginTop: '2px' }}>
                {totais.novos} <span style={{ fontSize: '11px', color: '#0284c7' }}>un</span>
              </div>
            </div>

            {/* 5. Usados */}
            <div
              style={{
                background: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid rgba(245, 158, 11, 0.25)',
                borderRadius: '8px',
                padding: '10px 14px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#fbbf24', fontWeight: 700 }}>🔄 USADOS (ATUAL)</div>
              <div style={{ fontSize: '19px', fontWeight: 800, color: '#d97706', marginTop: '2px' }}>
                {totais.usados} <span style={{ fontSize: '11px', color: '#b45309' }}>un</span>
              </div>
            </div>

            {/* 6. Estoque Atual */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(109, 40, 217, 0.2) 100%)',
                border: '1px solid #8b5cf6',
                borderRadius: '8px',
                padding: '10px 14px',
              }}
            >
              <div style={{ fontSize: '11px', color: '#c4b5fd', fontWeight: 700 }}>👔 ESTOQUE ATUAL</div>
              <div style={{ fontSize: '19px', fontWeight: 800, color: '#a78bfa', marginTop: '2px' }}>
                {totais.estoqueAtual} <span style={{ fontSize: '11px', color: '#c4b5fd' }}>un</span>
              </div>
            </div>
          </div>

          {/* Tabela de Dados */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '14px 24px' }}>
            {linhasFiltradas.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
                <span style={{ fontSize: '32px' }}>🔍</span>
                <p style={{ margin: '8px 0 0', fontWeight: 600 }}>Nenhum departamento encontrado com o filtro informado.</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    textAlign: 'left',
                    fontSize: '13px',
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: '#1e293b',
                        color: '#f8fafc',
                        borderBottom: '2px solid #334155',
                      }}
                    >
                      <th style={{ padding: '10px 12px', fontWeight: 700 }}>DEPARTAMENTO</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>ESTOQUE ANTERIOR</th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#34d399' }}>
                        ENTREGUES (-)
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#f87171' }}>
                        DESCARTADOS (-)
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#38bdf8' }}>
                        NOVOS (ATUAL)
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#fbbf24' }}>
                        USADOS (ATUAL)
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#c4b5fd' }}>
                        ESTOQUE ATUAL
                      </th>
                      <th style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>DETALHES</th>
                    </tr>
                  </thead>
                  <tbody>
                    {linhasFiltradas.map((linha, index) => {
                      const expandido = departamentoExpandido === linha.departamento;
                      const tamanhosArr = Object.values(linha.tamanhos || {});

                      return (
                        <React.Fragment key={linha.departamento}>
                          <tr
                            style={{
                              background: index % 2 === 0 ? 'rgba(15, 23, 42, 0.6)' : 'rgba(30, 41, 59, 0.4)',
                              borderBottom: '1px solid #1e293b',
                              transition: 'background 0.15s ease',
                            }}
                          >
                            <td style={{ padding: '10px 12px', fontWeight: 700, color: '#f8fafc' }}>
                              🏢 {linha.departamento}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#cbd5e1' }}>
                              {linha.estoqueAnterior} un
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#10b981' }}>
                              {linha.entregues > 0 ? `${linha.entregues} un` : '-'}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700, color: '#ef4444' }}>
                              {linha.descartados > 0 ? `${linha.descartados} un` : '-'}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#38bdf8' }}>
                              {linha.novos > 0 ? `${linha.novos} un` : '-'}
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 600, color: '#f59e0b' }}>
                              {linha.usados > 0 ? `${linha.usados} un` : '-'}
                            </td>
                            <td
                              style={{
                                padding: '10px 12px',
                                textAlign: 'center',
                                fontWeight: 800,
                                color: '#a78bfa',
                                fontSize: '14px',
                              }}
                            >
                              {linha.estoqueAtual} un
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                              <button
                                type="button"
                                onClick={() => toggleExpandir(linha.departamento)}
                                style={{
                                  background: expandido ? '#3b82f6' : 'rgba(255, 255, 255, 0.08)',
                                  border: '1px solid rgba(255, 255, 255, 0.15)',
                                  color: expandido ? '#ffffff' : '#cbd5e1',
                                  padding: '4px 10px',
                                  borderRadius: '5px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                {expandido ? '▲ Ocultar' : '▼ Tamanhos'}
                              </button>
                            </td>
                          </tr>

                          {/* Linha Expandida de Tamanhos */}
                          {expandido && (
                            <tr style={{ background: 'rgba(15, 23, 42, 0.95)' }}>
                              <td colSpan={8} style={{ padding: '12px 16px', borderBottom: '2px solid #3b82f6' }}>
                                <div style={{ fontSize: '11.5px', color: '#94a3b8', marginBottom: '8px', fontWeight: 700 }}>
                                  📐 Grade de Tamanhos • {linha.departamento}:
                                </div>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                  {tamanhosArr.length === 0 ? (
                                    <span style={{ fontSize: '12px', color: '#64748b' }}>
                                      Nenhum tamanho cadastrado ainda.
                                    </span>
                                  ) : (
                                    tamanhosArr.map((t) => (
                                      <div
                                        key={t.tamanho}
                                        style={{
                                          background: '#1e293b',
                                          border: '1px solid #334155',
                                          borderRadius: '6px',
                                          padding: '6px 10px',
                                          fontSize: '11px',
                                          minWidth: '100px',
                                        }}
                                      >
                                        <div style={{ fontWeight: 800, color: '#f8fafc', borderBottom: '1px solid #334155', paddingBottom: '3px', marginBottom: '4px' }}>
                                          Tam: {t.tamanho}
                                        </div>
                                        <div style={{ color: '#38bdf8' }}>Novos: <b>{t.novos}</b></div>
                                        <div style={{ color: '#fbbf24' }}>Usados: <b>{t.usados}</b></div>
                                        <div style={{ color: '#10b981' }}>Entregues: <b>{t.entregues}</b></div>
                                        <div style={{ color: '#f87171' }}>Descartados: <b>{t.descartados}</b></div>
                                        <div style={{ color: '#a78bfa', fontWeight: 700, marginTop: '2px' }}>
                                          Atual: <b>{t.total} un</b>
                                        </div>
                                      </div>
                                    ))
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr
                      style={{
                        background: '#0f172a',
                        color: '#ffffff',
                        borderTop: '2px solid #3b82f6',
                        fontSize: '13.5px',
                        fontWeight: 800,
                      }}
                    >
                      <td style={{ padding: '12px', color: '#f8fafc' }}>
                        TOTAL GERAL ({linhasFiltradas.length} Setores)
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{totais.estoqueAnterior} un</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#34d399' }}>{totais.entregues} un</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#f87171' }}>{totais.descartados} un</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#38bdf8' }}>{totais.novos} un</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#fbbf24' }}>{totais.usados} un</td>
                      <td style={{ padding: '12px', textAlign: 'center', color: '#c4b5fd', fontSize: '15px' }}>
                        {totais.estoqueAtual} un
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>-</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Rodapé do Modal */}
          <div
            style={{
              padding: '14px 24px',
              background: '#0f172a',
              borderTop: '1px solid #1e293b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              flexWrap: 'wrap',
            }}
          >
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              💡 <b>Nota:</b> O Estoque Anterior reflete a disponibilidade prévia à soma das entregas e descartes realizados.
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                onClick={handleVisualizarPDF}
                style={{
                  background: '#2563eb',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                title="Imprimir documento oficial em PDF"
              >
                <span>🖨️</span> Imprimir PDF
              </button>

              <button
                type="button"
                onClick={handleBaixarPDF}
                style={{
                  background: '#059669',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>📥</span> Baixar PDF
              </button>

              <button
                type="button"
                onClick={onClose}
                style={{
                  background: '#334155',
                  color: '#f8fafc',
                  border: 'none',
                  padding: '9px 16px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Visualizador do Documento Oficial em PDF */}
      {modalVisualizadorAberto && pdfBlob && (
        <ModalVisualizadorDocumento
          isOpen={modalVisualizadorAberto}
          onClose={() => {
            setModalVisualizadorAberto(false);
            setPdfBlob(null);
          }}
          titulo="Relatório de Uniformes por Departamento"
          subtitulo="Posição Consolidada • Big Master Supermercados"
          blob={pdfBlob}
          nomeArquivo={`Relatorio_Uniformes_BigMaster_${new Date().toISOString().slice(0, 10)}.pdf`}
        />
      )}
    </>
  );
}
