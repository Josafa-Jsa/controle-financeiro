// src/components/Modais/ModalRelatorioControleNotas.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import {
  gerarRelatorioControleNotasBlob,
  baixarRelatorioControleNotasPDF,
} from '../../utils/gerarRelatorioControleNotasPDF';
import { formatCurrencyBRL, formatDateBR } from '../../utils/telegram';
import { getUser } from '../../auth/auth';
import { normalizarNomeFilial } from '../../utils/filialUtils';
import '../Visual/modal.css';
import '../../pages/ControleNotas/controleNotas.css';

export default function ModalRelatorioControleNotas({
  isOpen = false,
  onClose = () => {},
  notas = [],
  dataReferencia = '',
}) {
  const [busca, setBusca] = useState('');
  const [filtroDanfe, setFiltroDanfe] = useState('todos'); // 'todos' | 'com_danfe' | 'sem_danfe'
  const [ordenacao, setOrdenacao] = useState('recente'); // 'recente' | 'antiga'
  const [modoExibicao, setModoExibicao] = useState('documento'); // 'documento' | 'pdf'
  const [zoomNivel, setZoomNivel] = useState('100'); // '100' | '90' | '80' | 'auto'
  const [pdfUrl, setPdfUrl] = useState('');
  const iframeRef = useRef(null);
  const containerRef = useRef(null);

  const usuarioLogado = getUser();
  const responsavel =
    usuarioLogado?.name ||
    usuarioLogado?.nome ||
    usuarioLogado?.username ||
    localStorage.getItem('usuario_nome') ||
    'Operador do Sistema';
  const filialUsuario = normalizarNomeFilial(
    usuarioLogado?.filial ||
    usuarioLogado?.user_filial ||
    localStorage.getItem('usuario_filial') ||
    'Filial 1'
  );

  const dataFormatadaBR = dataReferencia ? dataReferencia.split('-').reverse().join('/') : '';

  // Helper para formatar data e hora
  const formatarDataHora = (dtStr) => {
    if (!dtStr) return '-';
    try {
      const dt = new Date(dtStr);
      if (isNaN(dt.getTime())) return dtStr;
      return `${dt.toLocaleDateString('pt-BR')} às ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return dtStr;
    }
  };

  // Filtragem e ordenação cronológica de acordo com a hora de chegada
  const notasFiltradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const termoLimpo = termo.replace(/\D+/g, '');

    return [...notas]
      .filter((n) => {
        if (!termo) return true;
        const num = String(n.numero || n.id || '').toLowerCase();
        const chave = String(n.chavedeacesso || '').toLowerCase();
        const forn = String(n.fornecedor || '').toLowerCase();
        const cnpj = String(n.cnpj || '').toLowerCase();
        const quem = String(n.quemRecebeu || '').toLowerCase();

        return (
          num.includes(termo) ||
          chave.includes(termo) ||
          (termoLimpo && chave.replace(/\D+/g, '').includes(termoLimpo)) ||
          forn.includes(termo) ||
          cnpj.includes(termo) ||
          quem.includes(termo)
        );
      })
      .filter((n) => {
        if (filtroDanfe === 'com_danfe') return !!n.anexoDanfe;
        if (filtroDanfe === 'sem_danfe') return !n.anexoDanfe;
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.dataHoraEntrega || a.createdAt || 0).getTime();
        const timeB = new Date(b.dataHoraEntrega || b.createdAt || 0).getTime();
        return ordenacao === 'recente' ? timeB - timeA : timeA - timeB;
      });
  }, [notas, busca, filtroDanfe, ordenacao]);

  // Métricas calculadas
  const metricas = useMemo(() => {
    const total = notasFiltradas.length;
    const valor = notasFiltradas.reduce((acc, n) => acc + (Number(n.valor) || 0), 0);
    const fornecedores = new Set(notasFiltradas.map((n) => n.fornecedor?.trim() || n.cnpj?.trim()).filter(Boolean)).size;
    const comDanfe = notasFiltradas.filter((n) => !!n.anexoDanfe).length;
    const estimativaPaginas = Math.max(1, Math.ceil(total / 12));

    return { total, valor, fornecedores, comDanfe, estimativaPaginas };
  }, [notasFiltradas]);

  // Atualiza visualização do PDF
  useEffect(() => {
    if (isOpen && notasFiltradas.length >= 0) {
      try {
        const blob = gerarRelatorioControleNotasBlob({
          notas: notasFiltradas,
          responsavel,
          filial: filialUsuario,
          tituloPersonalizado: dataFormatadaBR
            ? `RELATÓRIO DE CONTROLE DE NOTAS • ${dataFormatadaBR} • ${String(filialUsuario).toUpperCase()}`
            : `RELATÓRIO CONSOLIDADO DE CONTROLE DE NOTAS • ${String(filialUsuario).toUpperCase()}`,
          filtroPeriodo: dataFormatadaBR ? `Data: ${dataFormatadaBR}` : 'Geral',
        });
        if (blob) {
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);
          return () => {
            if (url) URL.revokeObjectURL(url);
          };
        }
      } catch (err) {
        console.error('Erro ao gerar preview do PDF:', err);
      }
    } else {
      setPdfUrl('');
    }
  }, [isOpen, notasFiltradas, responsavel, filialUsuario, dataFormatadaBR]);

  // Fecha no ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleImprimir = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } else {
        const blob = gerarRelatorioControleNotasBlob({
          notas: notasFiltradas,
          responsavel,
          filial: filialUsuario,
          tituloPersonalizado: dataFormatadaBR
            ? `RELATÓRIO DE CONTROLE DE NOTAS • ${dataFormatadaBR} • ${String(filialUsuario).toUpperCase()}`
            : `RELATÓRIO CONSOLIDADO DE CONTROLE DE NOTAS • ${String(filialUsuario).toUpperCase()}`,
        });
        const url = URL.createObjectURL(blob);
        const win = window.open(url, '_blank');
        if (win) win.focus();
      }
    } catch (e) {
      console.warn('Erro ao imprimir relatório:', e);
      baixarRelatorioControleNotasPDF({
        notas: notasFiltradas,
        responsavel,
        filial: filialUsuario,
        tituloPersonalizado: dataFormatadaBR
          ? `RELATÓRIO DE CONTROLE DE NOTAS • ${dataFormatadaBR} • ${String(filialUsuario).toUpperCase()}`
          : `RELATÓRIO CONSOLIDADO DE CONTROLE DE NOTAS • ${String(filialUsuario).toUpperCase()}`,
      });
    }
  };

  const handleBaixarPDF = () => {
    try {
      const dataStr = dataReferencia || new Date().toISOString().slice(0, 10);
      baixarRelatorioControleNotasPDF(
        {
          notas: notasFiltradas,
          responsavel,
          filial: filialUsuario,
          tituloPersonalizado: dataFormatadaBR
            ? `RELATÓRIO DE CONTROLE DE NOTAS • ${dataFormatadaBR} • ${String(filialUsuario).toUpperCase()}`
            : `RELATÓRIO CONSOLIDADO DE CONTROLE DE NOTAS • ${String(filialUsuario).toUpperCase()}`,
        },
        `Relatorio_Controle_Notas_${filialUsuario.replace(/\s+/g, '_')}_${dataStr}.pdf`
      );
      toast.success('Relatório PDF baixado com sucesso!');
    } catch (e) {
      console.error('Erro ao baixar relatório:', e);
      toast.error('Erro ao gerar arquivo PDF para download.');
    }
  };

  const copiarChave = (chave) => {
    if (!chave) return;
    navigator.clipboard.writeText(chave);
    toast.success('Chave de acesso copiada!');
  };

  // Cálculo de zoom / escala
  const getScaleStyle = () => {
    if (zoomNivel === '90') return { transform: 'scale(0.90)', transformOrigin: 'top center' };
    if (zoomNivel === '80') return { transform: 'scale(0.80)', transformOrigin: 'top center' };
    if (zoomNivel === 'auto') return { transform: 'scale(0.86)', transformOrigin: 'top center' };
    return { transform: 'none' };
  };

  return (
    <div
      className="modal-relatorio-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="modal-relatorio-box"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Topo do Modal (Compacto e Elegante) */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            borderBottom: '1px solid #1e293b',
            paddingBottom: '10px',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.35)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '19px',
                flexShrink: 0,
              }}
            >
              📑
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <h2 style={{ margin: 0, fontSize: '1.18rem', color: '#38bdf8', fontWeight: 800 }}>
                  Relatório Oficial de Controle de Notas
                </h2>
                <span
                  style={{
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  🏢 {filialUsuario} • Big Master
                </span>
                {dataFormatadaBR && (
                  <span
                    style={{
                      background: 'rgba(16, 185, 129, 0.15)',
                      color: '#34d399',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      fontSize: '0.72rem',
                      fontWeight: 700,
                    }}
                  >
                    📅 Data: {dataFormatadaBR}
                  </span>
                )}
                <span
                  style={{
                    background: 'rgba(234, 179, 8, 0.15)',
                    color: '#fbbf24',
                    border: '1px solid rgba(234, 179, 8, 0.35)',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontSize: '0.72rem',
                    fontWeight: 700,
                  }}
                >
                  {metricas.estimativaPaginas === 1
                    ? '📄 1 Página de Impressão (Visualização Completa)'
                    : `📄 ${metricas.estimativaPaginas} Páginas de Impressão (Role para ver mais)`}
                </span>
              </div>
            </div>
          </div>

          {/* Ações do Topo */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Alternador de Modo: Folha de Impressão ou PDF */}
            <div
              style={{
                display: 'inline-flex',
                background: '#1e293b',
                padding: '2px',
                borderRadius: '8px',
                border: '1px solid #334155',
              }}
            >
              <button
                type="button"
                onClick={() => setModoExibicao('documento')}
                style={{
                  padding: '5px 10px',
                  background: modoExibicao === 'documento' ? '#0284c7' : 'transparent',
                  color: modoExibicao === 'documento' ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                🖼️ Folha de Impressão
              </button>
              <button
                type="button"
                onClick={() => setModoExibicao('pdf')}
                style={{
                  padding: '5px 10px',
                  background: modoExibicao === 'pdf' ? '#0284c7' : 'transparent',
                  color: modoExibicao === 'pdf' ? '#fff' : '#94a3b8',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '0.78rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                📄 PDF Formatado
              </button>
            </div>

            {/* Ajuste de Zoom / Escala para Folha */}
            {modoExibicao === 'documento' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <select
                  value={zoomNivel}
                  onChange={(e) => setZoomNivel(e.target.value)}
                  style={{
                    padding: '5px 8px',
                    borderRadius: '6px',
                    border: '1px solid #334155',
                    background: '#1e293b',
                    color: '#e2e8f0',
                    fontSize: '0.76rem',
                    fontWeight: 600,
                    outline: 'none',
                  }}
                  title="Ajuste do tamanho da folha na tela"
                >
                  <option value="100">🔍 100% Padrão</option>
                  <option value="auto">📐 Ajustar à Tela</option>
                  <option value="90">🔍 90% Compacto</option>
                  <option value="80">🔍 80% Ajustado</option>
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={handleImprimir}
              style={{
                height: '34px',
                padding: '0 14px',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.35)',
                transition: 'all 0.15s ease',
              }}
              title="Imprimir relatório oficial"
            >
              <span>🖨️</span> Imprimir
            </button>

            <button
              type="button"
              onClick={handleBaixarPDF}
              style={{
                height: '34px',
                padding: '0 12px',
                background: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #0284c7',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease',
              }}
              title="Baixar arquivo PDF"
            >
              <span>⬇️</span> Baixar PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '1.35rem',
                cursor: 'pointer',
                lineHeight: 1,
                padding: '4px',
                marginLeft: '2px',
              }}
              title="Fechar modal (ESC)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Toolbar Integrada: Filtros e Métricas em Linha Única Compacta (Economiza Espaço Vertical) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            marginBottom: '10px',
            flexWrap: 'wrap',
            background: '#0c1220',
            padding: '7px 12px',
            borderRadius: '8px',
            border: '1px solid #1e293b',
          }}
        >
          {/* Busca e Filtros Rápidos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '1 1 280px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1, background: '#111827', border: '1px solid #334155', borderRadius: '6px', padding: '0 8px', height: '32px' }}>
              <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>🔍</span>
              <input
                type="text"
                placeholder="Filtrar notas por Fornecedor, Chave, Nº ou Recebedor..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  color: '#f8fafc',
                  fontSize: '0.8rem',
                  outline: 'none',
                }}
              />
              {busca && (
                <button
                  type="button"
                  onClick={() => setBusca('')}
                  style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  ✕
                </button>
              )}
            </div>

            <select
              value={filtroDanfe}
              onChange={(e) => setFiltroDanfe(e.target.value)}
              style={{
                height: '32px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: '#1e293b',
                color: '#fff',
                fontSize: '0.76rem',
                outline: 'none',
              }}
            >
              <option value="todos">Todas as DANFEs</option>
              <option value="com_danfe">Com DANFE</option>
              <option value="sem_danfe">Sem DANFE</option>
            </select>

            <select
              value={ordenacao}
              onChange={(e) => setOrdenacao(e.target.value)}
              style={{
                height: '32px',
                padding: '0 8px',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: '#1e293b',
                color: '#fff',
                fontSize: '0.76rem',
                outline: 'none',
              }}
            >
              <option value="recente">🕒 Mais Recente</option>
              <option value="antiga">🕒 Mais Antiga</option>
            </select>
          </div>

          {/* Badges de Totais e Indicadores Rápidos */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#1e293b', padding: '4px 10px', borderRadius: '6px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Total:</span>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#38bdf8' }}>{metricas.total} notas</span>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#1e293b', padding: '4px 10px', borderRadius: '6px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Fornec:</span>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#c084fc' }}>{metricas.fornecedores}</span>
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: '#1e293b', padding: '4px 10px', borderRadius: '6px', border: '1px solid #334155' }}>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>DANFE:</span>
              <span style={{ fontSize: '0.84rem', fontWeight: 800, color: '#fbbf24' }}>{metricas.comDanfe}/{metricas.total}</span>
            </div>
          </div>
        </div>

        {/* Área Principal de Exibição (Preenche 100% da altura restante sem barra de rolagem geral) */}
        <div
          ref={containerRef}
          className="relatorio-custom-scrollbar"
          style={{
            flex: 1,
            minHeight: 0,
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            overflowY: 'auto',
            overflowX: 'auto',
            background: '#060911',
            borderRadius: '10px',
            border: '1px solid #1e293b',
            padding: '12px 14px',
            boxSizing: 'border-box',
          }}
        >
          {modoExibicao === 'pdf' ? (
            /* Modo PDF Iframe */
            <div style={{ flex: 1, width: '100%', height: '100%', borderRadius: '8px', overflow: 'hidden' }}>
              {pdfUrl ? (
                <iframe
                  ref={iframeRef}
                  src={pdfUrl}
                  title="Visualização do Relatório PDF"
                  style={{ width: '100%', height: '100%', minHeight: '520px', border: 'none' }}
                />
              ) : (
                <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                  ⏳ Gerando visualização do PDF...
                </div>
              )}
            </div>
          ) : (
            /* Modo Folha de Impressão (Document Sheet) */
            <div
              style={{
                width: '100%',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'flex-start',
                ...getScaleStyle(),
              }}
            >
              <div
                style={{
                  width: '100%',
                  maxWidth: '1420px',
                  background: '#0f172a',
                  border: '1.5px solid #334155',
                  borderRadius: '10px',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 10px 30px rgba(0, 0, 0, 0.6)',
                  boxSizing: 'border-box',
                }}
              >
                {/* 1. Cabeçalho Oficial da Folha */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #0b1120 0%, #1e1b4b 100%)',
                    border: '1px solid #334155',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '10px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.78rem', color: '#38bdf8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      🛒 BIG MASTER SUPERMERCADOS • {String(filialUsuario).toUpperCase()} • CONTROLE DE NOTAS FISCAIS
                    </div>
                    <h3 style={{ margin: '2px 0 0 0', fontSize: '1.1rem', color: '#f8fafc', fontWeight: 800 }}>
                      {dataFormatadaBR
                        ? `Relatório Oficial de Recebimento de Notas Fiscais • ${dataFormatadaBR}`
                        : 'Relatório Oficial de Recebimento de Notas Fiscais'}
                    </h3>
                    <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                      Registros ordenados pela hora de chegada/entrega da nota • Total de {notasFiltradas.length} nota(s)
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '0.74rem', color: '#cbd5e1' }}>
                    <div>📅 <strong>Emissão:</strong> {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                    <div style={{ marginTop: '2px' }}>👤 <strong>Responsável:</strong> {responsavel} ({filialUsuario})</div>
                  </div>
                </div>

                {/* 2. Resumo de Métricas na Folha */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '8px',
                  }}
                >
                  <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 12px' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Total de Notas</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#38bdf8' }}>{metricas.total} notas</div>
                  </div>
                  <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 12px' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Fornecedores Atendidos</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#c084fc' }}>{metricas.fornecedores} fornecedor(es)</div>
                  </div>
                  <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '6px', padding: '8px 12px' }}>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>DANFE Anexada (FSIST)</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fbbf24' }}>{metricas.comDanfe} de {metricas.total}</div>
                  </div>
                </div>

                {/* 3. Tabela de Notas Compacta e Elegante */}
                {notasFiltradas.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px 16px', color: '#94a3b8' }}>
                    <div style={{ fontSize: '2.2rem', marginBottom: '6px' }}>📄</div>
                    <h4 style={{ margin: 0, color: '#f1f5f9' }}>Nenhuma nota fiscal encontrada para esta data/filtro</h4>
                    <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem' }}>Verifique os filtros ou cadastre novas notas na filial.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table
                      style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.8rem',
                        textAlign: 'left',
                      }}
                    >
                      <thead>
                        <tr
                          style={{
                            background: '#090d16',
                            color: '#94a3b8',
                            borderBottom: '2px solid #334155',
                            fontSize: '0.72rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.3px',
                          }}
                        >
                          <th style={{ padding: '8px 10px', width: '36px', textAlign: 'center' }}>#</th>
                          <th style={{ padding: '8px 10px', color: '#fbbf24', whiteSpace: 'nowrap' }}>🕒 Hora Chegada</th>
                          <th style={{ padding: '8px 10px', color: '#38bdf8', whiteSpace: 'nowrap' }}>Número da Nota</th>
                          <th style={{ padding: '8px 10px' }}>Fornecedor / CNPJ</th>
                          <th style={{ padding: '8px 10px' }}>Chave de Acesso (44 dígitos)</th>
                          <th style={{ padding: '8px 10px' }}>Quem Recebeu</th>
                          <th style={{ padding: '8px 10px', textAlign: 'center' }}>DANFE</th>
                          <th style={{ padding: '8px 10px', textAlign: 'right', color: '#4ade80' }}>Valor Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {notasFiltradas.map((n, idx) => (
                          <React.Fragment key={n.id || idx}>
                            {/* Se houver quebra de página visual a cada ~14 itens */}
                            {idx > 0 && idx % 14 === 0 && (
                              <tr>
                                <td colSpan={8} style={{ padding: '6px 0' }}>
                                  <div className="relatorio-page-divider">
                                    📄 Quebra de Página {Math.floor(idx / 14) + 1} de {metricas.estimativaPaginas}
                                  </div>
                                </td>
                              </tr>
                            )}
                            <tr
                              style={{
                                background: idx % 2 === 0 ? 'rgba(15, 23, 42, 0.7)' : 'rgba(30, 41, 59, 0.4)',
                                borderBottom: '1px solid #1e293b',
                              }}
                            >
                              <td style={{ padding: '7px 10px', textAlign: 'center', color: '#64748b', fontWeight: 700 }}>
                                {idx + 1}
                              </td>
                              <td style={{ padding: '7px 10px', fontWeight: 700, color: '#fbbf24', whiteSpace: 'nowrap' }}>
                                {formatarDataHora(n.dataHoraEntrega)}
                              </td>
                              <td style={{ padding: '7px 10px', fontWeight: 800, color: '#38bdf8', whiteSpace: 'nowrap' }}>
                                <div>{n.numero ? `NF #${n.numero}` : `NF #${n.id}`}</div>
                                {n.situacaoNota && (
                                  <div style={{ marginTop: '2px' }}>
                                    <span
                                      style={{
                                        fontSize: '0.66rem',
                                        fontWeight: 700,
                                        padding: '1px 5px',
                                        borderRadius: '3px',
                                        background: n.situacaoNota === 'Liberada' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(56, 189, 248, 0.2)',
                                        color: n.situacaoNota === 'Liberada' ? '#34d399' : '#38bdf8',
                                        border: n.situacaoNota === 'Liberada' ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(56, 189, 248, 0.4)',
                                      }}
                                    >
                                      {n.situacaoNota}
                                    </span>
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '7px 10px' }}>
                                <div style={{ fontWeight: 700, color: '#f1f5f9' }}>{n.fornecedor || 'Não informado'}</div>
                                {n.cnpj && (
                                  <div style={{ fontSize: '0.7rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                    CNPJ: {n.cnpj}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '7px 10px' }}>
                                {n.chavedeacesso ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ fontFamily: 'monospace', fontSize: '0.7rem', color: '#94a3b8', wordBreak: 'break-all' }}>
                                      {n.chavedeacesso}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => copiarChave(n.chavedeacesso)}
                                      style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#38bdf8',
                                        cursor: 'pointer',
                                        fontSize: '0.72rem',
                                        padding: '2px',
                                      }}
                                      title="Copiar Chave de Acesso"
                                    >
                                      📋
                                    </button>
                                  </div>
                                ) : (
                                  <span style={{ color: '#64748b', fontSize: '0.72rem' }}>-</span>
                                )}
                              </td>
                              <td style={{ padding: '7px 10px', color: '#cbd5e1' }}>
                                👤 {n.quemRecebeu || 'Não especificado'}
                              </td>
                              <td style={{ padding: '7px 10px', textAlign: 'center' }}>
                                {n.anexoDanfe ? (
                                  <span
                                    style={{
                                      background: 'rgba(16, 185, 129, 0.15)',
                                      color: '#34d399',
                                      border: '1px solid rgba(16, 185, 129, 0.35)',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                    }}
                                  >
                                    Anexada
                                  </span>
                                ) : (
                                  <span
                                    style={{
                                      background: 'rgba(239, 68, 68, 0.15)',
                                      color: '#f87171',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      padding: '2px 6px',
                                      borderRadius: '4px',
                                      fontSize: '0.7rem',
                                      fontWeight: 700,
                                    }}
                                  >
                                    Pendente
                                  </span>
                                )}
                              </td>
                              <td style={{ padding: '7px 10px', textAlign: 'right', fontWeight: 800, color: '#4ade80', fontSize: '0.88rem', whiteSpace: 'nowrap' }}>
                                {formatCurrencyBRL(n.valor || 0)}
                              </td>
                            </tr>
                          </React.Fragment>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr
                          style={{
                            background: '#090d16',
                            borderTop: '2px solid #334155',
                            fontWeight: 800,
                            fontSize: '0.85rem',
                          }}
                        >
                          <td colSpan={7} style={{ padding: '10px 12px', textAlign: 'right', color: '#f8fafc' }}>
                            TOTAL CONSOLIDADO ({notasFiltradas.length} NOTAS):
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right', color: '#4ade80', fontSize: '1rem' }}>
                            {formatCurrencyBRL(metricas.valor)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}

                {/* 4. Rodapé Oficial da Folha com Copyright Obrigatório */}
                <div
                  style={{
                    marginTop: 'auto',
                    paddingTop: '12px',
                    borderTop: '1px solid #1e293b',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontSize: '0.75rem',
                    color: '#64748b',
                    flexWrap: 'wrap',
                    gap: '6px',
                  }}
                >
                  <div>
                    <strong>Copyright © 2026 JSA Soluções Tecnológicas. All rights reserved.</strong>
                  </div>
                  <div>
                    Big Master Supermercados • Sistema de Gestão Financeira & Controle
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé do Modal com Botões de Ação */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid #1e293b',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            <span>🔒 Documento Oficial com Auditoria de Recebimento • Sistema Big Master</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleImprimir}
              style={{
                padding: '7px 16px',
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(5, 150, 105, 0.35)',
              }}
            >
              <span>🖨️</span> Imprimir Relatório
            </button>

            <button
              type="button"
              onClick={handleBaixarPDF}
              style={{
                padding: '7px 14px',
                background: '#1e293b',
                color: '#38bdf8',
                border: '1px solid #0284c7',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>⬇️</span> Baixar PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '7px 16px',
                background: '#27272a',
                color: '#e4e4e7',
                border: '1px solid #3f3f46',
                borderRadius: '8px',
                fontSize: '0.82rem',
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
  );
}
