// src/services/clientesService.js
/**
 * Serviço de Gerenciamento e Busca de Clientes para Ordens de Serviço e Contratos.
 * Fornece formatação inteligente de CPF/CNPJ, telefone e busca histórica.
 */

const STORAGE_KEY = 'jsa_clientes_cadastrados';

/**
 * Remove caracteres não numéricos.
 */
export function limparDocumento(valor = '') {
  return String(valor || '').replace(/\D/g, '');
}

/**
 * Formata automaticamente CPF (000.000.000-00) ou CNPJ (00.000.000/0000-00).
 */
export function formatarCPFouCNPJ(valor = '') {
  const digits = limparDocumento(valor);

  if (digits.length <= 11) {
    // Formato CPF
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  }

  // Formato CNPJ
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2')
    .slice(0, 18);
}

/**
 * Formata telefone brasileiro: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX.
 */
export function formatarTelefone(valor = '') {
  const digits = String(valor || '').replace(/\D/g, '');
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2')
      .slice(0, 14);
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2')
    .slice(0, 15);
}

/**
 * Lê os clientes cadastrados do localStorage.
 */
function lerClientesSalvos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('[clientesService] Erro ao ler clientes salvos:', e);
    return [];
  }
}

/**
 * Salva a lista de clientes no localStorage.
 */
function persistirClientes(lista) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  } catch (e) {
    console.error('[clientesService] Erro ao salvar clientes:', e);
  }
}

/**
 * Salva ou atualiza um cliente no cadastro permanente.
 */
export function salvarClienteNaBase(cliente) {
  if (!cliente || (!cliente.nome && !cliente.documento)) return null;

  const docLimpo = limparDocumento(cliente.documento);
  const nomeTrim = String(cliente.nome || '').trim();
  if (!docLimpo && !nomeTrim) return null;

  const lista = lerClientesSalvos();
  const index = lista.findIndex((c) => {
    const cDoc = limparDocumento(c.documento);
    if (docLimpo && cDoc && docLimpo === cDoc) return true;
    if (nomeTrim && c.nome && c.nome.toLowerCase() === nomeTrim.toLowerCase()) return true;
    return false;
  });

  const clienteFormatado = {
    nome: nomeTrim,
    documento: formatarCPFouCNPJ(cliente.documento || ''),
    telefone: formatarTelefone(cliente.telefone || ''),
    endereco: String(cliente.endereco || '').trim(),
    email: String(cliente.email || '').trim().toLowerCase(),
    atualizadoEm: new Date().toISOString(),
  };

  if (index >= 0) {
    lista[index] = { ...lista[index], ...clienteFormatado };
  } else {
    lista.unshift({ ...clienteFormatado, criadoEm: new Date().toISOString() });
  }

  persistirClientes(lista);
  return clienteFormatado;
}

/**
 * Agrega todos os clientes únicos a partir de:
 * 1. Clientes salvos no localStorage (STORAGE_KEY)
 * 2. Lista de Ordens de Serviço passadas ou salvas no localStorage
 * 3. Lista de Contratos
 */
export function obterBaseClientes(ordens = []) {
  const mapa = new Map();

  // 1. Clientes salvos localmente
  const salvos = lerClientesSalvos();
  salvos.forEach((c) => {
    const chave = limparDocumento(c.documento) || c.nome?.toLowerCase().trim();
    if (chave) mapa.set(chave, { ...c, origem: 'cadastro' });
  });

  // 2. Ordens de Serviço (em memória ou no localStorage)
  let listaOrdens = Array.isArray(ordens) && ordens.length > 0 ? ordens : [];
  if (listaOrdens.length === 0) {
    try {
      const raw = localStorage.getItem('ordens');
      if (raw) listaOrdens = JSON.parse(raw);
    } catch {}
  }

  if (Array.isArray(listaOrdens)) {
    listaOrdens.forEach((os) => {
      const cli = typeof os.cliente === 'string' ? JSON.parse(os.cliente || '{}') : os.cliente;
      if (cli && (cli.nome || cli.documento)) {
        const chave = limparDocumento(cli.documento) || cli.nome?.toLowerCase().trim();
        if (chave) {
          const existente = mapa.get(chave) || {};
          mapa.set(chave, {
            ...existente,
            nome: cli.nome || existente.nome || '',
            documento: formatarCPFouCNPJ(cli.documento || existente.documento || ''),
            telefone: formatarTelefone(cli.telefone || existente.telefone || ''),
            endereco: cli.endereco || existente.endereco || '',
            email: cli.email || existente.email || '',
            ultimaOS: os.numeroOS || os.numero_os,
            ultimoEquipamento: os.equipamento,
          });
        }
      }
    });
  }

  // 3. Contratos
  try {
    const rawContratos = localStorage.getItem('contratos');
    if (rawContratos) {
      const contratos = JSON.parse(rawContratos);
      if (Array.isArray(contratos)) {
        contratos.forEach((ct) => {
          if (ct.parceiro) {
            const chave = ct.parceiro.toLowerCase().trim();
            if (!mapa.has(chave)) {
              mapa.set(chave, {
                nome: ct.parceiro,
                documento: '',
                telefone: '',
                endereco: '',
                email: '',
                origem: 'contrato',
              });
            }
          }
        });
      }
    }
  } catch {}

  return Array.from(mapa.values());
}

/**
 * Busca dados do cliente pelo CPF/CNPJ (exato ou por dígitos).
 */
export function buscarClientePorDocumento(documento, ordens = []) {
  const docLimpo = limparDocumento(documento);
  if (!docLimpo || docLimpo.length < 3) return null;

  const base = obterBaseClientes(ordens);

  // Busca primeiro por match completo
  const matchExato = base.find((c) => {
    const cDoc = limparDocumento(c.documento);
    return cDoc && cDoc === docLimpo;
  });

  if (matchExato) return matchExato;

  // Se tiver 11 dígitos (CPF) ou 14 dígitos (CNPJ), busca também se começa com os dígitos
  if (docLimpo.length >= 11) {
    const matchParcial = base.find((c) => {
      const cDoc = limparDocumento(c.documento);
      return cDoc && (cDoc.startsWith(docLimpo) || docLimpo.startsWith(cDoc));
    });
    if (matchParcial) return matchParcial;
  }

  return null;
}

/**
 * Realiza uma busca multicritério por Nome, CPF, Telefone ou Número da OS.
 * Retorna tanto a lista de clientes encontrados quanto as Ordens de Serviço associadas.
 */
export function buscarClientesEOrdens(
  { termo = '', nome = '', cpf = '', telefone = '', numeroOS = '' } = {},
  ordens = []
) {
  let listaOrdens = Array.isArray(ordens) && ordens.length > 0 ? ordens : [];
  if (listaOrdens.length === 0) {
    try {
      const raw = localStorage.getItem('ordens');
      if (raw) listaOrdens = JSON.parse(raw);
    } catch {}
  }

  const termoGeral = String(termo || '').trim().toLowerCase();
  const termoNome = String(nome || '').trim().toLowerCase();
  const termoCPF = limparDocumento(cpf);
  const termoTel = limparDocumento(telefone);
  const termoNumOS = String(numeroOS || '').trim().toLowerCase();

  // Filtrar Ordens de Serviço
  const ordensEncontradas = (Array.isArray(listaOrdens) ? listaOrdens : []).filter((os) => {
    const cli = typeof os.cliente === 'string' ? JSON.parse(os.cliente || '{}') : (os.cliente || {});
    const numOS = String(os.numeroOS || os.numero_os || '').toLowerCase();
    const cliNome = String(cli.nome || '').toLowerCase();
    const cliDoc = limparDocumento(cli.documento);
    const cliTel = limparDocumento(cli.telefone);
    const equip = typeof os.equipamento === 'string' ? os.equipamento : `${os.equipamento?.marca || ''} ${os.equipamento?.modelo || ''}`.toLowerCase();

    // Filtro por campo específico
    if (termoNumOS && !numOS.includes(termoNumOS)) return false;
    if (termoNome && !cliNome.includes(termoNome)) return false;
    if (termoCPF && (!cliDoc || !cliDoc.includes(termoCPF))) return false;
    if (termoTel && (!cliTel || !cliTel.includes(termoTel))) return false;

    // Filtro Geral se informado
    if (termoGeral) {
      const matchGeral =
        numOS.includes(termoGeral) ||
        cliNome.includes(termoGeral) ||
        cliDoc.includes(termoGeral) ||
        cliTel.includes(termoGeral) ||
        equip.includes(termoGeral);
      if (!matchGeral) return false;
    }

    return true;
  });

  // Filtrar Clientes Únicos da Base
  const baseClientes = obterBaseClientes(listaOrdens);
  const clientesEncontrados = baseClientes.filter((c) => {
    const cliNome = String(c.nome || '').toLowerCase();
    const cliDoc = limparDocumento(c.documento);
    const cliTel = limparDocumento(c.telefone);

    if (termoNome && !cliNome.includes(termoNome)) return false;
    if (termoCPF && (!cliDoc || !cliDoc.includes(termoCPF))) return false;
    if (termoTel && (!cliTel || !cliTel.includes(termoTel))) return false;

    if (termoGeral) {
      const matchGeral =
        cliNome.includes(termoGeral) ||
        cliDoc.includes(termoGeral) ||
        cliTel.includes(termoGeral) ||
        String(c.endereco || '').toLowerCase().includes(termoGeral) ||
        String(c.email || '').toLowerCase().includes(termoGeral);
      if (!matchGeral) return false;
    }

    return true;
  });

  return {
    ordens: ordensEncontradas,
    clientes: clientesEncontrados,
  };
}
