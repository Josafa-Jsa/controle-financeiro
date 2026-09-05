// src/services/contratosService.js
import { toast } from "react-toastify";
import { logEvent } from "../utils/logger";
import { api } from "../api/client";

const STORAGE_KEY = "contratos";

// Sincroniza em segundo plano com o banco de dados
export async function sincronizarContratosDoServidor() {
  try {
    const resp = await api.get("/contratos");
    if (Array.isArray(resp.data)) {
      safeWrite(resp.data);
      return resp.data;
    }
  } catch (e) {
    // Modo offline resiliente
  }
  return safeRead();
}

/* ================ Helpers ================ */
function safeRead() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error("[contratosService] JSON parse falhou:", e);
    return [];
  }
}
function safeWrite(lista) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}
function generateId(lista) {
  const maxId = lista.reduce((acc, c) => {
    const n = typeof c.id === "number" ? c.id : Number(c.id);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return maxId + 1;
}
function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
function normalizeContrato(c) {
  const hojeISO = new Date().toISOString().slice(0, 10);
  return {
    ...c,
    id: c.id ?? null,
    parceiro: String(c.parceiro || c.dadosContratante?.razaoSocial || c.dadosContratante?.nome || "").trim(),
    descricao: String(c.descricao || c.objetoServico || "").trim(),
    valor: Number.isFinite(Number(c.valor)) ? round2(Number(c.valor)) : 0,
    vencimento: c.vencimento
      ? new Date(c.vencimento).toISOString().slice(0, 10)
      : hojeISO,
    arquivoBase64: c.arquivoBase64 || "",
    arquivoNome: String(c.arquivoNome || "").trim(),
    createdAt: c.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
function changedFields(before = {}, after = {}) {
  const keys = [
    "parceiro",
    "descricao",
    "valor",
    "vencimento",
    "arquivoNome",
    "arquivoBase64",
  ];
  const diff = {};
  for (const k of keys) {
    const a = before[k];
    const b = after[k];
    const same =
      typeof a === "object" || typeof b === "object"
        ? JSON.stringify(a) === JSON.stringify(b)
        : a === b;
    if (!same) diff[k] = { from: a, to: b };
  }
  return diff;
}

/* ================ API ================ */
export function listarContratos() {
  try {
    const contratos = safeRead();
    return contratos;
  } catch (error) {
    toast.error("Erro ao carregar contratos.");
    console.error("Erro ao listar contratos:", error);
    return [];
  }
}

export function salvarContrato(novoContrato) {
  try {
    const lista = safeRead();
    const norm = normalizeContrato({ ...novoContrato, id: null });
    norm.id = generateId(lista);

    lista.push(norm);
    safeWrite(lista);
    toast.success("Contrato adicionado com sucesso!");

    // Persiste no banco de dados via API
    api.post("/contratos", norm).catch((e) =>
      console.warn("Aviso ao persistir contrato no banco via API:", e.message)
    );

    // LOG: criação
    logEvent({
      type: "contratos",
      title: "Contrato criado",
      details: {
        id: norm.id,
        parceiro: norm.parceiro,
        descricao: norm.descricao,
        valor: norm.valor,
        vencimento: norm.vencimento,
        arquivoNome: norm.arquivoNome || "",
      },
    });

    return norm;
  } catch (error) {
    toast.error("Erro ao salvar contrato.");
    console.error("Erro ao salvar contrato:", error);
    logEvent({
      type: "contratos",
      title: "Erro ao criar contrato",
      details: { erro: String(error?.message || error) },
    });
    return null;
  }
}

export function atualizarContrato(contratoAtualizado) {
  try {
    const lista = safeRead();
    const idx = lista.findIndex((c) => c.id === contratoAtualizado?.id);
    if (idx === -1)
      throw new Error("Contrato não encontrado para atualização.");

    const before = { ...lista[idx] };
    const merged = normalizeContrato({
      ...lista[idx],
      ...contratoAtualizado,
      id: lista[idx].id,
      createdAt: lista[idx].createdAt || new Date().toISOString(),
    });

    lista[idx] = merged;
    safeWrite(lista);
    toast.success("Contrato atualizado com sucesso!");

    // Persiste no banco de dados via API
    api.put(`/contratos/${merged.id}`, merged).catch((e) =>
      console.warn("Aviso ao atualizar contrato no banco via API:", e.message)
    );

    // LOG: atualização (com diff)
    logEvent({
      type: "contratos",
      title: "Contrato atualizado",
      details: {
        id: merged.id,
        changes: changedFields(before, merged),
      },
    });

    return merged;
  } catch (error) {
    toast.error("Erro ao atualizar contrato.");
    console.error("Erro ao atualizar contrato:", error);
    logEvent({
      type: "contratos",
      title: "Erro ao atualizar contrato",
      details: {
        id: contratoAtualizado?.id,
        erro: String(error?.message || error),
      },
    });
    return null;
  }
}

export function excluirContrato(id) {
  try {
    const lista = safeRead();
    const antes = lista.find((c) => c.id === id);
    const filtrada = lista.filter((c) => c.id !== id);
    safeWrite(filtrada);
    toast.success("Contrato excluído com sucesso!");

    // Persiste no banco de dados via API
    api.delete(`/contratos/${id}`).catch((e) =>
      console.warn("Aviso ao excluir contrato no banco via API:", e.message)
    );

    // LOG: exclusão
    logEvent({
      type: "contratos",
      title: "Contrato excluído",
      details: {
        id,
        parceiro: antes?.parceiro || "",
        descricao: antes?.descricao || "",
        valor: antes?.valor ?? null,
        vencimento: antes?.vencimento || "",
      },
    });

    return true;
  } catch (error) {
    toast.error("Erro ao excluir contrato.");
    console.error("Erro ao excluir contrato:", error);
    logEvent({
      type: "contratos",
      title: "Erro ao excluir contrato",
      details: { id, erro: String(error?.message || error) },
    });
    return false;
  }
}
