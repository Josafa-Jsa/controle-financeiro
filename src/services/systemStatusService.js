// src/services/systemStatusService.js
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
