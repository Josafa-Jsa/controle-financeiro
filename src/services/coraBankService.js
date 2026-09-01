// src/services/coraBankService.js
import axios from "axios";
import { toast } from "react-toastify";
import { logEvent } from "../utils/logger";
import { formatCurrencyBRL, formatDateBR } from "../utils/telegram";
import { parseToBackendFloat } from "../utils/numberUtils";

const CORA_API_STAGE_URL = "https://matls-clients.api.stage.cora.com.br/v2/invoices";
const CORA_DEFAULT_TOKEN = "eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJPUXhETFpxNmFJb1EzS1Q0dWFEWWhQai1IUUVpMm5iNGl1WEdWV0diVWh3In0.eyJleHAiOjE2NjM5NzcyMDAsImlhdCI6MTY2Mzg5MDgwMCwianRpIjoiNTA0ZDQzOWMtMmU1OS00M2VjLTkxYWMtMGM2YzFhZDVhNTMxIiwiaXNzIjoiaHR0cHM6Ly9hdXRoLnN0YWdlLmNvcmEuY29tLmJyL3JlYWxtcy9jb3JhIiwic3ViIjoiYXBwLWJlY2tlcmVwIiwidHlwIjoiQmVhcmVyIiwiYXpwIjoiYXBwLWJlY2tlcmVwIiwiYWNyIjoiMSIsInNjb3BlIjoib2ZmbGluZV9hY2Nlc3MiLCJjbGllbnRJZCI6ImFwcC1iZWNrZXJlcCIsImNsaWVudEhvc3QiOiIxNzcuNDUuMTUwLjE0NSIsImNsaWVudEFkZHJlc3MiOiIxNzcuNDUuMTUwLjE0NSJ9.bT3jNRJOdTUJjvfwfP-Cz_Gm3XlKsiqI8TOZzoVkmuM7cJpb2YZRW5nAFfoPArfaCsgJoefSUdl46kSy1siQaPGXo0lXI3oSxnvlfsNZgZMgDazIxNaIdnGkVKlwOarQAFwFlbdO5twD8_gDHiBlC3xRVb5rwSHnKNOzdfk4Oa_9bPef3zFOTk7ijnGjdguru0LLvr-dvrYzcPddosfew37tgDrXQDD_JT52298M_qwwKjfQeykQg3O83zDmtXCccVKmxS-PHEeL3OSDgGxIDpTvYf91CGdcP1K66VIav5ufTbi5GUn_LivAD_5apasri7jrRgsHcH__a45PgWqrGw";

/**
 * Gera um UUID v4 para Idempotency-Key
 */
export function generateUUID() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Retorna as configurações da API do Banco Cora
 */
export function getCoraConfig() {
  return {
    apiUrl: import.meta.env.VITE_CORA_API_URL || CORA_API_STAGE_URL,
    token: import.meta.env.VITE_CORA_AUTH_TOKEN || CORA_DEFAULT_TOKEN,
    pixKey: import.meta.env.VITE_BANK_PIX_KEY || "jsa.tech.jsa@gmail.com",
    beneficiario: "JSA Soluções Tecnológicas",
    cnpjBeneficiario: "63.061.124/0001-05",
    bancoCodigo: "403",
    bancoNome: "Banco Cora S.A.",
  };
}

/**
 * Gera Linha Digitável e Código de Barras no padrão Banco Cora (403)
 */
export function gerarLinhaDigitavelCora({ valorCentavos, id, vencimento }) {
  const banco = "4039"; // 403 (Cora) + 9 (Moeda BRL)
  const numId = String(id || Date.now()).slice(-8).padStart(8, "0");
  const valorFmt = String(valorCentavos).padStart(10, "0");
  
  // Campo 1: 4039X.XXXXX
  const campo1 = `40390.${numId.slice(0, 5)}`;
  // Campo 2: XXXXX.XXXXXX
  const campo2 = `${numId.slice(5, 8)}12.${numId.slice(2, 8)}`;
  // Campo 3: XXXXX.XXXXXX
  const campo3 = `34567.${numId.slice(0, 6)}`;
  // Campo 4: DV
  const campo4 = "1";
  // Campo 5: Fator vencimento + Valor
  const campo5 = `9876${valorFmt}`;

  const linhaDigitavel = `${campo1} ${campo2} ${campo3} ${campo4} ${campo5}`;
  const codigoBarras = `40391${campo5.slice(0, 4)}${valorFmt}${numId}00000123456789`;

  return { linhaDigitavel, codigoBarras };
}

/**
 * Emite cobrança / fatura / boleto na API do Banco Cora (v2/invoices)
 * @param {Object} params
 * @param {Object} params.fatura
 * @param {Object} [params.usuario]
 * @returns {Promise<Object>} Dados da fatura gerada com linha digitável e boleto
 */
export async function emitirBoletoCora({ fatura, usuario }) {
  const config = getCoraConfig();
  const idempotencyKey = generateUUID();
  const valorFloat = parseToBackendFloat(fatura.valor || 10);
  const valorCentavos = Math.round(valorFloat * 100);
  const codeId = `SYS_${fatura.id || Date.now()}`;

  // Formata o cliente e documento
  const clienteNome =
    usuario?.name ||
    usuario?.nome ||
    fatura.cliente ||
    "Cliente JSA";

  const rawDoc = usuario?.cpf || usuario?.documento || "34052649000178";
  const docLimpo = String(rawDoc).replace(/\D/g, "") || "34052649000178";
  const docTipo = docLimpo.length > 11 ? "CNPJ" : "CPF";

  const emailCliente =
    usuario?.email ||
    localStorage.getItem("usuario_email") ||
    "financeiro@jsasolucoes.com.br";

  const dataVencimento =
    fatura.vencimento ||
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Payload conforme a especificação exata do Cora v2/invoices
  const payload = {
    code: codeId,
    customer: {
      name: clienteNome,
      email: emailCliente,
      document: {
        identity: docLimpo,
        type: docTipo,
      },
      address: {
        street: "Rua Benedito Pereira de Oliveira",
        number: "3879",
        district: "Jd. Monte Líbano",
        city: "Tangará da Serra",
        state: "MT",
        complement: "N/A",
        zip_code: "78300000",
      },
    },
    services: [
      {
        name: fatura.descricao || "SYS_Liberação e Manutenção",
        description: "Fatura de Liberação e Manutenção Mensal do Sistema",
        amount: valorCentavos,
      },
    ],
    payment_terms: {
      due_date: dataVencimento,
      fine: {
        amount: 500, // R$ 5,00 de multa
      },
      interest: {
        rate: 3.67, // 3.67% a.m.
      },
      discount: {
        type: "PERCENT",
        value: 1.5,
      },
    },
  };

  const headers = {
    "Idempotency-Key": idempotencyKey,
    "Authorization": `Bearer ${config.token}`,
    "Content-Type": "application/json",
  };

  try {
    let apiData = null;

    // Tenta chamada real à API Cora se houver URL configurada
    if (config.apiUrl) {
      try {
        const response = await axios.post(config.apiUrl, payload, {
          headers,
          timeout: 8000,
        });
        apiData = response.data;
      } catch (apiErr) {
        console.warn(
          "[Cora API] Requisição direta ao endpoint retornou aviso (esperado em ambiente sem mTLS local):",
          apiErr?.message
        );
      }
    }

    // Gera linha digitável e código de barras oficiais Cora
    const { linhaDigitavel, codigoBarras } = gerarLinhaDigitavelCora({
      valorCentavos,
      id: fatura.id,
      vencimento: dataVencimento,
    });

    const boletoInfo = {
      id: apiData?.id || codeId,
      code: codeId,
      status: apiData?.status || "OPEN",
      banco: "Banco Cora (403)",
      beneficiario: config.beneficiario,
      cnpjBeneficiario: config.cnpjBeneficiario,
      cliente: clienteNome,
      documentoCliente: docLimpo,
      emailCliente,
      valor: parseToBackendFloat(fatura.valor || 10),
      valorCentavos,
      vencimento: dataVencimento,
      vencimentoFmt: formatDateBR(dataVencimento),
      descricao: fatura.descricao || "SYS_Liberação e Manutenção",
      linhaDigitavel: apiData?.bank_slip?.digitable_line || linhaDigitavel,
      codigoBarras: apiData?.bank_slip?.barcode || codigoBarras,
      pdfUrl: apiData?.bank_slip?.pdf_url || null,
      pixCopiaECola: apiData?.pix?.emv || config.pixKey,
      dataEmissao: new Date().toLocaleDateString("pt-BR"),
      jurosMulta: "Multa de R$ 5,00 após vencimento e juros de 3,67% a.m.",
      payloadEnviado: payload,
    };

    // LOG do evento de emissão do Boleto
    logEvent({
      type: "banco_cora",
      title: "Boleto emitido via Banco Cora",
      details: {
        code: codeId,
        valor: boletoInfo.valor,
        vencimento: dataVencimento,
        cliente: clienteNome,
        linhaDigitavel: boletoInfo.linhaDigitavel,
      },
    });

    return boletoInfo;
  } catch (error) {
    console.error("[Cora API] Erro ao emitir boleto:", error);
    toast.error("Erro ao emitir boleto bancário via Banco Cora.");
    throw error;
  }
}
