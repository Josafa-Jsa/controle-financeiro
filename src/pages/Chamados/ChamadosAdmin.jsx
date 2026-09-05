// src/pages/Chamados/ChamadosAdmin.jsx
import React, { useState, useEffect, useMemo } from "react";
import { toast } from "react-toastify";
import emailjs from "@emailjs/browser";
import { getUser, isAdmin } from "../../auth/auth";
import { api } from "../../api/client";
import { sendTelegramEvent } from "../../utils/telegram";
import { logEvent } from "../../utils/logger";
import ModalSecao from "../../components/Modais/ModalSecao";
import ModalChatAtendimento, { emitChatEvent } from "../../components/Modais/ModalChatAtendimento";
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
  const [imagemModalAberta, setImagemModalAberta] = useState(null);
  const [chatModalChamado, setChatModalChamado] = useState(null);

  // Helper para normalizar e extrair o anexo independente do formato
  const getAnexo = (item) => {
    if (!item) return null;
    let anx =
      item.anexo ||
      (Array.isArray(item.anexos) && item.anexos.length > 0 ? item.anexos[0] : null) ||
      item.imagem ||
      item.arquivo;
    if (!anx) return null;

    if (typeof anx === "string") {
      const trimmed = anx.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed);
          anx = Array.isArray(parsed) ? parsed[0] : parsed;
        } catch {}
      } else if (
        trimmed.startsWith("data:") ||
        trimmed.startsWith("http") ||
        trimmed.startsWith("/") ||
        trimmed.startsWith("blob:")
      ) {
        return {
          nome: "imagem_anexada.png",
          tamanho: "Imagem",
          tipo: "image/png",
          data: trimmed,
        };
      }
    }

    if (anx && typeof anx === "object") {
      const dataUrl = anx.data || anx.url || anx.src || anx.base64 || anx.link || "";
      return {
        nome: anx.nome || anx.name || "imagem_anexo.png",
        tamanho: anx.tamanho || anx.size || "Anexo",
        tipo:
          anx.tipo ||
          anx.type ||
          (typeof dataUrl === "string" && dataUrl.startsWith("data:image") ? "image/png" : ""),
        data: dataUrl,
      };
    }
    return null;
  };

  // Helper para identificar anexos que são imagens
  const isImagem = (anexo) => {
    if (!anexo) return false;
    const dataStr = typeof anexo === "string" ? anexo : anexo.data || anexo.url || anexo.src || "";
    if (
      typeof dataStr === "string" &&
      (dataStr.startsWith("data:image") ||
        dataStr.startsWith("blob:") ||
        /\.(jpe?g|png|webp|gif|svg|bmp)($|\?)/i.test(dataStr))
    ) {
      return true;
    }
    const tipo = (anexo.tipo || anexo.type || "").toLowerCase();
    if (tipo.startsWith("image")) return true;
    const nome = (anexo.nome || anexo.name || "").toLowerCase();
    if (/\.(jpe?g|png|webp|gif|svg|bmp)($|\?)/i.test(nome)) return true;
    return false;
  };

  // Modal Secao do Sistema para Cancelamento
  const [modalCancelamentoAberto, setModalCancelamentoAberto] = useState(false);
  const [chamadoParaCancelar, setChamadoParaCancelar] = useState(null);
  const [dadosModalCancelamento, setDadosModalCancelamento] = useState({ motivo: "" });

  useEffect(() => {
    carregarChamados();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (imagemModalAberta) {
          setImagemModalAberta(null);
        } else if (modalDetalhesAberto) {
          handleFecharDetalhes();
        }
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [modalDetalhesAberto, imagemModalAberta]);

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

  // 3. MUDAR PARA "EM ATENDIMENTO" E INICIAR CHAT AO VIVO
  const handleMudarParaAtendimento = async (chamado) => {
    if (!chamado) return;

    const nomeAdmin = user.name || user.nome || user.displayName || "Suporte JSA";
    const dataHora = new Date().toLocaleString("pt-BR");
    const historico = chamado.respostas || [];

    const novaResposta = {
      autor: nomeAdmin,
      mensagem: `Status alterado para Em Atendimento por ${nomeAdmin}. Chat ao vivo conectado.`,
      data: dataHora,
      isAdmin: true,
      timestamp: Date.now(),
    };

    const dadosUpdate = {
      ...chamado,
      status: "Em Atendimento",
      respostas: [...historico, novaResposta],
    };

    atualizarChamadoAtivo(chamado.id, dadosUpdate);

    // Emite evento para que abra o modal de conversa automaticamente na tela do usuário
    emitChatEvent({
      tipo: "INICIAR_ATENDIMENTO",
      chamadoId: chamado.id,
      clienteEmail: (chamado.clienteEmail || "").toLowerCase(),
      clienteNome: chamado.clienteNome || "Cliente",
      assunto: chamado.assunto,
      autor: nomeAdmin,
      mensagem: `Olá ${chamado.clienteNome || "Cliente"}! O Suporte JSA iniciou o atendimento da sua solicitação. Como podemos ajudar?`,
      data: dataHora,
      isAdminSender: true,
      timestamp: Date.now(),
    });

    // Abre o modal do chat na tela do Admin
    setChatModalChamado(dadosUpdate);

    // E-mail informativo
    const corpoEmail =
      `ATUALIZAÇÃO DO CHAMADO #${chamado.id}\n` +
      `----------------------------------------\n` +
      `Status Atual: EM ATENDIMENTO\n` +
      `Assunto: ${chamado.assunto}\n` +
      `Atendente: ${nomeAdmin}\n` +
      `Data: ${dataHora}\n\n` +
      `Nossa equipe iniciou o atendimento técnico do seu chamado no chat em tempo real do sistema.`;

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

    toast.info(`Atendimento iniciado no Chamado #${chamado.id}!`);
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
      isAdmin: true,
      timestamp: Date.now(),
    };

    const novoStatus =
      chamadoSelecionado.status === "Aberto" ? "Em Atendimento" : chamadoSelecionado.status;

    const dadosUpdate = {
      status: novoStatus,
      respostas: [...historico, novaResposta],
    };

    atualizarChamadoAtivo(chamadoSelecionado.id, dadosUpdate);
    setRespostaTexto("");

    // Emite evento de chat em tempo real
    emitChatEvent({
      tipo: "NOVA_MENSAGEM",
      chamadoId: chamadoSelecionado.id,
      clienteEmail: (chamadoSelecionado.clienteEmail || "").toLowerCase(),
      autor: `Suporte JSA (${nomeAdmin})`,
      mensagem: texto,
      data: dataHora,
      isAdminSender: true,
      timestamp: Date.now(),
    });

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

              {/* Anexo / Imagem no Card Admin */}
              {(() => {
                const anexoObj = getAnexo(c);
                if (!anexoObj || !anexoObj.data) return null;
                const ehImg = isImagem(anexoObj);

                return (
                  <div className="chamados-modal-anexo-wrapper" style={{ marginBottom: "14px" }}>
                    {ehImg ? (
                      <div className="chamados-admin-img-preview-card">
                        <div
                          className="chamados-admin-img-thumb-container"
                          onClick={() => setImagemModalAberta(anexoObj.data)}
                          title="Clique para ampliar a imagem"
                        >
                          <img
                            src={anexoObj.data}
                            alt={anexoObj.nome}
                            className="chamados-admin-img-thumb"
                          />
                          <div className="chamados-admin-img-overlay-zoom">
                            <span>🔍 Clique para ampliar</span>
                          </div>
                        </div>
                        <div className="chamados-admin-img-details">
                          <span className="chamados-admin-img-name" title={anexoObj.nome}>
                            📷 {anexoObj.nome}
                          </span>
                          <span className="chamados-admin-img-size">
                            {anexoObj.tamanho}
                          </span>
                          <div className="chamados-admin-img-btn-row">
                            <button
                              type="button"
                              className="chamados-btn-preview-zoom"
                              onClick={() => setImagemModalAberta(anexoObj.data)}
                            >
                              🔍 Ver Foto
                            </button>
                            <a
                              href={anexoObj.data}
                              download={anexoObj.nome}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="chamados-btn-preview-download"
                            >
                              ⬇️ Baixar
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="chamados-file-doc-row">
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                          <span>📄</span>
                          <strong style={{ color: "#fff" }}>{anexoObj.nome}</strong>
                          <span style={{ color: "#a1a1aa", fontSize: "11px" }}>({anexoObj.tamanho})</span>
                        </div>
                        <a
                          href={anexoObj.data}
                          download={anexoObj.nome}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="chamados-attachment-tag"
                        >
                          ⬇️ Baixar / Abrir
                        </a>
                      </div>
                    )}
                  </div>
                );
              })()}

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

              {/* Rodapé com Botões de Ação */}
              <div className="chamados-admin-card-footer">
                <button
                  type="button"
                  className="chamados-admin-btn-view"
                  onClick={() => handleAbrirDetalhes(c)}
                >
                  👁️ Ver Detalhes
                </button>

                {c.status === "Aberto" && (
                  <button
                    type="button"
                    className="chamados-btn-in-progress"
                    onClick={() => handleMudarParaAtendimento(c)}
                    title="Iniciar atendimento e abrir chat com o usuário"
                    style={{ padding: "8px 12px", fontSize: "13px" }}
                  >
                    🟡 Iniciar Atendimento
                  </button>
                )}

                {c.status === "Em Atendimento" && (
                  <button
                    type="button"
                    className="chamados-btn-edit-ticket"
                    onClick={() => setChatModalChamado(c)}
                    title="Abrir chat ao vivo deste chamado"
                    style={{ padding: "8px 12px", fontSize: "13px" }}
                  >
                    💬 Abrir Chat
                  </button>
                )}

                {(c.status === "Resolvido" || c.status === "Cancelado") && (
                  <button
                    type="button"
                    className="chamados-btn-edit-ticket"
                    onClick={() => setChatModalChamado(c)}
                    title="Visualizar todo o histórico da conversa e anexos deste chamado"
                    style={{ padding: "8px 12px", fontSize: "13px" }}
                  >
                    💬 Ver Histórico do Chat
                  </button>
                )}

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
                <span className="chamados-admin-category-badge">
                  {chamadoSelecionado.categoria || "Geral"}
                </span>
                {getStatusBadge(chamadoSelecionado.status)}
              </div>
              <button
                type="button"
                className="chamados-detail-modal-close-btn"
                onClick={handleFecharDetalhes}
                title="Fechar (Esc)"
              >
                ✕
              </button>
            </div>

            {/* Corpo do Modal em Grid Adaptável de 2 Colunas */}
            <div className="chamados-detail-modal-body-grid">
              {/* COLUNA ESQUERDA: Dados do Solicitante + Solicitação + Imagem / Anexo */}
              <div className="chamados-detail-col-left">
                {/* 1. Dados do Solicitante */}
                <div className="chamados-detail-section compact">
                  <div className="chamados-detail-section-title">
                    <span>👤</span> Dados do Solicitante
                  </div>
                  <div className="chamados-detail-grid-info">
                    <div className="chamados-detail-info-cell">
                      <span className="chamados-detail-info-label">Nome:</span>
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
                      <span className="chamados-detail-info-label">WhatsApp:</span>
                      <span className="chamados-detail-info-val">
                        {chamadoSelecionado.whatsapp ? (
                          <a
                            href={`https://wa.me/55${String(chamadoSelecionado.whatsapp).replace(/\D/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="chamados-admin-whatsapp-link"
                          >
                            📱 {chamadoSelecionado.whatsapp}
                          </a>
                        ) : (
                          "-"
                        )}
                      </span>
                    </div>
                    <div className="chamados-detail-info-cell">
                      <span className="chamados-detail-info-label">Data da Abertura:</span>
                      <span className="chamados-detail-info-val">
                        {chamadoSelecionado.dataCriacao || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. Solicitação do Chamado + Imagem / Anexo Inline */}
                <div className="chamados-detail-section compact">
                  <div className="chamados-detail-section-title">
                    <span>📝</span> Solicitação do Usuário
                  </div>
                  <div style={{ marginBottom: "6px" }}>
                    <strong style={{ color: "#38bdf8", fontSize: "14px" }}>
                      Assunto: {chamadoSelecionado.assunto}
                    </strong>
                  </div>
                  <div className="chamados-detail-description-box">
                    {chamadoSelecionado.descricao}
                  </div>

                  {/* ANEXO / IMAGEM INSERIDA PELO USUÁRIO */}
                  {(() => {
                    const anexoModal = getAnexo(chamadoSelecionado);
                    if (!anexoModal || !anexoModal.data) return null;
                    const ehImg = isImagem(anexoModal);

                    return (
                      <div className="chamados-modal-anexo-wrapper">
                        <div className="chamados-modal-anexo-header">
                          <span>📎</span>
                          <span>Anexo inserido pelo usuário:</span>
                        </div>

                        {ehImg ? (
                          <div className="chamados-admin-img-preview-card">
                            <div
                              className="chamados-admin-img-thumb-container"
                              onClick={() => setImagemModalAberta(anexoModal.data)}
                              title="Clique para ampliar a imagem"
                            >
                              <img
                                src={anexoModal.data}
                                alt={anexoModal.nome}
                                className="chamados-admin-img-thumb"
                              />
                              <div className="chamados-admin-img-overlay-zoom">
                                <span>🔍 Clique para ampliar</span>
                              </div>
                            </div>
                            <div className="chamados-admin-img-details">
                              <span className="chamados-admin-img-name" title={anexoModal.nome}>
                                {anexoModal.nome}
                              </span>
                              <span className="chamados-admin-img-size">
                                {anexoModal.tamanho}
                              </span>
                              <div className="chamados-admin-img-btn-row">
                                <button
                                  type="button"
                                  className="chamados-btn-preview-zoom"
                                  onClick={() => setImagemModalAberta(anexoModal.data)}
                                >
                                  🔍 Ampliar Imagem
                                </button>
                                <a
                                  href={anexoModal.data}
                                  download={anexoModal.nome}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="chamados-btn-preview-download"
                                >
                                  ⬇️ Baixar
                                </a>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="chamados-file-doc-row">
                            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                              <span>📄</span>
                              <strong style={{ color: "#fff" }}>{anexoModal.nome}</strong>
                              <span style={{ color: "#a1a1aa", fontSize: "11px" }}>({anexoModal.tamanho})</span>
                            </div>
                            <a
                              href={anexoModal.data}
                              download={anexoModal.nome}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="chamados-attachment-tag"
                            >
                              ⬇️ Baixar / Abrir
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* COLUNA DIREITA: Ações do Técnico / Resolução + Histórico */}
              <div className="chamados-detail-col-right">
                {/* Se Finalizado (Resolvido) */}
                {chamadoSelecionado.status === "Resolvido" && (
                  <div className="chamados-detail-section compact" style={{ borderColor: "#22c55e", background: "rgba(34, 197, 94, 0.05)" }}>
                    <div className="chamados-detail-section-title" style={{ color: "#22c55e" }}>
                      <span>✅</span> Chamado Finalizado / Resolvido
                    </div>
                    <div style={{ fontSize: "12px", color: "#e4e4e7", lineHeight: "1.4" }}>
                      <strong>Procedimento Executado:</strong>
                      <div className="chamados-detail-description-box" style={{ marginTop: "4px", color: "#86efac" }}>
                        {chamadoSelecionado.procedimentoExecutado || "Procedimento realizado conforme solicitação."}
                      </div>
                      <div style={{ marginTop: "6px", fontSize: "11px", color: "#a1a1aa" }}>
                        {chamadoSelecionado.tecnicoResponsavel && (
                          <span>Técnico: <strong>{chamadoSelecionado.tecnicoResponsavel}</strong> | </span>
                        )}
                        {chamadoSelecionado.dataFinalizacao && (
                          <span>Data: <strong>{chamadoSelecionado.dataFinalizacao}</strong></span>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Se Cancelado */}
                {chamadoSelecionado.status === "Cancelado" && (
                  <div className="chamados-detail-section compact" style={{ borderColor: "#ef4444", background: "rgba(239, 68, 68, 0.05)" }}>
                    <div className="chamados-detail-section-title" style={{ color: "#ef4444" }}>
                      <span>🚫</span> Chamado Cancelado
                    </div>
                    <div style={{ fontSize: "12px", color: "#e4e4e7", lineHeight: "1.4" }}>
                      <strong>Motivo do Cancelamento:</strong>
                      <div className="chamados-detail-description-box" style={{ marginTop: "4px", color: "#fca5a5" }}>
                        {chamadoSelecionado.motivoCancelamento || "Cancelado pelo usuário ou administração."}
                      </div>
                      <div style={{ marginTop: "6px", fontSize: "11px", color: "#a1a1aa" }}>
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

                {/* Ações de Gestão (Quando Aberto ou Em Atendimento) */}
                {chamadoSelecionado.status !== "Resolvido" && chamadoSelecionado.status !== "Cancelado" && (
                  <div className="chamados-detail-action-card">
                    <div className="chamados-detail-section-title" style={{ color: "#38bdf8" }}>
                      <span>⚙️</span> Gestão do Atendimento
                    </div>

                    <div className="chamados-detail-finalize-box">
                      <label className="chamados-admin-label" style={{ color: "#4ade80", fontWeight: "700", fontSize: "12px" }}>
                        * Procedimento Executado (Obrigatório para Finalizar):
                      </label>
                      <textarea
                        className="chamados-detail-textarea"
                        placeholder="Descreva o procedimento técnico executado para resolver o problema..."
                        value={procedimentoExecutado}
                        onChange={(e) => setProcedimentoExecutado(e.target.value)}
                        rows="2"
                      />

                      <div className="chamados-detail-action-buttons">
                        <button
                          type="button"
                          className="chamados-btn-finalize-submit"
                          onClick={() => handleFinalizarChamado(chamadoSelecionado)}
                          disabled={loading}
                        >
                          {loading ? "Salvando..." : "✅ Finalizar Chamado"}
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

                        {chamadoSelecionado.status === "Em Atendimento" && (
                          <button
                            type="button"
                            className="chamados-btn-edit-ticket"
                            onClick={() => setChatModalChamado(chamadoSelecionado)}
                            disabled={loading}
                          >
                            💬 Abrir Chat ao Vivo
                          </button>
                        )}

                        <button
                          type="button"
                          className="chamados-btn-cancel-action"
                          onClick={() => handleAbrirModalCancelamento(chamadoSelecionado)}
                          disabled={loading}
                        >
                          🚫 Cancelar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Histórico de Interações */}
                <div className="chamados-detail-section compact">
                  <div className="chamados-detail-section-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>💬 Histórico de Interações ({chamadoSelecionado.respostas?.length || 0})</span>
                    <button
                      type="button"
                      className="chamados-btn-edit-ticket"
                      onClick={() => setChatModalChamado(chamadoSelecionado)}
                      title="Abrir histórico completo em modal de chat interativo"
                      style={{ fontSize: "11px", padding: "2px 8px", textTransform: "none", fontWeight: "600" }}
                    >
                      💬 Abrir Chat Completo
                    </button>
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
                      <div style={{ color: "#71717a", fontSize: "11px", padding: "4px 0" }}>
                        Nenhuma interação registrada ainda.
                      </div>
                    )}
                  </div>

                  <div className="chamados-admin-reply-box" style={{ marginTop: "8px" }}>
                    <input
                      type="text"
                      placeholder="Enviar resposta ao cliente..."
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
                      {loading ? "..." : "Enviar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Rodapé do Modal */}
            <div className="chamados-modal-footer" style={{ marginTop: "4px", paddingBottom: "0" }}>
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
          MODAL LIGHTBOX: VISUALIZAÇÃO DA IMAGEM EM TAMANHO REAL
          ==================================================================== */}
      {imagemModalAberta && (
        <div
          className="chamados-lightbox-overlay"
          onClick={() => setImagemModalAberta(null)}
          style={{ zIndex: 100050 }}
        >
          <div className="chamados-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="chamados-lightbox-close"
              onClick={() => setImagemModalAberta(null)}
              title="Fechar (Esc)"
            >
              ✕
            </button>
            <img
              src={imagemModalAberta}
              alt="Imagem Ampliada do Chamado"
              className="chamados-lightbox-img"
            />
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

      {/* ====================================================================
          MODAL DE CHAT AO VIVO NO PAINEL ADMIN
          ==================================================================== */}
      {chatModalChamado && (
        <ModalChatAtendimento
          chamado={chatModalChamado}
          isCurrentUserAdmin={true}
          onClose={() => setChatModalChamado(null)}
          onUpdateChamado={(atualizado) => {
            setChatModalChamado(atualizado);
            atualizarChamadoAtivo(atualizado.id, atualizado);
          }}
        />
      )}
    </div>
  );
}

