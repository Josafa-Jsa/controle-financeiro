// src/utils/xmlNfeParser.js

/**
 * Utilitário de formatação de CNPJ / CPF
 */
function formatarCnpjCpf(valor) {
  const limpo = String(valor || '').replace(/\D+/g, '');
  if (limpo.length === 14) {
    return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}/${limpo.slice(8, 12)}-${limpo.slice(12)}`;
  }
  if (limpo.length === 11) {
    return `${limpo.slice(0, 3)}.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-${limpo.slice(9)}`;
  }
  return limpo;
}

/**
 * Obtém texto de uma tag filho direta ou profunda
 */
function getTagText(parent, tagName) {
  if (!parent) return '';
  const el = parent.getElementsByTagName(tagName)[0];
  return el ? (el.textContent || '').trim() : '';
}

/**
 * Converte data ISO ou YYYY-MM-DD para YYYY-MM-DD
 */
function extrairDataYMD(dataStr) {
  if (!dataStr) return new Date().toISOString().slice(0, 10);
  const limpa = String(dataStr).trim();
  if (limpa.includes('T')) {
    return limpa.split('T')[0];
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(limpa)) {
    return limpa.slice(0, 10);
  }
  return new Date().toISOString().slice(0, 10);
}

/**
 * Faz o parse completo de um arquivo XML de NF-e / NFC-e (Padrão Nacional SEFAZ)
 * @param {string} xmlString
 * @returns {object} Dados estruturados da NF-e
 */
export function parseNFeXml(xmlString) {
  if (!xmlString || typeof xmlString !== 'string') {
    throw new Error('Conteúdo do arquivo XML inválido ou vazio.');
  }

  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlString, 'text/xml');

  const parserError = xmlDoc.getElementsByTagName('parsererror')[0];
  if (parserError) {
    throw new Error('Falha ao interpretar a estrutura do XML da Nota Fiscal.');
  }

  // 1. Chave de Acesso
  let chaveAcesso = '';
  const infNFe = xmlDoc.getElementsByTagName('infNFe')[0];
  if (infNFe) {
    const idAttr = infNFe.getAttribute('Id') || '';
    chaveAcesso = idAttr.replace(/^NFe/i, '').replace(/\D+/g, '');
  }
  if (!chaveAcesso) {
    chaveAcesso = getTagText(xmlDoc, 'chNFe').replace(/\D+/g, '');
  }

  // 2. Identificação da Nota (<ide>)
  const ide = xmlDoc.getElementsByTagName('ide')[0];
  const numero = getTagText(ide, 'nNF');
  const serie = getTagText(ide, 'serie') || '1';
  const dataEmissaoRaw = getTagText(ide, 'dhEmi') || getTagText(ide, 'dEmi');
  const dataEmissao = extrairDataYMD(dataEmissaoRaw);
  const natOp = getTagText(ide, 'natOp');
  const tpNF = getTagText(ide, 'tpNF'); // 0 = Entrada (Pagar), 1 = Saída (Receber)
  const modelo = getTagText(ide, 'mod') || '55';
  const tipoNota = modelo === '65' ? 'NFCe' : modelo === '57' ? 'CTe' : 'NFe';
  const tipoContaSugerido = tpNF === '0' ? 'Pagar' : 'Receber';

  // 3. Emitente (<emit>)
  const emit = xmlDoc.getElementsByTagName('emit')[0];
  const emitCnpjRaw = getTagText(emit, 'CNPJ') || getTagText(emit, 'CPF');
  const emitCnpj = formatarCnpjCpf(emitCnpjRaw);
  const emitNome = getTagText(emit, 'xNome');
  const emitFantasia = getTagText(emit, 'xFant');
  const emitIe = getTagText(emit, 'IE');

  const enderEmit = emit ? emit.getElementsByTagName('enderEmit')[0] : null;
  const emitLgr = getTagText(enderEmit, 'xLgr');
  const emitNro = getTagText(enderEmit, 'nro');
  const emitBairro = getTagText(enderEmit, 'xBairro');
  const emitMun = getTagText(enderEmit, 'xMun');
  const emitUF = getTagText(enderEmit, 'UF');
  const emitCEP = getTagText(enderEmit, 'CEP');
  const emitFone = getTagText(enderEmit, 'fone');
  const emitEnderecoCompleto = [
    emitLgr ? `${emitLgr}${emitNro ? ', ' + emitNro : ''}` : '',
    emitBairro,
    emitMun ? `${emitMun} - ${emitUF}` : emitUF,
  ].filter(Boolean).join(' • ');

  // 4. Destinatário (<dest>)
  const dest = xmlDoc.getElementsByTagName('dest')[0];
  const destCnpjRaw = getTagText(dest, 'CNPJ') || getTagText(dest, 'CPF');
  const destCnpj = formatarCnpjCpf(destCnpjRaw);
  const destNome = getTagText(dest, 'xNome');

  const enderDest = dest ? dest.getElementsByTagName('enderDest')[0] : null;
  const destLgr = getTagText(enderDest, 'xLgr');
  const destNro = getTagText(enderDest, 'nro');
  const destBairro = getTagText(enderDest, 'xBairro');
  const destMun = getTagText(enderDest, 'xMun');
  const destUF = getTagText(enderDest, 'UF');

  // 5. Totais e Impostos (<total><ICMSTot>)
  const icmsTot = xmlDoc.getElementsByTagName('ICMSTot')[0];
  const valorTotalNF = Number(getTagText(icmsTot, 'vNF')) || Number(getTagText(icmsTot, 'vProd')) || 0;
  const valorProdutos = Number(getTagText(icmsTot, 'vProd')) || valorTotalNF;
  const valorFrete = Number(getTagText(icmsTot, 'vFrete')) || 0;
  const valorSeguro = Number(getTagText(icmsTot, 'vSeg')) || 0;
  const valorDesconto = Number(getTagText(icmsTot, 'vDesc')) || 0;
  const baseCalculoIcms = Number(getTagText(icmsTot, 'vBC')) || 0;
  const valorIcms = Number(getTagText(icmsTot, 'vICMS')) || 0;

  // 6. Itens / Produtos (<det>)
  const detElements = xmlDoc.getElementsByTagName('det');
  const itens = [];
  const produtosNomes = [];

  for (let i = 0; i < detElements.length; i++) {
    const det = detElements[i];
    const prod = det.getElementsByTagName('prod')[0];
    const imposto = det.getElementsByTagName('imposto')[0];
    const icms = imposto ? imposto.getElementsByTagName('ICMS')[0] : null;

    const cProd = getTagText(prod, 'cProd') || String(i + 1).padStart(3, '0');
    const xProd = getTagText(prod, 'xProd') || 'PRODUTO / SERVIÇO';
    const ncm = getTagText(prod, 'NCM') || '85176277';
    const cfop = getTagText(prod, 'CFOP') || '5102';
    const uCom = getTagText(prod, 'uCom') || 'UN';
    const qCom = Number(getTagText(prod, 'qCom')) || 1;
    const vUnCom = Number(getTagText(prod, 'vUnCom')) || (valorTotalNF / (detElements.length || 1));
    const vProd = Number(getTagText(prod, 'vProd')) || (vUnCom * qCom);

    const cst = getTagText(icms, 'CST') || getTagText(icms, 'CSOSN') || '0102';
    const vBC = Number(getTagText(icms, 'vBC')) || 0;
    const vICMS = Number(getTagText(icms, 'vICMS')) || 0;
    const pICMS = Number(getTagText(icms, 'pICMS')) || 0;

    produtosNomes.push(xProd);

    itens.push({
      codigo: cProd,
      descricao: xProd,
      ncm,
      cst,
      cfop,
      un: uCom,
      qtd: qCom,
      valorUnit: vUnCom,
      valorTotal: vProd,
      bcIcms: vBC,
      vlrIcms: vICMS,
      aliqIcms: pICMS,
    });
  }

  const produtoRelacionado = produtosNomes.slice(0, 3).join(', ') || 'PRODUTOS / MERCADORIAS';

  // 7. Informações Complementares e Protocolo
  const infCpl = getTagText(xmlDoc, 'infCpl');
  const nProt = getTagText(xmlDoc, 'nProt');

  return {
    sucesso: true,
    chavedeacesso: chaveAcesso,
    numero,
    serie,
    tipo: tipoNota,
    tipoConta: tipoContaSugerido,
    dataEmissao,
    naturezaOperacao: natOp || 'VENDA DE MERCADORIAS / PRESTAÇÃO DE SERVIÇOS',
    clienteOuServico: emitNome || emitFantasia || 'EMPRESA EMITENTE',
    origem: emitNome || emitFantasia || 'EMPRESA EMITENTE',
    cnpj: emitCnpj,
    emitente: {
      nome: emitNome,
      fantasia: emitFantasia,
      cnpj: emitCnpj,
      ie: emitIe,
      endereco: emitEnderecoCompleto,
      logradouro: emitLgr,
      numero: emitNro,
      bairro: emitBairro,
      municipio: emitMun,
      uf: emitUF,
      cep: emitCEP,
      telefone: emitFone,
    },
    destinatario: {
      nome: destNome,
      cnpj: destCnpj,
      municipio: destMun,
      uf: destUF,
    },
    valor: valorTotalNF,
    valorProdutos,
    valorFrete,
    valorSeguro,
    valorDesconto,
    baseCalculoIcms,
    valorIcms,
    itens,
    produtoRelacionado,
    informacoesComplementares: infCpl,
    protocolo: nProt,
    fonte: 'XML Oficial da NF-e Importado com Sucesso',
  };
}
