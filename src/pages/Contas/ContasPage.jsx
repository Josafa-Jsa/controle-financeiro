// src/pages/Contas/ContasPage.jsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaEdit, FaTrash, FaFileAlt, FaPrint } from 'react-icons/fa';
import { AiOutlineQrcode } from 'react-icons/ai';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import ModalConta from '../../components/Modais/ModalConta';
import ModalFiltroCobranca from '../../components/Modais/ModalFiltroCobranca';
import ModalMotivo from '../../components/Modais/ModalMotivo';
import ModalBoleto from '../../components/Modais/ModalBoleto';
import ModalConfirmarPagamento from '../../components/Modais/ModalConfirmarPagamento';
import qrCodeImg from '../../assets/QrCode.png';

import {
  listarContas,
  sincronizarContasDoServidor,
  salvarConta,
  atualizarConta,
  excluirConta,
  registrarBaixaParcialPorId,
  aplicarPagamentoConta,
} from '../../services/contasService';

import {
  processarConfirmacaoPagamentoFaturaSys,
  consultarStatusPagamentoBanco,
  getBankConfig,
  calcularVencimentoMesAtual,
  getDiaVencimentoSys,
} from '../../services/bankPaymentService';

import { emitirBoletoCora } from '../../services/coraBankService';

import { excluirNota } from '../../services/notasService';

import {
  sendTelegramEvent,
  formatCurrencyBRL,
  formatDateBR,
} from '../../utils/telegram';

import { logEvent } from '../../utils/logger';
import { getCurrentUser, isAdmin } from '../../auth/auth';

import '../../components/Visual/contas.css';
import '../../components/Visual/styles.css';
import '../../components/Visual/modal.css';

const NOME_CONTA_SYS = "SYS_Liberação e Manutenção";
const VALOR_PADRAO_SYS = 10.00;
const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 45;

const ContasPage = () => {
  const [contas, setContas] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalFiltroOpen, setModalFiltroOpen] = useState(false);
  const [modalPixOpen, setModalPixOpen] = useState(false);
  const [modalBoletoOpen, setModalBoletoOpen] = useState(false);
  const [boletoGerado, setBoletoGerado] = useState(null);
  const [emitindoBoleto, setEmitindoBoleto] = useState(false);
  const [modalRelatorioOpen, setModalRelatorioOpen] = useState(false);
  const [modalPagamentoOpen, setModalPagamentoOpen] = useState(false);
  const [contaParaPagamento, setContaParaPagamento] = useState(null);
  const [modalMotivoConfig, setModalMotivoConfig] = useState({ isOpen: false, conta: null });
  const [contaParaEditar, setContaParaEditar] = useState(null);

  const [faturaSysSelecionada, setFaturaSysSelecionada] = useState(null);
  const [verificandoPagamento, setVerificandoPagamento] = useState(false);

  const [filtroTipo, setFiltroTipo] = useState("Todos");
  const [filtroStatus, setFiltroStatus] = useState("Todos");

  const pendentesRef = useRef({});
  const lastUpdateIdRef = useRef(0);

  const isUserAdmin = isAdmin();
  const usuarioLogado = getCurrentUser()?.nome || getCurrentUser()?.name || "Usuário do Sistema";

  const getVencimentoPadraoSys = (dataBase = new Date()) => {
    return calcularVencimentoMesAtual(dataBase);
  };

  const fetchContas = async () => {
    try {
      setLoading(true);
      const data = await sincronizarContasDoServidor();
      let lista = Array.isArray(data) ? data : [];

      /* === GERAÇÃO E AVISO DE FATURA SYS COMENTADOS ATÉ REATIVAÇÃO ===
      const hoje = new Date();
      const mesAnoAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

      // 1. Busca todas as faturas SYS cadastradas
      const faturasSys = lista.filter(
        (c) => c.descricao === NOME_CONTA_SYS && c.tipo === "Pagar"
      );

      // Fatura do mês atual (YYYY-MM)
      const faturaMesAtual = faturasSys.find(
        (c) => c.vencimento && c.vencimento.slice(0, 7) === mesAnoAtual
      );

      // 2. Se a fatura do mês atual já existir:
      if (faturaMesAtual) {
        if (
          faturaMesAtual.status === "Pendente" &&
          !faturaMesAtual.editada &&
          Number(faturaMesAtual.valor) !== VALOR_PADRAO_SYS
        ) {
          faturaMesAtual.valor = VALOR_PADRAO_SYS;
          await atualizarConta(faturaMesAtual.id, faturaMesAtual);
        }
      } else {
        const novaContaSys = {
          id: Date.now(),
          descricao: NOME_CONTA_SYS,
          tipo: "Pagar",
          valor: VALOR_PADRAO_SYS,
          vencimento: getVencimentoPadraoSys(hoje),
          status: "Pendente",
          observacao: "Fatura de Liberação e Manutenção Mensal do Sistema",
          editada: false,
        };

        await salvarConta(novaContaSys);
        lista = [...lista, novaContaSys];
      }
      === FIM DA GERAÇÃO DE FATURA SYS === */

      setContas(lista);
    } catch (error) {
      toast.error("Erro ao carregar a lista de contas.");
      logEvent("ERRO_CARREGAR_CONTAS", { error: error.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContas();

    return () => {
      Object.keys(pendentesRef.current).forEach((reqId) => {
        if (pendentesRef.current[reqId]?.timer) {
          clearTimeout(pendentesRef.current[reqId].timer);
        }
      });
    };
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (modalPixOpen && !verificandoPagamento) setModalPixOpen(false);
        if (modalRelatorioOpen) setModalRelatorioOpen(false);
        if (modalBoletoOpen) setModalBoletoOpen(false);
        if (modalPagamentoOpen) setModalPagamentoOpen(false);
        if (modalOpen) setModalOpen(false);
        if (modalFiltroOpen) setModalFiltroOpen(false);
        if (modalMotivoConfig?.isOpen) setModalMotivoConfig({ isOpen: false, conta: null });
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [modalPixOpen, verificandoPagamento, modalRelatorioOpen, modalBoletoOpen, modalPagamentoOpen, modalOpen, modalFiltroOpen, modalMotivoConfig]);

  const tgBase = () => {
    const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    return token ? `https://api.telegram.org/bot${token}` : '';
  };

  const tgSendRaw = async (texto, replyMarkupObj) => {
    const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
    const base = tgBase();
    if (!base || !chatId) return;
    const url = `${base}/sendMessage`;
    const params = {
      chat_id: String(chatId),
      text: texto,
      parse_mode: 'HTML',
      disable_web_page_preview: 'true'
    };
    if (replyMarkupObj) params.reply_markup = JSON.stringify(replyMarkupObj);
    const body = new URLSearchParams(params).toString();
    try {
      const resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
      const data = await resp.json();
      if (!data.ok) throw new Error('Telegram erro: ' + JSON.stringify(data));
      return data;
    } catch (e) {
      console.error('[TG] sendMessage falhou:', e);
    }
  };

  const tgAnswerCallback = async (callbackQueryId, text) => {
    const base = tgBase();
    if (!base || !callbackQueryId) return;
    const url = `${base}/answerCallbackQuery`;
    const body = new URLSearchParams({ callback_query_id: String(callbackQueryId), text, show_alert: 'false' }).toString();
    try { await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body }); }
    catch (e) { console.error('[TG] answerCallbackQuery falhou:', e); }
  };

  const tgDisableButtonsAndAnnotate = async (chatId, messageId, originalText, suffix) => {
    const base = tgBase();
    if (!base || !chatId || !messageId) return;
    try {
      await fetch(`${base}/editMessageReplyMarkup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          chat_id: String(chatId),
          message_id: String(messageId),
          reply_markup: JSON.stringify({ inline_keyboard: [] })
        }).toString()
      });
      await fetch(`${base}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          chat_id: String(chatId),
          message_id: String(messageId),
          text: `${originalText}\n\n${suffix}`,
          parse_mode: 'HTML',
          disable_web_page_preview: 'true'
        }).toString()
      });
    } catch (e) { console.error('[TG] edição do texto falhou:', e); }
  };

  const checarAprovacaoTelegram = async (requestId, sinceTs) => {
    const base = tgBase();
    if (!base) return { status: 'indefinido' };

    try {
      const url = `${base}/getUpdates?offset=${lastUpdateIdRef.current + 1}`;
      const resp = await fetch(url);
      const json = await resp.json();
      if (!json.ok || !Array.isArray(json.result)) return { status: 'indefinido' };

      const reApproveDeleteCb = new RegExp(`^delete_conta:approve:${requestId}$`, 'i');
      const reDenyDeleteCb = new RegExp(`^delete_conta:deny:${requestId}$`, 'i');

      let decided = 'pendente';
      let cbMeta = null;

      for (const upd of json.result) {
        if (typeof upd.update_id === 'number' && upd.update_id > lastUpdateIdRef.current) {
          lastUpdateIdRef.current = upd.update_id;
        }

        const cbData = upd?.callback_query?.data;
        if (cbData) {
          if (reApproveDeleteCb.test(cbData)) { decided = 'aprovado'; }
          else if (reDenyDeleteCb.test(cbData)) { decided = 'negado'; }

          if (decided !== 'pendente') {
            cbMeta = {
              id: upd.callback_query.id,
              chatId: upd.callback_query.message?.chat?.id,
              messageId: upd.callback_query.message?.message_id,
              messageText: upd.callback_query.message?.text || ''
            };
            break;
          }
        }
      }
      return { status: decided, cbMeta };
    } catch (e) {
      console.error('[TG] Falha no getUpdates:', e);
      return { status: 'indefinido' };
    }
  };

  const encerrarPolling = (requestId) => {
    const pend = pendentesRef.current[requestId];
    if (pend?.timer) clearTimeout(pend.timer);
    delete pendentesRef.current[requestId];
  };

  const iniciarPollingDecisao = (requestId, conta, sinceTs) => {
    encerrarPolling(requestId);

    const loop = async () => {
      const pend = pendentesRef.current[requestId];
      if (!pend) return;

      if (pend.attempts >= POLL_MAX_ATTEMPTS) {
        toast.info('Aguardando decisão do financeiro. Você pode checar mais tarde.');
        encerrarPolling(requestId);
        return;
      }

      try {
        const r = await checarAprovacaoTelegram(requestId, sinceTs);
        if (r.status === 'aprovado' || r.status === 'negado') {
          const aprovado = r.status === 'aprovado';

          if (r.cbMeta?.id) {
            await tgAnswerCallback(r.cbMeta.id, aprovado ? 'Exclusão Aprovada ✅' : 'Exclusão Negada ❌');
          }
          if (r.cbMeta?.chatId && r.cbMeta?.messageId) {
            const suffix = aprovado ? '✅ <b>Exclusão Aprovada</b>' : '❌ <b>Exclusão Negada</b>';
            await tgDisableButtonsAndAnnotate(r.cbMeta.chatId, r.cbMeta.messageId, r.cbMeta.messageText || '', suffix);
          }

          if (aprovado) {
            const isOrigemNotaFiscal =
              conta.origem === 'Nota Fiscal' ||
              conta.notaFiscalId ||
              conta.descricao?.toLowerCase().includes('nota fiscal') ||
              conta.observacao?.toLowerCase().includes('nota fiscal');

            const idNota = conta.notaFiscalId || conta.id;

            if (isOrigemNotaFiscal && typeof excluirNota === 'function') {
              try { await excluirNota(idNota); } catch (err) { console.error(err); }
            }

            try { await excluirConta(conta.id); } catch (err) { console.error(err); }
            fetchContas();

            await sendTelegramEvent({
              title: "Exclusão de Conta Concluída",
              emoji: "🗑️",
              screen: "Gestão de Contas",
              lines: [
                `Conta #${conta.id} (${conta.descricao || "Sem descrição"}) foi excluída com sucesso por aprovação do financeiro.`,
              ],
            });
            logEvent("CONTA_EXCLUIDA_APROVADA", { idConta: conta.id, idNota });
            toast.success("Conta excluída com sucesso!");
          } else {
            const data = await listarContas();
            const c = (Array.isArray(data) ? data : []).find(x => x.id === conta.id);
            if (c) {
              const restaurada = { ...c };
              delete restaurada.exclusaoPendente;
              delete restaurada.deleteRequestId;
              delete restaurada.motivoExclusao;
              await atualizarConta(conta.id, restaurada);
            }
            fetchContas();

            await sendTelegramEvent({
              title: "Exclusão de Conta Negada",
              emoji: "🚫",
              screen: "Gestão de Contas",
              lines: [
                `A solicitação de exclusão para a Conta #${conta.id} (${conta.descricao || "Sem descrição"}) foi negada pelo financeiro.`,
              ],
            });
            logEvent("EXCLUSAO_CONTA_NEGADA", { id: conta.id });
            toast.warn("Solicitação de exclusão negada.");
          }

          encerrarPolling(requestId);
          return;
        }
      } catch (e) {
        console.error('[Polling] erro:', e);
      }

      if (pendentesRef.current[requestId]) {
        pendentesRef.current[requestId].attempts += 1;
        pendentesRef.current[requestId].timer = setTimeout(loop, POLL_INTERVAL_MS);
      }
    };

    pendentesRef.current[requestId] = {
      contaId: conta.id,
      sinceTs,
      attempts: pendentesRef.current[requestId]?.attempts || 0,
      timer: setTimeout(loop, POLL_INTERVAL_MS),
    };
  };

  const handleExcluirConta = (conta) => {
    if (!isAdmin()) {
      toast.error("Apenas administradores podem solicitar a exclusão de contas.");
      return;
    }
    setModalMotivoConfig({ isOpen: true, conta });
  };

  const confirmarExclusaoConta = async (motivo) => {
    if (!isAdmin()) {
      toast.error("Apenas administradores podem solicitar a exclusão de contas.");
      return;
    }
    const conta = modalMotivoConfig.conta;
    setModalMotivoConfig({ isOpen: false, conta: null });
    if (!conta) return;

    const isOrigemNotaFiscal =
      conta.origem === 'Nota Fiscal' ||
      conta.notaFiscalId ||
      conta.descricao?.toLowerCase().includes('nota fiscal') ||
      conta.observacao?.toLowerCase().includes('nota fiscal');

    const requestId = `REQ-CONTA-${Date.now()}`;
    const idNota = conta.notaFiscalId || conta.id;

    const contaPendente = {
      ...conta,
      exclusaoPendente: true,
      deleteRequestId: requestId,
      motivoExclusao: motivo
    };

    try {
      await atualizarConta(conta.id, contaPendente);
      fetchContas();

      const texto =
        '🧹 <b>Solicitação de Exclusão de Conta</b>\n' +
        `<b>Usuário:</b> ${usuarioLogado}\n` +
        `<b>ID Conta:</b> #${conta.id}\n` +
        (isOrigemNotaFiscal ? `<b>ID Nota Fiscal:</b> #${idNota}\n` : '') +
        `<b>Descrição:</b> ${conta.descricao}\n` +
        `<b>Tipo:</b> ${conta.tipo}\n` +
        `<b>Valor:</b> ${formatCurrencyBRL(conta.valor)}\n` +
        `<b>Vencimento:</b> ${formatDateBR(conta.vencimento)}\n` +
        `<b>Motivo:</b> ${motivo}\n\n` +
        'Selecione uma opção:';

      const replyMarkup = {
        inline_keyboard: [[
          { text: '✅ Aprovar', callback_data: `delete_conta:approve:${requestId}` },
          { text: '❌ Negar', callback_data: `delete_conta:deny:${requestId}` }
        ]]
      };

      await tgSendRaw(texto, replyMarkup);
      toast.info('Solicitação enviada ao financeiro. Aguardando aprovação…');

      logEvent("SOLICITACAO_EXCLUSAO_CONTA", { idConta: conta.id, requestId });

      pendentesRef.current[requestId] = { attempts: 0 };
      iniciarPollingDecisao(requestId, conta, Date.now());
    } catch (error) {
      toast.error("Erro ao solicitar exclusão da conta.");
      logEvent("ERRO_SOLICITAR_EXCLUSAO_CONTA", { id: conta.id, error: error.message });
    }
  };

  const calcularTotalBaixado = (conta) => {
    return (conta.baixas || []).reduce(
      (acc, b) => acc + (Number(b.valor) || 0),
      0
    );
  };

  const contasFiltradas = useMemo(() => {
    return contas.filter((c) => {
      if (filtroTipo !== "Todos" && c.tipo !== filtroTipo) return false;
      if (filtroStatus !== "Todos" && c.status !== filtroStatus) return false;
      return true;
    });
  }, [contas, filtroTipo, filtroStatus]);

  const resumoFinanceiro = useMemo(() => {
    let totalPagar = 0;
    let totalReceber = 0;
    let totalBaixas = 0;

    contas.forEach((c) => {
      const val = Number(c.valor) || 0;
      if (c.tipo === "Pagar") {
        totalPagar += val;
      } else if (c.tipo === "Receber") {
        totalReceber += val;
        totalBaixas += calcularTotalBaixado(c);
      }
    });

    return {
      totalPagar,
      totalReceber,
      totalBaixas,
      saldoPreviso: totalReceber - totalPagar,
    };
  }, [contas]);

  const handleSelectTipo = (tipo) => {
    setFiltroTipo(tipo);
    if (tipo === "Todos") setFiltroStatus("Todos");
  };

  const handleSelectStatus = (status) => setFiltroStatus(status);

  const handleNovaConta = () => {
    setContaParaEditar(null);
    setModalOpen(true);
  };

  const handleEditarConta = (conta) => {
    setContaParaEditar(conta);
    setModalOpen(true);
  };

  const abrirModalPix = (conta) => {
    setFaturaSysSelecionada(conta);
    setModalPixOpen(true);
  };

  const handleCopiarChavePix = () => {
    const bankCfg = getBankConfig();
    const chave = bankCfg.pixKey || "jsa.tech.jsa@gmail.com";
    navigator.clipboard.writeText(chave);
    toast.success("Chave Pix copiada com sucesso!");
  };

  const handleConfirmarPagamentoBanco = async () => {
    if (!faturaSysSelecionada) return;

    try {
      setVerificandoPagamento(true);
      toast.info("Consultando API do banco para validação do pagamento...");

      const resStatus = await consultarStatusPagamentoBanco({
        fatura: faturaSysSelecionada,
        transacaoId: faturaSysSelecionada.transacaoId,
      });

      if (resStatus.pago) {
        const userObj = getCurrentUser() || {
          name: usuarioLogado,
          email: localStorage.getItem("usuario_email") || "",
        };

        await processarConfirmacaoPagamentoFaturaSys({
          fatura: faturaSysSelecionada,
          usuario: userObj,
          txId: resStatus.transacaoId,
        });

        fetchContas();
        setModalPixOpen(false);
        setModalBoletoOpen(false);
        setFaturaSysSelecionada(null);
      } else {
        toast.warn("Pagamento ainda pendente no banco. Aguarde a compensação.");
      }
    } catch (e) {
      console.error("Erro ao confirmar pagamento com o banco:", e);
      toast.error("Erro ao processar confirmação bancária.");
    } finally {
      setVerificandoPagamento(false);
    }
  };

  const handleEmitirBoleto = async (contaAlvo) => {
    const conta = contaAlvo || faturaSysSelecionada;
    if (!conta) return;

    try {
      setEmitindoBoleto(true);
      toast.info("Emitindo boleto bancário via Banco Cora API v2...");

      const currentUser = getCurrentUser();
      const rawUser = localStorage.getItem("user") || localStorage.getItem("currentUser");
      const parsedUser = rawUser ? JSON.parse(rawUser) : null;

      const userObj = {
        name:
          currentUser?.nomeCompleto ||
          currentUser?.name ||
          currentUser?.nome ||
          parsedUser?.name ||
          parsedUser?.nome ||
          localStorage.getItem("usuario_nome") ||
          usuarioLogado ||
          "Cliente JSA",
        email:
          currentUser?.email ||
          parsedUser?.email ||
          localStorage.getItem("usuario_email") ||
          "financeiro@jsasolucoes.com.br",
        cpf:
          currentUser?.cpf ||
          parsedUser?.cpf ||
          localStorage.getItem("usuario_cpf") ||
          "34052649000178",
        dataNascimento:
          currentUser?.dataNascimento ||
          parsedUser?.dataNascimento ||
          localStorage.getItem("usuario_nascimento") ||
          "",
        whatsapp:
          currentUser?.whatsapp ||
          parsedUser?.whatsapp ||
          localStorage.getItem("usuario_whatsapp") ||
          "",
      };

      const boleto = await emitirBoletoCora({
        fatura: conta,
        usuario: userObj,
      });

      setBoletoGerado(boleto);
      setFaturaSysSelecionada(conta);
      setModalPixOpen(false);
      setModalBoletoOpen(true);
      toast.success(`Boleto emitido em nome de ${userObj.name} pelo Banco Cora!`);
    } catch (e) {
      console.error("Erro ao emitir boleto Cora:", e);
      toast.error("Erro ao emitir boleto via Banco Cora.");
    } finally {
      setEmitindoBoleto(false);
    }
  };

  const handleSaveConta = async (payload) => {
    try {
      const isEdicao = Boolean(payload.id);

      if (isEdicao) {
        if (payload.descricao === NOME_CONTA_SYS && payload.tipo === "Pagar") {
          payload.editada = true;
        }

        await atualizarConta(payload.id, payload);

        toast.success(
          `Conta ${payload.tipo === "Pagar" ? "A PAGAR" : "A RECEBER"} atualizada com sucesso!`
        );

        const emoji = payload.tipo === "Pagar" ? "🔴" : "🟢";
        await sendTelegramEvent({
          title: `Conta a ${payload.tipo} Alterada`,
          emoji,
          screen: "Gestão de Contas",
          lines: [
            `🏷️ Tipo: ${payload.tipo === "Pagar" ? "A PAGAR" : "A RECEBER"}`,
            `📄 Origem/Descrição: ${payload.descricao}`,
            payload.observacao ? `📝 Obs: ${payload.observacao}` : null,
            `💰 Valor: ${formatCurrencyBRL(payload.valor)}`,
            `📅 Vencimento: ${formatDateBR(payload.vencimento)}`,
            `📌 Status: ${payload.status}`,
            `🆔 ID da Conta: #${payload.id}`,
          ].filter(Boolean),
        });

      } else {
        const novaConta = await salvarConta(payload);
        const novoId = novaConta?.id || Date.now();

        if (payload.applyBaixa && payload.baixaTargetId) {
          await registrarBaixaParcialPorId(payload.baixaTargetId, {
            valor: payload.valor,
            observacao: payload.baixaObs || `Vinculado à conta #${novoId}`,
          });

          toast.success(
            `Baixa registrada com sucesso no valor de ${formatCurrencyBRL(payload.valor)}!`
          );

          await sendTelegramEvent({
            title: "Baixa Parcial / Total Registrada",
            emoji: "🔵",
            screen: "Gestão de Contas",
            lines: [
              `📄 Origem/Descrição: ${payload.descricao}`,
              payload.observacao ? `📝 Obs: ${payload.observacao}` : null,
              `💰 Valor da Baixa: ${formatCurrencyBRL(payload.valor)}`,
              `📅 Vencimento: ${formatDateBR(payload.vencimento)}`,
              `📌 Status: ${payload.status}`,
              `🆔 ID da Conta: #${novoId}`,
            ].filter(Boolean),
          });
        } else if (payload.tipo === "Pagar") {
          toast.warning(
            `Conta A PAGAR registrada com sucesso! Valor: ${formatCurrencyBRL(payload.valor)}`
          );

          await sendTelegramEvent({
            title: "Nova Conta A PAGAR Cadastrada",
            emoji: "🔴",
            screen: "Gestão de Contas",
            lines: [
              `🏷️ Tipo: A PAGAR`,
              `📄 Origem/Descrição: ${payload.descricao}`,
              payload.observacao ? `📝 Obs: ${payload.observacao}` : null,
              `💰 Valor Total: ${formatCurrencyBRL(payload.valor)}`,
              `📅 Vencimento: ${formatDateBR(payload.vencimento)}`,
              `📌 Status: ${payload.status}`,
              `🆔 ID da Conta: #${novoId}`,
            ].filter(Boolean),
          });
        } else {
          toast.success(
            `Conta A RECEBER registrada com sucesso! Valor: ${formatCurrencyBRL(payload.valor)}`
          );

          await sendTelegramEvent({
            title: "Nova Conta A RECEBER Cadastrada",
            emoji: "🟢",
            screen: "Gestão de Contas",
            lines: [
              `🏷️ Tipo: A RECEBER`,
              `📄 Origem/Descrição: ${payload.descricao}`,
              payload.observacao ? `📝 Obs: ${payload.observacao}` : null,
              `💰 Valor Total: ${formatCurrencyBRL(payload.valor)}`,
              `📅 Vencimento: ${formatDateBR(payload.vencimento)}`,
              `📌 Status: ${payload.status}`,
              `🆔 ID da Conta: #${novoId}`,
            ].filter(Boolean),
          });
        }
      }

      setModalOpen(false);
      setContaParaEditar(null);
      fetchContas();
    } catch (error) {
      toast.error("Erro ao salvar a conta. Verifique os dados prestados.");
      logEvent("ERRO_SALVAR_CONTA", { payload, error: error.message });
    }
  };

  const handleImprimirRelatorio = () => {
    window.print();
  };

  const handleAplicarPagamento = async ({
    identificador,
    tipoPagamento,
    valorPago,
    observacao,
    dataPagamento,
  }) => {
    try {
      const res = await aplicarPagamentoConta({
        identificador,
        tipoPagamento,
        valorPago,
        observacao,
        dataPagamento,
      });

      if (res.sucesso) {
        fetchContas();

        const emoji = res.estaQuitada ? "🟢" : "🟡";
        await sendTelegramEvent({
          title: res.estaQuitada
            ? "Pagamento Total Confirmado"
            : "Pagamento Parcial Confirmado",
          emoji,
          screen: "Gestão de Contas",
          lines: [
            `📄 Origem/Descrição: ${res.conta.descricao}`,
            `🔢 Código da Conta: #${res.conta.codigo || res.conta.id}`,
            `🏷️ Tipo: ${res.conta.tipo === "Pagar" ? "A PAGAR" : "A RECEBER"}`,
            `💰 Valor Aplicado: ${formatCurrencyBRL(res.valorAplicado)}`,
            `📊 Saldo Restante: ${formatCurrencyBRL(res.saldoRestante)}`,
            `📌 Status Atual: ${res.conta.status}`,
            observacao ? `📝 Obs: ${observacao}` : null,
          ].filter(Boolean),
        });
      }
    } catch (err) {
      console.error("Erro no handleAplicarPagamento:", err);
      toast.error("Erro ao processar confirmação de pagamento.");
    }
  };

  return (
    <div className="contas-page-container fade-in-page">
      <header className="contas-header no-print">
        <h1>Gestão de Contas</h1>
        <div className="header-actions">
          <button className="btn-nova-conta" onClick={handleNovaConta}>
            + Nova Conta
          </button>

          <button
            type="button"
            className="btn-confirmar-pagamento"
            onClick={() => {
              setContaParaPagamento(null);
              setModalPagamentoOpen(true);
            }}
            style={{
              background: '#10b981',
              color: '#fff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <span>💳</span> Confirmar Pagamento
          </button>

          <button
            className="btn-relatorio"
            onClick={() => setModalRelatorioOpen(true)}
            style={{
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              padding: '10px 16px',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <FaFileAlt /> Gerar Relatório
          </button>
        </div>
      </header>

      {/* Filtros */}
      <div className="contas-filtros no-print">
        <div className="filtro-grupo">
          <span className="filtro-titulo">Tipo:</span>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={filtroTipo === "Todos"}
              onChange={() => handleSelectTipo("Todos")}
            />
            Todos
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={filtroTipo === "Pagar"}
              onChange={() => handleSelectTipo("Pagar")}
            />
            A Pagar
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={filtroTipo === "Receber"}
              onChange={() => handleSelectTipo("Receber")}
            />
            A Receber
          </label>
        </div>

        {filtroTipo !== "Todos" && (
          <div className="filtro-grupo">
            <span className="filtro-titulo">Status:</span>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filtroStatus === "Todos"}
                onChange={() => handleSelectStatus("Todos")}
              />
              Todos
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filtroStatus === "Pendente"}
                onChange={() => handleSelectStatus("Pendente")}
              />
              Pendente
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={filtroStatus === "Pago"}
                onChange={() => handleSelectStatus("Pago")}
              />
              Pago
            </label>
          </div>
        )}
      </div>

      {/* Lista */}
      <div className="contas-lista no-print">
        {loading ? (
          <p className="no-data">Carregando contas...</p>
        ) : contasFiltradas.length === 0 ? (
          <p className="no-data">Nenhuma conta encontrada com os filtros selecionados.</p>
        ) : (
          contasFiltradas.map((conta, index) => {
            const totalBaixado = calcularTotalBaixado(conta);
            const saldoPendente = (Number(conta.valor) || 0) - totalBaixado;

            const isSysManutencao = conta.descricao === NOME_CONTA_SYS && conta.tipo === "Pagar";
            const jaEditada = conta.editada === true;

            return (
              <div
                key={conta.id}
                className={`conta-card card-slide-in ${conta.tipo?.toLowerCase()} ${conta.status?.toLowerCase()}`}
                style={{ animationDelay: `${index * 0.04}s` }}
              >
                <div className="conta-card-header">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={`badge-tipo ${conta.tipo?.toLowerCase()}`}>
                      {conta.tipo === "Receber" ? "A Receber" : "A Pagar"}
                    </span>
                    <span
                      style={{
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        color: '#34d399',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        fontFamily: 'monospace',
                        letterSpacing: '1px',
                      }}
                      title="Código único de 6 dígitos da Conta"
                    >
                      #{conta.codigo || conta.id}
                    </span>
                  </div>
                  <span className={`badge-status ${conta.status?.toLowerCase()}`}>
                    {conta.status}
                  </span>
                </div>

                <div className="conta-card-body">
                  <h3>{conta.descricao}</h3>
                  {conta.observacao && (
                    <p className="conta-obs">
                      <strong>Obs:</strong> {conta.observacao}
                    </p>
                  )}
                  <p>
                    <strong>Vencimento:</strong> {formatDateBR(conta.vencimento)}
                  </p>
                  <p>
                    <strong>Valor Total:</strong> {formatCurrencyBRL(conta.valor)}
                  </p>

                  {conta.tipo === "Receber" && conta.baixas?.length > 0 && (
                    <div className="conta-baixas-info">
                      <p className="txt-sucesso">
                        <strong>Já Recebido:</strong> {formatCurrencyBRL(totalBaixado)}
                      </p>
                      <p className="txt-alerta">
                        <strong>Saldo Pendente:</strong> {formatCurrencyBRL(saldoPendente)}
                      </p>
                    </div>
                  )}

                  {isUserAdmin && conta.exclusaoPendente && (
                    <div className="conta-alert-box danger" style={{ marginTop: '10px', color: '#ff4d4d' }}>
                      <small>🚨 Exclusão aguardando aprovação do financeiro...</small>
                    </div>
                  )}
                </div>

                <div className="conta-card-actions">
                  {/* Botão Baixar / Confirmar Pagamento para contas pendentes */}
                  {!isSysManutencao && conta.status !== "Pago" && (
                    <button
                      type="button"
                      className="btn-pagar-card"
                      onClick={() => {
                        setContaParaPagamento(conta);
                        setModalPagamentoOpen(true);
                      }}
                      style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        color: '#34d399',
                        border: '1px solid rgba(16, 185, 129, 0.4)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        fontWeight: '700',
                        fontSize: '0.8rem',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        transition: 'all 0.2s',
                      }}
                      title="Confirmar pagamento parcial ou total nesta conta"
                    >
                      <span>💳</span> Baixar / Pagar
                    </button>
                  )}

                  {(!isSysManutencao || !jaEditada) && (
                    <button
                      className="btn-editar"
                      onClick={() => handleEditarConta(conta)}
                      disabled={isUserAdmin && conta.exclusaoPendente}
                      title="Editar Conta"
                    >
                      <FaEdit /> Editar
                    </button>
                  )}

                  {isSysManutencao ? (
                    conta.status === "Pago" ? (
                      <div
                        style={{
                          background: "rgba(16, 185, 129, 0.15)",
                          border: "1px solid #10b981",
                          color: "#34d399",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          fontWeight: "700",
                          fontSize: "0.85rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "6px",
                        }}
                      >
                        ✅ Quitado / Liberado
                      </div>
                    ) : (
                      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                        <button
                          className="btn-pagar-pix"
                          onClick={() => abrirModalPix(conta)}
                          title="Pagar via Pix / Banco"
                        >
                          <AiOutlineQrcode size={18} /> Pagar via Pix
                        </button>

                        <button
                          className="btn-emitir-boleto"
                          onClick={() => handleEmitirBoleto(conta)}
                          disabled={emitindoBoleto}
                          title="Emitir Boleto Bancário"
                        >
                          <FaFileAlt size={14} /> {emitindoBoleto ? "Emitindo..." : "Emitir Boleto"}
                        </button>
                      </div>
                    )
                  ) : isUserAdmin ? (
                    conta.exclusaoPendente ? (
                      <button
                        className="btn-excluir btn-warning"
                        disabled
                        style={{ opacity: 0.8, cursor: 'not-allowed' }}
                        title="Exclusão aguardando aprovação do financeiro..."
                      >
                        ⏳ Exclusão Pendente...
                      </button>
                    ) : (
                      <button
                        className="btn-excluir"
                        onClick={() => handleExcluirConta(conta)}
                        title="Solicitar Exclusão da Conta"
                      >
                        <FaTrash /> Solicitar Exclusão
                      </button>
                    )
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Modal Pix */}
      {modalPixOpen && (
        <div className="modal-overlay" onClick={() => !verificandoPagamento && setModalPixOpen(false)}>
          <div className="modal-content modal-pix-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-pix-header">
              <h2>Pagamento via Pix / Banco</h2>
              <p className="modal-pix-subtitle">{NOME_CONTA_SYS}</p>
              {faturaSysSelecionada && (
                <div className="pix-valor-badge">
                  {formatCurrencyBRL(faturaSysSelecionada.valor || 10)}
                </div>
              )}
            </div>

            <div className="modal-pix-body-grid">
              <div className="modal-pix-qr-col">
                <div className="qrcode-container">
                  <img src={qrCodeImg} alt="QR Code Pix" className="qrcode-img" />
                </div>
                <span className="qrcode-instruction">Aponte a câmera do seu banco</span>
              </div>

              <div className="modal-pix-info-col">
                <div className="chave-pix-container">
                  <span>Chave Pix (E-mail):</span>
                  <div className="chave-pix-row">
                    <strong className="chave-pix-code">{getBankConfig().pixKey}</strong>
                    <button
                      type="button"
                      className="btn-copiar-pix"
                      onClick={handleCopiarChavePix}
                      title="Copiar Chave Pix"
                    >
                      📋 Copiar
                    </button>
                  </div>
                </div>

                <div className="pix-acoes-container">
                  <button
                    type="button"
                    className="btn-opcao-boleto"
                    onClick={() => handleEmitirBoleto(faturaSysSelecionada)}
                    disabled={emitindoBoleto}
                    title="Emitir Boleto Bancário pelo Banco Cora"
                  >
                    📄 {emitindoBoleto ? "Emitindo..." : "Preferir Boleto Bancário"}
                  </button>

                  <button
                    type="button"
                    className="btn-confirmar-banco"
                    onClick={handleConfirmarPagamentoBanco}
                    disabled={verificandoPagamento}
                  >
                    {verificandoPagamento ? "⏳ Verificando..." : "✅ Confirmar Pagamento"}
                  </button>

                  <button
                    type="button"
                    className="btn-fechar-modal"
                    onClick={() => setModalPixOpen(false)}
                    disabled={verificandoPagamento}
                  >
                    Fechar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Boleto Bancário Cora */}
      <ModalBoleto
        isOpen={modalBoletoOpen}
        onClose={() => setModalBoletoOpen(false)}
        boleto={boletoGerado}
        onConfirmarPagamento={handleConfirmarPagamentoBanco}
        processando={verificandoPagamento}
      />

      {/* Modal de Relatório Financeiro */}
      {modalRelatorioOpen && (
        <div className="modal-overlay modal-relatorio-overlay" onClick={() => setModalRelatorioOpen(false)}>
          <div
            className="modal-box modal-relatorio-box relatorio-print-area"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relatorio-header">
              <div>
                <h2>Relatório de Gestão Financeira</h2>
                <p>
                  Usuário: <strong>{usuarioLogado}</strong>
                </p>
              </div>

              <button
                type="button"
                className="btn-imprimir no-print"
                onClick={handleImprimirRelatorio}
              >
                <FaPrint /> Imprimir
              </button>
            </div>

            <div className="relatorio-tabela-container">
              <table className="relatorio-tabela">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Tipo</th>
                    <th>Origem/Descrição</th>
                    <th>Vencimento</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Valor Total</th>
                  </tr>
                </thead>
                <tbody>
                  {contas.map((c) => (
                    <tr key={c.id}>
                      <td style={{ fontWeight: 700, color: '#ff5252' }}>#{c.id}</td>
                      <td>{c.tipo}</td>
                      <td style={{ fontWeight: 600 }}>{c.descricao}</td>
                      <td>{formatDateBR(c.vencimento)}</td>
                      <td>
                        <span style={{
                          padding: '3px 8px',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                          backgroundColor: c.status === 'Pago' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                          color: c.status === 'Pago' ? '#4ade80' : '#fbbf24',
                          border: `1px solid ${c.status === 'Pago' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                        }}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontWeight: 700, color: c.tipo === 'Pagar' ? '#ef4444' : '#22c55e' }}>
                        {formatCurrencyBRL(c.valor)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="relatorio-resumo">
              <h3>Resumo de Cálculos</h3>
              <div className="relatorio-resumo-grid">
                <div className="kpi-box kpi-pagar">
                  <small>Total A Pagar:</small>
                  <p className="txt-pagar">{formatCurrencyBRL(resumoFinanceiro.totalPagar)}</p>
                </div>
                <div className="kpi-box kpi-receber">
                  <small>Total A Receber:</small>
                  <p className="txt-receber">{formatCurrencyBRL(resumoFinanceiro.totalReceber)}</p>
                </div>
                <div className="kpi-box kpi-baixas">
                  <small>Total de Baixas (Recebido):</small>
                  <p className="txt-baixas">{formatCurrencyBRL(resumoFinanceiro.totalBaixas)}</p>
                </div>
                <div className="kpi-box kpi-saldo">
                  <small>Saldo Previsto:</small>
                  <p className={resumoFinanceiro.saldoPreviso >= 0 ? "txt-receber" : "txt-pagar"}>
                    {formatCurrencyBRL(resumoFinanceiro.saldoPreviso)}
                  </p>
                </div>
              </div>
            </div>

            <div className="relatorio-footer">
              Copyright © 2026 <b>JSA Soluções Tecnológicas</b>. All rights reserved.
            </div>

            <div className="relatorio-acoes-bottom no-print">
              <button
                className="cancela"
                type="button"
                onClick={() => setModalRelatorioOpen(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Motivo de Exclusão */}
      <ModalMotivo
        isOpen={modalMotivoConfig.isOpen}
        onClose={() => setModalMotivoConfig({ isOpen: false, conta: null })}
        onConfirm={confirmarExclusaoConta}
        titulo="Solicitar Exclusão de Conta"
        descricao="Informe o motivo da exclusão para enviar a solicitação de aprovação:"
        textoBotao="Solicitar Exclusão"
      />

      <ModalConta
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setContaParaEditar(null);
        }}
        onSave={handleSaveConta}
        contaParaEditar={contaParaEditar}
        conta={contaParaEditar}
        contasParaBaixa={contas}
      />

      <ModalFiltroCobranca
        isOpen={modalFiltroOpen}
        onClose={() => setModalFiltroOpen(false)}
      />

      {/* Modal de Confirmação de Pagamento Parcial / Total */}
      <ModalConfirmarPagamento
        isOpen={modalPagamentoOpen}
        onClose={() => {
          setModalPagamentoOpen(false);
          setContaParaPagamento(null);
        }}
        contas={contas}
        contaSelecionadaInicial={contaParaPagamento}
        onAplicarPagamento={handleAplicarPagamento}
      />
    </div>
  );
};

export default ContasPage;