// src/services/uniformesService.js
import { api } from '../api/client';
import { getUser } from '../auth/auth';

const STORAGE_ESTOQUE_KEY = 'jsa_uniformes_estoque';
const STORAGE_MOV_KEY = 'jsa_uniformes_movimentacoes';

export const DEPARTAMENTOS_PADRAO = [
  'Hortifruti',
  'Operador(a) de Caixa',
  'Pacote',
  'Padaria',
  'Lanchonete',
  'Mercearia',
  'Frios',
  'Açougue',
  'Cozinha',
  'Confeitaria',
  'Deposito',
  'Recebimento',
  'Fiscal de Caixa',
  'Administrativo',
  'TI',
  'Prevenção de Perdas',
  'Outro',
];

export const TAMANHOS_PADRAO = [
  'PP',
  'P',
  'M',
  'G',
  'GG',
  'XG',
  'EXG',
  '36',
  '38',
  '40',
  '42',
  '44',
  '46',
  '48',
  '50',
  '52',
  '54',
  'Único',
];

export const FABRICANTES_PADRAO = ['Jucicler', 'Stamp', 'Outro'];

function safeRead(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function safeWrite(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (e) {
    console.warn(`Erro ao salvar no storage (${key}):`, e);
  }
}

// Lista Estoque Consolidado de Uniformes
export async function listarEstoqueUniformes() {
  try {
    const res = await api.get('/uniformes/estoque');
    if (Array.isArray(res.data)) {
      safeWrite(STORAGE_ESTOQUE_KEY, res.data);
      return res.data;
    }
  } catch (err) {
    console.warn('[Uniformes Service] Falha na API de Estoque, usando cache:', err.message);
  }
  return safeRead(STORAGE_ESTOQUE_KEY);
}

// Lista Histórico de Movimentações
export async function listarMovimentacoesUniformes() {
  try {
    const res = await api.get('/uniformes/movimentacoes');
    if (Array.isArray(res.data)) {
      safeWrite(STORAGE_MOV_KEY, res.data);
      return res.data;
    }
  } catch (err) {
    console.warn('[Uniformes Service] Falha na API de Movimentações, usando cache:', err.message);
  }
  return safeRead(STORAGE_MOV_KEY);
}

// Cadastra Entrada de Uniformes
export async function cadastrarEntradaUniforme(dados) {
  const user = getUser();
  const responsavel = user?.name || user?.nome || user?.email || 'Operador';

  const payload = {
    departamento: dados.departamento,
    tamanho: dados.tamanho,
    quantidade: parseInt(dados.quantidade, 10),
    estado: dados.estado || 'Novo',
    fabricante: dados.fabricante || 'Jucicler',
    responsavel,
    observacoes: dados.observacoes || '',
  };

  // Atualização otimista no cache local
  const movs = safeRead(STORAGE_MOV_KEY);
  const novaMov = {
    id: Date.now(),
    tipo: 'ENTRADA',
    ...payload,
    created_at: new Date().toISOString(),
  };
  movs.unshift(novaMov);
  safeWrite(STORAGE_MOV_KEY, movs);

  // Atualiza estoque local
  const estoque = safeRead(STORAGE_ESTOQUE_KEY);
  const idx = estoque.findIndex(
    (item) => item.departamento === payload.departamento && item.tamanho === payload.tamanho
  );

  const isNovo = payload.estado === 'Novo';
  if (idx !== -1) {
    estoque[idx] = {
      ...estoque[idx],
      estado_novo_qtd: (estoque[idx].estado_novo_qtd || 0) + (isNovo ? payload.quantidade : 0),
      estado_usado_qtd: (estoque[idx].estado_usado_qtd || 0) + (isNovo ? 0 : payload.quantidade),
      total_qtd: (estoque[idx].total_qtd || 0) + payload.quantidade,
      fabricante_principal: payload.fabricante,
    };
  } else {
    estoque.push({
      id: Date.now(),
      departamento: payload.departamento,
      tamanho: payload.tamanho,
      estado_novo_qtd: isNovo ? payload.quantidade : 0,
      estado_usado_qtd: isNovo ? 0 : payload.quantidade,
      total_qtd: payload.quantidade,
      fabricante_principal: payload.fabricante,
    });
  }
  safeWrite(STORAGE_ESTOQUE_KEY, estoque);

  // Envia ao MySQL
  try {
    const res = await api.post('/uniformes/entrada', payload);
    return res.data;
  } catch (err) {
    console.warn('[Uniformes Service] Entrada gravada offline:', err.message);
    return { success: true, offline: true };
  }
}

// Cadastra Saída / Entrega de Uniformes
export async function cadastrarSaidaUniforme(dados) {
  const user = getUser();
  const responsavel = user?.name || user?.nome || user?.email || 'Operador';

  const payload = {
    departamento: dados.departamento,
    tamanho: dados.tamanho,
    quantidade: parseInt(dados.quantidade, 10),
    estado: dados.estado || 'Novo',
    colaborador: dados.colaborador || dados.nome || '',
    cpf: dados.cpf || '',
    matricula: dados.matricula || '',
    trocaDevolucao: !!dados.trocaDevolucao,
    responsavel,
    observacoes: dados.observacoes || (dados.trocaDevolucao ? 'Troca com devolução do usado' : 'Retirada regular'),
    assinatura: dados.assinatura || '',
  };

  // Atualização otimista no cache local
  const movs = safeRead(STORAGE_MOV_KEY);
  const novaMov = {
    id: Date.now(),
    tipo: 'SAIDA',
    ...payload,
    created_at: new Date().toISOString(),
  };
  movs.unshift(novaMov);
  safeWrite(STORAGE_MOV_KEY, movs);

  // Subtrai do estoque local
  const estoque = safeRead(STORAGE_ESTOQUE_KEY);
  const idx = estoque.findIndex(
    (item) => item.departamento === payload.departamento && item.tamanho === payload.tamanho
  );

  const isNovo = payload.estado === 'Novo';
  if (idx !== -1) {
    estoque[idx] = {
      ...estoque[idx],
      estado_novo_qtd: Math.max(0, (estoque[idx].estado_novo_qtd || 0) - (isNovo ? payload.quantidade : 0)),
      estado_usado_qtd: Math.max(0, (estoque[idx].estado_usado_qtd || 0) - (isNovo ? 0 : payload.quantidade)),
      total_qtd: Math.max(0, (estoque[idx].total_qtd || 0) - payload.quantidade),
    };
    safeWrite(STORAGE_ESTOQUE_KEY, estoque);
  }

  try {
    const res = await api.post('/uniformes/saida', payload);
    return res.data;
  } catch (err) {
    console.warn('[Uniformes Service] Saída gravada offline:', err.message);
    return { success: true, offline: true };
  }
}

// Excluir movimentação
export async function excluirMovimentacaoUniforme(id) {
  try {
    await api.delete(`/uniformes/movimentacoes/${id}`);
  } catch (err) {
    console.warn('[Uniformes Service] Erro ao excluir movimentação:', err.message);
  }
}
