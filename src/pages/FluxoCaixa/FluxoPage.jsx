// src/pages/FluxoCaixa/FluxoPage.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { listarContas } from '../../services/contasService';
import { listarNotas } from '../../services/notasService';
import { toast } from 'react-toastify';
import { api } from '../../api/client';
import '../../components/Visual/styles.css';
import '../../components/Visual/modal.css';

const LAST_SENT_KEY = 'fluxo_daily_telegram_last_sent';

export default function FluxoPage() {
  const [contas, setContas] = useState([]);
  const [notas, setNotas] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const [entradasPagas, setEntradasPagas] = useState(0);
  const [saidasPagas, setSaidasPagas] = useState(0);
  const [saldoRealizado, setSaldoRealizado] = useState(0);

  const [totalReceberPend, setTotalReceberPend] = useState(0);
  const [totalPagarPend, setTotalPagarPend] = useState(0);
  const [totalContasAll, setTotalContasAll] = useState(0);
  const [totalNotas, setTotalNotas] = useState(0);

  const [filtroMes, setFiltroMes] = useState('');
  const [filtroDia, setFiltroDia] = useState('');

  const [modalAberto, setModalAberto] = useState(false);
  const [relatorioDia, setRelatorioDia] = useState(null);
  const [enviando, setEnviando] = useState(false);

  const carregarDados = async () => {
    setIsLoading(true);
    let loadedContas = [];
    let loadedNotas = [];

    try {
      const respContas = await api.get('/contas');
      if (Array.isArray(respContas.data)) {
        loadedContas = respContas.data;
      }
    } catch {
      loadedContas = listarContas() || [];
    }

    try {
      const respNotas = await api.get('/notas');
      if (Array.isArray(respNotas.data)) {
        loadedNotas = respNotas.data;
      }
    } catch {
      loadedNotas = listarNotas() || [];
    }

    if (!loadedContas.length) {
      loadedContas = listarContas() || [];
    }
    if (!loadedNotas.length) {
      loadedNotas = listarNotas() || [];
    }

    setContas(loadedContas);
    setNotas(loadedNotas);
    setIsLoading(false);
  };

  useEffect(() => {
    carregarDados();
  }, []);

  useEffect(() => {
    calcularFluxo();
  }, [filtroMes, contas, notas]);

  useEffect(() => {
    if (filtroDia) gerarRelatorioDia(filtroDia);
  }, [filtroDia]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape' && modalAberto) setModalAberto(false);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [modalAberto]);

  // ===== Helpers
  const formatarMoeda = (v) =>
    Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatarDataBR = (iso) => {
    if (!iso) return '-';
    try {
      const parts = String(iso).split('T')[0].split('-');
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
      return new Date(iso).toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
  };

  const yyyyMmDdLocal = (d) => {
    const dt = d instanceof Date ? d : new Date(d);
    const y = dt.getFullYear();
    const m = String(dt.getMonth() + 1).padStart(2, '0');
    const day = String(dt.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const sameMonthOfCurrentYear = (iso, month) => {
    if (!month) return true;
    if (!iso) return false;
    const d = new Date(iso);
    const now = new Date();
    return (
      d.getMonth() + 1 === parseInt(month, 10) &&
      d.getFullYear() === now.getFullYear()
    );
  };

  // ===== Cálculos principais
  const calcularFluxo = () => {
    try {
      const contasFiltradas = contas.filter((c) =>
        sameMonthOfCurrentYear(c.vencimento, filtroMes)
      );
      const sum = (arr, prop = 'valor') =>
        arr.reduce((acc, c) => acc + Number(c[prop] || 0), 0);

      // Recebidos
      const recebidosPagos = sum(
        contasFiltradas.filter((c) => c.tipo === 'Receber' && c.status === 'Pago')
      );
      const baixasReceberPend = contasFiltradas
        .filter(
          (c) =>
            c.tipo === 'Receber' &&
            c.status !== 'Pago' &&
            Array.isArray(c.baixas) &&
            c.baixas.length
        )
        .flatMap((c) => c.baixas)
        .reduce((acc, b) => acc + Number(b.valor || 0), 0);
      const recPagas = recebidosPagos + baixasReceberPend;

      // Saídas pagas
      const pagPagas = sum(
        contasFiltradas.filter((c) => c.tipo === 'Pagar' && c.status === 'Pago')
      );

      // Pendências
      const recPend = sum(
        contasFiltradas.filter((c) => c.tipo === 'Receber' && c.status !== 'Pago')
      );
      const pagPend = sum(
        contasFiltradas.filter((c) => c.tipo === 'Pagar' && c.status !== 'Pago')
      );

      // Todas
      const totalAll = sum(contasFiltradas);

      // Notas (não canceladas)
      const notasFiltradas = (notas || [])
        .filter((n) => n.status !== 'Cancelada')
        .filter((n) => sameMonthOfCurrentYear(n.dataEmissao, filtroMes));
      const sumNotas = notasFiltradas.reduce(
        (acc, n) => acc + Number(n.valor || 0),
        0
      );

      setEntradasPagas(recPagas);
      setSaidasPagas(pagPagas);
      setSaldoRealizado(recPagas - pagPagas);

      setTotalReceberPend(recPend);
      setTotalPagarPend(pagPend);
      setTotalContasAll(totalAll);
      setTotalNotas(sumNotas);
    } catch (e) {
      console.error('Erro ao calcular fluxo:', e);
    }
  };

  const formatarLinha = (c) =>
    `${c.tipo}: ${c.descricao || '-'} | Valor: ${formatarMoeda(c.valor)} | Venc.: ${formatarDataBR(c.vencimento)} | Status: ${c.status || '-'}`;

  // === Monta relatório de um dia
  const montarRelatorioDia = (yyyyMMdd) => {
    const alvo = new Date(yyyyMMdd + 'T00:00:00');
    if (Number.isNaN(alvo.getTime())) return null;

    const itens = contas.filter((c) => {
      const d = new Date(c.vencimento);
      return (
        d.getFullYear() === alvo.getFullYear() &&
        d.getMonth() === alvo.getMonth() &&
        d.getDate() === alvo.getDate()
      );
    });

    const entradas = itens
      .filter((c) => c.tipo === 'Receber')
      .reduce((a, c) => a + Number(c.valor || 0), 0);
    const saidas = itens
      .filter((c) => c.tipo === 'Pagar')
      .reduce((a, c) => a + Number(c.valor || 0), 0);

    const notasDoDia = notas
      .filter((n) => n.status !== 'Cancelada')
      .filter((n) => yyyyMmDdLocal(n.dataEmissao) === yyyyMMdd);
    const totalNotasDia = notasDoDia.reduce(
      (acc, n) => acc + Number(n.valor || 0),
      0
    );

    return {
      dataISO: yyyyMMdd,
      dataBR: formatarDataBR(yyyyMMdd),
      entradas,
      saidas,
      saldo: entradas - saidas,
      itens,
      totalNotasDia,
    };
  };

  const gerarRelatorioDia = (yyyyMMdd) => {
    try {
      const dado = montarRelatorioDia(yyyyMMdd);
      if (!dado) return toast.warn('Data selecionada inválida.');
      setRelatorioDia(dado);
      setModalAberto(true);
    } catch (e) {
      console.error('Erro ao gerar relatório do dia:', e);
      toast.error('Falha ao gerar relatório do dia.');
    }
  };

  // ========= Envio Telegram (modal)
  const enviarRelatorioTelegram = async () => {
    if (!relatorioDia) return;
    try {
      setEnviando(true);
      await enviarRelatorioParaTelegram(relatorioDia);
      toast.success('Relatório enviado ao Telegram com sucesso!');
    } catch (e) {
      console.error('Falha ao enviar Telegram:', e);
      toast.error('Não foi possível enviar ao Telegram.');
    } finally {
      setEnviando(false);
    }
  };

  // ========= Funções do Telegram
  const enviarRelatorioParaTelegram = async (rel) => {
    const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
    if (!token || !chatId) {
      toast.warn('Configure as chaves do Telegram no arquivo de ambiente (.env).');
      return;
    }

    const header = `📅 <b>Relatório Diário de Fluxo — ${rel.dataBR}</b>\n`;
    const body = rel.itens.length
      ? rel.itens.map(formatarLinha).join('\n')
      : '— Sem movimentações neste dia —';
    const footer =
      `\n\n🟢 Entradas: <b>${formatarMoeda(rel.entradas)}</b>` +
      `\n🔴 Saídas: <b>${formatarMoeda(rel.saidas)}</b>` +
      `\n🔵 Saldo Líquido: <b>${formatarMoeda(rel.saldo)}</b>` +
      `\n📑 Notas emitidas: <b>${formatarMoeda(rel.totalNotasDia)}</b>`;

    const texto = header + body + footer;

    const bodyForm = new URLSearchParams({
      chat_id: String(chatId),
      text: texto,
      parse_mode: 'HTML',
      disable_web_page_preview: 'true',
    }).toString();

    const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: bodyForm,
    });
    const data = await r.json();
    if (!data.ok) throw new Error(JSON.stringify(data));
  };

  // ========= Agendador diário às 17:00
  useEffect(() => {
    const checkAndSend = async () => {
      try {
        const now = new Date();
        const horas = now.getHours();
        const ymd = yyyyMmDdLocal(now);
        const lastSent = localStorage.getItem(LAST_SENT_KEY);

        if (horas >= 17 && lastSent !== ymd) {
          const rel = montarRelatorioDia(ymd);
          if (rel) {
            try {
              await enviarRelatorioParaTelegram(rel);
              localStorage.setItem(LAST_SENT_KEY, ymd);
            } catch (err) {
              console.error('[Fluxo] Falha ao enviar relatório diário:', err);
            }
          }
        }
      } catch (e) {
        console.error('[Fluxo] Agendador diário erro:', e);
      }
    };

    checkAndSend();
    const id = setInterval(checkAndSend, 60 * 1000);
    return () => clearInterval(id);
  }, [contas, notas]);

  const contasExibicao = useMemo(() => {
    return contas.filter((c) => sameMonthOfCurrentYear(c.vencimento, filtroMes));
  }, [contas, filtroMes]);

  return (
    <div className="page-container fade-in-page">
      {/* Header */}
      <div className="notas-header-bar" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title" style={{ color: '#00d2ff', margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>
            📈 Fluxo de Caixa & Projeções
          </h1>
          <p className="page-subtitle" style={{ color: '#8a94a6', fontSize: '0.95rem', marginTop: '4px' }}>
            Acompanhamento em tempo real de entradas, saídas, saldo realizado e movimentações diárias.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <button
            className="btn-nova-conta"
            style={{ background: 'linear-gradient(135deg, #0088cc 0%, #00b4d8 100%)', display: 'flex', alignItems: 'center', gap: '6px' }}
            onClick={() => {
              const hoje = yyyyMmDdLocal(new Date());
              gerarRelatorioDia(hoje);
            }}
          >
            <span>📅</span> Relatório de Hoje
          </button>
          <button
            className="btn-nova-conta"
            style={{ background: '#242b35', border: '1px solid #334155' }}
            onClick={carregarDados}
          >
            🔄 Atualizar
          </button>
        </div>
      </div>

      {/* Grid de Métricas do Fluxo */}
      <div className="notas-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            🟢
          </div>
          <div className="stat-data">
            <span className="stat-title">Entradas Pagas (Recebidas)</span>
            <span className="stat-value" style={{ color: '#10b981' }}>{formatarMoeda(entradasPagas)}</span>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #ef4444' }}>
          <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>
            🔴
          </div>
          <div className="stat-data">
            <span className="stat-title">Saídas Pagas (Despesas)</span>
            <span className="stat-value" style={{ color: '#ef4444' }}>{formatarMoeda(saidasPagas)}</span>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: `4px solid ${saldoRealizado >= 0 ? '#3b82f6' : '#f59e0b'}` }}>
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            🔵
          </div>
          <div className="stat-data">
            <span className="stat-title">Saldo Líquido Realizado</span>
            <span className="stat-value" style={{ color: saldoRealizado >= 0 ? '#60a5fa' : '#f87171' }}>
              {formatarMoeda(saldoRealizado)}
            </span>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <div className="stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }}>
            ⏳
          </div>
          <div className="stat-data">
            <span className="stat-title">Pendências (Receber / Pagar)</span>
            <span className="stat-value" style={{ fontSize: '15px', color: '#fbbf24' }}>
              R: {formatarMoeda(totalReceberPend)} | P: {formatarMoeda(totalPagarPend)}
            </span>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #a855f7' }}>
          <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            📑
          </div>
          <div className="stat-data">
            <span className="stat-title">Total Notas Emitidas</span>
            <span className="stat-value" style={{ color: '#c084fc' }}>{formatarMoeda(totalNotas)}</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="control-bar" style={{ background: '#181d24', padding: '16px', borderRadius: '10px', border: '1px solid #283340', marginBottom: '20px' }}>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
              📅 Filtrar por Mês:
            </label>
            <select
              value={filtroMes}
              onChange={(e) => setFiltroMes(e.target.value)}
              className="select-input"
              style={{ minWidth: '180px' }}
            >
              <option value="">Todos os Meses</option>
              {[...Array(12)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
              🔍 Relatório do Dia:
            </label>
            <input
              type="date"
              value={filtroDia}
              onChange={(e) => setFiltroDia(e.target.value)}
              className="modal-input"
              style={{ minWidth: '170px' }}
            />
          </div>
        </div>
      </div>

      {/* Tabela de Movimentações */}
      <div className="table-responsive" style={{ background: '#181d24', borderRadius: '10px', border: '1px solid #283340', overflow: 'hidden' }}>
        <table className="contasTable" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1e2632', borderBottom: '1px solid #2d3748' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Tipo</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Descrição</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Categoria</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Vencimento</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Valor</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
                  ⏳ Carregando movimentações de fluxo de caixa...
                </td>
              </tr>
            ) : contasExibicao.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Nenhuma movimentação financeira encontrada para o período selecionado.
                </td>
              </tr>
            ) : (
              contasExibicao.map((c) => {
                const isReceber = c.tipo === 'Receber';
                const isPago = c.status === 'Pago';
                return (
                  <tr key={c.id || Math.random()} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <span
                        style={{
                          padding: '3px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: isReceber ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: isReceber ? '#4ade80' : '#f87171',
                          border: `1px solid ${isReceber ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        }}
                      >
                        {c.tipo || 'Lançamento'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: '#f1f5f9' }}>
                      {c.descricao || '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                      {c.categoria || 'Geral'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                      {formatarDataBR(c.vencimento)}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: isReceber ? '#4ade80' : '#f87171' }}>
                      {formatarMoeda(c.valor)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '11.5px',
                          fontWeight: 600,
                          background: isPago ? 'rgba(34, 197, 94, 0.2)' : 'rgba(234, 179, 8, 0.2)',
                          color: isPago ? '#4ade80' : '#fde047',
                          border: `1px solid ${isPago ? 'rgba(34, 197, 94, 0.4)' : 'rgba(234, 179, 8, 0.4)'}`,
                        }}
                      >
                        {c.status || 'Pendente'}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Relatório do Dia */}
      {modalAberto && relatorioDia && (
        <div className="modal-overlay" onClick={() => setModalAberto(false)}>
          <div className="modal-card" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ margin: 0, fontSize: '20px' }}>📅 Relatório do Dia — {relatorioDia.dataBR}</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', margin: '14px 0' }}>
              <div style={{ background: '#0f3b2a', border: '1px solid rgba(74, 222, 128, 0.3)', padding: '12px', borderRadius: '8px', color: '#d0f3e3' }}>
                <span style={{ fontSize: '11.5px', display: 'block', opacity: 0.8 }}>🟢 Entradas</span>
                <strong style={{ fontSize: '16px' }}>{formatarMoeda(relatorioDia.entradas)}</strong>
              </div>
              <div style={{ background: '#3b0f14', border: '1px solid rgba(248, 113, 113, 0.3)', padding: '12px', borderRadius: '8px', color: '#ffd7db' }}>
                <span style={{ fontSize: '11.5px', display: 'block', opacity: 0.8 }}>🔴 Saídas</span>
                <strong style={{ fontSize: '16px' }}>{formatarMoeda(relatorioDia.saidas)}</strong>
              </div>
              <div style={{ background: '#0f1b3b', border: '1px solid rgba(96, 165, 250, 0.3)', padding: '12px', borderRadius: '8px', color: '#d6e3ff' }}>
                <span style={{ fontSize: '11.5px', display: 'block', opacity: 0.8 }}>🔵 Saldo</span>
                <strong style={{ fontSize: '16px' }}>{formatarMoeda(relatorioDia.saldo)}</strong>
              </div>
            </div>

            <h3 style={{ fontSize: '14px', color: '#94a3b8', margin: '12px 0 8px' }}>Movimentações registradas no dia:</h3>
            <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #334155', borderRadius: '6px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                <thead>
                  <tr style={{ background: '#1e2632', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Tipo</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Descrição</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Valor</th>
                    <th style={{ padding: '8px 10px', textAlign: 'left' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorioDia.itens.length === 0 ? (
                    <tr>
                      <td colSpan="4" style={{ textAlign: 'center', padding: '14px', color: '#64748b' }}>
                        Nenhuma movimentação neste dia.
                      </td>
                    </tr>
                  ) : (
                    relatorioDia.itens.map((c) => (
                      <tr key={c.id || Math.random()} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                        <td style={{ padding: '8px 10px' }}>{c.tipo}</td>
                        <td style={{ padding: '8px 10px' }}>{c.descricao}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600 }}>{formatarMoeda(c.valor)}</td>
                        <td style={{ padding: '8px 10px' }}>{c.status}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="modal-footer" style={{ marginTop: '16px' }}>
              <button
                type="button"
                className="modal-btn modal-btn-save"
                onClick={enviarRelatorioTelegram}
                disabled={enviando}
              >
                {enviando ? '⏳ Enviando...' : '📲 Enviar ao Telegram'}
              </button>
              <button
                type="button"
                className="modal-btn modal-btn-close"
                onClick={() => setModalAberto(false)}
                disabled={enviando}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
