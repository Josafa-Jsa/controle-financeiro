// src/utils/numberUtils.js

/**
 * Utilitário Centralizado de Padronização Numérica e Monetária
 * Front-End: Visualização amigável em BRL com vírgula (ex: "R$ 1.500,00")
 * Back-End / Banco de Dados: Padrão numérico puro com ponto decimal (ex: 1500.00 / "1500.00")
 */

/**
 * Converte qualquer valor (string BRL, número float, input de usuário) para float puro com ponto decimal.
 * Garante sempre 2 casas decimais e retorno numérico float válido.
 * Ex: "R$ 1.500,50" -> 1500.50 | "150,00" -> 150.00 | "" -> 0.00
 */
export function parseToBackendFloat(value) {
  if (value === null || value === undefined || value === "") return 0.00;

  if (typeof value === "number") {
    return Number.isFinite(value)
      ? Math.round((value + Number.EPSILON) * 100) / 100
      : 0.00;
  }

  const str = String(value).trim();

  // Caso contenha pontos de milhar e vírgula decimal (ex: "1.250,50" ou "R$ 1.250,50")
  if (str.includes(",") && str.includes(".")) {
    const normalized = str.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(normalized.replace(/[^\d.-]/g, ""));
    return Number.isFinite(num) ? Math.round((num + Number.EPSILON) * 100) / 100 : 0.00;
  }

  // Caso contenha apenas vírgula (ex: "150,50" ou "R$ 150,50")
  if (str.includes(",")) {
    const normalized = str.replace(",", ".");
    const num = parseFloat(normalized.replace(/[^\d.-]/g, ""));
    return Number.isFinite(num) ? Math.round((num + Number.EPSILON) * 100) / 100 : 0.00;
  }

  // Caso padrão com ponto ou número simples
  const num = parseFloat(str.replace(/[^\d.-]/g, ""));
  return Number.isFinite(num) ? Math.round((num + Number.EPSILON) * 100) / 100 : 0.00;
}

/**
 * Retorna uma string decimal padronizada com ponto no formato "0.00"
 * Ideal para compilação em schemas SQL / PostgreSQL / MySQL / MongoDB / JSON.
 * Ex: 150 -> "150.00" | "R$ 1.250,50" -> "1250.50"
 */
export function formatBackendDecimal(value) {
  const floatVal = parseToBackendFloat(value);
  return floatVal.toFixed(2);
}

/**
 * Formata um valor numérico para exibição no Front-End brasileiro (com vírgula e R$).
 * Ex: 1500.50 -> "R$ 1.500,50" | 0 -> "R$ 0,00"
 */
export function formatFrontendCurrency(value) {
  const floatVal = parseToBackendFloat(value);
  return floatVal.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Máscara dinâmica de input enquanto o usuário digita nos campos.
 * Ex: Digitar "15000" resulta em "R$ 150,00" na tela.
 */
export function formatarMoedaInput(valor) {
  if (valor === "" || valor === null || valor === undefined) return "";
  const apenasNumeros = String(valor).replace(/\D/g, "");
  if (!apenasNumeros) return "";
  const numero = Number(apenasNumeros) / 100;
  return numero.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/**
 * Converte valor digitado no input de volta para o float do backend (com ponto decimal).
 */
export function converterMoedaParaNumero(valorFormatado) {
  return parseToBackendFloat(valorFormatado);
}
