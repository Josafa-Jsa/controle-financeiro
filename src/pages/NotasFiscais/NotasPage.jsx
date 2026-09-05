// src/pages/NotasFiscais/NotasPage.jsx
import React, { useEffect, useRef, useState } from 'react';
import {
  listarNotas,
  salvarNota,
  atualizarNota,
  cancelarNota,
  excluirNota,
  chaveExiste,
  sincronizarNotasDoServidor,
} from '../../services/notasService';

import ModalNota from '../../components/Modais/ModalNota';
import ModalEditarNota from '../../components/Modais/ModalEditarNota';
import ModalMotivo from '../../components/Modais/ModalMotivo';
import ModalDanfe from '../../components/Modais/ModalDanfe';
import ModalExcluirNota from '../../components/Modais/ModalExcluirNota';
import ModalCadastrarFornecedor from '../../components/Modais/ModalCadastrarFornecedor';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import {
  obterPadraoCnpj,
  salvarPadraoCnpj,
  formatarCnpj,
} from '../../services/memoriaCnpjService';
import { sincronizarFornecedoresDoServidor } from '../../services/fornecedoresService';

import {
  listarContas as listarContasFinanceiro,
  salvarConta as salvarContaFinanceiro,
  atualizarConta as atualizarContaFinanceiro,
  salvarContasEmLote,
  sincronizarContasDoServidor,
  excluirConta,
  buscarPorReferencia,
} from '../../services/contasService';
import { getUser, isAdmin, getCurrentUser } from '../../auth/auth';

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

function nfSetCooldown(id) {
  const map = nfGetCooldownMap();
  map[String(id)] = Date.now() + NF_COOLDOWN_MS;
  nfSaveCooldownMap(map);
}

function nfRemaining(id) {
  const map = nfGetCooldownMap();
  const until = Number(map[String(id)]) || 0;
  return Math.max(0, until - Date.now());
}

/* ---------------- Utils ---------------- */
const formatarValor = (valor) => formatCurrencyBRL(valor || 0);

const formatarData = (dataStr) => {
  if (!dataStr) return '-';
  try {
    const d = new Date(dataStr);
    return formatDateBR(d);
  } catch {
    return dataStr;
  }
};

const extrairLinhasNota = (nota) => {
  const origem = nota.clienteOuServico || nota.origem || 'Não informado';
  const numero = nota.numero ? `#${nota.numero}` : `#${nota.id || 'S/N'}`;
  const tipo = nota.tipo || 'NFe';
  const valor = formatarValor(nota.valor);
  const data = formatarData(nota.dataEmissao);
  const status = !nota.status || nota.status === 'Emitida' ? 'Adicionada' : nota.status;

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
    return origemOuCliente ? `#1-NF ${numLimpo} - ${origemOuCliente}` : `#1-NF ${numLimpo}`;
  }
  return origemOuCliente ? `#1-NF - ${origemOuCliente}` : `#1-NF #${nota.id || '1'}`;
}

/* ---------------- Geração de conta a pagar ou receber ao salvar nota ---------------- */
async function gerarContaParaNota(notaCriada) {
  try {
    const contas = (await sincronizarContasDoServidor()) || listarContasFinanceiro() || [];
    const numLimpo = extrairNumeroLimpoNota(notaCriada);
    const regexNumNF = numLimpo ? new RegExp(`(?:#1-NF|NF)\\s*#?\\s*${numLimpo}\\b`, 'i') : null;

    const jaExiste = contas.some(
      (c) =>
        (String(c.referenciaTipo) === 'nota' && String(c.referenciaId) === String(notaCriada.id)) ||
        (c.notaFiscalId && String(c.notaFiscalId) === String(notaCriada.id)) ||
        (regexNumNF ? regexNumNF.test(c.descricao || '') : false)
    );
    if (jaExiste) return;

    const descricao = obterDescricaoNotaLimpa(notaCriada);
    const curUser = getCurrentUser() || {};
    const userEmail = (
      curUser.email ||
      curUser.user_email ||
      localStorage.getItem('usuario_email') ||
      (curUser.username ? `${curUser.username}@jsa.com` : 'jsa@jsa.com')
    ).toLowerCase().trim();
    const userId = String(
      curUser.id ||
      curUser.userId ||
      localStorage.getItem('usuario_id') ||
      '1'
    ).trim();
    const userFilial = curUser.filial || localStorage.getItem('usuario_filial') || 'Filial 1';

    const tipoFinal = notaCriada.tipoConta || 'Receber';

    const novaConta = {
      descricao,
      tipo: tipoFinal, // 'Receber' ou 'Pagar'
      valor: Number(notaCriada.valor) || 0,
      vencimento: notaCriada.dataEmissao || new Date().toISOString().slice(0, 10),
      status: 'Pendente',
      notaFiscalId: notaCriada.id,
      referenciaTipo: 'nota',
      referenciaId: String(notaCriada.id),
      usuario: userEmail,
      usuarioId: userId,
      filial: userFilial,
      observacao: `Gerado automaticamente a partir da Nota Fiscal #${notaCriada.numero || notaCriada.id} (${tipoFinal === 'Pagar' ? 'A Pagar' : 'A Receber'})`,
    };

    const criada = await salvarContaFinanceiro(novaConta);

    logEvent({
      type: 'contas',
      title: tipoFinal === 'Pagar' ? 'Conta a pagar gerada (Nota Fiscal)' : 'Conta a receber gerada (Nota Fiscal)',
      details: {
        notaId: notaCriada.id,
        contaId: criada?.id,
        tipo: tipoFinal,
        descricao: criada?.descricao,
        valor: criada?.valor,
        vencimento: criada?.vencimento,
      },
    });

    const lines = [
      `Descrição: ${criada?.descricao || '-'}`,
      `Tipo: Conta a ${tipoFinal.toUpperCase()}`,
      `Valor: ${formatarValor(criada?.valor)}`,
      `Vencimento: ${formatarData(criada?.vencimento)}`,
      `Status: ${criada?.status || '-'}`,
    ];
    if (notaCriada.numero) {
      lines.push(`NF: #${notaCriada.numero}`);
    }

    await sendTelegramEvent({
      title: tipoFinal === 'Pagar' ? 'Conta a Pagar Gerada Automaticamente' : 'Conta a Receber Gerada Automaticamente',
      emoji: tipoFinal === 'Pagar' ? '🔴' : '🟢',
      screen: 'Notas Fiscais',
      lines,
    });
  } catch (e) {
    console.error('[Notas] Falha ao gerar conta a partir da nota:', e);
  }
}

async function sincronizarContaParaNotaEditada(notaAtualizada) {
  try {
    const contas = (await sincronizarContasDoServidor()) || listarContasFinanceiro() || [];
    const numLimpo = extrairNumeroLimpoNota(notaAtualizada);
    const regexNumNF = numLimpo ? new RegExp(`(?:#1-NF|NF)\\s*#?\\s*${numLimpo}\\b`, 'i') : null;

    const contaCorrespondente = contas.find(
      (c) =>
        (String(c.referenciaTipo) === 'nota' && String(c.referenciaId) === String(notaAtualizada.id)) ||
        (c.notaFiscalId && String(c.notaFiscalId) === String(notaAtualizada.id)) ||
        (regexNumNF ? regexNumNF.test(c.descricao || '') : false)
    );

    const tipoFinal = notaAtualizada.tipoConta || contaCorrespondente?.tipo || 'Receber';

    if (contaCorrespondente) {
      const descricao = obterDescricaoNotaLimpa(notaAtualizada);
      const contaAtualizada = {
        ...contaCorrespondente,
        tipo: tipoFinal,
        descricao,
        valor: Number(notaAtualizada.valor) || contaCorrespondente.valor,
        vencimento: notaAtualizada.dataEmissao || contaCorrespondente.vencimento,
        observacao: `Gerado a partir da Nota Fiscal #${notaAtualizada.numero || notaAtualizada.id}`,
      };
      await atualizarContaFinanceiro(contaAtualizada.id, contaAtualizada);
    } else {
      await gerarContaParaNota(notaAtualizada);
    }
  } catch (e) {
    console.warn('[Notas] Falha ao sincronizar conta para nota editada:', e);
  }
}

/* ---------------- Telegram polling ---------------- */
const POLL_INTERVAL_MS = 4000;
const POLL_MAX_ATTEMPTS = 45;

export default function NotasPage() {
  const usuarioLogado = getUser();
  const isUserAdmin = isAdmin(usuarioLogado);
  const filialUsuario =
    usuarioLogado?.filial ||
    usuarioLogado?.user_filial ||
    localStorage.getItem('usuario_filial') ||
    'Filial 1';

  const [notas, setNotas] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState(null);
  const [notaParaEditarRapido, setNotaParaEditarRapido] = useState(null);
  const [numeroBusca, setNumeroBusca] = useState('');
  const [selecionadas, setSelecionadas] = useState({});
  const [enviandoContas, setEnviandoContas] = useState(false);
  const [danfeModalNota, setDanfeModalNota] = useState(null);
  const [modalExcluirNotaAberto, setModalExcluirNotaAberto] = useState(false);
  const [modalCadastrarFornecedorAberto, setModalCadastrarFornecedorAberto] = useState(false);
  const [notaParaExcluir, setNotaParaExcluir] = useState(null);

  /* Estado do Modal de Motivo (Cancelamento) */
  const [modalMotivoConfig, setModalMotivoConfig] = useState({
    isOpen: false,
    nota: null,
    tipo: 'cancelar',
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

  const handleConfirmarExclusaoNota = async (nota) => {
    if (!nota) return;
    const idNota = nota.id;
    setModalExcluirNotaAberto(false);
    setNotaParaExcluir(null);

    // 1. Atualização otimista imediata na interface
    setNotas((prev) => prev.filter((n) => String(n.id) !== String(idNota)));

    try {
      // 2. Exclui a Nota Fiscal
      excluirNota(idNota);

      // 3. Exclui eventual Conta a Receber correspondente no Financeiro
      try {
        const contasRef = buscarPorReferencia('nota', idNota);
        if (contasRef && contasRef.length > 0) {
          for (const c of contasRef) {
            await excluirConta(c.id);
          }
        }
      } catch (errRef) {
        console.warn('Aviso ao excluir conta vinculada à nota:', errRef);
      }

      carregarNotas();
      toast.success(`Nota Fiscal #${nota.numero || nota.id} excluída com sucesso!`);

      await sendTelegramEvent({
        title: 'Nota Fiscal Excluída',
        emoji: '🗑️',
        screen: 'Notas Fiscais',
        lines: [
          `Nota Fiscal #${nota.numero || nota.id} (${formatCurrencyBRL(nota.valor || 0)}) foi excluída.`,
          `Cliente / Origem: ${nota.clienteOuServico || nota.origem || 'Não informado'}`,
        ],
      });

      logEvent({ type: 'notas', title: 'Nota excluída', details: { id: idNota, numero: nota.numero } });
    } catch (err) {
      console.error('Erro ao excluir nota fiscal:', err);
      toast.error('Falha ao excluir a nota fiscal.');
      carregarNotas();
    }
  };

  const carregarNotas = () => {
    const dados = listarNotas(usuarioLogado);
    const limpos = (dados || []).map((n) => {
      if (n && n.exclusaoPendente) {
        const copy = { ...n };
        delete copy.exclusaoPendente;
        delete copy.deleteRequestId;
        return copy;
      }
      return n;
    });
    setNotas(limpos);
  };

  useEffect(() => {
    carregarNotas();
    sincronizarNotasDoServidor(usuarioLogado)
      .then((res) => {
        if (Array.isArray(res) && res.length) {
          const limpos = res.map((n) => {
            if (n && n.exclusaoPendente) {
              const copy = { ...n };
              delete copy.exclusaoPendente;
              delete copy.deleteRequestId;
              return copy;
            }
            return n;
          });
          setNotas(limpos);
        }
      })
      .catch(() => {});

    sincronizarFornecedoresDoServidor().catch(() => {});

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
      const padrao = obterPadraoCnpj(numLimpo);

      setNotaSelecionada({
        numero: eChaveLonga ? '' : numLimpo,
        chavedeacesso: numLimpo,
        clienteOuServico: padrao?.nome || '',
        origem: padrao?.nome || '',
        cnpj: padrao?.cnpj || '',
        produtoRelacionado: padrao?.produtoRelacionado || '',
        tipoConta: padrao?.tipoConta || 'Receber',
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
        filial: nota.filial || filialUsuario,
        status: !nota.status || nota.status === 'Emitida' ? 'Adicionada' : nota.status,
      };

      // Persiste ou atualiza o padrão deste CNPJ para futuras notas
      if (notaParaSalvar.cnpj || notaParaSalvar.chavedeacesso) {
        salvarPadraoCnpj(notaParaSalvar.cnpj || notaParaSalvar.chavedeacesso, {
          nome: notaParaSalvar.clienteOuServico || notaParaSalvar.origem,
          produtoRelacionado: notaParaSalvar.produtoRelacionado,
          tipoConta: notaParaSalvar.tipoConta,
          tipo: notaParaSalvar.tipo,
        });
      }

      if (isEdicao) {
        atualizarNota(notaParaSalvar, usuarioLogado);
        await notificarEmissao(notaParaSalvar, true);
        await sincronizarContaParaNotaEditada(notaParaSalvar);
        toast.info(`Nota Fiscal #${notaParaSalvar.numero || notaParaSalvar.id} atualizada com sucesso!`);
      } else {
        const criada = salvarNota(notaParaSalvar, usuarioLogado);
        await notificarEmissao(criada, false);
        await gerarContaParaNota(criada);
        toast.success(`Nota Fiscal #${criada.numero || criada.id} salva com sucesso!`);
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
    }
  };

  const handleEnviarNotasParaContas = async () => {
    try {
      setEnviandoContas(true);
      toast.info('Verificando e sincronizando notas em Contas a Receber...');

      // 1. Sincroniza e busca todas as contas existentes do usuário
      const contasAtuais = (await sincronizarContasDoServidor()) || listarContasFinanceiro() || [];

      // Verifica se o usuário marcou notas específicas pelos checkboxes
      const selecionadasIds = Object.keys(selecionadas).filter((id) => selecionadas[id]);

      const todasAtivas = (notas || []).filter(
        (n) => n.status !== 'Cancelada' && n.statusCancelamento !== 'Pendente'
      );

      const notasParaProcessar = selecionadasIds.length > 0
        ? todasAtivas.filter((n) => selecionadasIds.includes(String(n.id)))
        : todasAtivas;

      if (notasParaProcessar.length === 0) {
        toast.info('Nenhuma nota fiscal ativa para enviar.');
        return;
      }

      const curUser = getCurrentUser() || {};
      const userEmail = (
        curUser.email ||
        curUser.user_email ||
        localStorage.getItem('usuario_email') ||
        (curUser.username ? `${curUser.username}@jsa.com` : 'jsa@jsa.com')
      ).toLowerCase().trim();
      const userId = String(
        curUser.id ||
        curUser.userId ||
        localStorage.getItem('usuario_id') ||
        '1'
      ).trim();
      const userFilial = curUser.filial || localStorage.getItem('usuario_filial') || 'Filial 1';

      const novasContasParaCriar = [];
      let jaExistentesCount = 0;

      for (const nota of notasParaProcessar) {
        const numLimpo = extrairNumeroLimpoNota(nota);
        const regexNumNF = numLimpo ? new RegExp(`\\bNF\\s*#?\\s*${numLimpo}\\b`, 'i') : null;

        // Valida duplicidade estrita por referenciaId, notaFiscalId ou número exato da NF
        const jaExiste = contasAtuais.some((c) => {
          const mesmoRef =
            (String(c.referenciaTipo) === 'nota' && String(c.referenciaId) === String(nota.id)) ||
            (c.notaFiscalId && String(c.notaFiscalId) === String(nota.id));

          const mesmoNumero = regexNumNF ? regexNumNF.test(c.descricao || '') : false;

          return mesmoRef || mesmoNumero;
        });

        if (jaExiste) {
          jaExistentesCount++;
          continue;
        }

        const descricao = obterDescricaoNotaLimpa(nota);
        const tipoContaNota = nota.tipoConta === 'Pagar' ? 'Pagar' : 'Receber';

        novasContasParaCriar.push({
          tipo: tipoContaNota,
          descricao,
          observacao: `Gerado a partir da Nota Fiscal #${nota.numero || nota.id}`,
          valor: Number(nota.valor) || 0,
          vencimento: nota.dataEmissao || new Date().toISOString().slice(0, 10),
          status: 'Pendente',
          referenciaTipo: 'nota',
          referenciaId: String(nota.id),
          origem: 'Nota Fiscal',
          notaFiscalId: nota.id,
          userEmail,
          userId,
          filial: userFilial,
        });
      }

      let enviadasCount = 0;
      if (novasContasParaCriar.length > 0) {
        const criadas = await salvarContasEmLote(novasContasParaCriar);
        enviadasCount = criadas.length;
        // Força sincronização para garantir consistência no cache
        await sincronizarContasDoServidor();
      }

      // Limpa a seleção após envio
      setSelecionadas({});

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
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Notas Fiscais</h1>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.8rem',
                fontWeight: 700,
                background: isUserAdmin ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                color: isUserAdmin ? '#60a5fa' : '#34d399',
                border: `1px solid ${isUserAdmin ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
              }}
            >
              <span>🏢</span> {isUserAdmin ? 'Todas as Filiais (Acesso Master)' : `${filialUsuario} • Acesso Setorial`}
            </span>
          </div>
          <p className="page-subtitle" style={{ marginTop: '4px' }}>Gerenciamento e controle de Notas Fiscais</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn btn-cadastrar-fornecedor-nf"
            onClick={() => setModalCadastrarFornecedorAberto(true)}
            style={{
              background: '#1e293b',
              color: '#60a5fa',
              border: '1px solid #3b82f6',
              padding: '9px 16px',
              borderRadius: '6px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.9rem',
              boxShadow: '0 2px 6px rgba(59, 130, 246, 0.25)',
              transition: 'all 0.2s',
            }}
            title="Cadastrar Fornecedor com CNPJ e Nome em Maiúsculas"
          >
            <span>🏢</span> Cadastrar Fornecedor
          </button>

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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        backgroundColor: 'rgba(59, 130, 246, 0.15)',
                        color: '#93c5fd',
                        border: '1px solid rgba(59, 130, 246, 0.3)',
                      }}
                    >
                      🏢 {nota.filial || 'Filial 1'}
                    </span>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: '4px',
                        backgroundColor: nota.tipoConta === 'Pagar' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                        color: nota.tipoConta === 'Pagar' ? '#f87171' : '#34d399',
                        border: `1px solid ${nota.tipoConta === 'Pagar' ? 'rgba(239, 68, 68, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
                      }}
                    >
                      {nota.tipoConta === 'Pagar' ? '🔴 A PAGAR' : '🟢 A RECEBER'}
                    </span>
                    <span className={`badge status-${statusClass}`}>
                      {statusExibicao}
                    </span>
                  </div>
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
                    {nota.cnpj && (
                      <div className="detail-item">
                        <span className="detail-label">CNPJ:</span>
                        <span className="detail-value" style={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
                          {nota.cnpj}
                        </span>
                      </div>
                    )}
                    {nota.produtoRelacionado && (
                      <div className="detail-item full-width">
                        <span className="detail-label">Produto / Serviço:</span>
                        <span className="detail-value" style={{ color: '#38bdf8' }}>
                          {nota.produtoRelacionado}
                        </span>
                      </div>
                    )}
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
                </div>

                <div className="nota-card-footer" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', alignItems: 'center' }}>
                  <button
                    type="button"
                    className="btn btn-edit-card"
                    onClick={() => setNotaParaEditarRapido(nota)}
                    style={{
                      background: 'rgba(56, 189, 248, 0.12)',
                      color: '#38bdf8',
                      border: '1px solid rgba(56, 189, 248, 0.35)',
                      padding: '7px 8px',
                      borderRadius: '6px',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                    }}
                    title="Editar Forma (A Receber / A Pagar) e Valor Total da Nota"
                  >
                    ✏️ Editar
                  </button>

                  <button
                    type="button"
                    className="btn btn-danfe-card"
                    onClick={() => setDanfeModalNota(nota)}
                    style={{
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      padding: '7px 8px',
                      borderRadius: '6px',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                    }}
                    title="Visualizar e Imprimir Nota Fiscal em modal do sistema"
                  >
                    🖨️ Imprimir
                  </button>

                  <button
                    type="button"
                    className="btn btn-danger-card"
                    onClick={() => {
                      setNotaParaExcluir(nota);
                      setModalExcluirNotaAberto(true);
                    }}
                    style={{
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#ef4444',
                      border: '1px solid rgba(239, 68, 68, 0.35)',
                      padding: '7px 8px',
                      borderRadius: '6px',
                      fontWeight: '700',
                      fontSize: '0.8rem',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      transition: 'all 0.2s',
                    }}
                    title="Excluir Nota Fiscal"
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

      <ModalEditarNota
        isOpen={!!notaParaEditarRapido}
        onClose={() => setNotaParaEditarRapido(null)}
        onSave={handleSalvar}
        nota={notaParaEditarRapido}
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

      <ModalExcluirNota
        isOpen={modalExcluirNotaAberto}
        onClose={() => {
          setModalExcluirNotaAberto(false);
          setNotaParaExcluir(null);
        }}
        onConfirm={handleConfirmarExclusaoNota}
        nota={notaParaExcluir}
      />

      <ModalCadastrarFornecedor
        isOpen={modalCadastrarFornecedorAberto}
        onClose={() => setModalCadastrarFornecedorAberto(false)}
        onSave={(fornecedorSalvo) => {
          toast.success(`Fornecedor "${fornecedorSalvo.nome}" cadastrado com sucesso!`);
          setModalCadastrarFornecedorAberto(false);
        }}
      />
    </div>
  );
}