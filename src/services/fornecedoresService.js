// src/services/fornecedoresService.js
import { api } from '../api/client';
import { extrairCnpjLimpo, formatarCnpj, salvarPadraoCnpj, listarMemoriaCnpj } from './memoriaCnpjService';

const STORAGE_KEY = 'jsa_fornecedores_banco';

/**
 * Carrega a lista local de fornecedores em cache
 */
export function listarFornecedoresLocais() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const lista = JSON.parse(raw);
      if (Array.isArray(lista)) return lista;
    }
  } catch (e) {
    console.warn('[Fornecedores] Falha ao ler cache local:', e);
  }

  // Fallback a partir do memória CNPJ
  const memoria = listarMemoriaCnpj();
  return Object.values(memoria).map((item) => ({
    cnpj: item.cnpj,
    cnpjRaw: item.cnpjRaw,
    nome: item.nome || item.clienteOuServico || '',
    razaoSocial: item.nome || item.clienteOuServico || '',
    produtoRelacionado: item.produtoRelacionado || '',
    tipoConta: item.tipoConta || 'Pagar',
  }));
}

/**
 * Sincroniza fornecedores do banco de dados MySQL para o frontend
 */
export async function sincronizarFornecedoresDoServidor() {
  try {
    const resp = await api.get('/fornecedores');
    if (Array.isArray(resp.data)) {
      const fornecedores = resp.data;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fornecedores));

      // Atualiza também os templates de memória para autopreenchimento instantâneo
      fornecedores.forEach((f) => {
        if (f.cnpjRaw || f.cnpj) {
          salvarPadraoCnpj(f.cnpjRaw || f.cnpj, {
            nome: f.nome || f.razaoSocial,
            produtoRelacionado: f.produtoRelacionado || f.categoria || '',
            tipoConta: f.tipoConta || 'Pagar',
            tipo: f.tipo || 'NFe',
          });
        }
      });

      return fornecedores;
    }
  } catch (error) {
    console.warn('[Fornecedores] Servidor offline ou indisponível:', error.message);
  }
  return listarFornecedoresLocais();
}

/**
 * Salva ou atualiza um fornecedor no banco de dados e na memória local
 */
export async function salvarFornecedorNoBanco(dadosFornecedor) {
  const cnpjPuro = extrairCnpjLimpo(dadosFornecedor.cnpj || dadosFornecedor.cnpjRaw);
  if (!cnpjPuro || cnpjPuro.length !== 14) {
    throw new Error('CNPJ inválido para cadastro.');
  }

  const nomeLimpo = String(
    dadosFornecedor.nome || dadosFornecedor.razaoSocial || `FORNECEDOR ${cnpjPuro}`
  ).trim().toUpperCase();

  const payload = {
    cnpj: formatarCnpj(cnpjPuro),
    cnpjRaw: cnpjPuro,
    nome: nomeLimpo,
    razaoSocial: dadosFornecedor.razaoSocial ? String(dadosFornecedor.razaoSocial).toUpperCase() : nomeLimpo,
    nomeFantasia: dadosFornecedor.nomeFantasia ? String(dadosFornecedor.nomeFantasia).toUpperCase() : nomeLimpo,
    categoria: dadosFornecedor.categoria ? String(dadosFornecedor.categoria).toUpperCase() : null,
    produtoRelacionado: dadosFornecedor.produtoRelacionado
      ? String(dadosFornecedor.produtoRelacionado).toUpperCase()
      : dadosFornecedor.categoria
      ? String(dadosFornecedor.categoria).toUpperCase()
      : 'FORNECEDOR',
    tipoConta: dadosFornecedor.tipoConta || 'Pagar',
    tipo: dadosFornecedor.tipo || 'NFe',
    telefone: dadosFornecedor.telefone || null,
    email: dadosFornecedor.email || null,
    origemPadrao: 'usuario',
  };

  // 1. Salva na memória local do cliente imediatamente
  salvarPadraoCnpj(cnpjPuro, payload);

  const locais = listarFornecedoresLocais().filter((f) => f.cnpjRaw !== cnpjPuro);
  locais.push(payload);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(locais));

  // 2. Envia para o MySQL Server
  try {
    await api.post('/fornecedores', payload);
  } catch (err) {
    console.warn('[Fornecedores] Erro ao enviar para API (mantido em cache local):', err.message);
  }

  return payload;
}

/**
 * Consulta fornecedor por CNPJ ou por Chave de Acesso no banco de dados
 */
export async function consultarFornecedorBanco(cnpjOuChave) {
  const cnpjPuro = extrairCnpjLimpo(cnpjOuChave);
  if (!cnpjPuro || cnpjPuro.length !== 14) return null;

  // 1. Consulta o servidor MySQL
  try {
    const resp = await api.get(`/fornecedores/consultar/${cnpjPuro}`);
    if (resp.data && resp.data.found) {
      const f = resp.data;
      // Atualiza memória local
      salvarPadraoCnpj(cnpjPuro, {
        nome: f.nome || f.razaoSocial,
        produtoRelacionado: f.produtoRelacionado || f.categoria || '',
        tipoConta: f.tipoConta || 'Pagar',
        tipo: f.tipo || 'NFe',
      });
      return f;
    }
  } catch (err) {
    // Se o backend não encontrar ou estiver offline, continua com o fallback
  }

  // 2. Fallback: memória local
  const memoria = listarMemoriaCnpj();
  if (memoria[cnpjPuro]) {
    return memoria[cnpjPuro];
  }

  return null;
}
