// src/services/produtosOSService.js
/**
 * Serviço de Gerenciamento e Busca de Produtos/Equipamentos para Ordens de Serviço.
 * Permite auto-preenchimento por Número de Série a partir de O.S. anteriores, estoque e cache permanente.
 */

const STORAGE_KEY = 'jsa_produtos_equipamentos_cadastrados';

/**
 * Lê os produtos/equipamentos salvos do localStorage.
 */
function lerEquipamentosSalvos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.error('[produtosOSService] Erro ao ler equipamentos salvos:', e);
    return [];
  }
}

/**
 * Salva a lista de produtos/equipamentos no localStorage.
 */
function persistirEquipamentos(lista) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
  } catch (e) {
    console.error('[produtosOSService] Erro ao salvar equipamentos:', e);
  }
}

/**
 * Salva ou atualiza um produto/equipamento no cadastro permanente.
 */
export function salvarEquipamentoNaBase(equipamento) {
  if (!equipamento || (!equipamento.marca && !equipamento.modelo && !equipamento.serie)) return null;

  const serieTrim = String(equipamento.serie || '').trim();
  const marcaTrim = String(equipamento.marca || '').trim();
  const modeloTrim = String(equipamento.modelo || '').trim();
  if (!serieTrim && !marcaTrim && !modeloTrim) return null;

  const lista = lerEquipamentosSalvos();
  const index = lista.findIndex((item) => {
    const s1 = String(item.serie || '').trim().toLowerCase();
    const s2 = serieTrim.toLowerCase();
    if (s1 && s2 && s1 === s2) return true;
    return false;
  });

  const equipamentoNormalizado = {
    marca: marcaTrim,
    modelo: modeloTrim,
    serie: serieTrim,
    problema: String(equipamento.problema || '').trim(),
    atualizadoEm: new Date().toISOString(),
  };

  if (index >= 0) {
    lista[index] = { ...lista[index], ...equipamentoNormalizado };
  } else {
    lista.unshift({ ...equipamentoNormalizado, criadoEm: new Date().toISOString() });
  }

  persistirEquipamentos(lista);
  return equipamentoNormalizado;
}

/**
 * Agrega todos os equipamentos conhecidos a partir de:
 * 1. Cache permanente em localStorage (jsa_produtos_equipamentos_cadastrados)
 * 2. Histórico de Ordens de Serviço (ordens)
 * 3. Tabela de estoque de produtos (produtos)
 */
export function obterBaseEquipamentos(ordens = []) {
  const mapa = new Map();

  // 1. Cadastrados localmente
  const salvos = lerEquipamentosSalvos();
  salvos.forEach((eq) => {
    const chave = String(eq.serie || '').trim().toLowerCase() || `${eq.marca}-${eq.modelo}`.toLowerCase();
    if (chave) mapa.set(chave, { ...eq, origem: 'cadastro' });
  });

  // 2. Histórico de OS
  let listaOrdens = Array.isArray(ordens) && ordens.length > 0 ? ordens : [];
  if (listaOrdens.length === 0) {
    try {
      const raw = localStorage.getItem('ordens');
      if (raw) listaOrdens = JSON.parse(raw);
    } catch {}
  }

  if (Array.isArray(listaOrdens)) {
    listaOrdens.forEach((os) => {
      const eq = typeof os.equipamento === 'string' ? JSON.parse(os.equipamento || '{}') : os.equipamento;
      if (eq && (eq.marca || eq.modelo || eq.serie)) {
        const chave = String(eq.serie || '').trim().toLowerCase() || `${eq.marca}-${eq.modelo}`.toLowerCase();
        if (chave) {
          const existente = mapa.get(chave) || {};
          mapa.set(chave, {
            ...existente,
            marca: eq.marca || existente.marca || '',
            modelo: eq.modelo || existente.modelo || '',
            serie: eq.serie || existente.serie || '',
            problema: eq.problema || existente.problema || '',
            ultimaOS: os.numeroOS || os.numero_os,
            clienteUltimaOS: os.cliente?.nome || '',
          });
        }
      }
    });
  }

  // 3. Estoque de Produtos
  try {
    const rawProd = localStorage.getItem('produtos');
    if (rawProd) {
      const produtos = JSON.parse(rawProd);
      if (Array.isArray(produtos)) {
        produtos.forEach((p) => {
          if (p.nome) {
            const chave = p.nome.toLowerCase().trim();
            if (!mapa.has(chave)) {
              mapa.set(chave, {
                marca: 'Estoque',
                modelo: p.nome,
                serie: '',
                problema: p.descricao || '',
                origem: 'estoque',
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
 * Busca equipamento pelo Número de Série (exato ou parcial).
 */
export function buscarEquipamentoPorSerie(serie, ordens = []) {
  const serieTrim = String(serie || '').trim().toLowerCase();
  if (!serieTrim || serieTrim.length < 2) return null;

  const base = obterBaseEquipamentos(ordens);

  // Busca exata pelo número de série
  const matchExato = base.find((eq) => {
    const s = String(eq.serie || '').trim().toLowerCase();
    return s && s === serieTrim;
  });

  if (matchExato) return matchExato;

  // Busca se começa com a série digitada
  if (serieTrim.length >= 3) {
    const matchParcial = base.find((eq) => {
      const s = String(eq.serie || '').trim().toLowerCase();
      return s && (s.startsWith(serieTrim) || serieTrim.startsWith(s));
    });
    if (matchParcial) return matchParcial;
  }

  return null;
}
