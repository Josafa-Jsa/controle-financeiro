// src/services/controleNotasService.js
import { api } from '../api/client';
import { parseToBackendFloat } from '../utils/numberUtils';
import { limparChave, formatarChaveBlocos } from './consultaNFeService';
import { extrairCnpjLimpo, formatarCnpj, obterPadraoCnpj } from './memoriaCnpjService';
import { getUser, isAdmin } from '../auth/auth';
import { normalizarNomeFilial } from '../utils/filialUtils';

const KEY = 'jsa_controle_notas';

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
  const filial = normalizarNomeFilial(u.filial || u.user_filial || filialStorage || 'Filial 1');

  return { id: u.id || null, email, name: fullName, isUserAdmin, filial };
}

/**
 * Decodifica uma chave de 44 dígitos da NF-e para o Controle de Notas
 */
export function decodificarChaveControle(chave) {
  const limpa = limparChave(chave);
  if (limpa.length !== 44) return null;

  const cUf = limpa.slice(0, 2);
  const aa = limpa.slice(2, 4);
  const mm = limpa.slice(4, 6);
  const cnpjRaw = limpa.slice(6, 20);
  const serieRaw = limpa.slice(22, 25);
  const nNfRaw = limpa.slice(25, 34);

  const ano = 2000 + Number(aa);
  const dataEmissaoEstimada = `${ano}-${mm}-01`;
  const cnpjFormatado = formatarCnpj(cnpjRaw);
  const numeroFormatado = String(Number(nNfRaw));
  const serieFormatada = String(Number(serieRaw));

  // Verifica fornecedor cadastrado na memória
  const padrao = obterPadraoCnpj(cnpjRaw);
  const fornecedorCadastrado = Boolean(
    padrao &&
    padrao.nome &&
    !padrao.nome.startsWith('EMITENTE CNPJ') &&
    padrao.nome !== 'Emitente'
  );

  return {
    chavedeacesso: limpa,
    chaveFormatada: formatarChaveBlocos(limpa),
    cnpj: cnpjFormatado,
    cnpjRaw,
    numero: numeroFormatado,
    serie: serieFormatada,
    dataEmissao: dataEmissaoEstimada,
    fornecedor: fornecedorCadastrado ? padrao.nome : '',
    fornecedorCadastrado,
    padrao,
  };
}

// ---------- Sincronização e Armazenamento ----------
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
  } catch (err) {
    console.warn('[ControleNotas] Falha ao persistir no LocalStorage:', err);
  }
}

function normalizeControleNota(nota, customUser = null) {
  const u = _resolveUser(customUser);
  const chave = String(nota.chavedeacesso || '').trim();
  const cnpj = formatarCnpj(nota.cnpj || extrairCnpjLimpo(chave));
  const numero = String(nota.numero || '').trim();
  const valor = parseToBackendFloat(nota.valor) || 0;
  const filial = normalizarNomeFilial(nota.filial || u.filial || 'Filial 1');

  return {
    ...nota,
    id: nota.id || Date.now(),
    filial,
    chavedeacesso: chave,
    cnpj,
    numero,
    fornecedor: nota.fornecedor || nota.clienteOuServico || nota.origem || 'Fornecedor Não Informado',
    dataEmissao: nota.dataEmissao ? String(nota.dataEmissao).slice(0, 10) : new Date().toISOString().slice(0, 10),
    dataHoraEntrega: nota.dataHoraEntrega || new Date().toISOString().slice(0, 16),
    quemRecebeu: nota.quemRecebeu || u.name || 'Usuário Atual',
    quemRecebeuEmail: nota.quemRecebeuEmail || u.email || '',
    valor,
    observacoes: nota.observacoes || '',
    status: nota.status || 'Recebida',
    situacaoNota: nota.situacaoNota || nota.situacao_nota || '',
    responsavelLiberacao: nota.responsavelLiberacao || nota.responsavel_liberacao || '',
    dataHoraLiberacao: nota.dataHoraLiberacao || nota.data_hora_liberacao || null,
    anexoDanfe: nota.anexoDanfe || null,
    createdAt: nota.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function listarControleNotas(customUser = null) {
  const u = _resolveUser(customUser);
  const raw = localStorage.getItem(KEY);
  const list = safeParse(raw).map((n) => normalizeControleNota(n, u));

  // Admin visualiza todas as filiais
  if (u.isUserAdmin) {
    return list;
  }

  // Usuário de filial visualiza todas as notas inseridas por todos os usuários da sua filial (ex: Filial 4)
  const userFilialNorm = normalizarNomeFilial(u.filial || 'Filial 1').toLowerCase();
  return list.filter((n) => {
    const notaFilialNorm = normalizarNomeFilial(n.filial || 'Filial 1').toLowerCase();
    return notaFilialNorm === userFilialNorm;
  });
}

export async function sincronizarControleNotasDoServidor(customUser = null) {
  const u = _resolveUser(customUser);
  try {
    const params = u.isUserAdmin ? { isAdmin: 'true' } : { filial: u.filial, isAdmin: 'false' };
    const resp = await api.get('/controle-notas', {
      params,
      headers: {
        'x-user-email': u.email,
      },
    });
    if (Array.isArray(resp.data)) {
      if (u.isUserAdmin) {
        persist(resp.data);
      } else {
        const currentList = safeParse(localStorage.getItem(KEY));
        const userFilialNorm = normalizarNomeFilial(u.filial || 'Filial 1').toLowerCase();
        const otherBranches = currentList.filter(
          (n) => normalizarNomeFilial(n.filial || '').toLowerCase() !== userFilialNorm
        );
        persist([...otherBranches, ...resp.data]);
      }
      return listarControleNotas(u);
    }
  } catch (e) {
    // Modo offline resiliente
  }
  return listarControleNotas(u);
}

/**
 * Consulta notas do relatório no banco de dados por data específica e filial
 */
export async function buscarRelatorioControleNotasBanco({ data, filial, customUser = null }) {
  const u = _resolveUser(customUser);
  const filialFinal = filial ? normalizarNomeFilial(filial) : (u.isUserAdmin ? undefined : normalizarNomeFilial(u.filial));
  const dataFinal = data || new Date().toISOString().slice(0, 10);

  try {
    const params = { data: dataFinal };
    if (filialFinal && filialFinal.toLowerCase() !== 'todas') {
      params.filial = filialFinal;
    }
    const resp = await api.get('/relatorio-controle-notas', { params });
    if (Array.isArray(resp.data)) {
      return resp.data.map((n) => normalizeControleNota(n, u));
    }
  } catch (err) {
    console.warn('[ControleNotas] Falha ao consultar relatório no servidor, usando dados locais:', err.message);
  }

  // Fallback local caso offline
  const list = listarControleNotas(u);
  return list.filter((n) => {
    const dataEntrega = String(n.dataHoraEntrega || '').slice(0, 10);
    const dataEmissao = String(n.dataEmissao || '').slice(0, 10);
    return dataEntrega === dataFinal || dataEmissao === dataFinal;
  });
}

export function salvarControleNota(nota, customUser = null) {
  const u = _resolveUser(customUser);
  const raw = localStorage.getItem(KEY);
  const list = safeParse(raw).map((n) => normalizeControleNota(n, u));
  const filialNota = normalizarNomeFilial(nota.filial || u.filial || 'Filial 1');
  const nova = normalizeControleNota(
    {
      ...nota,
      filial: filialNota,
      quemRecebeu: nota.quemRecebeu || u.name,
      quemRecebeuEmail: nota.quemRecebeuEmail || u.email,
    },
    u
  );

  list.unshift(nova);
  persist(list);

  // Persiste no backend via API de forma não-bloqueante
  api.post('/controle-notas', nova).catch((e) =>
    console.warn('[ControleNotas] Aviso ao persistir nota no banco via API:', e.message)
  );

  return nova;
}

export function atualizarControleNota(nota, customUser = null) {
  const u = _resolveUser(customUser);
  const raw = localStorage.getItem(KEY);
  const list = safeParse(raw).map((n) => normalizeControleNota(n, u));
  const idx = list.findIndex((n) => String(n.id) === String(nota.id));
  if (idx >= 0) {
    const atualizada = normalizeControleNota({ ...list[idx], ...nota }, u);
    list[idx] = atualizada;
    persist(list);

    api.put(`/controle-notas/${atualizada.id}`, atualizada).catch((e) =>
      console.warn('[ControleNotas] Aviso ao atualizar nota no banco via API:', e.message)
    );

    return atualizada;
  }
  return null;
}

export function excluirControleNota(id) {
  const raw = localStorage.getItem(KEY);
  const list = safeParse(raw);
  const idx = list.findIndex((n) => String(n.id) === String(id));
  if (idx < 0) return false;

  list.splice(idx, 1);
  persist(list);

  api.delete(`/controle-notas/${id}`).catch((e) =>
    console.warn('[ControleNotas] Aviso ao excluir nota no banco via API:', e.message)
  );

  return true;
}

export { normalizarNomeFilial };

