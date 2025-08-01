const STORAGE_KEY = 'simulacoesCredito';

export function listarSimulacoes() {
  return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
}

export function salvarSimulacao(simulacao) {
  const simulacoes = listarSimulacoes();
  simulacoes.push(simulacao);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(simulacoes));
}
