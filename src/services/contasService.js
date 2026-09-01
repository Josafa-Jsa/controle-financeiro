// src/services/contasService.js
import { toast } from "react-toastify";
import { logEvent } from "../utils/logger";
import { parseToBackendFloat } from "../utils/numberUtils";
import { api } from "../api/client";
import { getCurrentUser } from "../auth/auth";

const STORAGE_KEY = "contas";

const ADMIN_EMAILS = ["jsa@jsa.com", "jsa.admin@gmail.com"];

// Filtra uma lista de contas estritamente para o usuário atualmente logado
function filtrarParaUsuarioAtual(contas = []) {
  const curUser = getCurrentUser();
  if (!curUser) return [];
  const emailLogado = String(curUser.email || "").trim().toLowerCase();
  const idLogado = String(curUser.id || "").trim();
  const isAdminUser = curUser.role === "ADMIN" || ADMIN_EMAILS.includes(emailLogado);

  return contas.filter((c) => {
    const cEmail = String(c.userEmail || "").trim().toLowerCase();
    const cId = String(c.userId || "").trim();

    if (isAdminUser) {
      // O Admin visualiza contas dos emails de Admin e contas base do sistema
      if (!cEmail || ADMIN_EMAILS.includes(cEmail)) return true;
      if (cId && idLogado && cId === idLogado) return true;
      return false;
    } else {
      // Usuário comum visualiza ÚNICA e ESTRITAMENTE as suas próprias contas
      if (cEmail && emailLogado && cEmail === emailLogado) return true;
      if (cId && idLogado && cId === idLogado) return true;
      return false;
    }
  });
}

// Sincroniza ativamente com o servidor (garante consistência entre Desktop 5173 e Mobile 2515 com isolamento por usuário)
export async function sincronizarContasDoServidor() {
  try {
    const resp = await api.get("/contas");
    if (Array.isArray(resp.data)) {
      const serverContas = resp.data;
      const localContas = safeRead();

      const mapa = new Map();

      // Prioriza dados do servidor
      for (const sc of serverContas) {
        if (sc && sc.id != null) {
          mapa.set(String(sc.id), sc);
        }
      }

      // Adiciona contas locais caso ainda não existam no servidor
      for (const lc of localContas) {
        if (lc && lc.id != null && !mapa.has(String(lc.id))) {
          mapa.set(String(lc.id), lc);
          api.post("/contas", lc).catch(() => {});
        }
      }

      let listaMesclada = Array.from(mapa.values());

      // Assegura código de 6 dígitos em todas
      const codigosSet = new Set();
      listaMesclada = listaMesclada.map((c) => {
        let cod = c.codigo || c.codigoConta;
        if (!cod || String(cod).length !== 6 || codigosSet.has(String(cod))) {
          cod = gerarCodigoAleatorio6Digitos(listaMesclada);
        }
        codigosSet.add(String(cod));
        return {
          ...c,
          codigo: String(cod),
          codigoConta: String(cod),
        };
      });

      listaMesclada.sort((a, b) => {
        const da = new Date(a.vencimento).getTime();
        const db = new Date(b.vencimento).getTime();
        return da - db;
      });

      // Salva no storage local
      safeWrite(listaMesclada);

      // Retorna estritamente as contas pertencentes ao usuário logado
      return filtrarParaUsuarioAtual(listaMesclada);
    }
  } catch (e) {
    console.warn("[contasService] Modo offline / aviso ao sincronizar:", e.message);
  }
  return listarContas();
}

/* ================= Helpers internos ================= */
export function sanitizarDescricaoConta(desc) {
  if (!desc || typeof desc !== "string") return "";
  const str = desc.trim();

  // Caso: "NF 51260830584450000130550010001102881855 - AUTO POSTO RODOCAR"
  const matchChave = str.match(/^(NF|NFE)\s*(\d{20,})\s*(?:-\s*(.*))?$/i);
  if (matchChave) {
    const chave = matchChave[2];
    const resto = (matchChave[3] || "").trim();
    let numNota = "";
    if (chave.length === 44) {
      const nNF = chave.slice(25, 34);
      numNota = String(Number(nNF) || chave.slice(-6));
    } else {
      numNota = chave.slice(-6);
    }
    return resto ? `NF ${numNota} - ${resto}` : `NF ${numNota}`;
  }

  return str;
}

function safeRead() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    return arr.map((c) => ({
      ...c,
      descricao: sanitizarDescricaoConta(c.descricao),
    }));
  } catch (e) {
    console.error("[contasService] JSON parse falhou:", e);
    return [];
  }
}

function safeWrite(lista) {
  const listaSanitizada = (lista || []).map((c) => ({
    ...c,
    descricao: sanitizarDescricaoConta(c.descricao),
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(listaSanitizada));
}

function generateId(lista) {
  const maxId = lista.reduce((acc, c) => {
    const n = typeof c.id === "number" ? c.id : Number(c.id);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return maxId + 1;
}

function round2(n) {
  return parseToBackendFloat(n);
}

export function gerarCodigoAleatorio6Digitos(lista = []) {
  const codigosExistentes = new Set(
    lista.map((c) => String(c?.codigo || c?.codigoConta || "")).filter(Boolean)
  );
  let codigo = "";
  let tentativas = 0;
  do {
    codigo = String(Math.floor(100000 + Math.random() * 900000));
    tentativas++;
  } while (codigosExistentes.has(codigo) && tentativas < 1000);
  return codigo;
}

function normalizeConta(c, lista = []) {
  const hojeISO = new Date().toISOString().slice(0, 10);
  const valorNumerico = parseToBackendFloat(c.valor);
  const codigoExistente =
    c.codigo ||
    c.codigoConta ||
    (c.id ? String(c.id).slice(-6).padStart(6, "0") : null) ||
    gerarCodigoAleatorio6Digitos(lista);

  const curUser = getCurrentUser();
  const emailPadrao = curUser?.email ? String(curUser.email).toLowerCase() : "jsa@jsa.com";
  const userEmail = c.userEmail ? String(c.userEmail).toLowerCase() : emailPadrao;
  const userId = c.userId || (curUser?.id ? String(curUser.id) : "1");

  return {
    id: c.id ?? null,
    codigo: String(codigoExistente),
    codigoConta: String(codigoExistente),
    userEmail: String(userEmail).toLowerCase(),
    userId: String(userId),
    tipo: c.tipo === "Receber" ? "Receber" : "Pagar",
    descricao: sanitizarDescricaoConta(c.descricao),
    observacao: String(c.observacao || "").trim(),
    valor: valorNumerico,
    vencimento: c.vencimento
      ? new Date(c.vencimento).toISOString().slice(0, 10)
      : hojeISO,
    status: c.status === "Pago" ? "Pago" : "Pendente",
    editada: Boolean(c.editada),
    referenciaTipo: c.referenciaTipo,
    referenciaId: c.referenciaId,
    createdAt: c.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    // Histórico de baixas com valores decimais puros
    baixas: Array.isArray(c.baixas)
      ? c.baixas.map((b) => ({
          valor: parseToBackendFloat(b.valor),
          data: b.data
            ? new Date(b.data).toISOString()
            : new Date().toISOString(),
          obs: String(b.obs || ""),
        }))
      : [],
  };
}

// Diff simples para logs de atualização
function changedFields(before = {}, after = {}) {
  const keys = [
    "codigo",
    "tipo",
    "descricao",
    "observacao",
    "valor",
    "vencimento",
    "status",
    "referenciaTipo",
    "referenciaId",
    "baixas",
  ];
  const diff = {};
  for (const k of keys) {
    const a = before[k];
    const b = after[k];
    // comparação simples; para objetos/arrays usa JSON
    const same =
      typeof a === "object" || typeof b === "object"
        ? JSON.stringify(a) === JSON.stringify(b)
        : a === b;
    if (!same) diff[k] = { from: a, to: b };
  }
  return diff;
}

/* ================= API ================= */
export function listarContas() {
  try {
    let contas = safeRead();
    let alterouCodigos = false;

    // Assegura código aleatório de 6 dígitos em todas as contas (A Pagar e A Receber)
    const codigosExistentes = new Set();
    contas = contas.map((c) => {
      let cod = c.codigo || c.codigoConta;
      if (!cod || String(cod).length !== 6 || codigosExistentes.has(String(cod))) {
        cod = gerarCodigoAleatorio6Digitos(contas);
        alterouCodigos = true;
      }
      codigosExistentes.add(String(cod));
      return {
        ...c,
        codigo: String(cod),
        codigoConta: String(cod),
      };
    });

    if (alterouCodigos) {
      safeWrite(contas);
    }

    contas.sort((a, b) => {
      const da = new Date(a.vencimento).getTime();
      const db = new Date(b.vencimento).getTime();
      return da - db;
    });

    // Retorna estritamente as contas pertencentes ao usuário logado
    return filtrarParaUsuarioAtual(contas);
  } catch (error) {
    console.error("Erro ao listar contas:", error);
    toast.error("Erro ao carregar contas.");
    return [];
  }
}

export function obterContaPorId(id) {
  const contas = safeRead();
  return contas.find((c) => String(c.id) === String(id)) || null;
}

export function buscarPorReferencia(referenciaTipo, referenciaId) {
  const contas = safeRead();
  return contas.filter(
    (c) =>
      String(c.referenciaTipo || "") === String(referenciaTipo || "") &&
      String(c.referenciaId || "") === String(referenciaId || "")
  );
}

export function salvarConta(novaConta) {
  try {
    const contas = safeRead();
    const contaNorm = normalizeConta({ ...novaConta, id: null });
    contaNorm.id = generateId(contas);
    contas.push(contaNorm);
    safeWrite(contas);
    toast.success(`Conta "${contaNorm.descricao}" cadastrada com sucesso!`);

    // Persiste no banco de dados via API
    api.post("/contas", contaNorm).catch((e) =>
      console.warn("Aviso ao persistir conta no banco via API:", e.message)
    );

    // LOG: criação
    logEvent({
      type: "contas",
      title: "Conta criada",
      details: {
        id: contaNorm.id,
        tipo: contaNorm.tipo,
        descricao: contaNorm.descricao,
        valor: contaNorm.valor,
        vencimento: contaNorm.vencimento,
        status: contaNorm.status,
        referenciaTipo: contaNorm.referenciaTipo || "",
        referenciaId: contaNorm.referenciaId || "",
      },
    });

    return contaNorm;
  } catch (error) {
    console.error("Erro ao salvar conta:", error);
    toast.error("Erro ao salvar conta.");
    logEvent({
      type: "contas",
      title: "Erro ao criar conta",
      details: { erro: String(error?.message || error) },
    });
    return null;
  }
}

export function atualizarConta(contaAtualizada, maybeData) {
  try {
    let contaObj = contaAtualizada;
    if (typeof contaAtualizada !== "object" || contaAtualizada === null) {
      contaObj = { ...(maybeData || {}), id: contaAtualizada };
    }

    const contas = safeRead();
    if (!contaObj || contaObj.id == null) {
      throw new Error("Conta sem id para atualizar.");
    }

    const idx = contas.findIndex(
      (c) => String(c.id) === String(contaObj.id)
    );
    if (idx === -1) throw new Error("Conta não encontrada para atualização.");

    const before = { ...contas[idx] };
    const merged = normalizeConta({
      ...contas[idx],
      ...contaObj,
      id: contas[idx].id, // preserva id
      createdAt: contas[idx].createdAt || new Date().toISOString(),
    });

    contas[idx] = merged;
    safeWrite(contas);
    toast.info(`Conta "${merged.descricao}" atualizada com sucesso!`);

    // Persiste atualização no banco de dados via API
    api.put(`/contas/${merged.id}`, merged).catch((e) =>
      console.warn("Aviso ao atualizar conta no banco via API:", e.message)
    );

    // LOG: atualização (com diff)
    logEvent({
      type: "contas",
      title: "Conta atualizada",
      details: {
        id: merged.id,
        changes: changedFields(before, merged),
      },
    });

    return merged;
  } catch (error) {
    console.error("Erro ao atualizar conta:", error);
    toast.error("Erro ao atualizar conta.");
    logEvent({
      type: "contas",
      title: "Erro ao atualizar conta",
      details: {
        id: contaAtualizada?.id,
        erro: String(error?.message || error),
      },
    });
    return null;
  }
}

// Marcar como Pago
export function marcarComoPago(id, dataPagamento = new Date()) {
  try {
    const contas = safeRead();
    const idx = contas.findIndex((c) => String(c.id) === String(id));
    if (idx === -1) throw new Error("Conta não encontrada.");

    // salva SOMENTE a data (YYYY-MM-DD) para evitar timezone/NaN
    const d = new Date(dataPagamento);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    const isoDateOnly = `${yyyy}-${mm}-${dd}`;

    contas[idx] = {
      ...contas[idx],
      status: "Pago",
      dataPagamento: isoDateOnly,
      updatedAt: new Date().toISOString(),
    };
    safeWrite(contas);

    // Persiste atualização no banco de dados via API
    api.put(`/contas/${id}`, contas[idx]).catch((e) =>
      console.warn("Aviso ao marcar conta como paga via API:", e.message)
    );

    toast.success(`Conta "${contas[idx].descricao}" marcada como paga!`);
    return contas[idx];
  } catch (error) {
    console.error("Erro ao marcar como pago:", error);
    toast.error("Erro ao marcar como pago.");
    return null;
  }
}

export function excluirConta(id) {
  try {
    const contas = safeRead();
    const contaAntes = contas.find((c) => String(c.id) === String(id));
    const filtradas = contas.filter((conta) => String(conta.id) !== String(id));
    safeWrite(filtradas);
    toast.warn(`Conta "${contaAntes?.descricao || '#' + id}" excluída com sucesso!`);

    // Persiste exclusão no banco de dados via API
    api.delete(`/contas/${id}`).catch((e) =>
      console.warn("Aviso ao excluir conta no banco via API:", e.message)
    );

    // LOG: exclusão
    logEvent({
      type: "contas",
      title: "Conta excluída",
      details: {
        id,
        descricao: contaAntes?.descricao || "",
        valor: contaAntes?.valor ?? null,
        vencimento: contaAntes?.vencimento || "",
        status: contaAntes?.status || "",
      },
    });

    return true;
  } catch (error) {
    console.error("Erro ao excluir conta:", error);
    toast.error("Erro ao excluir conta.");
    logEvent({
      type: "contas",
      title: "Erro ao excluir conta",
      details: { id, erro: String(error?.message || error) },
    });
    return false;
  }
}

/**
 * Baixa parcial por ID.
 * - Abate do saldo (valor) e registra em `baixas`.
 * - Se zerar, marca como Pago.
 * - Nunca deixa o saldo negativo (corta no máximo).
 */
export function registrarBaixaParcialPorId(arg1, arg2) {
  try {
    let id, valorPago, obs;
    if (typeof arg1 === "object" && arg1 !== null) {
      id = arg1.id;
      valorPago = arg1.valorPago ?? arg1.valor;
      obs = arg1.obs ?? arg1.observacao ?? "";
    } else {
      id = arg1;
      valorPago = arg2?.valorPago ?? arg2?.valor;
      obs = arg2?.obs ?? arg2?.observacao ?? "";
    }

    const pago = Number(valorPago);
    if (!Number.isFinite(pago) || pago <= 0) return { aplicado: false };

    const contas = safeRead();
    const idx = contas.findIndex((c) => String(c.id) === String(id));
    if (idx === -1) return { aplicado: false };

    const conta = normalizeConta(contas[idx]);
    if (String(conta.status) !== "Pendente") return { aplicado: false };

    const saldoAnterior = Number(conta.valor);
    const abatimento = round2(Math.min(pago, saldoAnterior)); // evita negativo
    let saldoAtual = round2(saldoAnterior - abatimento);

    // registra baixa
    conta.baixas = [
      ...(conta.baixas || []),
      { valor: abatimento, data: new Date().toISOString(), obs },
    ];

    if (Math.abs(saldoAtual) <= 0.005) saldoAtual = 0;

    if (saldoAtual > 0) {
      contas[idx] = {
        ...conta,
        valor: saldoAtual,
        updatedAt: new Date().toISOString(),
        status: "Pendente",
      };
    } else {
      contas[idx] = {
        ...conta,
        valor: 0,
        status: "Pago",
        dataPagamento: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }

    safeWrite(contas);
    toast.info(`Baixa parcial de R$ ${abatimento.toFixed(2)} registrada na conta "${conta.descricao}"!`);

    // LOG: baixa parcial
    logEvent({
      type: "contas",
      title: "Baixa parcial registrada",
      details: {
        id,
        valorPago: abatimento,
        saldoAnterior,
        saldoAtual: Math.max(0, saldoAtual),
        zerado: saldoAtual === 0,
        obs,
      },
    });

    return {
      aplicado: true,
      contaId: conta.id,
      saldoAnterior,
      saldoAtual: Math.max(0, saldoAtual),
      zerado: saldoAtual === 0,
    };
  } catch (e) {
    console.error("Erro na baixa por ID:", e);
    toast.error("Erro ao registrar baixa parcial.");
    logEvent({
      type: "contas",
      title: "Erro na baixa parcial",
      details: { id, valorPago, erro: String(e?.message || e) },
    });
    return { aplicado: false };
  }
}

/**
 * Busca uma conta específica pelo código de 6 dígitos ou ID
 */
export function buscarContaPorCodigo(codigoOuId) {
  if (!codigoOuId) return null;
  const contas = safeRead();
  const termo = String(codigoOuId).trim();
  return (
    contas.find(
      (c) =>
        String(c.codigo || c.codigoConta) === termo ||
        String(c.id) === termo
    ) || null
  );
}

/**
 * Aplica confirmação de pagamento Total ou Parcial direcionado à conta pelo Código de 6 dígitos ou ID
 */
export async function aplicarPagamentoConta({
  identificador,
  tipoPagamento = "total",
  valorPago,
  observacao = "",
  dataPagamento = new Date().toISOString().slice(0, 10),
}) {
  try {
    const contas = safeRead();
    const termo = String(identificador || "").trim();
    const idx = contas.findIndex(
      (c) =>
        String(c.codigo || c.codigoConta) === termo ||
        String(c.id) === termo
    );

    if (idx === -1) {
      toast.error(`Conta com código #${termo} não foi encontrada.`);
      return { sucesso: false, erro: "Conta não encontrada" };
    }

    const conta = { ...contas[idx] };
    const valorOriginal = Number(conta.valor) || 0;
    const totalBaixadoAntes = (conta.baixas || []).reduce(
      (acc, b) => acc + (Number(b.valor) || 0),
      0
    );
    const saldoPendenteAntes = round2(Math.max(0, valorOriginal - totalBaixadoAntes));

    let valorAplicado = 0;
    if (tipoPagamento === "total" || Number(valorPago) >= saldoPendenteAntes) {
      valorAplicado = saldoPendenteAntes;
    } else {
      valorAplicado = round2(Math.min(Number(valorPago), saldoPendenteAntes));
    }

    if (valorAplicado <= 0) {
      toast.warn("Informe um valor válido maior que zero para o pagamento.");
      return { sucesso: false, erro: "Valor inválido" };
    }

    const novaBaixa = {
      valor: valorAplicado,
      data: dataPagamento
        ? new Date(dataPagamento).toISOString()
        : new Date().toISOString(),
      obs:
        observacao ||
        (tipoPagamento === "total"
          ? "Pagamento Total (Quitação)"
          : "Pagamento Parcial"),
    };

    const novasBaixas = [...(conta.baixas || []), novaBaixa];
    const totalBaixadoDepois = round2(totalBaixadoAntes + valorAplicado);
    const saldoRestante = round2(Math.max(0, valorOriginal - totalBaixadoDepois));
    const estaQuitada = saldoRestante <= 0.005;

    const contaAtualizada = {
      ...conta,
      baixas: novasBaixas,
      status: estaQuitada ? "Pago" : "Pendente",
      dataPagamento: estaQuitada ? dataPagamento : conta.dataPagamento,
      updatedAt: new Date().toISOString(),
    };

    contas[idx] = contaAtualizada;
    safeWrite(contas);

    // Persiste atualização no banco de dados via API
    api.put(`/contas/${contaAtualizada.id}`, contaAtualizada).catch((e) =>
      console.warn("Aviso ao atualizar conta no banco via API:", e.message)
    );

    if (estaQuitada) {
      toast.success(
        `🎉 Pagamento Total de R$ ${valorAplicado.toFixed(2)} aplicado! Conta #${
          conta.codigo || conta.id
        } quitada com sucesso.`
      );
    } else {
      toast.info(
        `✓ Pagamento Parcial de R$ ${valorAplicado.toFixed(2)} aplicado! Saldo restante: R$ ${saldoRestante.toFixed(
          2
        )}.`
      );
    }

    // LOG: aplicação de pagamento
    logEvent({
      type: "contas",
      title: estaQuitada ? "Pagamento Total Confirmado" : "Pagamento Parcial Confirmado",
      details: {
        id: conta.id,
        codigo: conta.codigo || conta.codigoConta,
        tipo: conta.tipo,
        descricao: conta.descricao,
        tipoPagamento,
        valorAplicado,
        saldoRestante,
        status: contaAtualizada.status,
      },
    });

    return {
      sucesso: true,
      conta: contaAtualizada,
      valorAplicado,
      saldoRestante,
      estaQuitada,
    };
  } catch (error) {
    console.error("Erro ao aplicar pagamento na conta:", error);
    toast.error("Erro ao aplicar confirmação de pagamento.");
    return { sucesso: false, erro: error.message };
  }
}

