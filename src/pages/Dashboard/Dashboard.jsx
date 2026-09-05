// src/pages/Dashboard/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { sincronizarContasDoServidor } from "../../services/contasService";
import { listarNotas } from "../../services/notasService";
import { sincronizarSimulacoesDoServidor } from "../../services/simulacoesService";
import { obterStatusSistema, obterStatusLocal, isManutencaoGeral } from "../../services/systemStatusService";
import ModalStatusManutencao from "../../components/Modais/ModalStatusManutencao";
import { getCurrentUser } from "../../auth/auth";
import { formatCurrencyBRL, formatDateBR, sendTelegramEvent } from "../../utils/telegram";
import "./Dashboard.css";

const FEEDBACK_STORAGE_KEY = "feedback_jsa";

export default function Dashboard() {
  const [user, setUserState] = useState(() => getCurrentUser());
  const [systemStatus, setSystemStatus] = useState(() => obterStatusLocal());
  const [modalStatusAberto, setModalStatusAberto] = useState(false);

  useEffect(() => {
    const handlePerms = () => setUserState(getCurrentUser());
    window.addEventListener("permissoes_alteradas_evento", handlePerms);
    window.addEventListener("storage", handlePerms);
    return () => {
      window.removeEventListener("permissoes_alteradas_evento", handlePerms);
      window.removeEventListener("storage", handlePerms);
    };
  }, []);

  // Sincronização em tempo real do status do sistema e manutenção
  useEffect(() => {
    const carregarStatus = async () => {
      const s = await obterStatusSistema();
      if (s) setSystemStatus(s);
    };
    carregarStatus();

    const handleStatusEvent = (e) => {
      if (e.detail) {
        setSystemStatus(e.detail);
      } else {
        carregarStatus();
      }
    };

    window.addEventListener("system_status_updated", handleStatusEvent);
    window.addEventListener("storage", (e) => {
      if (e.key === "system_status_updated_event") {
        carregarStatus();
      }
    });

    const intervalId = window.setInterval(carregarStatus, 8_000);

    return () => {
      window.removeEventListener("system_status_updated", handleStatusEvent);
      window.clearInterval(intervalId);
    };
  }, []);

  const email = String(user?.email || "").toLowerCase().trim();
  const isAdmin =
    email === "jsa@jsa.com" ||
    email === "josafa.santos.jss@gmail.com" ||
    user?.name === "JSA Admin" ||
    user?.role === "ADMIN" ||
    user?.role === "admin";

  let perms = Array.isArray(user?.permissions || user?.permissoes)
    ? (user.permissions || user.permissoes)
    : [];

  try {
    const rawUsers = JSON.parse(localStorage.getItem("users") || "[]");
    const matched = rawUsers.find((u) => String(u?.email || "").toLowerCase().trim() === email);
    if (matched && Array.isArray(matched.permissions)) {
      perms = matched.permissions;
    }
  } catch { }

  if (!isAdmin) {
    perms = perms.filter((p) => p !== "*");
  }

  const canAccess = (key) => {
    if (isAdmin) return true;
    if (key === "chamados" || key === "atendimento") return true;
    if (key === "ordem-servico" || key === "os") {
      return perms.includes("ordem-servico") || perms.includes("os");
    }
    return perms.includes(key);
  };

  // Estados de métricas consolidadas
  const [loading, setLoading] = useState(true);
  const [metricasContas, setMetricasContas] = useState({
    total: 0,
    aReceberValor: 0,
    aReceberPendente: 0,
    aReceberPago: 0,
    aPagarValor: 0,
    aPagarPendente: 0,
    aPagarPago: 0,
    saldoProjetado: 0,
    saldoRealizado: 0,
  });

  const [metricasNotas, setMetricasNotas] = useState({
    total: 0,
    valorTotal: 0,
    ativas: 0,
    canceladas: 0,
  });

  const [metricasChamados, setMetricasChamados] = useState({
    total: 0,
    abertos: 0,
    andamento: 0,
    finalizados: 0,
    cancelados: 0,
  });

  const [metricasOS, setMetricasOS] = useState({
    total: 0,
    valorTotal: 0,
  });

  const [metricasSimulador, setMetricasSimulador] = useState({
    total: 0,
    valorTotal: 0,
  });

  // Estados do formulário de Feedback / Satisfação / Ideia
  const [categoriaFeedback, setCategoriaFeedback] = useState("ideia"); // 'elogio' | 'reclamacao' | 'ideia'
  const [estrelas, setEstrelas] = useState(5);
  const [nomeFeedback, setNomeFeedback] = useState(() => user?.name || user?.nome || "");
  const [contatoFeedback, setContatoFeedback] = useState(() => user?.email || "");
  const [tituloFeedback, setTituloFeedback] = useState("");
  const [mensagemFeedback, setMensagemFeedback] = useState("");
  const [enviandoFeedback, setEnviandoFeedback] = useState(false);
  const [historicoFeedbacks, setHistoricoFeedbacks] = useState([]);

  // Carrega todas as métricas em tempo real
  const carregarDadosDashboard = async () => {
    try {
      setLoading(true);

      // 1. Contas a Pagar / Receber
      const contas = (await sincronizarContasDoServidor()) || [];
      let recTotal = 0, recPend = 0, recPago = 0;
      let pagTotal = 0, pagPend = 0, pagPago = 0;

      contas.forEach((c) => {
        const val = Number(c.valor) || 0;
        const tipo = String(c.tipo || "").toLowerCase();
        const isPago = c.status === "Pago";

        if (tipo === "receber") {
          recTotal += val;
          if (isPago) recPago += val;
          else recPend += val;
        } else {
          pagTotal += val;
          if (isPago) pagPago += val;
          else pagPend += val;
        }
      });

      setMetricasContas({
        total: contas.length,
        aReceberValor: recTotal,
        aReceberPendente: recPend,
        aReceberPago: recPago,
        aPagarValor: pagTotal,
        aPagarPendente: pagPend,
        aPagarPago: pagPago,
        saldoProjetado: recTotal - pagTotal,
        saldoRealizado: recPago - pagPago,
      });

      // 2. Notas Fiscais
      const notas = listarNotas() || [];
      let somaNotas = 0;
      let notasAtivas = 0;
      let notasCanc = 0;

      notas.forEach((n) => {
        if (n.status === "Cancelada") {
          notasCanc++;
        } else {
          notasAtivas++;
          somaNotas += Number(n.valor) || 0;
        }
      });

      setMetricasNotas({
        total: notas.length,
        valorTotal: somaNotas,
        ativas: notasAtivas,
        canceladas: notasCanc,
      });

      // 3. Chamados / Atendimentos
      try {
        const rawChamados = localStorage.getItem("chamados_db");
        const chamados = rawChamados ? JSON.parse(rawChamados) : [];
        let ab = 0, and = 0, fin = 0, canc = 0;

        if (Array.isArray(chamados)) {
          chamados.forEach((ch) => {
            const st = String(ch.status || "").toLowerCase();
            if (st.includes("abert") || st.includes("novo") || st.includes("pend")) ab++;
            else if (st.includes("andament") || st.includes("execu")) and++;
            else if (st.includes("conclu") || st.includes("finaliz") || st.includes("resolv")) fin++;
            else if (st.includes("cancel")) canc++;
            else and++;
          });

          setMetricasChamados({
            total: chamados.length,
            abertos: ab,
            andamento: and,
            finalizados: fin,
            cancelados: canc,
          });
        }
      } catch (e) {
        console.warn("Aviso ao ler chamados:", e);
      }

      // 4. Ordens de Serviço (OS)
      try {
        const rawOS = localStorage.getItem("ordens");
        const ordens = rawOS ? JSON.parse(rawOS) : [];
        let somaOS = 0;
        if (Array.isArray(ordens)) {
          ordens.forEach((o) => {
            somaOS += Number(o.valorPagamento || o.custos || 0);
          });
          setMetricasOS({
            total: ordens.length,
            valorTotal: somaOS,
          });
        }
      } catch (e) {
        console.warn("Aviso ao ler OS:", e);
      }

      // 5. Simulações de Crédito
      try {
        const simulacoes = (await sincronizarSimulacoesDoServidor()) || [];
        let somaSim = 0;
        if (Array.isArray(simulacoes)) {
          simulacoes.forEach((s) => {
            somaSim += Number(s.valor || s.total || 0);
          });
          setMetricasSimulador({
            total: simulacoes.length,
            valorTotal: somaSim,
          });
        }
      } catch (e) {
        console.warn("Aviso ao ler simulações:", e);
      }

      // 6. Histórico de Feedbacks
      try {
        const rawFeed = localStorage.getItem(FEEDBACK_STORAGE_KEY);
        const feeds = rawFeed ? JSON.parse(rawFeed) : [];
        setHistoricoFeedbacks(Array.isArray(feeds) ? feeds : []);
      } catch (e) { }

    } catch (err) {
      console.error("Erro ao carregar métricas do dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarDadosDashboard();
  }, []);

  // Envio de Feedback / Ideia / Avaliação
  const handleEnviarFeedback = async (e) => {
    e.preventDefault();

    if (!mensagemFeedback.trim()) {
      toast.warn("Por favor, descreva sua mensagem, avaliação ou ideia.");
      return;
    }

    try {
      setEnviandoFeedback(true);

      const novoFeedback = {
        id: Date.now(),
        categoria: categoriaFeedback,
        estrelas: Number(estrelas),
        autor: nomeFeedback.trim() || "Usuário Anônimo",
        contato: contatoFeedback.trim() || "Não informado",
        titulo: tituloFeedback.trim() || `Avaliação do Sistema (${estrelas} estrelas)`,
        mensagem: mensagemFeedback.trim(),
        data: new Date().toISOString(),
      };

      // Salva no histórico local
      const listaAtualizada = [novoFeedback, ...historicoFeedbacks];
      setHistoricoFeedbacks(listaAtualizada);
      try {
        localStorage.setItem(FEEDBACK_STORAGE_KEY, JSON.stringify(listaAtualizada));
      } catch (e) { }

      // Mapeamento de categorias e emojis
      const catNomes = {
        elogio: "🌟 Elogio / Satisfação",
        reclamacao: "⚠️ Reclamação / Dificuldade",
        ideia: "💡 Nova Ideia / Sugestão de Melhoria",
      };

      const estrelasIcon = "⭐".repeat(estrelas);

      // Envia notificação estruturada para o Telegram
      await sendTelegramEvent({
        title: `Novo Feedback Recebido - ${catNomes[categoriaFeedback]}`,
        emoji: categoriaFeedback === "elogio" ? "🌟" : categoriaFeedback === "reclamacao" ? "⚠️" : "💡",
        screen: "Dashboard / Central de Ideias",
        lines: [
          `👤 Autor: ${novoFeedback.autor}`,
          `📞 Contato: ${novoFeedback.contato}`,
          `⭐ Avaliação: ${estrelasIcon} (${estrelas}/5)`,
          `📌 Título: ${novoFeedback.titulo}`,
          `📝 Mensagem: ${novoFeedback.mensagem}`,
          `🕒 Data: ${formatDateBR(novoFeedback.data)}`,
        ],
      });

      toast.success("✨ Muito obrigado! Sua avaliação/ideia foi enviada à equipe JSA com sucesso!");

      // Limpa formulário
      setTituloFeedback("");
      setMensagemFeedback("");
    } catch (error) {
      console.error("Erro ao enviar feedback:", error);
      toast.error("Erro ao processar envio do feedback.");
    } finally {
      setEnviandoFeedback(false);
    }
  };

  return (
    <div className="dashboard-page fade-in-page">
      {/* 1. SEÇÃO INSTITUCIONAL - JSA SOLUÇÕES TECNOLÓGICAS */}
      <div className="company-hero-card">
        <div className="company-hero-content">
          <div className="company-brand-info">
            <h1>
              <span>🚀</span> JSA Soluções Tecnológicas
            </h1>
            <p className="tagline">
              Gestão Financeira, Controle Fiscal, Telecomunicações & Soluções em Tecnologia da Informação
            </p>

            <div className="company-meta-chips">
              <div className="meta-chip">
                <span>📄</span> CNPJ: <strong>63.061.124/0001-05</strong>
              </div>
              <div className="meta-chip">
                <span>📱</span> WhatsApp: <strong>(65) 98402-7342</strong>
              </div>
              <div className="meta-chip">
                <span>✉️</span> Email: <strong>jsa.tech.jsa@gmail.com</strong>
              </div>
              <div className="meta-chip">
                <span>📍</span> Endereço: <strong>Rua Benedito Pereira de Oliveira, 3879-W - Jd. Monte Líbano</strong>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "10px" }}>
            <div
              className={`company-status-badge ${systemStatus.emManutencao ? "maintenance" : "online"}`}
              style={isAdmin ? { cursor: "pointer" } : undefined}
              onClick={isAdmin ? () => setModalStatusAberto(true) : undefined}
              title={isAdmin ? "Clique para gerenciar status de manutenção do sistema" : undefined}
            >
              <div className={`pulse-dot ${systemStatus.emManutencao ? "maintenance" : "online"}`}></div>
              <span>
                {systemStatus.emManutencao
                  ? (isManutencaoGeral(systemStatus)
                    ? "⚠️ Sistema em Manutenção em Múltiplas Telas!"
                    : `⚠️ Manutenção: ${systemStatus.tela || "Ajuste em Andamento"}`)
                  : "Sistema Operacional e Online"}
              </span>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setModalStatusAberto(true)}
                  className="btn btn-secondary"
                  style={{
                    fontSize: "0.85rem",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    cursor: "pointer",
                    background: systemStatus.emManutencao ? "rgba(245, 158, 11, 0.2)" : undefined,
                    borderColor: systemStatus.emManutencao ? "#f59e0b" : undefined,
                    color: systemStatus.emManutencao ? "#fef08a" : undefined,
                  }}
                  title="Gerenciar status de manutenção das telas"
                >
                  ⚙️ Status do Sistema
                </button>
              )}
              <button
                onClick={carregarDadosDashboard}
                className="btn btn-secondary"
                style={{
                  fontSize: "0.85rem",
                  padding: "6px 14px",
                  borderRadius: "8px",
                  cursor: "pointer",
                }}
                title="Atualizar indicadores agora"
              >
                🔄 Atualizar Dados
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Banner Informativo de Manutenção Ativa para todos os usuários */}
      {systemStatus.emManutencao && (
        <div className="dashboard-maintenance-banner">
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ fontSize: "24px" }}>🛠️</span>
            <div>
              <strong style={{ fontSize: "14px", color: "#fef08a", display: "block" }}>
                ⚠️ {isManutencaoGeral(systemStatus) ? "Sistema em Manutenção em Múltiplas Telas!" : `${systemStatus.tela || "Tela do Sistema"} Em Manutenção...`}
              </strong>
              <span style={{ fontSize: "12.5px", color: "#fef9c3" }}>
                {systemStatus.mensagem
                  ? systemStatus.mensagem
                  : isManutencaoGeral(systemStatus)
                    ? "O sistema está temporariamente bloqueado para todos os usuários comuns devido a manutenção geral (inclusive login). O acesso será liberado automaticamente assim que retornar ao status Operacional & Online."
                    : `A tela "${systemStatus.tela || 'selecionada'}" está temporariamente bloqueada para os usuários para ajustes técnicos. O acesso será liberado automaticamente em tempo real assim que o sistema retornar ao status Operacional & Online.`}
              </span>
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              onClick={() => setModalStatusAberto(true)}
              style={{
                background: "rgba(0, 0, 0, 0.3)",
                border: "1px solid #f59e0b",
                color: "#fef08a",
                padding: "5px 12px",
                borderRadius: "6px",
                fontSize: "12px",
                fontWeight: 700,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              ⚙️ Liberar / Alterar Status
            </button>
          )}
        </div>
      )}

      {/* 2. PAINÉIS DE MÉTRICAS / KPIS DO SISTEMA */}
      {(canAccess("contas") || canAccess("notas") || canAccess("simulador")) && (
        <>
          <h2 className="dashboard-section-title">
            <span>📊</span> Indicadores Gerais do Sistema
          </h2>

          <div className="kpi-grid">
            {/* KPI: A RECEBER */}
            {canAccess("contas") && (
              <div className="kpi-card">
                <div>
                  <div className="kpi-header">
                    <span className="kpi-title">Contas A Receber</span>
                    <div className="kpi-icon-box green">💰</div>
                  </div>
                  <div className="kpi-value" style={{ color: "#34d399" }}>
                    {formatCurrencyBRL(metricasContas.aReceberValor)}
                  </div>
                  <div className="kpi-subtext">
                    <span>{metricasContas.total} contas cadastradas no total</span>
                  </div>
                </div>

                <div className="kpi-details-list">
                  <div className="kpi-detail-item">
                    <span>Recebido (Baixado):</span>
                    <strong style={{ color: "#34d399" }}>{formatCurrencyBRL(metricasContas.aReceberPago)}</strong>
                  </div>
                  <div className="kpi-detail-item">
                    <span>Pendente a Receber:</span>
                    <strong style={{ color: "#fbbf24" }}>{formatCurrencyBRL(metricasContas.aReceberPendente)}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* KPI: A PAGAR */}
            {canAccess("contas") && (
              <div className="kpi-card">
                <div>
                  <div className="kpi-header">
                    <span className="kpi-title">Contas A Pagar</span>
                    <div className="kpi-icon-box red">💳</div>
                  </div>
                  <div className="kpi-value" style={{ color: "#f87171" }}>
                    {formatCurrencyBRL(metricasContas.aPagarValor)}
                  </div>
                  <div className="kpi-subtext">
                    <span>Compromissos e despesas financeiras</span>
                  </div>
                </div>

                <div className="kpi-details-list">
                  <div className="kpi-detail-item">
                    <span>Total Pago:</span>
                    <strong style={{ color: "#94a3b8" }}>{formatCurrencyBRL(metricasContas.aPagarPago)}</strong>
                  </div>
                  <div className="kpi-detail-item">
                    <span>Pendente de Pagamento:</span>
                    <strong style={{ color: "#f87171" }}>{formatCurrencyBRL(metricasContas.aPagarPendente)}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* KPI: NOTAS FISCAIS */}
            {canAccess("notas") && (
              <div className="kpi-card">
                <div>
                  <div className="kpi-header">
                    <span className="kpi-title">Notas Fiscais (NF-e)</span>
                    <div className="kpi-icon-box blue">📄</div>
                  </div>
                  <div className="kpi-value" style={{ color: "#60a5fa" }}>
                    {metricasNotas.total} <small style={{ fontSize: "1rem", color: "#94a3b8" }}>notas</small>
                  </div>
                  <div className="kpi-subtext">
                    <span>Montante: {formatCurrencyBRL(metricasNotas.valorTotal)}</span>
                  </div>
                </div>

                <div className="kpi-details-list">
                  <div className="kpi-detail-item">
                    <span>Notas Ativas / Emitidas:</span>
                    <strong style={{ color: "#60a5fa" }}>{metricasNotas.ativas}</strong>
                  </div>
                  <div className="kpi-detail-item">
                    <span>Canceladas:</span>
                    <strong style={{ color: "#94a3b8" }}>{metricasNotas.canceladas}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* KPI: SIMULAÇÕES DE CRÉDITO */}
            {canAccess("simulador") && (
              <div className="kpi-card">
                <div>
                  <div className="kpi-header">
                    <span className="kpi-title">Simulações de Crédito</span>
                    <div className="kpi-icon-box amber">📈</div>
                  </div>
                  <div className="kpi-value" style={{ color: "#fbbf24" }}>
                    {metricasSimulador.total} <small style={{ fontSize: "1rem", color: "#94a3b8" }}>propostas</small>
                  </div>
                  <div className="kpi-subtext">
                    <span>Volume: {formatCurrencyBRL(metricasSimulador.valorTotal)}</span>
                  </div>
                </div>

                <div className="kpi-details-list">
                  <div className="kpi-detail-item">
                    <span>Média por Simulação:</span>
                    <strong>
                      {metricasSimulador.total > 0
                        ? formatCurrencyBRL(metricasSimulador.valorTotal / metricasSimulador.total)
                        : "R$ 0,00"}
                    </strong>
                  </div>
                  <div className="kpi-detail-item">
                    <span>Status do Simulador:</span>
                    <strong style={{ color: "#34d399" }}>Ativo</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* 3. PAINEL DE ATENDIMENTOS E ORDENS DE SERVIÇO */}
      <h2 className="dashboard-section-title">
        <span>{canAccess("ordem-servico") ? "🛠️" : "🎧"}</span>{" "}
        {canAccess("ordem-servico")
          ? "Atendimentos, Chamados & Ordens de Serviço"
          : "Central de Atendimentos & Chamados"}
      </h2>

      <div className="kpi-grid">
        {/* Resumo de Chamados */}
        <div
          className="kpi-card"
          style={{ gridColumn: canAccess("ordem-servico") ? "span 2" : "1 / -1" }}
        >
          <div className="kpi-header">
            <div>
              <span className="kpi-title">Central de Chamados de Suporte</span>
              <div style={{ fontSize: "1.4rem", fontWeight: "800", color: "#fff", marginTop: "4px" }}>
                {metricasChamados.total} chamados registrados
              </div>
            </div>
            <div className="kpi-icon-box purple">🎧</div>
          </div>

          <div className="chamados-status-bar-grid">
            <div className="status-mini-card aberto">
              <span className="count">{metricasChamados.abertos}</span>
              <span className="label">Abertos</span>
            </div>
            <div className="status-mini-card andamento">
              <span className="count">{metricasChamados.andamento}</span>
              <span className="label">Em Andamento</span>
            </div>
            <div className="status-mini-card finalizado">
              <span className="count">{metricasChamados.finalizados}</span>
              <span className="label">Finalizados</span>
            </div>
            <div className="status-mini-card cancelado">
              <span className="count">{metricasChamados.cancelados}</span>
              <span className="label">Cancelados</span>
            </div>
          </div>
        </div>

        {/* Resumo de OS */}
        {canAccess("ordem-servico") && (
          <div className="kpi-card">
            <div>
              <div className="kpi-header">
                <span className="kpi-title">Ordens de Serviço (O.S)</span>
                <div className="kpi-icon-box blue">📋</div>
              </div>
              <div className="kpi-value" style={{ color: "#38bdf8" }}>
                {metricasOS.total} <small style={{ fontSize: "1rem", color: "#94a3b8" }}>emitidas</small>
              </div>
              <div className="kpi-subtext">
                <span>Valor Total O.S: {formatCurrencyBRL(metricasOS.valorTotal)}</span>
              </div>
            </div>

            <div className="kpi-details-list">
              <div className="kpi-detail-item">
                <span>Integração Técnica:</span>
                <strong style={{ color: "#34d399" }}>Ativa</strong>
              </div>
              <div className="kpi-detail-item">
                <span>Média de Valores:</span>
                <strong>
                  {metricasOS.total > 0
                    ? formatCurrencyBRL(metricasOS.valorTotal / metricasOS.total)
                    : "R$ 0,00"}
                </strong>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. CENTRAL DE SATISFAÇÃO, RECLAMAÇÕES & NOVAS IDEIAS */}
      <div className="feedback-hub-card">
        <div className="feedback-header">
          <h2>
            <span>💬</span> Central de Satisfação, Reclamações & Novas Ideias
          </h2>
          <p>
            Sua opinião é fundamental para a constante evolução do sistema. Avalie nossa plataforma, exponha uma dificuldade ou sugira novas ferramentas!
          </p>
        </div>

        <form onSubmit={handleEnviarFeedback}>
          {/* Seletor de Categoria */}
          <div className="category-selector">
            <button
              type="button"
              className={`category-btn ${categoriaFeedback === "elogio" ? "active elogio" : ""}`}
              onClick={() => setCategoriaFeedback("elogio")}
            >
              <span>🌟</span> Elogio / Satisfação
            </button>
            <button
              type="button"
              className={`category-btn ${categoriaFeedback === "reclamacao" ? "active reclamacao" : ""}`}
              onClick={() => setCategoriaFeedback("reclamacao")}
            >
              <span>⚠️</span> Reclamação / Dificuldade
            </button>
            <button
              type="button"
              className={`category-btn ${categoriaFeedback === "ideia" ? "active ideia" : ""}`}
              onClick={() => setCategoriaFeedback("ideia")}
            >
              <span>💡</span> Nova Ideia / Sugestão
            </button>
          </div>

          {/* Avaliação em Estrelas */}
          <div style={{ marginBottom: "16px" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: "600", color: "#cbd5e1", marginBottom: "6px" }}>
              Qual o seu nível de satisfação com o sistema?
            </label>
            <div className="star-rating-box">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className={`star-btn ${star <= estrelas ? "active" : ""}`}
                  onClick={() => setEstrelas(star)}
                  title={`${star} estrela(s)`}
                >
                  ★
                </button>
              ))}
              <span style={{ fontSize: "0.9rem", color: "#94a3b8", marginLeft: "10px", fontWeight: "600" }}>
                {estrelas === 5 ? "Excelente! 🚀" : estrelas === 4 ? "Muito Bom! 👍" : estrelas === 3 ? "Regular 😐" : estrelas === 2 ? "Insatisfeito 😕" : "Crítico / Precisa de Melhorias 🚨"}
              </span>
            </div>
          </div>

          <div className="feedback-form-grid">
            <div>
              <div className="form-group">
                <label>Seu Nome ou Empresa:</label>
                <input
                  type="text"
                  className="form-input-dark"
                  placeholder="Nome do solicitante / usuário..."
                  value={nomeFeedback}
                  onChange={(e) => setNomeFeedback(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Email ou WhatsApp de Contato:</label>
                <input
                  type="text"
                  className="form-input-dark"
                  placeholder="Email ou WhatsApp para retorno..."
                  value={contatoFeedback}
                  onChange={(e) => setContatoFeedback(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Título ou Assunto:</label>
                <input
                  type="text"
                  className="form-input-dark"
                  placeholder="Ex.: Sugestão de novo filtro, Elogio ao módulo de notas..."
                  value={tituloFeedback}
                  onChange={(e) => setTituloFeedback(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="form-group" style={{ height: "100%" }}>
                <label>Descreva sua Avaliação, Dificuldade ou Nova Ideia de Melhoria:</label>
                <textarea
                  className="form-input-dark"
                  rows="6"
                  style={{ height: "calc(100% - 30px)", resize: "none" }}
                  placeholder="Conte-nos em detalhes como podemos melhorar ou qual funcionalidade você gostaria de ver implementada..."
                  value={mensagemFeedback}
                  onChange={(e) => setMensagemFeedback(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          <div style={{ marginTop: "18px", display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              className="btn-send-feedback"
              disabled={enviandoFeedback}
            >
              <span>{enviandoFeedback ? "⏳ Enviando..." : "🚀 Enviar Avaliação / Sugestão"}</span>
            </button>
          </div>
        </form>

        {/* Histórico Recente de Feedbacks Enviados */}
        {historicoFeedbacks.length > 0 && (
          <div style={{ marginTop: "28px", paddingTop: "20px", borderTop: "1px solid #2d2d42" }}>
            <h3 style={{ fontSize: "1rem", color: "#cbd5e1", margin: "0 0 12px 0", fontWeight: 700 }}>
              📜 Suas Contribuições & Feedbacks Recentes ({historicoFeedbacks.length})
            </h3>
            <div className="recent-feedbacks-list">
              {historicoFeedbacks.slice(0, 5).map((fb) => (
                <div key={fb.id} className="feedback-card-mini">
                  <div className="feedback-card-top">
                    <span style={{ fontWeight: 700, color: fb.categoria === "elogio" ? "#34d399" : fb.categoria === "reclamacao" ? "#f87171" : "#c084fc" }}>
                      {fb.categoria === "elogio" ? "🌟 Elogio" : fb.categoria === "reclamacao" ? "⚠️ Reclamação" : "💡 Nova Ideia"} • {"⭐".repeat(fb.estrelas || 5)}
                    </span>
                    <span style={{ color: "#64748b", fontSize: "0.75rem" }}>
                      {formatDateBR(fb.data)}
                    </span>
                  </div>
                  {fb.titulo && (
                    <div style={{ fontWeight: 600, color: "#fff", fontSize: "0.88rem" }}>
                      {fb.titulo}
                    </div>
                  )}
                  <div className="feedback-card-body">
                    {fb.mensagem}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Gerenciamento de Status & Manutenção para Administradores */}
      <ModalStatusManutencao
        isOpen={modalStatusAberto}
        onClose={() => setModalStatusAberto(false)}
        currentStatus={systemStatus}
        onStatusChanged={(novo) => setSystemStatus(novo)}
      />
    </div>
  );
}
