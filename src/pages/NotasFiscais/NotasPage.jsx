// src/pages/NotasFiscais/NotasPage.jsx
import React, { useEffect, useRef, useState } from 'react';
import {
  listarNotas,
  salvarNota,
  atualizarNota,
  cancelarNota,
  excluirNota,
  chaveExiste,
} from '../../services/notasService';

import ModalNota from '../../components/Modais/ModalNota';
import ModalMotivo from '../../components/Modais/ModalMotivo';
import ModalDanfe from '../../components/Modais/ModalDanfe';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import {
  listarContas as listarContasFinanceiro,
  salvarConta as salvarContaFinanceiro,
  sincronizarContasDoServidor,
} from '../../services/contasService';

import { gerarDanfePDF } from '../../utils/gerarDanfePDF';

import { logEvent } from '../../utils/logger';
import {
  sendTelegramEvent,
  sendTelegramMessage,
  formatCurrencyBRL,
  formatDateBR,
} from '../../utils/telegram';

import '../../components/Visual/NotasPage.css';

/* ---------------- Cooldown de cancelamento ---------------- */
const NF_COOLDOWN_KEY = 'nf_cancel_retry';
const NF_COOLDOWN_MS = 10_000;

function nfGetCooldownMap() {
  try {
    const raw = localStorage.getItem(NF_COOLDOWN_KEY);
    const obj = raw ? JSON.parse(raw) : {};
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function nfSaveCooldownMap(map) {
  try {
    localStorage.setItem(NF_COOLDOWN_KEY, JSON.stringify(map || {}));
  } catch { }
}

function nfStartCooldown(id, ms = NF_COOLDOWN_MS) {
  if (!id) return;
  const map = nfGetCooldownMap();
  const now = Date.now();
  if (!map[id] || now >= map[id]) {
    map[id] = now + ms;
    nfSaveCooldownMap(map);
  }
}

function nfRemaining(id, now = Date.now()) {
  const map = nfGetCooldownMap();
  const ts = map[id] || 0;
  return Math.max(0, ts - now);
}

/* ---------------- Helpers ---------------- */
const formatarValor = (v) => formatCurrencyBRL(v);
const formatarData = (d) => formatDateBR(d);

const extrairLinhasNota = (nota) => {
  const origem = nota.origem || nota.clienteOuServico || '-';
  const numero = nota.numero || '-';
  const tipo = nota.tipo || '-';
  const valor = formatarValor(nota.valor);
  const data = formatarData(nota.dataEmissao);
  const status = nota.status || 'Adicionada';

  const lines = [
    `Origem: ${origem}`,
    `Número: ${numero}`,
    `Tipo: ${tipo}`,
    `Valor: ${valor}`,
    `Data: ${data}`,
    `Status: ${status}`,
  ];

  if (nota.motivoCancelamento) {
    lines.push(`Motivo: ${nota.motivoCancelamento}`);
  }

  return lines;
};

function extrairNumeroLimpoNota(nota) {
  let num = String(nota.numero || '').trim();
  const chave = String(nota.chavedeacesso || '').replace(/\D+/g, '');

  if (num.replace(/\D+/g, '').length >= 20) {
    const numPuro = num.replace(/\D+/g, '');
    const nNF = numPuro.slice(25, 34);
    num = String(Number(nNF) || numPuro.slice(-6));
  } else if (!num && chave.length === 44) {
    const nNF = chave.slice(25, 34);
    num = String(Number(nNF));
  }
  return num || String(nota.id || '1');
}

function obterDescricaoNotaLimpa(nota) {
  const numLimpo = extrairNumeroLimpoNota(nota);
  const origemOuCliente = nota.origem || nota.clienteOuServico || '';
  if (numLimpo) {
    return origemOuCliente ? `NF ${numLimpo} - ${origemOuCliente}` : `NF ${numLimpo}`;
  }
  return origemOuCliente ? `NF - ${origemOuCliente}` : `NF #${nota.id || '1'}`;
}

/* ---------------- Geração de conta a receber ao emitir nota ---------------- */
async function gerarContaReceberParaNota(notaCriada) {
  try {
    const contas = (await sincronizarContasDoServidor()) || listarContasFinanceiro() || [];
    const numLimpo = extrairNumeroLimpoNota(notaCriada);

    const jaExiste = contas.some(
      (c) =>
        (String(c.referenciaTipo) === 'nota' && String(c.referenciaId) === String(notaCriada.id)) ||
        (numLimpo && c.descricao && (c.descricao.includes(`NF ${numLimpo}`) || c.descricao.includes(`NF #${numLimpo}`)))
    );
    if (jaExiste) return;

    const descricao = obterDescricaoNotaLimpa(notaCriada);

    const novaConta = {
      tipo: 'Receber',
      descricao,
      valor: Number(notaCriada.valor) || 0,
      vencimento: notaCriada.dataEmissao || new Date().toISOString().slice(0, 10),
      status: 'Pendente',
      referenciaTipo: 'nota',
      referenciaId: String(notaCriada.id),
    };

    const criada = salvarContaFinanceiro(novaConta);

    logEvent({
      type: 'notas',
      title: 'Conta a receber gerada pela Nota',
      details: {
        notaId: notaCriada.id,
        notaNumero: notaCriada.numero,
        contaId: criada?.id,
        descricao: criada?.descricao,
        valor: criada?.valor,
        vencimento: criada?.vencimento,
      },
    });

    const lines = [
      `Descrição: ${criada?.descricao || '-'}`,
      `Valor: ${formatarValor(criada?.valor)}`,
      `Vencimento: ${formatarData(criada?.vencimento)}`,
      `Status: ${criada?.status || '-'}`,
    ];
    if (notaCriada.numero) {
      lines.push(`NF: #${notaCriada.numero}`);
    }

    await sendTelegramEvent({
      title: 'Conta a Receber Gerada Automaticamente',
      emoji: '🟢',
      screen: 'Notas Fiscais',
      lines,
    });
  } catch (e) {
    console.error('[Notas] Falha ao gerar conta a receber:', e);
  }
}

/* ---------------- Telegram polling ---------------- */
const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 45;

export default function NotasPage() {
  const [notas, setNotas] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState(null);
  const [numeroBusca, setNumeroBusca] = useState('');
  const [selecionadas, setSelecionadas] = useState({});
  const [enviandoContas, setEnviandoContas] = useState(false);
  const [danfeModalNota, setDanfeModalNota] = useState(null);

  /* Estado do Modal de Motivo (Cancelamento / Exclusão) */
  const [modalMotivoConfig, setModalMotivoConfig] = useState({
    isOpen: false,
    nota: null,
    tipo: 'cancelar', // 'cancelar' | 'excluir'
    titulo: '',
    descricao: '',
    placeholder: '',
    textoBotao: 'Confirmar',
  });

  /* Estado de bloqueio com ampulheta */
  const [processandoAcao, setProcessandoAcao] = useState(false);
  const [mensagemProcessamento, setMensagemProcessamento] = useState('');

  const pendentesRef = useRef({});
  const lastUpdateIdRef = useRef(0);

  const carregarNotas = () => {
    const dados = listarNotas();
    setNotas(dados || []);
  };

  useEffect(() => {
    carregarNotas();

    return () => {
      Object.keys(pendentesRef.current).forEach((reqId) => {
        if (pendentesRef.current[reqId]?.timer) {
          clearTimeout(pendentesRef.current[reqId].timer);
        }
      });
    };
  }, []);

  const handleProcessarNumeroNota = (e) => {
    e?.preventDefault();
    const numLimpo = numeroBusca.trim();

    if (!numLimpo) {
      toast.warn('Por favor, informe o número ou chave de acesso da nota fiscal.');
      return;
    }

    const notaExistente = (notas || []).find(
      (n) =>
        String(n.numero || '').trim().toLowerCase() === numLimpo.toLowerCase() ||
        String(n.chavedeacesso || '').trim().toLowerCase() === numLimpo.toLowerCase()
    );

    if (notaExistente) {
      toast.info(`Nota encontrada! Abrindo para edição.`);
      setNotaSelecionada(notaExistente);
    } else {
      toast.info(`Nota não encontrada. Abrindo cadastro preenchido.`);

      const eChaveLonga = /^\d{20,}$/.test(numLimpo);

      setNotaSelecionada({
        numero: eChaveLonga ? '' : numLimpo,
        chavedeacesso: numLimpo,
        status: 'Adicionada',
      });
    }

    setModalAberto(true);
    setNumeroBusca('');
  };

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
      disable_web_page_preview: 'true',
    };
    if (replyMarkupObj) params.reply_markup = JSON.stringify(replyMarkupObj);
    const body = new URLSearchParams(params).toString();
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
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
    const body = new URLSearchParams({
      callback_query_id: String(callbackQueryId),
      text,
      show_alert: 'false',
    }).toString();
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });
    } catch (e) {
      console.error('[TG] answerCallbackQuery falhou:', e);
    }
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
          reply_markup: JSON.stringify({ inline_keyboard: [] }),
        }).toString(),
      });
      await fetch(`${base}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          chat_id: String(chatId),
          message_id: String(messageId),
          text: `${originalText}\n\n${suffix}`,
          parse_mode: 'HTML',
          disable_web_page_preview: 'true',
        }).toString(),
      });
    } catch (e) {
      console.error('[TG] edição do texto falhou:', e);
    }
  };

  const checarAprovacaoTelegram = async (requestId, sinceTs) => {
    const base = tgBase();
    if (!base) return { status: 'indefinido' };

    try {
      const url = `${base}/getUpdates?offset=${lastUpdateIdRef.current + 1}`;
      const resp = await fetch(url);
      const json = await resp.json();
      if (!json.ok || !Array.isArray(json.result)) return { status: 'indefinido' };

      const reApproveCancelCb = new RegExp(`^cancel:approve:${requestId}$`, 'i');
      const reDenyCancelCb = new RegExp(`^cancel:deny:${requestId}$`, 'i');
      const reApproveDeleteCb = new RegExp(`^delete:approve:${requestId}$`, 'i');
      const reDenyDeleteCb = new RegExp(`^delete:deny:${requestId}$`, 'i');

      const reApproveCmd = new RegExp(`^/(aprovar|aprovado)\\s+${requestId}\\b`, 'i');
      const reDenyCmd = new RegExp(`^/(negar|negado)\\s+${requestId}\\b`, 'i');

      let decided = 'pendente';
      let action = 'cancel';
      let cbMeta = null;

      for (const upd of json.result) {
        if (typeof upd.update_id === 'number' && upd.update_id > lastUpdateIdRef.current) {
          lastUpdateIdRef.current = upd.update_id;
        }

        const cbData = upd?.callback_query?.data;
        if (cbData) {
          if (reApproveCancelCb.test(cbData)) { decided = 'aprovado'; action = 'cancel'; }
          else if (reDenyCancelCb.test(cbData)) { decided = 'negado'; action = 'cancel'; }
          else if (reApproveDeleteCb.test(cbData)) { decided = 'aprovado'; action = 'delete'; }
          else if (reDenyDeleteCb.test(cbData)) { decided = 'negado'; action = 'delete'; }

          if (decided !== 'pendente') {
            cbMeta = {
              id: upd.callback_query.id,
              chatId: upd.callback_query.message?.chat?.id,
              messageId: upd.callback_query.message?.message_id,
              messageText: upd.callback_query.message?.text || '',
            };
            break;
          }
        }

        const text = upd?.message?.text || '';
        if (text) {
          const msgDateSec = upd?.message?.date;
          if (!msgDateSec || !sinceTs || msgDateSec * 1000 >= sinceTs) {
            if (reApproveCmd.test(text)) { decided = 'aprovado'; }
            else if (reDenyCmd.test(text)) { decided = 'negado'; }
          }
        }
      }
      return { status: decided, action, cbMeta };
    } catch (e) {
      console.error('[TG] Falha no getUpdates:', e);
      return { status: 'indefinido' };
    }
  };

  const encerrarPolling = (requestId) => {
    const pend = pendentesRef.current[requestId];
    if (pend?.timer) clearTimeout(pend.timer);
    delete pendentesRef.current[requestId];
    setProcessandoAcao(false);
  };

  const iniciarPollingDecisao = (requestId, notaId, sinceTs) => {
    encerrarPolling(requestId);
    setProcessandoAcao(true);

    const loop = async () => {
      const pend = pendentesRef.current[requestId];
      if (!pend) return;

      if (pend.attempts >= POLL_MAX_ATTEMPTS) {
        toast.info('Tempo limite atingido aguardando resposta do financeiro.');
        encerrarPolling(requestId);
        return;
      }

      try {
        const r = await checarAprovacaoTelegram(requestId, sinceTs);
        if (r.status === 'aprovado' || r.status === 'negado') {
          const aprovado = r.status === 'aprovado';

          if (r.cbMeta?.id) {
            await tgAnswerCallback(
              r.cbMeta.id,
              aprovado ? 'Aprovado ✅' : 'Negado ❌'
            );
          }
          if (r.cbMeta?.chatId && r.cbMeta?.messageId) {
            const suffix = aprovado ? '✅ <b>Aprovado</b>' : '❌ <b>Negado</b>';
            await tgDisableButtonsAndAnnotate(
              r.cbMeta.chatId,
              r.cbMeta.messageId,
              r.cbMeta.messageText || '',
              suffix
            );
          }

          if (pend.action === 'delete') {
            if (aprovado) {
              try { excluirNota(notaId); } catch { }
              carregarNotas();

              await sendTelegramEvent({
                title: 'Exclusão Aprovada',
                emoji: '🗑️',
                screen: 'Notas Fiscais',
                lines: [`Nota #${notaId} foi excluída.`],
              });
              toast.success('Exclusão de nota aprovada com sucesso!');
            } else {
              const atual = listarNotas();
              const n = atual.find((x) => x.id === notaId);
              if (n) {
                const restaurada = { ...n };
                delete restaurada.exclusaoPendente;
                delete restaurada.deleteRequestId;
                atualizarNota(restaurada);
              }
              carregarNotas();

              await sendTelegramEvent({
                title: 'Exclusão Negada',
                emoji: '🚫',
                screen: 'Notas Fiscais',
                lines: [`Nota #${notaId} — exclusão negada.`],
              });
              toast.error('Exclusão de nota negada pelo financeiro.');
            }
            encerrarPolling(requestId);
            return;
          }

          if (aprovado) {
            cancelarNota(notaId);
            carregarNotas();

            await sendTelegramEvent({
              title: 'Cancelamento Aprovado',
              emoji: '✅',
              screen: 'Notas Fiscais',
              lines: [`Nota #${notaId} cancelada.`],
            });
            toast.success('Cancelamento de nota aprovado com sucesso!');
          } else {
            const atual = listarNotas();
            const n = atual.find((x) => x.id === notaId);
            if (n) {
              const restaurada = { ...n };
              delete restaurada.statusCancelamento;
              delete restaurada.cancelRequestId;
              atualizarNota(restaurada);
            }
            carregarNotas();

            await sendTelegramEvent({
              title: 'Cancelamento Negado',
              emoji: '🚫',
              screen: 'Notas Fiscais',
              lines: [`Nota #${notaId} — cancelamento negado.`],
            });
            toast.error('Cancelamento de nota negado pelo financeiro.');
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
      notaId,
      sinceTs,
      action: pendentesRef.current[requestId]?.action || 'cancel',
      attempts: pendentesRef.current[requestId]?.attempts || 0,
      timer: setTimeout(loop, POLL_INTERVAL_MS),
    };
  };

  /* ---------------- Ações ---------------- */
  const notificarEmissao = async (nota, isEdicao = false) => {
    await sendTelegramEvent({
      title: isEdicao ? 'Nota Atualizada' : 'Nota Inserida',
      emoji: isEdicao ? '✏️' : '🟢',
      screen: 'Notas Fiscais',
      lines: extrairLinhasNota(nota),
    });
  };

  const handleSalvar = async (nota) => {
    try {
      const isEdicao = !!nota.id;

      if (nota.chavedeacesso && chaveExiste(nota.chavedeacesso, nota.id)) {
        toast.warn('Já existe uma nota com essa chave de acesso.');
        return;
      }

      const notaParaSalvar = {
        ...nota,
        status: !nota.status || nota.status === 'Emitida' ? 'Adicionada' : nota.status,
      };

      if (isEdicao) {
        atualizarNota(notaParaSalvar);
        await notificarEmissao(notaParaSalvar, true);
        toast.info(`Nota Fiscal #${notaParaSalvar.numero || notaParaSalvar.id} atualizada com sucesso!`);
      } else {
        const criada = salvarNota(notaParaSalvar);
        await notificarEmissao(criada, false);
        await gerarContaReceberParaNota(criada);
        toast.success(`Nota Fiscal #${criada.numero || criada.id} emitida com sucesso!`);
      }

      carregarNotas();
      setModalAberto(false);
      setNotaSelecionada(null);
    } catch (e) {
      console.error('Erro ao salvar nota:', e);
      toast.error('Falha ao salvar nota fiscal.');
    }
  };

  const abrirModalCancelamento = (nota) => {
    setModalMotivoConfig({
      isOpen: true,
      nota,
      tipo: 'cancelar',
      titulo: `Solicitar Cancelamento da Nota #${nota.numero || nota.id}`,
      descricao: `Informe o motivo do cancelamento da Nota Fiscal de ${formatCurrencyBRL(nota.valor)}:`,
      placeholder: 'Ex: Erro nos dados do cliente, cancelamento de serviço...',
      textoBotao: 'Solicitar Cancelamento',
    });
  };

  const executarCancelamento = async (nota, motivo) => {
    const requestId = `REQ-${Date.now()}`;
    const notaPendente = {
      ...nota,
      statusCancelamento: 'Pendente',
      cancelRequestId: requestId,
      motivoCancelamento: motivo.trim(),
    };

    try {
      atualizarNota(notaPendente);
      carregarNotas();

      const linhasStr = extrairLinhasNota(notaPendente).join('\n');
      const texto = `🚫 <b>Solicitação de Cancelamento</b>\n${linhasStr}\n\n<b>Motivo:</b> ${motivo.trim()}\n\nSelecione uma opção:`;

      const replyMarkup = {
        inline_keyboard: [[
          { text: '✅ Aprovar', callback_data: `cancel:approve:${requestId}` },
          { text: '❌ Negar', callback_data: `cancel:deny:${requestId}` },
        ]],
      };

      await tgSendRaw(texto, replyMarkup);
      setMensagemProcessamento('Aguardando resposta do cancelamento pelo financeiro...');
      toast.info(`Solicitação de cancelamento da Nota Fiscal #${nota.numero || nota.id} enviada para aprovação!`);

      logEvent({ type: 'notas', title: 'Solicitação de cancelamento', details: { id: nota.id, requestId, motivo: motivo.trim() } });

      pendentesRef.current[requestId] = { action: 'cancel', attempts: 0 };
      iniciarPollingDecisao(requestId, nota.id, Date.now());
    } catch (e) {
      console.error('Erro ao solicitar cancelamento:', e);
      toast.error('Falha ao solicitar cancelamento.');
    }
  };

  const abrirModalExclusao = (nota) => {
    setModalMotivoConfig({
      isOpen: true,
      nota,
      tipo: 'excluir',
      titulo: `Solicitar Exclusão da Nota #${nota.numero || nota.id}`,
      descricao: `Informe o motivo da solicitação de exclusão da Nota Fiscal de ${formatCurrencyBRL(nota.valor)}:`,
      placeholder: 'Ex: Nota cadastrada em duplicidade, teste de emissão...',
      textoBotao: 'Solicitar Exclusão',
    });
  };

  const executarExclusao = async (nota, motivo) => {
    const requestId = `REQ-${Date.now()}`;
    const pend = {
      ...nota,
      exclusaoPendente: true,
      deleteRequestId: requestId,
      motivoCancelamento: motivo.trim(),
    };

    try {
      atualizarNota(pend);
      carregarNotas();

      const linhasStr = extrairLinhasNota(pend).join('\n');
      const texto = `🧹 <b>Solicitação de Exclusão</b>\n${linhasStr}\n\n<b>Motivo:</b> ${motivo.trim()}\n\nSelecione uma opção:`;

      const replyMarkup = {
        inline_keyboard: [[
          { text: '✅ Aprovar', callback_data: `delete:approve:${requestId}` },
          { text: '❌ Negar', callback_data: `delete:deny:${requestId}` },
        ]],
      };

      await tgSendRaw(texto, replyMarkup);
      setMensagemProcessamento('Aguardando resposta da exclusão pelo financeiro...');
      toast.warn(`Solicitação de exclusão da Nota Fiscal #${nota.numero || nota.id} enviada para aprovação!`);

      logEvent({ type: 'notas', title: 'Solicitação de exclusão', details: { id: nota.id, requestId, motivo: motivo.trim() } });

      pendentesRef.current[requestId] = { action: 'delete', attempts: 0 };
      iniciarPollingDecisao(requestId, nota.id, Date.now());
    } catch (e) {
      console.error('Erro ao solicitar exclusão:', e);
      toast.error('Falha ao solicitar exclusão.');
    }
  };

  const handleConfirmarMotivo = async (motivo) => {
    const { nota, tipo } = modalMotivoConfig;
    setModalMotivoConfig({
      isOpen: false,
      nota: null,
      tipo: 'cancelar',
      titulo: '',
      descricao: '',
      placeholder: '',
      textoBotao: 'Confirmar',
    });
    if (!nota) return;

    if (tipo === 'cancelar') {
      nfStartCooldown(nota.id);
      await executarCancelamento(nota, motivo);
    } else {
      await executarExclusao(nota, motivo);
    }
  };

  const handleEnviarNotasParaContas = async () => {
    try {
      setEnviandoContas(true);
      toast.info('Verificando e sincronizando notas em Contas a Receber...');

      // 1. Sincroniza e busca todas as contas existentes do usuário
      const contasAtuais = (await sincronizarContasDoServidor()) || [];

      const notasParaProcessar = (notas || []).filter(
        (n) => n.status !== 'Cancelada' && n.statusCancelamento !== 'Pendente'
      );

      if (notasParaProcessar.length === 0) {
        toast.info('Nenhuma nota fiscal ativa para enviar.');
        return;
      }

      let enviadasCount = 0;
      let jaExistentesCount = 0;

      for (const nota of notasParaProcessar) {
        const numLimpo = extrairNumeroLimpoNota(nota);

        // Valida duplicidade por referenciaId ou por número da NF
        const jaExiste = contasAtuais.some((c) => {
          const mesmoRef =
            String(c.referenciaTipo) === 'nota' &&
            String(c.referenciaId) === String(nota.id);

          const mesmoNumero =
            numLimpo &&
            c.descricao &&
            (c.descricao.includes(`NF ${numLimpo}`) || c.descricao.includes(`NF #${numLimpo}`));

          return mesmoRef || mesmoNumero;
        });

        if (jaExiste) {
          jaExistentesCount++;
          continue;
        }

        const descricao = obterDescricaoNotaLimpa(nota);

        const novaConta = {
          tipo: 'Receber',
          descricao,
          valor: Number(nota.valor) || 0,
          vencimento: nota.dataEmissao || new Date().toISOString().slice(0, 10),
          status: 'Pendente',
          referenciaTipo: 'nota',
          referenciaId: String(nota.id),
        };

        const criada = salvarContaFinanceiro(novaConta);
        if (criada) {
          enviadasCount++;
          contasAtuais.push(criada);
        }
      }

      if (enviadasCount > 0) {
        toast.success(
          `🚀 ${enviadasCount} nota(s) enviada(s) para Contas a Receber com sucesso!` +
          (jaExistentesCount > 0 ? ` (${jaExistentesCount} já constavam sincronizadas)` : '')
        );

        await sendTelegramEvent({
          title: 'Sincronização em Lote de Notas para Contas',
          emoji: '📥',
          screen: 'Notas Fiscais',
          lines: [
            `📄 Novas Contas Criadas: ${enviadasCount}`,
            `✅ Já Existentes (Sem Duplicação): ${jaExistentesCount}`,
            `💰 Total de Notas Avaliadas: ${notasParaProcessar.length}`,
          ],
        });
      } else {
        toast.info(
          `Todas as ${jaExistentesCount} nota(s) já constam registradas no Contas a Receber.`
        );
      }
    } catch (err) {
      console.error('Erro ao enviar notas para contas:', err);
      toast.error('Erro ao processar envio de notas para contas.');
    } finally {
      setEnviandoContas(false);
    }
  };

  const toggleSelecionarTodas = (e) => {
    const checked = e.target.checked;
    const m = {};
    notasExibidas.forEach((n) => (m[n.id] = checked));
    setSelecionadas(m);
  };

  const notasExibidas = (notas || []).filter((n) => n.status !== 'Cancelada');

  return (
    <div className="container page-container fade-in-page">
      {/* Overlay de Bloqueio com Ampulheta/Spinner */}
      {processandoAcao && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{
            fontSize: '50px',
            animation: 'spin 2s linear infinite',
            marginBottom: '15px'
          }}>
            ⏳
          </div>
          <h3 style={{ margin: '0 0 8px 0', fontSize: '1.25rem' }}>{mensagemProcessamento}</h3>
          <p style={{ margin: 0, color: '#aaa', fontSize: '0.9rem' }}>Responda à solicitação no grupo/bot do Telegram.</p>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      )}

      <div className="notas-header-bar">
        <div>
          <h1 className="page-title">Notas Fiscais</h1>
          <p className="page-subtitle">Gerenciamento e controle de Notas Fiscais</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-enviar-contas"
            onClick={handleEnviarNotasParaContas}
            disabled={enviandoContas || notasExibidas.length === 0}
            style={{
              background: '#10b981',
              color: '#fff',
              border: 'none',
              padding: '9px 16px',
              borderRadius: '6px',
              fontWeight: '700',
              cursor: enviandoContas ? 'wait' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '0.9rem',
              boxShadow: '0 2px 6px rgba(16, 185, 129, 0.3)',
              transition: 'all 0.2s',
            }}
            title="Enviar todas as notas fiscais para o financeiro como Contas a Receber (evitando duplicidades)"
          >
            <span>📥</span> {enviandoContas ? 'Enviando...' : 'Enviar Notas a Contas'}
          </button>

          <form onSubmit={handleProcessarNumeroNota} style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              className="input-busca-nota"
              placeholder="Nº da Nota ou Chave de Acesso..."
              value={numeroBusca}
              onChange={(e) => setNumeroBusca(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #2d2d3d',
                backgroundColor: '#1e1e2d',
                color: '#fff',
                outline: 'none',
              }}
            />
            <button type="submit" className="btn btn-primary btn-nova-nota">
              🔍 Abrir / Inserir
            </button>
          </form>
        </div>
      </div>

      {notasExibidas.length > 0 && (
        <div className="select-all-bar">
          <label className="checkbox-custom-label">
            <input
              type="checkbox"
              onChange={toggleSelecionarTodas}
              checked={
                notasExibidas.length > 0 &&
                notasExibidas.every((n) => !!selecionadas[n.id])
              }
            />
            <span>Selecionar Todas as Notas ({notasExibidas.length})</span>
          </label>
        </div>
      )}

      {notasExibidas.length === 0 ? (
        <div className="empty-state-card">
          <div className="empty-icon">📄</div>
          <h3>Nenhuma nota fiscal cadastrada</h3>
          <p>Digite um número/chave no campo acima para registrar ou editar uma nota no sistema.</p>
        </div>
      ) : (
        <div className="notas-cards-grid">
          {notasExibidas.map((nota, index) => {
            const cooldownMs = nfRemaining(nota.id);
            const cancelDisabled = cooldownMs > 0;
            const statusExibicao =
              !nota.status || nota.status === 'Emitida' ? 'Adicionada' : nota.status;
            const statusClass = statusExibicao.toLowerCase().replace(/\s+/g, '-');

            const nomeOrigem =
              nota.origem || nota.clienteOuServico || (nota.numero ? `#${nota.numero}` : 'S/N');

            return (
              <div
                key={nota.id}
                className={`nota-card ${selecionadas[nota.id] ? 'selected' : ''}`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="nota-card-header">
                  <div className="header-left">
                    <label className="checkbox-custom-label">
                      <input
                        type="checkbox"
                        checked={!!selecionadas[nota.id]}
                        onChange={(e) =>
                          setSelecionadas((s) => ({ ...s, [nota.id]: e.target.checked }))
                        }
                      />
                      <span className="nota-number">NF - {nomeOrigem}</span>
                    </label>
                  </div>
                  <span className={`badge status-${statusClass}`}>
                    {statusExibicao}
                  </span>
                </div>

                <div className="nota-card-body">
                  <div className="nota-main-info">
                    <span className="nota-cliente">
                      {nota.clienteOuServico || nota.origem || 'Cliente não informado'}
                    </span>
                    <span className="nota-valor">{formatarValor(nota.valor)}</span>
                  </div>

                  <div className="nota-details-grid">
                    <div className="detail-item">
                      <span className="detail-label">Tipo:</span>
                      <span className="detail-value">{nota.tipo || '-'}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Data de Emissão:</span>
                      <span className="detail-value">{formatarData(nota.dataEmissao)}</span>
                    </div>
                    <div className="detail-item full-width">
                      <span className="detail-label">Chave de Acesso:</span>
                      <span className="detail-value key-value">
                        {nota.chavedeacesso || 'NÃO GERADA'}
                      </span>
                    </div>
                  </div>

                  {nota.statusCancelamento === 'Pendente' && (
                    <div className="nota-alert-box warning">
                      <span>⏳ Aguardando aprovação de cancelamento...</span>
                      {nota.motivoCancelamento && (
                        <small>Motivo: {nota.motivoCancelamento}</small>
                      )}
                    </div>
                  )}

                  {nota.exclusaoPendente && (
                    <div className="nota-alert-box danger">
                      <span>🚨 Aguardando aprovação de exclusão...</span>
                    </div>
                  )}
                </div>

                <div className="nota-card-footer">
                  <button
                    type="button"
                    className="btn btn-danfe-card"
                    onClick={() => setDanfeModalNota(nota)}
                    style={{
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      padding: '6px 12px',
                      borderRadius: '4px',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.2s',
                    }}
                    title="Visualizar e Imprimir DANFE em modal do sistema"
                  >
                    🖨️ DANFE
                  </button>

                  {/* Botão Editar (comentado a pedido)
                  <button
                    className="btn btn-secondary edit"
                    onClick={() => {
                      setNotaSelecionada(nota);
                      setModalAberto(true);
                    }}
                  >
                    ✏️ Editar
                  </button>
                  */}

                  {/* Botão Solicitar Cancelamento (comentado a pedido)
                  {nota.statusCancelamento === 'Pendente' ? (
                    <button className="btn btn-warning cancel" disabled title="Cancelamento em análise">
                      ⏳ Cancelamento Pendente
                    </button>
                  ) : (
                    <button
                      className="btn btn-warning cancel"
                      onClick={() => abrirModalCancelamento(nota)}
                      disabled={cancelDisabled}
                      title={
                        cancelDisabled
                          ? 'Aguarde o cooldown para tentar novamente'
                          : 'Solicitar cancelamento'
                      }
                    >
                      🚫 Solicitar Cancelamento
                    </button>
                  )}
                  */}

                  <button
                    className="btn btn-danger exc"
                    onClick={() => abrirModalExclusao(nota)}
                    disabled={!!nota.exclusaoPendente}
                    title={
                      nota.exclusaoPendente
                        ? 'Exclusão pendente no financeiro'
                        : 'Solicitar exclusão'
                    }
                  >
                    🗑️ Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ModalNota
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        onSave={handleSalvar}
        notaParaEditar={notaSelecionada}
        onOpenDanfe={(n) => setDanfeModalNota(n)}
      />

      <ModalMotivo
        isOpen={modalMotivoConfig.isOpen}
        onClose={() =>
          setModalMotivoConfig({
            isOpen: false,
            nota: null,
            tipo: 'cancelar',
            titulo: '',
            descricao: '',
            placeholder: '',
            textoBotao: 'Confirmar',
          })
        }
        onConfirm={handleConfirmarMotivo}
        titulo={modalMotivoConfig.titulo}
        descricao={modalMotivoConfig.descricao}
        placeholder={modalMotivoConfig.placeholder}
        textoBotao={modalMotivoConfig.textoBotao}
      />

      <ModalDanfe
        isOpen={!!danfeModalNota}
        onClose={() => setDanfeModalNota(null)}
        nota={danfeModalNota}
      />
    </div>
  );
}