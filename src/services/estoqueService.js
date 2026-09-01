// src/services/estoqueService.js
import { toast } from "react-toastify";
import { logEvent } from "../utils/logger";
import { api } from "../api/client";

const STORAGE_KEY = "produtos";

// Sincroniza em segundo plano com o banco de dados
export async function sincronizarEstoqueDoServidor() {
  try {
    const resp = await api.get("/produtos");
    if (Array.isArray(resp.data)) {
      safeWrite(resp.data);
      return resp.data;
    }
  } catch (e) {
    // Modo offline resiliente
  }
  return safeRead();
}

/* =============== Helpers =============== */
function safeRead() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error("[estoqueService] JSON parse falhou:", e);
    return [];
  }
}
function safeWrite(lista) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
}
function generateId(lista) {
  const maxId = lista.reduce((acc, p) => {
    const n = typeof p.id === "number" ? p.id : Number(p.id);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return maxId + 1;
}
function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100;
}
function normalizeProduto(p) {
  return {
    id: p.id ?? null,
    nome: String(p.nome || "").trim(),
    descricao: String(p.descricao || "").trim(),
    quantidade: Number.isFinite(Number(p.quantidade))
      ? Number(p.quantidade)
      : 0,
    estoqueMinimo: Number.isFinite(Number(p.estoqueMinimo))
      ? Number(p.estoqueMinimo)
      : 0,
    valorUnitario: Number.isFinite(Number(p.valorUnitario))
      ? round2(Number(p.valorUnitario))
      : 0,
    createdAt: p.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
function changedFields(before = {}, after = {}) {
  const keys = [
    "nome",
    "descricao",
    "quantidade",
    "estoqueMinimo",
    "valorUnitario",
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

/* =============== API =============== */
export function listarProdutos() {
  try {
    return safeRead();
  } catch (error) {
    toast.error("Erro ao carregar produtos.");
    console.error("Erro ao listar produtos:", error);
    return [];
  }
}

export function salvarProduto(novoProduto) {
  try {
    const lista = safeRead();
    const norm = normalizeProduto({ ...novoProduto, id: null });
    norm.id = generateId(lista);

    lista.push(norm);
    safeWrite(lista);
    toast.success("Produto cadastrado com sucesso!");

    // Persiste no banco de dados via API
    api.post("/produtos", norm).catch((e) =>
      console.warn("Aviso ao persistir produto no banco via API:", e.message)
    );

    // LOG: criação
    logEvent({
      type: "estoque",
      title: "Produto cadastrado",
      details: {
        id: norm.id,
        nome: norm.nome,
        quantidade: norm.quantidade,
        estoqueMinimo: norm.estoqueMinimo,
        valorUnitario: norm.valorUnitario,
      },
    });

    return norm;
  } catch (error) {
    toast.error("Erro ao salvar produto.");
    console.error("Erro ao salvar produto:", error);
    logEvent({
      type: "estoque",
      title: "Erro ao cadastrar produto",
      details: { erro: String(error?.message || error) },
    });
    return null;
  }
}

export function atualizarProduto(produtoAtualizado) {
  try {
    const lista = safeRead();
    const idx = lista.findIndex((p) => p.id === produtoAtualizado?.id);
    if (idx === -1) throw new Error("Produto não encontrado para atualização.");

    const before = { ...lista[idx] };
    const merged = normalizeProduto({
      ...lista[idx],
      ...produtoAtualizado,
      id: lista[idx].id,
      createdAt: lista[idx].createdAt || new Date().toISOString(),
    });

    lista[idx] = merged;
    safeWrite(lista);
    toast.success("Produto atualizado com sucesso!");

    // Persiste no banco de dados via API
    api.put(`/produtos/${merged.id}`, merged).catch((e) =>
      console.warn("Aviso ao atualizar produto no banco via API:", e.message)
    );

    // LOG: atualização (com diff)
    logEvent({
      type: "estoque",
      title: "Produto atualizado",
      details: {
        id: merged.id,
        changes: changedFields(before, merged),
      },
    });

    return merged;
  } catch (error) {
    toast.error("Erro ao atualizar produto.");
    console.error("Erro ao atualizar produto:", error);
    logEvent({
      type: "estoque",
      title: "Erro ao atualizar produto",
      details: {
        id: produtoAtualizado?.id,
        erro: String(error?.message || error),
      },
    });
    return null;
  }
}

export function excluirProduto(id) {
  try {
    const lista = safeRead();
    const antes = lista.find((p) => p.id === id);
    const filtrada = lista.filter((p) => p.id !== id);
    safeWrite(filtrada);
    toast.success("Produto excluído com sucesso!");

    // Persiste no banco de dados via API
    api.delete(`/produtos/${id}`).catch((e) =>
      console.warn("Aviso ao excluir produto no banco via API:", e.message)
    );

    // LOG: exclusão
    logEvent({
      type: "estoque",
      title: "Produto excluído",
      details: {
        id,
        nome: antes?.nome || "",
        quantidade: antes?.quantidade ?? null,
        estoqueMinimo: antes?.estoqueMinimo ?? null,
        valorUnitario: antes?.valorUnitario ?? null,
      },
    });

    return true;
  } catch (error) {
    toast.error("Erro ao excluir produto.");
    console.error("Erro ao excluir produto:", error);
    logEvent({
      type: "estoque",
      title: "Erro ao excluir produto",
      details: { id, erro: String(error?.message || error) },
    });
    return false;
  }
}
