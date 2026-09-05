// src/services/memoriaCnpjService.js
import { limparChave } from './consultaNFeService';
import { api } from '../api/client';

const STORAGE_KEY = 'jsa_memoria_cnpj_templates';

/**
 * Padrões iniciais pré-configurados pelo sistema
 */
const PADROES_INICIAIS = {
  '26536763000145': {
    cnpj: '26.536.763/0001-45',
    cnpjRaw: '26536763000145',
    nome: 'AUTO POSTO DELCAS',
    clienteOuServico: 'AUTO POSTO DELCAS',
    origem: 'AUTO POSTO DELCAS',
    produtoRelacionado: 'ABASTECIMENTO',
    tipoConta: 'Pagar',
    tipo: 'NFe',
    origemPadrao: 'predefinido',
    updatedAt: new Date().toISOString(),
  },
};

/**
 * Extrai os 14 dígitos numéricos de um CNPJ ou de uma Chave de Acesso de 44 dígitos
 */
export function extrairCnpjLimpo(valor) {
  const limpo = limparChave(valor);
  if (limpo.length === 44) {
    // Na chave de 44 dígitos, o CNPJ fica entre os índices 6 e 20 (14 dígitos)
    return limpo.slice(6, 20);
  }
  if (limpo.length >= 14) {
    return limpo.slice(0, 14);
  }
  return limpo;
}

/**
 * Formata um CNPJ de 14 dígitos para 00.000.000/0000-00
 */
export function formatarCnpj(cnpjRaw) {
  const limpo = limparChave(cnpjRaw);
  if (limpo.length !== 14) return cnpjRaw || '';
  return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}/${limpo.slice(8, 12)}-${limpo.slice(12)}`;
}

/**
 * Carrega o repositório de memórias de CNPJ do LocalStorage
 */
export function listarMemoriaCnpj() {
  try {
    const salvo = localStorage.getItem(STORAGE_KEY);
    const dados = salvo ? JSON.parse(salvo) : {};
    // Garante que os padrões iniciais existam
    return {
      ...PADROES_INICIAIS,
      ...dados,
    };
  } catch (err) {
    console.warn('[MemoriaCNPJ] Falha ao ler localStorage:', err);
    return { ...PADROES_INICIAIS };
  }
}

/**
 * Obtém o padrão gravado para um CNPJ ou Chave de Acesso
 */
export function obterPadraoCnpj(cnpjOuChave) {
  if (!cnpjOuChave) return null;
  const cnpjPuro = extrairCnpjLimpo(cnpjOuChave);
  if (!cnpjPuro || cnpjPuro.length !== 14) return null;

  const memoria = listarMemoriaCnpj();

  // 1. Busca na memória direta
  if (memoria[cnpjPuro]) {
    return memoria[cnpjPuro];
  }

  // 2. Busca no cache de fornecedores do banco de dados
  try {
    const fornecedoresRaw = localStorage.getItem('jsa_fornecedores_banco');
    if (fornecedoresRaw) {
      const fornecedores = JSON.parse(fornecedoresRaw);
      if (Array.isArray(fornecedores)) {
        const found = fornecedores.find((f) => extrairCnpjLimpo(f.cnpjRaw || f.cnpj) === cnpjPuro);
        if (found) {
          const padrao = {
            cnpj: formatarCnpj(cnpjPuro),
            cnpjRaw: cnpjPuro,
            nome: (found.nome || found.razaoSocial || '').toUpperCase(),
            clienteOuServico: (found.nome || found.razaoSocial || '').toUpperCase(),
            origem: (found.nome || found.razaoSocial || '').toUpperCase(),
            produtoRelacionado: (found.produtoRelacionado || found.categoria || '').toUpperCase(),
            tipoConta: found.tipoConta || 'Pagar',
            tipo: found.tipo || 'NFe',
            origemPadrao: 'banco_dados',
            updatedAt: found.updatedAt || new Date().toISOString(),
          };
          salvarPadraoCnpj(cnpjPuro, padrao, false);
          return padrao;
        }
      }
    }
  } catch (_) {}

  // 3. Fallback: Busca nas notas já cadastradas no sistema
  try {
    const notasRaw = localStorage.getItem('notas_jsa');
    if (notasRaw) {
      const notas = JSON.parse(notasRaw);
      if (Array.isArray(notas)) {
        // Encontra a nota mais recente com esse CNPJ
        const notaCorrespondente = notas
          .slice()
          .reverse()
          .find((n) => {
            const cLimpo = extrairCnpjLimpo(n.cnpj || n.chavedeacesso);
            return cLimpo === cnpjPuro;
          });

        if (notaCorrespondente) {
          const padraoEncontrado = {
            cnpj: formatarCnpj(cnpjPuro),
            cnpjRaw: cnpjPuro,
            nome: notaCorrespondente.clienteOuServico || notaCorrespondente.origem || '',
            clienteOuServico: notaCorrespondente.clienteOuServico || notaCorrespondente.origem || '',
            origem: notaCorrespondente.clienteOuServico || notaCorrespondente.origem || '',
            produtoRelacionado:
              notaCorrespondente.produtoRelacionado ||
              notaCorrespondente.produto_relacionado ||
              notaCorrespondente.produto ||
              '',
            tipoConta: notaCorrespondente.tipoConta || 'Receber',
            tipo: notaCorrespondente.tipo || 'NFe',
            origemPadrao: 'historico_notas',
            updatedAt: notaCorrespondente.updatedAt || new Date().toISOString(),
          };

          // Salva na memória para acessos instantâneos futuros
          salvarPadraoCnpj(cnpjPuro, padraoEncontrado);
          return padraoEncontrado;
        }
      }
    }
  } catch (err) {
    console.warn('[MemoriaCNPJ] Falha ao escanear histórico de notas:', err);
  }

  return null;
}

/**
 * Consulta assíncrona com fallback ao banco de dados no servidor
 */
export async function obterPadraoCnpjAsync(cnpjOuChave) {
  if (!cnpjOuChave) return null;
  const cnpjPuro = extrairCnpjLimpo(cnpjOuChave);
  if (!cnpjPuro || cnpjPuro.length !== 14) return null;

  // 1. Tenta síncrono da memória local primeiro
  const local = obterPadraoCnpj(cnpjPuro);
  if (local) return local;

  // 2. Consulta a API do MySQL Server
  try {
    const resp = await api.get(`/fornecedores/consultar/${cnpjPuro}`);
    if (resp.data && resp.data.found) {
      const f = resp.data;
      const padraoServidor = {
        cnpj: f.cnpj || formatarCnpj(cnpjPuro),
        cnpjRaw: cnpjPuro,
        nome: (f.nome || f.razaoSocial || '').toUpperCase(),
        clienteOuServico: (f.nome || f.razaoSocial || '').toUpperCase(),
        origem: (f.nome || f.razaoSocial || '').toUpperCase(),
        produtoRelacionado: (f.produtoRelacionado || f.categoria || '').toUpperCase(),
        tipoConta: f.tipoConta || 'Pagar',
        tipo: f.tipo || 'NFe',
        origemPadrao: 'banco_dados',
        updatedAt: f.updatedAt || new Date().toISOString(),
      };
      salvarPadraoCnpj(cnpjPuro, padraoServidor, false);
      return padraoServidor;
    }
  } catch (err) {
    // Continua
  }

  return null;
}

/**
 * Salva ou atualiza o padrão de preenchimento para um CNPJ específico e envia ao MySQL
 */
export function salvarPadraoCnpj(cnpjOuChave, dados = {}, sincronizarBanco = true) {
  if (!cnpjOuChave) return null;
  const cnpjPuro = extrairCnpjLimpo(cnpjOuChave);
  if (!cnpjPuro || cnpjPuro.length !== 14) return null;

  const nome = (dados.nome || dados.clienteOuServico || dados.origem || '').trim().toUpperCase();
  const produtoRelacionado = (
    dados.produtoRelacionado ||
    dados.produto_relacionado ||
    dados.produto ||
    dados.categoria ||
    ''
  ).trim().toUpperCase();
  const tipoConta = dados.tipoConta || 'Receber';
  const tipo = dados.tipo || 'NFe';

  // Não sobrescreve com campos vazios se já houver registro preenchido
  const memoria = listarMemoriaCnpj();
  const anterior = memoria[cnpjPuro] || {};

  const novoPadrao = {
    ...anterior,
    cnpj: formatarCnpj(cnpjPuro),
    cnpjRaw: cnpjPuro,
    nome: nome || anterior.nome || `EMITENTE CNPJ ${formatarCnpj(cnpjPuro)}`,
    clienteOuServico: nome || anterior.clienteOuServico || anterior.nome || '',
    origem: nome || anterior.origem || anterior.nome || '',
    produtoRelacionado: produtoRelacionado !== undefined ? produtoRelacionado : anterior.produtoRelacionado || '',
    tipoConta: tipoConta || anterior.tipoConta || 'Receber',
    tipo: tipo || anterior.tipo || 'NFe',
    origemPadrao: 'personalizado_usuario',
    updatedAt: new Date().toISOString(),
  };

  memoria[cnpjPuro] = novoPadrao;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoria));
  } catch (err) {
    console.warn('[MemoriaCNPJ] Falha ao persistir no localStorage:', err);
  }

  // Envia assincronamente ao banco de dados no MySQL Server
  if (sincronizarBanco && novoPadrao.nome) {
    api.post('/fornecedores', {
      cnpj: novoPadrao.cnpj,
      cnpjRaw: novoPadrao.cnpjRaw,
      nome: novoPadrao.nome,
      razaoSocial: novoPadrao.nome,
      produtoRelacionado: novoPadrao.produtoRelacionado,
      tipoConta: novoPadrao.tipoConta,
      tipo: novoPadrao.tipo,
    }).catch((err) => {
      console.warn('[MemoriaCNPJ] Aviso ao persistir fornecedor na API MySQL:', err.message);
    });
  }

  return novoPadrao;
}

/**
 * Inicializa a memória garantindo que o padrão do Auto Posto Delcas e outros estejam carregados
 */
export function inicializarMemoriaCnpj() {
  const memoria = listarMemoriaCnpj();
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memoria));
  } catch {}
  return memoria;
}
