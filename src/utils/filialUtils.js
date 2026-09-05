// src/utils/filialUtils.js

/**
 * Normaliza o nome da filial para um formato padrão consistente (ex: "Filial 4", "Filial Particular")
 * Aceita entradas como "4", "filial 4", "FILIAL 04", "Filial 4", "Particular", etc.
 */
export function normalizarNomeFilial(f) {
  if (!f) return 'Filial 1';
  const s = String(f).trim();
  if (!s) return 'Filial 1';
  if (/^todas/i.test(s)) return 'Todas';
  if (/particular/i.test(s)) return 'Filial Particular';
  const matchNum = s.match(/\d+/);
  if (matchNum) {
    return `Filial ${parseInt(matchNum[0], 10)}`;
  }
  return s;
}

export const LISTA_FILIAIS_SISTEMA = [
  'Filial 1',
  'Filial 2',
  'Filial 3',
  'Filial 4',
  'Filial 5',
  'Filial 6',
  'Filial 7',
  'Filial Particular',
];
