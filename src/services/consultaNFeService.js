// src/services/consultaNFeService.js
import { api } from '../api/client';
import { obterPadraoCnpj, obterPadraoCnpjAsync, formatarCnpj, extrairCnpjLimpo } from './memoriaCnpjService';

/**
 * Mapeamento dos códigos de UF do IBGE
 */
const UF_MAP = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR',
  '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};

/**
 * Higieniza chave removendo caracteres não numéricos
 */
export function limparChave(chave) {
  return String(chave || '').replace(/\D+/g, '');
}

/**
 * Formata chave em blocos de 4 dígitos (ex: 5123 0600 0000 ...)
 */
export function formatarChaveBlocos(chave) {
  const limpa = limparChave(chave);
  return limpa.match(/.{1,4}/g)?.join(' ') || limpa;
}

/**
 * Consulta dados cadastrais do CNPJ via memória do sistema, BrasilAPI ou fallback MinhaReceita
 */
export async function consultarCNPJ(cnpjRaw) {
  const cnpjPuro = extrairCnpjLimpo(cnpjRaw);
  if (!cnpjPuro || cnpjPuro.length !== 14) return null;

  // 1. Memória inteligente de CNPJs cadastrados/configurados + Banco de Dados
  let padrao = obterPadraoCnpj(cnpjPuro);
  if (!padrao) {
    padrao = await obterPadraoCnpjAsync(cnpjPuro);
  }

  if (padrao && padrao.nome && padrao.nome !== `EMITENTE CNPJ ${formatarCnpj(cnpjPuro)}`) {
    return {
      razaoSocial: padrao.nome,
      nomeFantasia: padrao.nome,
      nomeExibicao: padrao.nome,
      cnae: padrao.produtoRelacionado || '',
      cnaesSecundarios: [],
      logradouro: padrao.logradouro || '',
      numero: padrao.numero || 'SN',
      bairro: padrao.bairro || '',
      municipio: padrao.municipio || '',
      uf: padrao.uf || '',
      cep: padrao.cep || '',
      telefone: padrao.telefone || '',
      enderecoCompleto: [padrao.logradouro, padrao.numero, padrao.bairro, padrao.municipio, padrao.uf].filter(Boolean).join(', '),
      padraoMemorizado: true,
      tipoConta: padrao.tipoConta || 'Receber',
    };
  }

  // 2. Tentativa 1: BrasilAPI
  try {
    const resp = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjPuro}`, {
      headers: { Accept: 'application/json' },
    });
    if (resp.ok) {
      const data = await resp.json();
      const nome = data.nome_fantasia || data.razao_social || '';
      const cnae = data.cnae_fiscal_descricao || '';
      const logradouro = data.logradouro ? `${data.descricao_tipo_de_logradouro || ''} ${data.logradouro}`.trim() : '';
      const numero = data.numero || 'SN';
      const bairro = data.bairro || '';
      const municipio = data.municipio || '';
      const uf = data.uf || '';
      const cep = data.cep || '';
      const telefone = data.ddd_telefone_1 ? `(${data.ddd_telefone_1.slice(0, 2)}) ${data.ddd_telefone_1.slice(2)}` : '';

      return {
        razaoSocial: data.razao_social || nome,
        nomeFantasia: data.nome_fantasia || data.razao_social || '',
        nomeExibicao: nome || data.razao_social,
        cnae,
        cnaesSecundarios: Array.isArray(data.cnaes_secundarios) ? data.cnaes_secundarios.map((c) => c.descricao) : [],
        logradouro,
        numero,
        bairro,
        municipio,
        uf,
        cep,
        telefone,
        enderecoCompleto: [logradouro, numero, bairro, municipio, uf].filter(Boolean).join(', '),
        padraoMemorizado: false,
      };
    }
  } catch (err) {
    console.warn('[ConsultaNFe] Falha na BrasilAPI:', err.message);
  }

  // 3. Tentativa 2: Minha Receita
  try {
    const resp2 = await fetch(`https://minhareceita.org/${cnpjPuro}`);
    if (resp2.ok) {
      const data2 = await resp2.json();
      const nome2 = data2.nome_fantasia || data2.razao_social || '';
      return {
        razaoSocial: data2.razao_social || nome2,
        nomeFantasia: data2.nome_fantasia || data2.razao_social || '',
        nomeExibicao: nome2 || data2.razao_social,
        cnae: data2.cnae_fiscal_descricao || '',
        logradouro: data2.logradouro || '',
        numero: data2.numero || 'SN',
        bairro: data2.bairro || '',
        municipio: data2.municipio || '',
        uf: data2.uf || '',
        cep: data2.cep || '',
        telefone: data2.ddd_telefone_1 || '',
        enderecoCompleto: [data2.logradouro, data2.numero, data2.bairro, data2.municipio, data2.uf].filter(Boolean).join(', '),
        padraoMemorizado: false,
      };
    }
  } catch (err2) {
    console.warn('[ConsultaNFe] Falha no fallback MinhaReceita:', err2.message);
  }

  return null;
}

/**
 * Consulta e valida a Chave de 44 dígitos da Nota Fiscal no portal Meu DANFE / Base Nacional
 * Retorna os campos estruturados para preenchimento:
 * - Nome (Razão Social / Emitente)
 * - CNPJ
 * - Data de Emissão
 * - Produto / Serviço Relacionado
 * - Valor (ou em branco se não constar para digitação manual)
 * - Número da Nota
 * - Série
 * - Tipo
 */
export async function consultarDadosChaveNFe(chave) {
  const chaveLimpa = limparChave(chave);

  if (!chaveLimpa) {
    throw new Error('Por favor, informe a Chave de Acesso da Nota Fiscal.');
  }

  if (chaveLimpa.length !== 44) {
    throw new Error(`A chave de acesso da NF-e deve ter exatamente 44 dígitos numéricos (informado: ${chaveLimpa.length}).`);
  }

  // 1. Decodificação Estrutural da Chave (Padrão SEFAZ)
  const cUf = chaveLimpa.slice(0, 2);
  const uf = UF_MAP[cUf] || 'MT';
  const aa = chaveLimpa.slice(2, 4);
  const mm = chaveLimpa.slice(4, 6);
  const cnpjRaw = chaveLimpa.slice(6, 20);
  const modelo = chaveLimpa.slice(20, 22);
  const serieRaw = chaveLimpa.slice(22, 25);
  const nNfRaw = chaveLimpa.slice(25, 34);

  const cnpjFormatado = formatarCnpj(cnpjRaw);
  const numeroFormatado = String(Number(nNfRaw));
  const serieFormatada = String(Number(serieRaw));
  const ano = 2000 + Number(aa);
  const dataEmissaoEstimada = `${ano}-${mm}-01`;

  const tipoNota = modelo === '65' ? 'NFCe' : modelo === '57' ? 'CTe' : 'NFe';

  // 2. Consulta de Memória Inteligente de CNPJ + Banco de Dados
  let padraoMemorizado = obterPadraoCnpj(cnpjRaw);
  if (!padraoMemorizado) {
    padraoMemorizado = await obterPadraoCnpjAsync(cnpjRaw);
  }

  // 3. Consulta no Backend (se disponível)
  let backendResult = null;
  try {
    const res = await api.get(`/notas/consultar-chave/${chaveLimpa}`);
    if (res.data && res.data.sucesso) {
      backendResult = res.data;
    }
  } catch (err) {
    // Continua para resolução no frontend
  }

  // 4. Consulta de Dados Cadastrais e Fiscais da Empresa Emitente (se não houver padrão memorizado completo)
  let dadosEmpresa = null;
  if (!padraoMemorizado || !padraoMemorizado.nome || !padraoMemorizado.produtoRelacionado) {
    if (!backendResult || !backendResult.nome) {
      dadosEmpresa = await consultarCNPJ(cnpjRaw);
    }
  }

  // Definição com prioridade para padrão memorizado do CNPJ
  const nomeEmitente =
    padraoMemorizado?.nome ||
    backendResult?.nome ||
    dadosEmpresa?.nomeExibicao ||
    dadosEmpresa?.razaoSocial ||
    `EMITENTE CNPJ ${cnpjFormatado}`;

  const produtoRelacionado =
    padraoMemorizado?.produtoRelacionado !== undefined && padraoMemorizado.produtoRelacionado !== ''
      ? padraoMemorizado.produtoRelacionado
      : (backendResult?.produtoRelacionado ||
        dadosEmpresa?.cnae ||
        (dadosEmpresa?.cnaesSecundarios?.[0] ? dadosEmpresa.cnaesSecundarios[0] : '') ||
        '');

  const tipoConta = padraoMemorizado?.tipoConta || backendResult?.tipoConta || 'Receber';
  const dataEmissaoFinal = backendResult?.dataEmissao || dataEmissaoEstimada;
  const valorFinal = backendResult?.valor != null ? Number(backendResult.valor) : null;

  return {
    sucesso: true,
    chavedeacesso: chaveLimpa,
    chaveFormatada: formatarChaveBlocos(chaveLimpa),
    numero: numeroFormatado,
    serie: serieFormatada,
    tipo: tipoNota,
    nome: nomeEmitente,
    clienteOuServico: nomeEmitente,
    origem: nomeEmitente,
    cnpj: cnpjFormatado,
    cnpjRaw,
    dataEmissao: dataEmissaoFinal,
    produtoRelacionado,
    tipoConta,
    valor: valorFinal,
    uf,
    municipio: backendResult?.municipio || dadosEmpresa?.municipio || '',
    logradouro: dadosEmpresa?.logradouro || '',
    bairro: dadosEmpresa?.bairro || '',
    cep: dadosEmpresa?.cep || '',
    telefone: dadosEmpresa?.telefone || '',
    enderecoEmitente: dadosEmpresa?.enderecoCompleto || '',
    padraoMemorizado: !!padraoMemorizado,
    origemPadrao: padraoMemorizado?.origemPadrao || 'consulta_receita',
    fonte: padraoMemorizado
      ? `Padrão memorizado para o CNPJ ${cnpjFormatado}`
      : 'Validação e Decodificação Meu DANFE / Base Nacional Receita Federal',
  };
}
