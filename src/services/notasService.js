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

/**
 * Deduplica estritamente uma lista de notas fiscais
 */
export function deduplicarListaNotas(lista) {
  if (!Array.isArray(lista)) return [];
  const vistas = new Set();
  const resultado = [];

  for (const item of lista) {
    if (!item) continue;
    const id = item.id != null ? String(item.id).trim() : '';
    const num = item.numero != null ? String(item.numero).trim() : '';
    const chave = item.chavedeacesso != null ? String(item.chavedeacesso).trim().replace(/\D+/g, '') : '';
    const email = (item.userEmail || item.user_email || '').trim().toLowerCase();
    
    // Identificador único de deduplicação
    let chaveUnica = '';
    if (chave.length >= 20) {
      chaveUnica = `chave:${chave}`;
    } else if (num && email) {
      chaveUnica = `num:${num}:${email}:${String(item.origem || item.clienteOuServico || '').trim().toLowerCase()}`;
    } else if (id) {
      chaveUnica = `id:${id}`;
    }

    if (chaveUnica) {
      if (vistas.has(chaveUnica)) {
        continue; // duplicata ignorada
      }
      vistas.add(chaveUnica);
    }
    
    // Também previne duplicata pelo mesmo ID numérico
    if (id) {
      const idKey = `raw_id:${id}`;
      if (vistas.has(idKey)) {
        continue;
      }
      vistas.add(idKey);
    }

    resultado.push(item);
  }
  return resultado;
}

// Sincroniza em segundo plano com o banco de dados
export async function sincronizarNotasDoServidor(customUser = null) {
  const u = _resolveUser(customUser);
  try {
    const params = { user_email: u.email, user_id: u.id };
    const resp = await api.get("/notas", {
      params,
      headers: {
        'x-user-email': u.email,
        'x-user-id': u.id,
      },
    });
    if (Array.isArray(resp.data)) {
      const currentList = safeParse(localStorage.getItem(KEY));
      const myEmail = (u.email || '').trim().toLowerCase();
      const myId = u.id ? String(u.id).trim() : '';

      const otherUsersNotas = currentList.filter((n) => {
        const nEmail = (n.userEmail || n.user_email || '').trim().toLowerCase();
        const nId = n.userId || n.user_id ? String(n.userId || n.user_id).trim() : '';
        if (myEmail && nEmail && nEmail === myEmail) return false;
        if (myId && nId && nId === myId) return false;
        return true;
      });

      const listaMesclada = deduplicarListaNotas([...otherUsersNotas, ...resp.data]);
      persist(listaMesclada);
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
    const limpos = deduplicarListaNotas(list || []);
    localStorage.setItem(KEY, JSON.stringify(limpos));
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
  const userEmail = (nota.userEmail || nota.user_email || u.email || '').trim().toLowerCase();
  const userId = nota.userId || nota.user_id || u.id || null;
  const userName = nota.userName || nota.user_name || u.name || '';

  return {
    ...nota,
    filial,
    userEmail,
    userId,
    userName,
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
  const list = deduplicarListaNotas(safeParse(raw).map((n) => normalizeNota(n, u)));

  // Cada usuário visualiza apenas as suas próprias notas fiscais
  const myEmail = (u.email || '').trim().toLowerCase();
  const myId = u.id ? String(u.id).trim() : '';

  if (!myEmail && !myId) return [];

  const filtradas = list.filter((n) => {
    const notaEmail = (n.userEmail || n.user_email || '').trim().toLowerCase();
    const notaId = n.userId || n.user_id ? String(n.userId || n.user_id).trim() : '';
    
    if (myEmail && notaEmail && notaEmail === myEmail) return true;
    if (myId && notaId && notaId === myId) return true;

    return false;
  });

  return deduplicarListaNotas(filtradas);
}

/** true se já existir outra nota com a mesma chave (ignora o id informado) */
export function chaveExiste(chavedeacesso, ignoreId, customUser = null) {
  const raw = localStorage.getItem(KEY);
  const list = safeParse(raw);
  const key = String(chavedeacesso || "").trim().replace(/\D+/g, '');
  if (!key || key.length < 10) return false;
  return list.some(
    (n) => {
      const nKey = String(n.chavedeacesso || "").trim().replace(/\D+/g, '');
      return nKey === key && Number(n.id) !== Number(ignoreId);
    }
  );
}

/** true se já existir outra nota com o mesmo número para este usuário */
export function numeroExiste(numero, ignoreId, customUser = null) {
  const u = _resolveUser(customUser);
  const raw = localStorage.getItem(KEY);
  const list = safeParse(raw);
  const num = String(numero || "").trim();
  if (!num) return false;
  const myEmail = (u.email || '').trim().toLowerCase();

  return list.some((n) => {
    const nNum = String(n.numero || "").trim();
    const nEmail = (n.userEmail || n.user_email || '').trim().toLowerCase();
    return nNum === num && Number(n.id) !== Number(ignoreId) && (!nEmail || !myEmail || nEmail === myEmail);
  });
}

export function salvarNota(nota, customUser = null) {
  const u = _resolveUser(customUser);
  const raw = localStorage.getItem(KEY);
  const list = deduplicarListaNotas(safeParse(raw).map((n) => normalizeNota(n, u)));

  const nova = normalizeNota(
    {
      ...nota,
      userEmail: u.email,
      userId: u.id,
      userName: u.name,
      filial: nota.filial || u.filial || 'Filial 1',
    },
    u
  );

  const chaveLimpa = String(nova.chavedeacesso || '').trim().replace(/\D+/g, '');
  const numLimpo = String(nova.numero || '').trim();

  // Verifica se já existe uma nota com mesmo id, mesma chave ou mesmo número para este usuário
  const existingIdx = list.findIndex((n) => {
    if (nova.id && Number(n.id) === Number(nova.id)) return true;
    const nChave = String(n.chavedeacesso || '').trim().replace(/\D+/g, '');
    if (chaveLimpa.length >= 20 && nChave.length >= 20 && nChave === chaveLimpa) return true;
    const nNum = String(n.numero || '').trim();
    if (numLimpo && nNum && numLimpo === nNum) {
      const nEmail = (n.userEmail || n.user_email || '').trim().toLowerCase();
      const myEmail = (u.email || '').trim().toLowerCase();
      if (nEmail === myEmail) return true;
    }
    return false;
  });

  if (existingIdx >= 0) {
    // Atualiza a nota existente em vez de duplicar
    const atualizada = normalizeNota({ ...list[existingIdx], ...nova }, u);
    list[existingIdx] = atualizada;
    persist(deduplicarListaNotas(list));
    api.put(`/notas/${atualizada.id}`, atualizada).catch((e) =>
      console.warn("Aviso ao atualizar nota existente via API:", e.message)
    );
    return atualizada;
  }

  if (!nova.id) nova.id = nextId(list);
  if (!nova.numero) nova.numero = nextNumero(list);
  if (!nova.createdAt) nova.createdAt = new Date().toISOString();

  list.unshift(nova);
  const listaFinal = deduplicarListaNotas(list);
  persist(listaFinal);

  // Persiste no banco de dados via API
  api.post("/notas", nova).catch((e) =>
    console.warn("Aviso ao persistir nota no banco via API:", e.message)
  );

  return nova;
}

export function atualizarNota(nota, customUser = null) {
  const u = _resolveUser(customUser);
  const raw = localStorage.getItem(KEY);
  const list = deduplicarListaNotas(safeParse(raw).map((n) => normalizeNota(n, u)));
  const idx = list.findIndex((n) => Number(n.id) === Number(nota.id));
  if (idx >= 0) {
    const atualizada = normalizeNota({ ...list[idx], ...nota }, u);
    list[idx] = atualizada;
    persist(deduplicarListaNotas(list));

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
    persist(deduplicarListaNotas(list));

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
  persist(deduplicarListaNotas(list));

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

  persist(deduplicarListaNotas(keep));
  return { deletedIds, blockedIds };
}

export { excluirNota as excluirNotaFiscal };