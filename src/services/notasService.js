// src/services/notasService.js
import { parseToBackendFloat } from "../utils/numberUtils";
import { api } from "../api/client";

const KEY = "notas_jsa";

// Sincroniza em segundo plano com o banco de dados
export async function sincronizarNotasDoServidor() {
  try {
    const resp = await api.get("/notas");
    if (Array.isArray(resp.data)) {
      persist(resp.data);
      return resp.data;
    }
  } catch (e) {
    // Modo offline resiliente
  }
  return listarNotas();
}

// ---------- utils ----------
function safeParse(raw) {
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function persist(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list || []));
  } catch {}
}

function nextId(list) {
  const ids = (list || []).map((n) => Number(n.id) || 0);
  return ids.length ? Math.max(...ids) + 1 : 1;
}

function nextNumero(list) {
  const nums = (list || [])
    .map((n) => Number(n.numero))
    .filter(Number.isFinite);
  return nums.length ? Math.max(...nums) + 1 : 1;
}

function normalizeNota(nota) {
  let numeroLimpo = nota.numero != null ? String(nota.numero).trim() : '';
  let chaveAcesso = String(nota.chavedeacesso || '').trim();

  // Se o número foi gravado como a chave de 44 dígitos, extrai o número real
  const numPuro = numeroLimpo.replace(/\D+/g, '');
  if (numPuro.length >= 20) {
    if (!chaveAcesso) chaveAcesso = numPuro;
    const nNF = numPuro.slice(25, 34);
    numeroLimpo = String(Number(nNF) || numPuro.slice(-6));
  } else if (!numeroLimpo && chaveAcesso.replace(/\D+/g, '').length === 44) {
    const nNF = chaveAcesso.replace(/\D+/g, '').slice(25, 34);
    numeroLimpo = String(Number(nNF));
  }

  return {
    ...nota,
    numero: numeroLimpo || nota.numero,
    chavedeacesso: chaveAcesso,
    valor: parseToBackendFloat(nota.valor),
    status: nota.status || "Emitida",
    updatedAt: new Date().toISOString(),
  };
}

// ---------- API ----------
export function listarNotas() {
  const raw = localStorage.getItem(KEY);
  const list = safeParse(raw);
  return list.map(normalizeNota);
}

/** true se já existir outra nota com a mesma chave (ignora o id informado) */
export function chaveExiste(chavedeacesso, ignoreId) {
  const list = listarNotas();
  const key = String(chavedeacesso || "").trim();
  if (!key) return false;
  return list.some(
    (n) =>
      String(n.chavedeacesso || "").trim() === key &&
      Number(n.id) !== Number(ignoreId)
  );
}

export function salvarNota(nota) {
  const list = listarNotas();

  const nova = normalizeNota(nota);
  if (!nova.id) nova.id = nextId(list);
  if (!nova.numero) nova.numero = nextNumero(list);
  if (!nova.createdAt) nova.createdAt = new Date().toISOString();

  list.push(nova);
  persist(list);

  // Persiste no banco de dados via API
  api.post("/notas", nova).catch((e) =>
    console.warn("Aviso ao persistir nota no banco via API:", e.message)
  );

  return nova;
}

export function atualizarNota(nota) {
  const list = listarNotas();
  const idx = list.findIndex((n) => Number(n.id) === Number(nota.id));
  if (idx >= 0) {
    const atualizada = normalizeNota({ ...list[idx], ...nota });
    list[idx] = atualizada;
    persist(list);

    // Persiste atualização no banco de dados via API
    api.put(`/notas/${atualizada.id}`, atualizada).catch((e) =>
      console.warn("Aviso ao atualizar nota no banco via API:", e.message)
    );

    return atualizada;
  }
  return null;
}

export function cancelarNota(id) {
  const list = listarNotas();
  const idx = list.findIndex((n) => Number(n.id) === Number(id));
  if (idx >= 0) {
    const n = { ...list[idx] };
    n.status = "Cancelada";
    delete n.statusCancelamento;
    delete n.cancelRequestId;
    n.updatedAt = new Date().toISOString();
    list[idx] = n;
    persist(list);

    // Persiste cancelamento no banco de dados via API
    api.put(`/notas/${id}`, n).catch((e) =>
      console.warn("Aviso ao cancelar nota no banco via API:", e.message)
    );

    return n;
  }
  return null;
}

export function excluirNota(id) {
  const list = listarNotas();
  const idx = list.findIndex((n) => Number(n.id) === Number(id));
  if (idx < 0) return false;
  const n = list[idx];
  if (n.statusCancelamento === "Pendente" || n.deletePending || n.exclusaoPendente) {
    return false;
  }
  list.splice(idx, 1);
  persist(list);

  // Persiste exclusão no banco de dados via API
  api.delete(`/notas/${id}`).catch((e) =>
    console.warn("Aviso ao excluir nota no banco via API:", e.message)
  );

  return true;
}

export function excluirNotas(ids = []) {
  const set = new Set((ids || []).map(Number));
  const list = listarNotas();

  const keep = [];
  const deletedIds = [];
  const blockedIds = [];

  for (const n of list) {
    if (set.has(Number(n.id))) {
      if (n.statusCancelamento === "Pendente" || n.deletePending || n.exclusaoPendente) {
        blockedIds.push(n.id);
        keep.push(n);
      } else {
        deletedIds.push(n.id);
      }
    } else {
      keep.push(n);
    }
  }

  persist(keep);
  return { deletedIds, blockedIds };
}

export { excluirNota as excluirNotaFiscal };