// src/services/notasService.js
import { parseToBackendFloat } from "../utils/numberUtils";
import { api } from "../api/client";
import { getUser, isAdmin } from "../auth/auth";

const KEY = "notas_jsa";

function _resolveUser(provided = null) {
  const u = provided || getUser() || {};
  const email = (u.email || u.user_email || '').trim().toLowerCase();
  const rawName = (u.name || u.nome || '').trim();
  const rawSurname = (u.surname || u.sobrenome || '').trim();
  let fullName = [rawName, rawSurname].filter(Boolean).join(' ');
  if (!fullName || fullName.toLowerCase() === 'usuario') {
    fullName = email ? email.split('@')[0] : 'Operador';
  }

  const isUserAdmin = isAdmin(u);
  const filialStorage = localStorage.getItem('usuario_filial');
  const filial = (u.filial || u.user_filial || filialStorage || 'Filial 1').trim();

  return { id: u.id || null, email, name: fullName, isUserAdmin, filial };
}

// Sincroniza em segundo plano com o banco de dados
export async function sincronizarNotasDoServidor(customUser = null) {
  const u = _resolveUser(customUser);
  try {
    const params = u.isUserAdmin ? { isAdmin: 'true' } : { filial: u.filial };
    const resp = await api.get("/notas", { params });
    if (Array.isArray(resp.data)) {
      persist(resp.data);
      return listarNotas(u);
    }
  } catch (e) {
    // Modo offline resiliente
  }
  return listarNotas(u);
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

function normalizeNota(nota, customUser = null) {
  const u = _resolveUser(customUser);
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

  const cnpj = nota.cnpj ? String(nota.cnpj).trim() : '';
  const produtoRelacionado = nota.produtoRelacionado || nota.produto_relacionado || nota.produto || '';
  const tipoConta = nota.tipoConta || 'Receber';
  const filial = (nota.filial || u.filial || 'Filial 1').trim();

  return {
    ...nota,
    filial,
    numero: numeroLimpo || nota.numero,
    chavedeacesso: chaveAcesso,
    cnpj,
    produtoRelacionado,
    tipoConta,
    valor: parseToBackendFloat(nota.valor),
    status: nota.status || "Emitida",
    updatedAt: new Date().toISOString(),
  };
}

// ---------- API ----------
export function listarNotas(customUser = null) {
  const u = _resolveUser(customUser);
  const raw = localStorage.getItem(KEY);
  const list = safeParse(raw).map((n) => normalizeNota(n, u));

  // Admin visualiza todas as filiais
  if (u.isUserAdmin) {
    return list;
  }

  // Usuário de filial visualiza todas as notas inseridas por todos os usuários da sua filial (ex: Filial 4)
  const userFilialNorm = String(u.filial || 'Filial 1').trim().toLowerCase();
  return list.filter((n) => {
    const notaFilialNorm = String(n.filial || 'Filial 1').trim().toLowerCase();
    return notaFilialNorm === userFilialNorm;
  });
}

/** true se já existir outra nota com a mesma chave (ignora o id informado) */
export function chaveExiste(chavedeacesso, ignoreId) {
  const raw = localStorage.getItem(KEY);
  const list = safeParse(raw);
  const key = String(chavedeacesso || "").trim();
  if (!key) return false;
  return list.some(
    (n) =>
      String(n.chavedeacesso || "").trim() === key &&
      Number(n.id) !== Number(ignoreId)
  );
}

export function salvarNota(nota, customUser = null) {
  const u = _resolveUser(customUser);
  const raw = localStorage.getItem(KEY);
  const list = safeParse(raw).map((n) => normalizeNota(n, u));

  const nova = normalizeNota(
    {
      ...nota,
      filial: nota.filial || u.filial || 'Filial 1',
    },
    u
  );
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

export function atualizarNota(nota, customUser = null) {
  const u = _resolveUser(customUser);
  const raw = localStorage.getItem(KEY);
  const list = safeParse(raw).map((n) => normalizeNota(n, u));
  const idx = list.findIndex((n) => Number(n.id) === Number(nota.id));
  if (idx >= 0) {
    const atualizada = normalizeNota({ ...list[idx], ...nota }, u);
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
  const raw = localStorage.getItem(KEY);
  const list = safeParse(raw);
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
  const raw = localStorage.getItem(KEY);
  const list = safeParse(raw);
  const idx = list.findIndex((n) => Number(n.id) === Number(id));
  if (idx < 0) return false;
  const n = list[idx];
  if (n.statusCancelamento === "Pendente") {
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
  const raw = localStorage.getItem(KEY);
  const list = safeParse(raw);

  const keep = [];
  const deletedIds = [];
  const blockedIds = [];

  for (const n of list) {
    if (set.has(Number(n.id))) {
      if (n.statusCancelamento === "Pendente") {
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