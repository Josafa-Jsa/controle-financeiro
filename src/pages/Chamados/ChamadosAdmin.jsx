// src/pages/Chamados/ChamadosAdmin.jsx
import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import emailjs from "@emailjs/browser";
import { getUser, isAdmin } from "../../auth/auth";
import { api } from "../../api/client";
import { sendTelegramEvent } from "../../utils/telegram";
import { logEvent } from "../../utils/logger";
import ModalSecao from "../../components/Modais/ModalSecao";
import ChamadosClient from "./ChamadosClient";
import "../../components/Visual/chamados.css";

const EMAILJS_SERVICE_ID = "jsasolucoestecnologicas";
const EMAILJS_TEMPLATE_ID = "template_qra8gli";
const EMAILJS_PUBLIC_KEY = "YUEhSf74n7z0_XT30";

export default function ChamadosAdmin() {
  const user = getUser() || {};

  const isUserAdmin =
    (typeof isAdmin === "function" && isAdmin()) ||
    (user?.email || "").toLowerCase().includes("admin") ||
    user?.email === "jsa@jsa.com" ||
    user?.email === "jsa.admin@gmail.com" ||
    user?.role === "admin" ||
    user?.isAdmin === true;

  if (!isUserAdmin) {
    return <ChamadosClient />;
  }

  // Estados principais
  const [todosChamados, setTodosChamados] = useState([]);
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [buscaTexto, setBuscaTexto] = useState("");
  const [loading, setLoading] = useState(false);

  // Modal de Detalhes do Chamado Selecionado ("Ver Chamado")
  const [chamadoSelecionado, setChamadoSelecionado] = useState(null);
  const [modalDetalhesAberto, setModalDetalhesAberto] = useState(false);
  const [procedimentoExecutado, setProcedimentoExecutado] = useState("");
  const [respostaTexto, setRespostaTexto] = useState("");

  // Modal Secao do Sistema para Cancelamento
  const [modalCancelamentoAberto, setModalCancelamentoAberto] = useState(false);
  const [chamadoParaCancelar, setChamadoParaCancelar] = useState(null);
  const [dadosModalCancelamento, setDadosModalCancelamento] = useState({ motivo: "" });

  useEffect(() => {
    carregarChamados();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && modalDetalhesAberto) {
        handleFecharDetalhes();
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [modalDetalhesAberto]);

  const carregarChamados = async () => {
    try {
      const resp = await api.get("/chamados");
      if (Array.isArray(resp.data)) {
        setTodosChamados(resp.data);
        localStorage.setItem("chamados_db", JSON.stringify(resp.data));
        return;
      }
    } catch (e) {
      console.warn("Aviso ao carregar chamados via API:", e.message);
    }

    try {
      const data = JSON.parse(localStorage.getItem("chamados_db") || "[]");
      setTodosChamados(Array.isArray(data) ? data : []);
    } catch {
      setTodosChamados([]);
    }
  };

  const salvarChamados = (novos, modificadoId, modificadoObj) => {
    setTodosChamados(novos);
    localStorage.setItem("chamados_db", JSON.stringify(novos));

    if (modificadoId && modificadoObj) {
      api.put(`/chamados/${modificadoId}`, modificadoObj).catch((e) =>
        console.warn("Aviso ao persistir atualização do chamado via API:", e.message)
      );
    }
  };

  // KPIs / Contadores
  const contadores = useMemo(() => {
    const total = todosChamados.length;
    const abertos = todosChamados.filter((c) => c.status === "Aberto").length;
    const emAtendimento = todosChamados.filter((c) => c.status === "Em Atendimento").length;
    const resolvidos = todosChamados.filter((c) => c.status === "Resolvido").length;
    const cancelados = todosChamados.filter((c) => c.status === "Cancelado").length;
    return { total, abertos, emAtendimento, resolvidos, cancelados };
  }, [todosChamados]);

  // Lista filtrada
  const chamadosFiltrados = useMemo(() => {
    let resultado = [...todosChamados];

    if (filtroStatus !== "Todos") {
      resultado = resultado.filter((c) => c.status === filtroStatus);
    }

    if (filtroCategoria !== "Todas") {
      resultado = resultado.filter((c) => c.categoria === filtroCategoria);
    }

    if (buscaTexto.trim()) {
      const termo = buscaTexto.toLowerCase();
      resultado = resultado.filter(
        (c) =>
          String(c.id || "").toLowerCase().includes(termo) ||
          String(c.assunto || "").toLowerCase().includes(termo) ||
          String(c.descricao || "").toLowerCase().includes(termo) ||
          (c.clienteNome && c.clienteNome.toLowerCase().includes(termo)) ||
          (c.clienteEmail && c.clienteEmail.toLowerCase().includes(termo)) ||
          (c.whatsapp && c.whatsapp.toLowerCase().includes(termo)) ||
          (c.motivoCancelamento && c.motivoCancelamento.toLowerCase().includes(termo)) ||
          (c.procedimentoExecutado && c.procedimentoExecutado.toLowerCase().includes(termo))
      );
    }

    return resultado;
  }, [todosChamados, filtroStatus, filtroCategoria, buscaTexto]);

  // Envio de E-mail via EmailJS
  const enviarEmailCliente = async ({ chamado, novoStatus, mensagemCorpo }) => {
    if (!chamado?.clienteEmail) return;

    try {
      const templateParams = {
        to_email: chamado.clienteEmail,
        email: chamado.clienteEmail,
        user_name: chamado.clienteNome || "Cliente",
        protocolo: chamado.id,
        status: novoStatus,
        assunto: chamado.assunto,
        message: mensagemCorpo,
      };

      await emailjs.send(
        EMAILJS_SERVICE_ID,
        EMAILJS_TEMPLATE_ID,
        templateParams,
        EMAILJS_PUBLIC_KEY
      );

      toast.success(`E-mail de notificação enviado para ${chamado.clienteEmail}`);
    } catch (err) {
      console.error("[ChamadosAdmin] Erro ao enviar e-mail via EmailJS:", err);
      toast.warn("Não foi possível enviar o e-mail automático.");
    }
  };

  // Abrir Modal de Detalhes
  const handleAbrirDetalhes = (chamado) => {
    setChamadoSelecionado(chamado);
    setProcedimentoExecutado(chamado.procedimentoExecutado || "");
    setRespostaTexto("");
    setModalDetalhesAberto(true);
  };

  const handleFecharDetalhes = () => {
    setModalDetalhesAberto(false);
    setChamadoSelecionado(null);
    setProcedimentoExecutado("");
    setRespostaTexto("");
  };

  // Atualizar chamado selecionado ativo
  const atualizarChamadoAtivo = (idAlvo, dadosAtualizados) => {
    const novos = todosChamados.map((item) =>
      item.id === idAlvo ? { ...item, ...dadosAtualizados } : item
    );
    salvarChamados(novos);

    if (chamadoSelecionado && chamadoSelecionado.id === idAlvo) {
      setChamadoSelecionado((prev) => ({ ...prev, ...dadosAtualizados }));
    }
  };

  // 1. FINALIZAR CHAMADO (EXIGE PROCEDIMENTO EXECUTADO)
  const handleFinalizarChamado = async (chamado) => {
    if (!chamado) return;

    const procTrim = String(procedimentoExecutado || "").trim();
    if (!procTrim) {
      toast.warn("Por favor, descreva o procedimento executado para finalizar o chamado.");
      return;
    }

    setLoading(true);
    const nomeAdmin = user.name || user.nome || user.displayName || "Equipe de Suporte JSA";
    const dataHora = new Date().toLocaleString("pt-BR");

    try {
      const historico = chamado.respostas || [];
      const novaResposta = {
        autor: nomeAdmin,
        mensagem: `✅ CHAMADO FINALIZADO / RESOLVIDO\nProcedimento Executado: ${procTrim}`,
        data: dataHora,
      };

      const dadosUpdate = {
        status: "Resolvido",
        procedimentoExecutado: procTrim,
        dataFinalizacao: dataHora,
        tecnicoResponsavel: nomeAdmin,
        respostas: [...historico, novaResposta],
      };

      atualizarChamadoAtivo(chamado.id, dadosUpdate);

      // Notificação por E-mail ao cliente
      const corpoEmail =
        `ATUALIZAÇÃO DO CHAMADO #${chamado.id}\n` +
        `----------------------------------------\n` +
        `Status: RESOLVIDO / CONCLUÍDO\n` +
        `Assunto: ${chamado.assunto}\n` +
        `Data da Conclusão: ${dataHora}\n` +
        `Técnico Responsável: ${nomeAdmin}\n\n` +
        `PROCEDIMENTO EXECUTADO PELA EQUIPE:\n` +
        `${procTrim}\n\n` +
        `Seu chamado foi finalizado com sucesso! Agradecemos pela confiança, JSA Soluções Tecnológicas.`;

      await enviarEmailCliente({
        chamado,
        novoStatus: "Resolvido",
        mensagemCorpo: corpoEmail,
      });

      // Notificação ao Telegram
      try {
        await sendTelegramEvent({
          title: "Chamado Finalizado",
          emoji: "✅",
          lines: [
            `Protocolo: #${chamado.id}`,
            `Cliente: ${chamado.clienteNome || "Cliente"} (${chamado.clienteEmail || "-"})`,
            `WhatsApp: ${chamado.whatsapp || "Não informado"}`,
            `Categoria: ${chamado.categoria || "Geral"}`,
            `Assunto: ${chamado.assunto}`,
            `Status: Resolvido`,
            `Técnico Responsável: ${nomeAdmin}`,
            `Procedimento Executado: ${procTrim}`,
            `Data da Conclusão: ${dataHora}`,
          ],
        });
      } catch (tgErr) {
        console.error("[Telegram] Erro ao notificar finalização:", tgErr);
      }

      // Log do sistema
      try {
        logEvent({
          type: "chamados",
          title: "Chamado Finalizado",
          user,
          details: {
            protocolo: chamado.id,
            cliente: chamado.clienteNome,
            procedimento: procTrim,
          },
        });
      } catch (logErr) {
        console.error(logErr);
      }

      toast.success(`Chamado #${chamado.id} finalizado com sucesso!`);
    } catch (err) {
      console.error("[ChamadosAdmin] Erro ao finalizar:", err);
      toast.error("Erro ao finalizar o chamado.");
    } finally {
      setLoading(false);
    }
  };

  // 2. CANCELAR CHAMADO COM MODAL DO SISTEMA (MODALSECAO)
  const handleAbrirModalCancelamento = (chamado) => {
    setChamadoParaCancelar(chamado);
    setDadosModalCancelamento({ motivo: "" });
    setModalCancelamentoAberto(true);
  };

  const handleFecharModalCancelamento = () => {
    setModalCancelamentoAberto(false);
    setChamadoParaCancelar(null);
    setDadosModalCancelamento({ motivo: "" });
  };

  const handleConfirmarCancelamento = async () => {
    if (!chamadoParaCancelar) return;

    const motivoTrim = String(dadosModalCancelamento.motivo || "").trim();
    if (!motivoTrim) {
      toast.warn("Por favor, informe o motivo do cancelamento.");
      return;
    }

    setLoading(true);
    const nomeAdmin = user.name || user.nome || user.displayName || "Administração JSA";
    const dataHora = new Date().toLocaleString("pt-BR");
    const chamado = chamadoParaCancelar;

    try {
      const historico = chamado.respostas || [];
      const novaResposta = {
        autor: `Administração (${nomeAdmin})`,
        mensagem: `🚫 CHAMADO CANCELADO\nMotivo: ${motivoTrim}`,
        data: dataHora,
      };

      const dadosUpdate = {
        status: "Cancelado",
        motivoCancelamento: motivoTrim,
        dataCancelamento: dataHora,
        canceladoPor: nomeAdmin,
        respostas: [...historico, novaResposta],
      };

      atualizarChamadoAtivo(chamado.id, dadosUpdate);

      // Notificação por E-mail ao cliente
      const corpoEmail =
        `ATUALIZAÇÃO DO CHAMADO #${chamado.id}\n` +
        `----------------------------------------\n` +
        `Status: CANCELADO\n` +
        `Assunto: ${chamado.assunto}\n` +
        `Data do Cancelamento: ${dataHora}\n` +
        `Responsável: ${nomeAdmin}\n\n` +
        `MOTIVO DO CANCELAMENTO:\n` +
        `${motivoTrim}\n\n` +
        `Caso você ainda precise de suporte, por favor abra uma nova solicitação ou entre em contato com nossa equipe.`;

      await enviarEmailCliente({
        chamado,
        novoStatus: "Cancelado",
        mensagemCorpo: corpoEmail,
      });

      // Notificação ao Telegram
      try {
        await sendTelegramEvent({
          title: "Chamado Cancelado pela Administração",
          emoji: "🚫",
          lines: [
            `Protocolo: #${chamado.id}`,
            `Cliente: ${chamado.clienteNome || "Cliente"} (${chamado.clienteEmail || "-"})`,
            `WhatsApp: ${chamado.whatsapp || "Não informado"}`,
            `Categoria: ${chamado.categoria || "Geral"}`,
            `Assunto: ${chamado.assunto}`,
            `Status: Cancelado`,
            `Cancelado por: ${nomeAdmin}`,
            `Motivo do Cancelamento: ${motivoTrim}`,
            `Data do Cancelamento: ${dataHora}`,
          ],
        });
      } catch (tgErr) {
        console.error("[Telegram] Erro ao notificar cancelamento:", tgErr);
      }

      // Log do sistema
      try {
        logEvent({
          type: "chamados",
          title: "Chamado Cancelado pela Administração",
          user,
          details: {
            protocolo: chamado.id,
            cliente: chamado.clienteNome,
            motivo: motivoTrim,
          },
        });
      } catch (logErr) {
        console.error(logErr);
      }

      toast.info(`O chamado #${chamado.id} foi cancelado.`);
      handleFecharModalCancelamento();
    } catch (err) {
      console.error("[ChamadosAdmin] Erro ao cancelar:", err);
      toast.error("Erro ao cancelar o chamado.");
    } finally {
      setLoading(false);
    }
  };

  // 3. MUDAR PARA "EM ATENDIMENTO"
  const handleMudarParaAtendimento = async (chamado) => {
    if (!chamado) return;

    const nomeAdmin = user.name || user.nome || user.displayName || "Suporte JSA";
    const dataHora = new Date().toLocaleString("pt-BR");
    const historico = chamado.respostas || [];

    const novaResposta = {
      autor: nomeAdmin,
      mensagem: `Status alterado para Em Atendimento por ${nomeAdmin}.`,
      data: dataHora,
    };

    const dadosUpdate = {
      status: "Em Atendimento",
      respostas: [...historico, novaResposta],
    };

    atualizarChamadoAtivo(chamado.id, dadosUpdate);

    // E-mail informativo
    const corpoEmail =
      `ATUALIZAÇÃO DO CHAMADO #${chamado.id}\n` +
      `----------------------------------------\n` +
      `Status Atual: EM ATENDIMENTO\n` +
      `Assunto: ${chamado.assunto}\n` +
      `Atendente: ${nomeAdmin}\n` +
      `Data: ${dataHora}\n\n` +
      `Nossa equipe iniciou o atendimento técnico do seu chamado. Em breve você receberá novas informações!`;

    await enviarEmailCliente({
      chamado,
      novoStatus: "Em Atendimento",
      mensagemCorpo: corpoEmail,
    });

    // Telegram
    try {
      await sendTelegramEvent({
        title: "Chamado Em Atendimento",
        emoji: "🟡",
        lines: [
          `Protocolo: #${chamado.id}`,
          `Cliente: ${chamado.clienteNome || "Cliente"} (${chamado.clienteEmail || "-"})`,
          `Status: Em Atendimento`,
          `Atendente: ${nomeAdmin}`,
          `Data/Hora: ${dataHora}`,
        ],
      });
    } catch (tgErr) {
      console.error(tgErr);
    }

    toast.info(`Chamado #${chamado.id} colocado em atendimento.`);
  };

  // 4. ENVIAR RESPOSTA / ATUALIZAÇÃO NO HISTÓRICO
  const handleEnviarRespostaModal = async () => {
    if (!chamadoSelecionado) return;

    const texto = respostaTexto.trim();
    if (!texto) {
      toast.warn("Digite uma mensagem de resposta antes de enviar.");
      return;
    }

    setLoading(true);
    const nomeAdmin = user.name || user.nome || user.displayName || "Atendimento JSA";
    const dataHora = new Date().toLocaleString("pt-BR");
    const historico = chamadoSelecionado.respostas || [];

    const novaResposta = {
      autor: nomeAdmin,
      mensagem: texto,
      data: dataHora,
    };

    const novoStatus =
      chamadoSelecionado.status === "Aberto" ? "Em Atendimento" : chamadoSelecionado.status;

    const dadosUpdate = {
      status: novoStatus,
      respostas: [...historico, novaResposta],
    };

    atualizarChamadoAtivo(chamadoSelecionado.id, dadosUpdate);
    setRespostaTexto("");

    // Enviar E-mail
    const corpoEmail =
      `ATUALIZAÇÃO DO CHAMADO #${chamadoSelecionado.id}\n` +
      `----------------------------------------\n` +
      `Status: ${novoStatus}\n` +
      `Assunto: ${chamadoSelecionado.assunto}\n` +
      `Data: ${dataHora}\n\n` +
      `MENSAGEM DO ATENDENTE (${nomeAdmin}):\n` +
      `${texto}\n\n` +
      `JSA Soluções Tecnológicas`;

    await enviarEmailCliente({
      chamado: chamadoSelecionado,
      novoStatus,
      mensagemCorpo: corpoEmail,
    });

    // Enviar Telegram
    try {
      await sendTelegramEvent({
        title: "Resposta em Chamado",
        emoji: "💬",
        lines: [
          `Protocolo: #${chamadoSelecionado.id}`,
          `Cliente: ${chamadoSelecionado.clienteNome || "Cliente"} (${chamadoSelecionado.clienteEmail || "-"})`,
          `Atendente: ${nomeAdmin}`,
          `Resposta: ${texto}`,
          `Data: ${dataHora}`,
        ],
      });
    } catch (tgErr) {
      console.error(tgErr);
    }

    toast.success("Resposta enviada e registrada com sucesso!");
    setLoading(false);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Aberto":
        return <span className="chamados-admin-status-badge chamados-admin-status-aberto">🔴 Aberto</span>;
      case "Em Atendimento":
        return <span className="chamados-admin-status-badge chamados-admin-status-atendimento">🟡 Em Atendimento</span>;
      case "Resolvido":
        return <span className="chamados-admin-status-badge chamados-admin-status-resolvido">🟢 Resolvido</span>;
      case "Cancelado":
        return <span className="chamados-admin-status-badge chamados-admin-status-cancelado">⚫ Cancelado</span>;
      default:
        return <span className="chamados-admin-status-badge chamados-admin-status-cancelado">{status}</span>;
    }
  };

  const getCardStatusBorderClass = (status) => {
    switch (status) {
      case "Aberto":
        return "status-border-aberto";
      case "Em Atendimento":
        return "status-border-atendimento";
      case "Resolvido":
        return "status-border-resolvido";
      case "Cancelado":
        return "status-border-cancelado";
      default:
        return "";
    }
  };

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const limparFiltros = () => {
    setFiltroStatus("Todos");
    setFiltroCategoria("Todas");
    setBuscaTexto("");
  };

  return (
    <div className="chamados-admin-container fade-in-page">
      <div className="chamados-admin-header-row">
        <h2 className="chamados-admin-title">
          <span>🎧</span> Central de Atendimento (Gestão de Chamados dos Usuários)
        </h2>
      </div>

      {/* KPI / Contadores Resumo */}
      <div className="chamados-admin-kpi-grid">
        <div
          className={`chamados-admin-kpi-card kpi-total ${filtroStatus === "Todos" ? "active" : ""}`}
          onClick={() => setFiltroStatus("Todos")}
          title="Filtrar todos os chamados"
        >
          <div className="chamados-admin-kpi-info">
            <span className="chamados-admin-kpi-label">Total de Chamados</span>
            <span className="chamados-admin-kpi-value">{contadores.total}</span>
          </div>
          <div className="chamados-admin-kpi-icon">📊</div>
        </div>

        <div
          className={`chamados-admin-kpi-card kpi-aberto ${filtroStatus === "Aberto" ? "active" : ""}`}
          onClick={() => setFiltroStatus("Aberto")}
          title="Filtrar chamados abertos"
        >
          <div className="chamados-admin-kpi-info">
            <span className="chamados-admin-kpi-label">Abertos</span>
            <span className="chamados-admin-kpi-value">{contadores.abertos}</span>
          </div>
          <div className="chamados-admin-kpi-icon">🔴</div>
        </div>

        <div
          className={`chamados-admin-kpi-card kpi-atendimento ${filtroStatus === "Em Atendimento" ? "active" : ""}`}
          onClick={() => setFiltroStatus("Em Atendimento")}
          title="Filtrar chamados em atendimento"
        >
          <div className="chamados-admin-kpi-info">
            <span className="chamados-admin-kpi-label">Em Atendimento</span>
            <span className="chamados-admin-kpi-value">{contadores.emAtendimento}</span>
          </div>
          <div className="chamados-admin-kpi-icon">🟡</div>
        </div>

        <div
          className={`chamados-admin-kpi-card kpi-resolvido ${filtroStatus === "Resolvido" ? "active" : ""}`}
          onClick={() => setFiltroStatus("Resolvido")}
          title="Filtrar chamados resolvidos"
        >
          <div className="chamados-admin-kpi-info">
            <span className="chamados-admin-kpi-label">Resolvidos</span>
            <span className="chamados-admin-kpi-value">{contadores.resolvidos}</span>
          </div>
          <div className="chamados-admin-kpi-icon">🟢</div>
        </div>

        <div
          className={`chamados-admin-kpi-card kpi-cancelado ${filtroStatus === "Cancelado" ? "active" : ""}`}
          onClick={() => setFiltroStatus("Cancelado")}
          title="Filtrar chamados cancelados"
        >
          <div className="chamados-admin-kpi-info">
            <span className="chamados-admin-kpi-label">Cancelados</span>
            <span className="chamados-admin-kpi-value">{contadores.cancelados}</span>
          </div>
          <div className="chamados-admin-kpi-icon">⚫</div>
        </div>
      </div>

      {/* Barra de Pesquisa e Filtros */}
      <div className="chamados-admin-filter-card">
        <div className="chamados-admin-filter-group">
          <div className="chamados-admin-filter-item">
            <label className="chamados-admin-label">Categoria:</label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="chamados-admin-select"
            >
              <option value="Todas">Todas as Categorias</option>
              <option value="Suporte Técnico">Suporte Técnico</option>
              <option value="Financeiro / Fatura">Financeiro / Fatura</option>
              <option value="Comercial">Comercial</option>
              <option value="Outros Assuntos">Outros Assuntos</option>
              <option value="Outros">Outros</option>
            </select>
          </div>

          <div className="chamados-admin-filter-item">
            <label className="chamados-admin-label">Status:</label>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="chamados-admin-select"
            >
              <option value="Todos">Todos os Status</option>
              <option value="Aberto">Aberto</option>
              <option value="Em Atendimento">Em Atendimento</option>
              <option value="Resolvido">Resolvido</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          <div className="chamados-admin-filter-item search-item">
            <label className="chamados-admin-label">Pesquisa rápida:</label>
            <input
              type="text"
              placeholder="Buscar por cliente, e-mail, telefone, assunto ou #id..."
              value={buscaTexto}
              onChange={(e) => setBuscaTexto(e.target.value)}
              className="chamados-admin-search-input"
            />
          </div>

          <button
            type="button"
            onClick={limparFiltros}
            className="chamados-admin-btn-clear"
            title="Limpar todos os filtros"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      {/* Grid de Chamados (Containers amplos e organizados) */}
      {chamadosFiltrados.length === 0 ? (
        <div className="chamados-admin-empty-state">
          Nenhum chamado encontrado com os filtros selecionados.
        </div>
      ) : (
        <div className="chamados-admin-grid">
          {chamadosFiltrados.map((c, index) => (
            <div
              key={c.id}
              className={`chamados-admin-card card-slide-in ${getCardStatusBorderClass(c.status)}`}
              style={{ animationDelay: `${index * 0.04}s` }}
            >
              {/* Header do Container: Protocolo, Categoria e Status */}
              <div className="chamados-admin-card-header">
                <div className="chamados-admin-protocol-group">
                  <span className="chamados-admin-protocolo">#{c.id}</span>
                  <span className="chamados-admin-category-badge">
                    {c.categoria || "Geral"}
                  </span>
                </div>
                <div>{getStatusBadge(c.status)}</div>
              </div>

              {/* CONTAINER DESTACADO: DADOS DO USUÁRIO SOLICITANTE */}
              <div className="chamados-admin-user-box">
                <div className="chamados-admin-user-avatar">
                  {getInitials(c.clienteNome)}
                </div>
                <div className="chamados-admin-user-info">
                  <div className="chamados-admin-user-name">
                    <span>👤</span> {c.clienteNome || "Usuário não identificado"}
                  </div>
                  <div className="chamados-admin-user-meta-line">
                    <span>✉️</span> {c.clienteEmail || "Sem e-mail"}
                  </div>
                  {c.whatsapp ? (
                    <div className="chamados-admin-user-meta-line">
                      <span>📱</span>
                      <a
                        href={`https://wa.me/55${String(c.whatsapp).replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="chamados-admin-whatsapp-link"
                        title="Iniciar conversa no WhatsApp"
                      >
                        {c.whatsapp} <em>(Abrir WhatsApp)</em>
                      </a>
                    </div>
                  ) : (
                    <div className="chamados-admin-user-meta-line" style={{ color: "#71717a" }}>
                      <span>📱</span> WhatsApp não informado
                    </div>
                  )}
                  <div className="chamados-admin-user-date">
                    <span>📅</span> Aberto em: {c.dataCriacao || "Data não informada"}
                  </div>
                </div>
              </div>

              {/* Assunto e Descrição da Solicitação */}
              <div className="chamados-admin-assunto-container">
                <span className="chamados-admin-assunto-label">Assunto:</span>
                <strong className="chamados-admin-assunto">{c.assunto}</strong>
              </div>
              <p className="chamados-admin-descricao">{c.descricao}</p>

              {/* Anexo se houver */}
              {c.anexo && (
                <div style={{ marginBottom: "12px" }}>
                  <a
                    href={c.anexo.data}
                    download={c.anexo.nome}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="chamados-attachment-tag"
                  >
                    📎 Anexo: {c.anexo.nome} ({c.anexo.tamanho}) — <em>Visualizar / Baixar</em>
                  </a>
                </div>
              )}

              {/* Destaque: Cancelado e Motivo */}
              {c.status === "Cancelado" && (
                <div className="chamados-admin-box-canceled">
                  <div className="chamados-admin-box-canceled-title">
                    <span>🚫</span> Chamado Cancelado
                  </div>
                  <div className="chamados-admin-box-canceled-text">
                    <strong>Motivo:</strong> {c.motivoCancelamento || "Cancelado pelo usuário."}
                  </div>
                  {(c.dataCancelamento || c.canceladoPor) && (
                    <div className="chamados-admin-box-canceled-meta">
                      {c.canceladoPor && `Cancelado por: ${c.canceladoPor} `}
                      {c.dataCancelamento && `• em ${c.dataCancelamento}`}
                    </div>
                  )}
                </div>
              )}

              {/* Destaque: Resolvido e Procedimento */}
              {c.status === "Resolvido" && (
                <div className="chamados-admin-box-resolved">
                  <div className="chamados-admin-box-resolved-title">
                    <span>✅</span> Chamado Finalizado / Resolvido
                  </div>
                  <div className="chamados-admin-box-resolved-text">
                    <strong>Procedimento Executado:</strong> {c.procedimentoExecutado || "Procedimento registrado no atendimento."}
                  </div>
                  {(c.dataFinalizacao || c.tecnicoResponsavel) && (
                    <div className="chamados-admin-box-resolved-meta">
                      {c.tecnicoResponsavel && `Técnico: ${c.tecnicoResponsavel} `}
                      {c.dataFinalizacao && `• em ${c.dataFinalizacao}`}
                    </div>
                  )}
                </div>
              )}

              {/* Rodapé com Botão "Ver Chamado" */}
              <div className="chamados-admin-card-footer">
                <button
                  type="button"
                  className="chamados-admin-btn-view"
                  onClick={() => handleAbrirDetalhes(c)}
                >
                  👁️ Ver Chamado Completo
                </button>

                {c.status !== "Cancelado" && c.status !== "Resolvido" && (
                  <button
                    type="button"
                    className="chamados-admin-btn-quick-cancel"
                    onClick={() => handleAbrirModalCancelamento(c)}
                    title="Cancelar chamado informando motivo"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ====================================================================
          MODAL: DETALHES DO CHAMADO SELECIONADO ("VER CHAMADO")
          ==================================================================== */}
      {modalDetalhesAberto && chamadoSelecionado && (
        <div className="chamados-detail-modal-overlay" onClick={handleFecharDetalhes}>
          <div
            className="chamados-detail-modal-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {/* Cabeçalho do Modal */}
            <div className="chamados-detail-modal-header">
              <div className="chamados-detail-modal-header-info">
                <h3 className="chamados-detail-modal-title">
                  <span>🎧</span> Chamado #{chamadoSelecionado.id}
                </h3>
                <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                  <span className="chamados-admin-category-badge">
                    {chamadoSelecionado.categoria || "Geral"}
                  </span>
                  {getStatusBadge(chamadoSelecionado.status)}
                </div>
              </div>
              <button
                type="button"
                className="chamados-detail-modal-close-btn"
                onClick={handleFecharDetalhes}
                title="Fechar"
              >
                ✕
              </button>
            </div>

            {/* CONTAINER DESTACADO: DADOS DO USUÁRIO NO MODAL */}
            <div className="chamados-detail-section">
              <div className="chamados-detail-section-title">
                <span>👤</span> Dados do Usuário Solicitante
              </div>
              <div className="chamados-detail-grid-info">
                <div className="chamados-detail-info-cell">
                  <span className="chamados-detail-info-label">Nome do Usuário:</span>
                  <span className="chamados-detail-info-val">
                    {chamadoSelecionado.clienteNome || "Não informado"}
                  </span>
                </div>
                <div className="chamados-detail-info-cell">
                  <span className="chamados-detail-info-label">E-mail:</span>
                  <span className="chamados-detail-info-val">
                    {chamadoSelecionado.clienteEmail || "-"}
                  </span>
                </div>
                <div className="chamados-detail-info-cell">
                  <span className="chamados-detail-info-label">WhatsApp / Telefone:</span>
                  <span className="chamados-detail-info-val">
                    {chamadoSelecionado.whatsapp ? (
                      <a
                        href={`https://wa.me/55${String(chamadoSelecionado.whatsapp).replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="chamados-admin-whatsapp-link"
                      >
                        📱 {chamadoSelecionado.whatsapp} (Conversar no WhatsApp)
                      </a>
                    ) : (
                      "-"
                    )}
                  </span>
                </div>
                <div className="chamados-detail-info-cell">
                  <span className="chamados-detail-info-label">Data e Hora da Abertura:</span>
                  <span className="chamados-detail-info-val">
                    {chamadoSelecionado.dataCriacao || "-"}
                  </span>
                </div>
              </div>
            </div>

            {/* Detalhes da Solicitação */}
            <div className="chamados-detail-section">
              <div className="chamados-detail-section-title">
                <span>📝</span> Solicitação do Chamado
              </div>
              <div style={{ marginBottom: "8px" }}>
                <strong style={{ color: "#fff", fontSize: "15px" }}>
                  Assunto: {chamadoSelecionado.assunto}
                </strong>
              </div>
              <div className="chamados-detail-description-box">
                {chamadoSelecionado.descricao}
              </div>

              {chamadoSelecionado.anexo && (
                <div style={{ marginTop: "10px" }}>
                  <a
                    href={chamadoSelecionado.anexo.data}
                    download={chamadoSelecionado.anexo.nome}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="chamados-attachment-tag"
                  >
                    📎 Anexo: {chamadoSelecionado.anexo.nome} ({chamadoSelecionado.anexo.tamanho}) — <em>Baixar / Abrir</em>
                  </a>
                </div>
              )}
            </div>

            {/* SEÇÃO: SE FINALIZADO (RESOLVIDO) */}
            {chamadoSelecionado.status === "Resolvido" && (
              <div className="chamados-detail-section" style={{ borderColor: "#22c55e", background: "rgba(34, 197, 94, 0.05)" }}>
                <div className="chamados-detail-section-title" style={{ color: "#22c55e" }}>
                  <span>✅</span> Chamado Finalizado / Resolvido
                </div>
                <div style={{ fontSize: "13px", color: "#e4e4e7", lineHeight: "1.5" }}>
                  <strong>Procedimento Executado:</strong>
                  <div className="chamados-detail-description-box" style={{ marginTop: "6px" }}>
                    {chamadoSelecionado.procedimentoExecutado || "Procedimento realizado conforme solicitação."}
                  </div>
                  <div style={{ marginTop: "8px", fontSize: "12px", color: "#a1a1aa" }}>
                    {chamadoSelecionado.tecnicoResponsavel && (
                      <span>Técnico Responsável: <strong>{chamadoSelecionado.tecnicoResponsavel}</strong> | </span>
                    )}
                    {chamadoSelecionado.dataFinalizacao && (
                      <span>Data de Conclusão: <strong>{chamadoSelecionado.dataFinalizacao}</strong></span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO: SE CANCELADO */}
            {chamadoSelecionado.status === "Cancelado" && (
              <div className="chamados-detail-section" style={{ borderColor: "#ef4444", background: "rgba(239, 68, 68, 0.05)" }}>
                <div className="chamados-detail-section-title" style={{ color: "#ef4444" }}>
                  <span>🚫</span> Chamado Cancelado
                </div>
                <div style={{ fontSize: "13px", color: "#e4e4e7", lineHeight: "1.5" }}>
                  <strong>Motivo do Cancelamento:</strong>
                  <div className="chamados-detail-description-box" style={{ marginTop: "6px", color: "#fca5a5" }}>
                    {chamadoSelecionado.motivoCancelamento || "Cancelado pelo usuário ou administração."}
                  </div>
                  <div style={{ marginTop: "8px", fontSize: "12px", color: "#a1a1aa" }}>
                    {chamadoSelecionado.canceladoPor && (
                      <span>Cancelado por: <strong>{chamadoSelecionado.canceladoPor}</strong> | </span>
                    )}
                    {chamadoSelecionado.dataCancelamento && (
                      <span>Data: <strong>{chamadoSelecionado.dataCancelamento}</strong></span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SEÇÃO: AÇÕES DE RESOLUÇÃO E CANCELAMENTO (QUANDO NÃO FINALIZADO) */}
            {chamadoSelecionado.status !== "Resolvido" && chamadoSelecionado.status !== "Cancelado" && (
              <div className="chamados-detail-action-card">
                <div className="chamados-detail-section-title" style={{ color: "#38bdf8" }}>
                  <span>⚙️</span> Gestão do Chamado
                </div>

                {/* Bloco: Finalizar com Procedimento Obrigatório */}
                <div className="chamados-detail-finalize-box">
                  <label className="chamados-admin-label" style={{ color: "#4ade80", fontWeight: "700" }}>
                    * Procedimento Executado para Resolução (Obrigatório para Finalizar):
                  </label>
                  <textarea
                    className="chamados-detail-textarea"
                    placeholder="Descreva detalhadamente o procedimento técnico executado para resolver o problema do usuário..."
                    value={procedimentoExecutado}
                    onChange={(e) => setProcedimentoExecutado(e.target.value)}
                    rows="3"
                  />

                  <div className="chamados-detail-action-buttons">
                    <button
                      type="button"
                      className="chamados-btn-finalize-submit"
                      onClick={() => handleFinalizarChamado(chamadoSelecionado)}
                      disabled={loading}
                    >
                      {loading ? "Processando..." : "✅ Finalizar Chamado (Notificar E-mail + Telegram)"}
                    </button>

                    {chamadoSelecionado.status === "Aberto" && (
                      <button
                        type="button"
                        className="chamados-btn-in-progress"
                        onClick={() => handleMudarParaAtendimento(chamadoSelecionado)}
                        disabled={loading}
                      >
                        🟡 Iniciar Atendimento
                      </button>
                    )}

                    <button
                      type="button"
                      className="chamados-btn-cancel-action"
                      onClick={() => handleAbrirModalCancelamento(chamadoSelecionado)}
                      disabled={loading}
                    >
                      🚫 Cancelar Chamado (Informar Motivo)
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Histórico de Mensagens & Resposta Adicional */}
            <div className="chamados-detail-section">
              <div className="chamados-detail-section-title">
                <span>💬</span> Histórico de Interações ({chamadoSelecionado.respostas?.length || 0})
              </div>

              <div className="chamados-detail-timeline">
                {chamadoSelecionado.respostas && chamadoSelecionado.respostas.length > 0 ? (
                  chamadoSelecionado.respostas.map((r, idx) => (
                    <div key={idx} className="chamados-detail-timeline-item">
                      <div className="chamados-detail-timeline-header">
                        <span className="chamados-detail-timeline-author">{r.autor}</span>
                        <span>{r.data}</span>
                      </div>
                      <div className="chamados-detail-timeline-msg">{r.mensagem}</div>
                    </div>
                  ))
                ) : (
                  <div style={{ color: "#71717a", fontSize: "12px", padding: "8px 0" }}>
                    Nenhuma interação adicional registrada ainda.
                  </div>
                )}
              </div>

              {/* Caixa para enviar resposta intermediária */}
              <div className="chamados-admin-reply-box" style={{ marginTop: "12px" }}>
                <input
                  type="text"
                  placeholder="Enviar mensagem ou resposta ao cliente..."
                  value={respostaTexto}
                  onChange={(e) => setRespostaTexto(e.target.value)}
                  className="chamados-admin-input-reply"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleEnviarRespostaModal();
                    }
                  }}
                />
                <button
                  type="button"
                  onClick={handleEnviarRespostaModal}
                  disabled={loading}
                  className="chamados-admin-btn-reply"
                >
                  {loading ? "Enviando..." : "Enviar Resposta"}
                </button>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="chamados-modal-footer" style={{ marginTop: "10px" }}>
              <button
                type="button"
                className="chamados-btn-cancelar"
                onClick={handleFecharDetalhes}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          MODAL PRÓPRIO DO SISTEMA (MODALSECAO) PARA INFORMAR O MOTIVO DO CANCELAMENTO
          ==================================================================== */}
      {modalCancelamentoAberto && chamadoParaCancelar && (
        <ModalSecao
          titulo={`Cancelar Chamado #${chamadoParaCancelar.id}`}
          campos={[
            {
              nome: "motivo",
              label: "Informe o Motivo do Cancelamento (Obrigatório):",
              type: "textarea",
              rows: 4,
              fullWidth: true,
            },
          ]}
          dados={dadosModalCancelamento}
          onChange={(campo, valor) =>
            setDadosModalCancelamento((prev) => ({ ...prev, [campo]: valor }))
          }
          onClose={handleFecharModalCancelamento}
          onSalvar={handleConfirmarCancelamento}
        />
      )}
    </div>
  );
}

