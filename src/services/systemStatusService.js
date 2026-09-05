// src/services/systemStatusService.js
import { useState, useEffect } from 'react';
import { api } from '../api/client';

const STORAGE_KEY = 'jsa_system_status_cache';

const DEFAULT_STATUS = {
  emManutencao: false,
  tela: '',
  mensagem: '',
  tipo: 'ajuste',
  updatedAt: new Date().toISOString(),
  updatedBy: 'Sistema',
};

// Configuração completa de todas as telas do sistema para detecção de manutenção
export const TELAS_SISTEMA_CONFIG = [
  {
    nome: 'Prevenção de Perdas',
    aliases: ['prevencao', 'prevenção', 'prevencao de perdas', 'prevenção de perdas'],
    paths: ['/prevencao'],
    key: 'prevencao',
    icon: '🛡️',
  },
  {
    nome: 'Gestão de Contas',
    aliases: ['contas', 'gestao de contas', 'gestão de contas', 'financeiro'],
    paths: ['/contas'],
    key: 'contas',
    icon: '💳',
  },
  {
    nome: 'Fluxo de Caixa',
    aliases: ['fluxo', 'fluxo de caixa'],
    paths: ['/fluxo'],
    key: 'fluxo',
    icon: '📈',
  },
  {
    nome: 'Notas Fiscais',
    aliases: ['notas', 'notas fiscais', 'nfe', 'nf-e'],
    paths: ['/notas'],
    key: 'notas',
    icon: '📑',
  },
  {
    nome: 'Ordens de Serviço',
    aliases: ['ordem-servico', 'ordens', 'os', 'ordem de servico', 'ordem de serviço', 'ordens de serviço', 'ordens de servico'],
    paths: ['/ordem-servico', '/ordens'],
    key: 'ordem-servico',
    icon: '🛠️',
  },
  {
    nome: 'Controle de Estoque',
    aliases: ['estoque', 'controle de estoque'],
    paths: ['/estoque'],
    key: 'estoque',
    icon: '📦',
  },
  {
    nome: 'Central de Chamados',
    aliases: ['chamados', 'atendimento', 'central de chamados', 'atendimento & chamados', 'suporte'],
    paths: ['/chamados'],
    key: 'chamados',
    icon: '🎧',
  },
  {
    nome: 'Simulador de Créditos',
    aliases: ['simulador', 'simulador de creditos', 'simulador de créditos'],
    paths: ['/simulador'],
    key: 'simulador',
    icon: '🧮',
  },
  {
    nome: 'Gestão de Contratos',
    aliases: ['contratos', 'gestao de contratos', 'gestão de contratos'],
    paths: ['/contratos'],
    key: 'contratos',
    icon: '📝',
  },
  {
    nome: 'Contrato Internet / Provedor',
    aliases: ['contrato-internet', 'internet', 'provedor', 'contrato internet'],
    paths: ['/contrato-internet'],
    key: 'contrato-internet',
    icon: '🌐',
  },
  {
    nome: 'Controle de Uniformes',
    aliases: ['uniformes', 'painel uniformes', 'controle de uniformes'],
    paths: ['/uniformes'],
    key: 'uniformes',
    icon: '👔',
  },
  {
    nome: 'Controle de Notas',
    aliases: ['controle-notas', 'controle de notas', 'controle de nota', 'controle notas', 'painel notas'],
    paths: ['/controle-notas'],
    key: 'controle-notas',
    icon: '📋',
  },
  {
    nome: 'Dashboard Principal',
    aliases: ['dashboard', 'dashboard principal', 'inicio', 'painel'],
    paths: ['/dashboard'],
    key: 'dashboard',
    icon: '📊',
  },
  {
    nome: 'Painel Administrativo',
    aliases: ['admin', 'painel administrativo', 'usuarios', 'admin users', 'log'],
    paths: ['/admin/users', '/admin/log'],
    key: 'admin',
    icon: '⚙️',
  },
];

/* =========================================================
   GRUPOS DE MANUTENÇÃO SIMULTÂNEA / VINCULADA
   ========================================================= */
export const GRUPOS_MANUTENCAO_VINCULADOS = [
  {
    id: 'grupo_notas_contas',
    nome: 'Notas Fiscais & Gestão de Contas',
    telas: ['Notas Fiscais', 'Gestão de Contas'],
    keys: ['notas', 'contas'],
    descricao: 'Ajuste simultâneo: Notas Fiscais e Gestão de Contas.',
  },
  {
    id: 'grupo_contratos_internet_os',
    nome: 'Contratos, Internet & Ordens de Serviço',
    telas: ['Gestão de Contratos', 'Contrato Internet / Provedor', 'Ordens de Serviço'],
    keys: ['contratos', 'contrato-internet', 'ordem-servico'],
    descricao: 'Ajuste simultâneo: Gestão de Contratos, Contrato Internet e Ordens de Serviço.',
  },
  {
    id: 'grupo_prevencao_uniformes_notas',
    nome: 'Prevenção, Uniformes & Controle de Notas',
    telas: ['Prevenção de Perdas', 'Controle de Uniformes', 'Controle de Notas'],
    keys: ['prevencao', 'uniformes', 'controle-notas'],
    descricao: 'Ajuste simultâneo: Prevenção de Perdas, Controle de Uniformes e Controle de Notas.',
  },
];

/**
 * Retorna as telas vinculadas caso a tela informada pertença a um grupo simultâneo
 */
export function resolverTelasVinculadasManutencao(telaSelecionada) {
  if (!telaSelecionada) return [];
  if (Array.isArray(telaSelecionada)) {
    const result = [];
    telaSelecionada.forEach((t) => {
      const vinculadas = resolverTelasVinculadasManutencao(t);
      vinculadas.forEach((v) => {
        if (!result.includes(v)) result.push(v);
      });
    });
    return result;
  }

  const telaTrim = String(telaSelecionada).trim();

  for (const grupo of GRUPOS_MANUTENCAO_VINCULADOS) {
    const pertence = grupo.telas.some(
      (t) =>
        t.toLowerCase() === telaTrim.toLowerCase() ||
        telaTrim.toLowerCase().includes(t.toLowerCase()) ||
        t.toLowerCase().includes(telaTrim.toLowerCase())
    );

    if (pertence) {
      return [...grupo.telas];
    }
  }

  return [telaTrim];
}

/**
 * Retorna o grupo vinculado correspondente, se existir
 */
export function obterGrupoVinculado(tela) {
  if (!tela) return null;
  const telaTrim = String(tela).trim().toLowerCase();

  return (
    GRUPOS_MANUTENCAO_VINCULADOS.find((g) =>
      g.telas.some((t) => t.toLowerCase() === telaTrim || telaTrim.includes(t.toLowerCase()))
    ) || null
  );
}

/**
 * Checa se o status ativo corresponde à manutenção geral de todas as telas
 */
export function isManutencaoGeral(status) {
  if (!status || !status.emManutencao) return false;
  const tela = String(status.tela || '').toLowerCase().trim();
  return (
    tela.includes('geral') ||
    tela.includes('todas as telas') ||
    tela.includes('multiplas') ||
    tela.includes('múltiplas') ||
    tela === '*'
  );
}

/**
 * Verifica se uma rota/tela está em modo de manutenção ativa
 * Retorna os detalhes da manutenção ou null se liberada
 */
export function verificarManutencaoTela(pathname, status) {
  if (!status || !status.emManutencao) return null;
  const telaConfigurada = String(status.tela || '').trim();
  if (!telaConfigurada) return null;

  const telaLower = telaConfigurada.toLowerCase();

  // 1. Manutenção Geral do Sistema (bloqueia todas as telas)
  if (isManutencaoGeral(status)) {
    return {
      nomeTela: 'Sistema em Manutenção em Múltiplas Telas!',
      emManutencao: true,
      mensagem: status.mensagem || 'O sistema está passando por uma manutenção geral programada em todas as telas.',
      icon: '🛠️',
      isGeral: true,
    };
  }

  // 2. Normaliza o pathname atual
  const pathClean = String(pathname || '').toLowerCase().split('?')[0].replace(/\/$/, '') || '/';

  // Não bloqueia páginas de autenticação para manutenções de telas individuais
  if (
    pathClean.startsWith('/login') ||
    pathClean.startsWith('/register') ||
    pathClean.startsWith('/forgot') ||
    pathClean.startsWith('/reset-password')
  ) {
    return null;
  }

  // Se o pathname for a raiz '/', trata como Dashboard
  const pathParaChecar = pathClean === '' || pathClean === '/' ? '/dashboard' : pathClean;

  // Encontra a configuração pelo pathname
  const configPorPath = TELAS_SISTEMA_CONFIG.find((t) =>
    t.paths.some((p) => pathParaChecar === p || pathParaChecar.startsWith(p + '/'))
  );

  if (configPorPath) {
    const nomeLower = configPorPath.nome.toLowerCase();
    const match =
      telaLower.includes(nomeLower) ||
      nomeLower.includes(telaLower) ||
      configPorPath.aliases.some((alias) => telaLower.includes(alias));

    if (match) {
      return {
        nomeTela: configPorPath.nome,
        emManutencao: true,
        mensagem: status.mensagem || '',
        icon: configPorPath.icon,
      };
    }
  }

  // 3. Fallback: Checa por aliases diretamente no pathname
  for (const item of TELAS_SISTEMA_CONFIG) {
    const matchAlias = item.aliases.some((a) => pathParaChecar.includes(a));
    if (matchAlias) {
      const nomeLower = item.nome.toLowerCase();
      if (
        telaLower.includes(nomeLower) ||
        nomeLower.includes(telaLower) ||
        item.aliases.some((a) => telaLower.includes(a))
      ) {
        return {
          nomeTela: item.nome,
          emManutencao: true,
          mensagem: status.mensagem || '',
          icon: item.icon,
        };
      }
    }
  }

  // 4. Se a tela configurada for personalizada ('Outra') e coincidir com a URL
  if (telaLower.length > 2 && pathParaChecar.includes(telaLower.replace(/\s+/g, '-'))) {
    return {
      nomeTela: telaConfigurada,
      emManutencao: true,
      mensagem: status.mensagem || '',
      icon: '🛠️',
    };
  }

  return null;
}

export function obterStatusLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_STATUS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_STATUS;
  }
}

export async function obterStatusSistema() {
  try {
    const res = await api.get('/system-status');
    if (res && res.data) {
      const data = res.data;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {}
      return data;
    }
  } catch (err) {
    console.warn('[SystemStatus Service] Falha ao consultar backend:', err.message);
  }
  return obterStatusLocal();
}

export async function salvarStatusSistema(novoStatus, nomeUsuario = 'Administrador') {
  const payload = {
    emManutencao: Boolean(novoStatus.emManutencao),
    tela: novoStatus.tela ? String(novoStatus.tela).trim() : '',
    mensagem: novoStatus.mensagem ? String(novoStatus.mensagem).trim() : '',
    tipo: novoStatus.tipo || 'ajuste',
    updatedAt: new Date().toISOString(),
    updatedBy: nomeUsuario,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    localStorage.setItem('system_status_updated_event', JSON.stringify({ payload, timestamp: Date.now() }));
    window.dispatchEvent(new CustomEvent('system_status_updated', { detail: payload }));
  } catch {}

  try {
    const res = await api.post('/system-status', payload);
    if (res && res.data && res.data.status) {
      return res.data.status;
    }
  } catch (err) {
    console.warn('[SystemStatus Service] Erro ao salvar no backend:', err.message);
  }

  return payload;
}

/**
 * Hook React que escuta alterações de status do sistema em tempo real
 */
export function useSystemStatus() {
  const [status, setStatus] = useState(obterStatusLocal);

  useEffect(() => {
    // 1. Busca status atualizado do backend imediatamente
    obterStatusSistema().then((res) => {
      if (res) setStatus(res);
    });

    // 2. Escuta eventos locais e entre abas
    const handleStatusUpdate = (e) => {
      if (e.detail) {
        setStatus(e.detail);
      } else {
        setStatus(obterStatusLocal());
      }
    };

    const handleStorage = (e) => {
      if (e.key === STORAGE_KEY || e.key === 'system_status_updated_event') {
        setStatus(obterStatusLocal());
      }
    };

    window.addEventListener('system_status_updated', handleStatusUpdate);
    window.addEventListener('storage', handleStorage);

    // 3. Polling a cada 5 segundos para sincronizar computadores na rede / abas diferentes
    const interval = setInterval(() => {
      obterStatusSistema().then((res) => {
        if (res) setStatus(res);
      });
    }, 5000);

    return () => {
      window.removeEventListener('system_status_updated', handleStatusUpdate);
      window.removeEventListener('storage', handleStorage);
      clearInterval(interval);
    };
  }, []);

  return status;
}
