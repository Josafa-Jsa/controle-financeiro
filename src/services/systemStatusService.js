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

// Configuração completa e individual de todas as telas do sistema
export const TELAS_SISTEMA_CONFIG = [
  {
    nome: 'Dashboard Principal',
    aliases: ['dashboard', 'dashboard principal', 'inicio', 'painel'],
    paths: ['/dashboard'],
    key: 'dashboard',
    icon: '📊',
    descricao: 'Indicadores, gráficos e resumo financeiro',
  },
  {
    nome: 'Atendimento & Chamados',
    aliases: ['chamados', 'atendimento', 'central de chamados', 'atendimento & chamados', 'suporte'],
    paths: ['/chamados'],
    key: 'chamados',
    icon: '🎧',
    descricao: 'Suporte e abertura de chamados técnicos',
  },
  {
    nome: 'Gestão de Contas',
    aliases: ['contas', 'gestao de contas', 'gestão de contas', 'financeiro'],
    paths: ['/contas'],
    key: 'contas',
    icon: '💳',
    descricao: 'Contas a pagar e receber, lançamentos',
  },
  {
    nome: 'Fluxo de Caixa',
    aliases: ['fluxo', 'fluxo de caixa'],
    paths: ['/fluxo'],
    key: 'fluxo',
    icon: '📈',
    descricao: 'Entradas, saídas e projeções financeiras',
  },
  {
    nome: 'Simulador de Créditos',
    aliases: ['simulador', 'simulador de creditos', 'simulador de créditos'],
    paths: ['/simulador'],
    key: 'simulador',
    icon: '🧮',
    descricao: 'Simulação de taxas, parcelas e juros',
  },
  {
    nome: 'Notas Fiscais',
    aliases: ['notas', 'notas fiscais', 'nfe', 'nf-e', 'notas fiscais (nf-e)'],
    paths: ['/notas'],
    key: 'notas',
    icon: '📑',
    descricao: 'Emissão, consulta e upload de NF-e',
  },
  {
    nome: 'Controle de Notas',
    aliases: ['controle-notas', 'controle de notas', 'controle de nota', 'controle notas', 'painel notas'],
    paths: ['/controle-notas'],
    key: 'controle-notas',
    icon: '📋',
    descricao: 'Registro, conferência e entrega de notas recebidas',
  },
  {
    nome: 'Ordens de Serviço',
    aliases: ['ordem-servico', 'ordens', 'os', 'ordem de servico', 'ordem de serviço', 'ordens de serviço', 'ordens de servico'],
    paths: ['/ordem-servico', '/ordens'],
    key: 'ordem-servico',
    icon: '🛠️',
    descricao: 'Abertura, acompanhamento e fechamento de O.S',
  },
  {
    nome: 'Gestão de Contratos',
    aliases: ['contratos', 'gestao de contratos', 'gestão de contratos'],
    paths: ['/contratos'],
    key: 'contratos',
    icon: '📝',
    descricao: 'Contratos gerais e clientes',
  },
  {
    nome: 'Contrato Internet / Provedor',
    aliases: ['contrato-internet', 'internet', 'provedor', 'contrato internet'],
    paths: ['/contrato-internet'],
    key: 'contrato-internet',
    icon: '🌐',
    descricao: 'Planos e contratos de internet',
  },
  {
    nome: 'Controle de Estoque',
    aliases: ['estoque', 'controle de estoque'],
    paths: ['/estoque'],
    key: 'estoque',
    icon: '📦',
    descricao: 'Produtos, itens e movimentações',
  },
  {
    nome: 'Prevenção de Perdas',
    aliases: ['prevencao', 'prevenção', 'prevencao de perdas', 'prevenção de perdas'],
    paths: ['/prevencao'],
    key: 'prevencao',
    icon: '🛡️',
    descricao: 'Registro e gestão de ocorrências e segurança',
  },
  {
    nome: 'Controle de Uniformes',
    aliases: ['uniformes', 'painel uniformes', 'controle de uniformes'],
    paths: ['/uniformes'],
    key: 'uniformes',
    icon: '👔',
    descricao: 'Estoque de uniformes novos e usados por departamento',
  },
  {
    nome: 'Painel Administrativo',
    aliases: ['admin', 'painel administrativo', 'usuarios', 'admin users', 'log'],
    paths: ['/admin/users', '/admin/log'],
    key: 'admin',
    icon: '⚙️',
    descricao: 'Gestão de usuários, permissões e configurações',
  },
];

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

  // Lista de nomes/chaves selecionadas pelo admin no modal de status
  const listaSelecionadas = telaConfigurada
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  // Localiza a configuração da tela correspondente ao pathname exato
  const configDaTela = TELAS_SISTEMA_CONFIG.find((t) =>
    t.paths.some((p) => pathParaChecar === p || pathParaChecar.startsWith(p + '/'))
  );

  if (configDaTela) {
    const nomeNorm = configDaTela.nome.toLowerCase();
    const keyNorm = configDaTela.key.toLowerCase();
    const aliasesNorm = (configDaTela.aliases || []).map((a) => a.toLowerCase());

    const estaEmManutencao = listaSelecionadas.some((sel) => {
      // 1. Match exato por nome, key ou aliases
      if (sel === nomeNorm || sel === keyNorm || aliasesNorm.includes(sel)) return true;

      // 2. Tratamento estrito para evitar colisão entre 'Notas Fiscais' e 'Controle de Notas'
      if (keyNorm === 'controle-notas') {
        if (sel === 'controle de notas' || sel === 'controle-notas' || sel === 'controle notas' || sel.includes('controle')) return true;
        return false;
      }
      if (keyNorm === 'notas') {
        if (sel.includes('controle')) return false; // NUNCA ativa quando o selecionado for controle de notas
        if (sel === 'notas fiscais' || sel === 'notas' || sel === 'nfe' || sel === 'nf-e' || sel.startsWith('notas fiscais')) return true;
        return false;
      }

      // 3. Match por inclusão para os demais módulos
      if (sel.includes(nomeNorm) || nomeNorm.includes(sel) || sel.includes(keyNorm) || keyNorm.includes(sel)) {
        return true;
      }
      return false;
    });

    if (estaEmManutencao) {
      return {
        nomeTela: configDaTela.nome,
        emManutencao: true,
        mensagem: status.mensagem || '',
        icon: configDaTela.icon,
      };
    }
  }

  // 3. Fallback se tela personalizada digitada coincidir com a URL
  if (telaConfigurada.length > 2 && pathParaChecar.includes(telaConfigurada.toLowerCase().replace(/\s+/g, '-'))) {
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
