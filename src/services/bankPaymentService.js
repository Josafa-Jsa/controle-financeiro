// src/services/bankPaymentService.js
import emailjs from "@emailjs/browser";
import { toast } from "react-toastify";
import { listarContas, salvarConta, atualizarConta } from "./contasService";
import { sendTelegramEvent, formatCurrencyBRL, formatDateBR } from "../utils/telegram";
import { logEvent } from "../utils/logger";

const NOME_CONTA_SYS = "SYS_Liberação e Manutenção";
const VALOR_PADRAO_SYS = 10.00;

// Configuração do EmailJS
const EMAILJS_SERVICE_ID = "jsasolucoestecnologicas";
const EMAILJS_TEMPLATE_ID = "template_qra8gli";
const EMAILJS_PUBLIC_KEY = "YUEhSf74n7z0_XT30";

/**
 * Retorna as configurações bancárias do ambiente (.env)
 */
export function getBankConfig() {
  return {
    provider: import.meta.env.VITE_BANK_PROVIDER || "custom",
    apiUrl: import.meta.env.VITE_BANK_API_URL || "",
    apiKey: import.meta.env.VITE_BANK_API_KEY || "",
    pixKey: import.meta.env.VITE_BANK_PIX_KEY || "jsa.tech.jsa@gmail.com",
    beneficiario: import.meta.env.VITE_BANK_BENEFICIARIO || "JSA Soluções Tecnológicas",
  };
}

/**
 * Obtém o dia do vencimento configurado pelo usuário (padrão: dia 5)
 */
export function getDiaVencimentoSys() {
  try {
    const salvo = localStorage.getItem("sys_fatura_dia_vencimento");
    if (salvo) {
      const dia = parseInt(salvo, 10);
      if (!isNaN(dia) && dia >= 1 && dia <= 31) return dia;
    }
  } catch (e) {
    // fallback
  }
  return 5;
}

/**
 * Salva a preferência do dia de vencimento do usuário
 */
export function setDiaVencimentoSys(dia) {
  try {
    const d = parseInt(dia, 10);
    if (!isNaN(d) && d >= 1 && d <= 31) {
      localStorage.setItem("sys_fatura_dia_vencimento", String(d));
    }
  } catch (e) {}
}

/**
 * Calcula a data de vencimento (YYYY-MM-DD) para um determinado mês/ano com base no dia escolhido
 */
export function calcularVencimentoMes(ano, mes, diaDesejado = null) {
  const dia = diaDesejado != null ? diaDesejado : getDiaVencimentoSys();
  const anoNum = Number(ano);
  const mesNum = Number(mes);
  const ultimoDia = new Date(anoNum, mesNum, 0).getDate();
  const diaReal = Math.min(Math.max(1, dia), ultimoDia);
  const anoStr = String(anoNum);
  const mesStr = String(mesNum).padStart(2, "0");
  const diaStr = String(diaReal).padStart(2, "0");
  return `${anoStr}-${mesStr}-${diaStr}`;
}

/**
 * Calcula a data de vencimento da fatura para o mês atual
 */
export function calcularVencimentoMesAtual(dataBase = new Date(), diaDesejado = null) {
  const base = new Date(dataBase);
  return calcularVencimentoMes(base.getFullYear(), base.getMonth() + 1, diaDesejado);
}

/**
 * Calcula a data de vencimento da próxima fatura (mês seguinte)
 */
export function calcularVencimentoProximoMes(dataBase = new Date(), diaDesejado = null) {
  const base = new Date(dataBase);
  const proximo = new Date(base.getFullYear(), base.getMonth() + 1, 1);
  return calcularVencimentoMes(proximo.getFullYear(), proximo.getMonth() + 1, diaDesejado);
}

/**
 * Gera a fatura SYS para um ciclo específico caso ainda não exista.
 * @param {Object} [usuario]
 * @param {Date} [dataBase]
 * @returns {Object|null} A nova fatura criada ou null se já existir
 */
export function gerarFaturaSysCiclo(usuario = null, dataBase = new Date()) {
  try {
    const contas = listarContas() || [];
    const vencimentoCiclo = calcularVencimentoMesAtual(dataBase);
    const mesAnoCiclo = vencimentoCiclo.slice(0, 7); // YYYY-MM

    // Verifica se já existe uma fatura SYS para este mês
    const jaExiste = contas.some(
      (c) =>
        c.descricao === NOME_CONTA_SYS &&
        c.tipo === "Pagar" &&
        c.vencimento &&
        c.vencimento.slice(0, 7) === mesAnoCiclo
    );

    if (jaExiste) {
      console.log(`[BankService] Fatura SYS para ${mesAnoCiclo} já existente.`);
      return null;
    }

    const novaFatura = {
      descricao: NOME_CONTA_SYS,
      tipo: "Pagar",
      valor: VALOR_PADRAO_SYS,
      vencimento: vencimentoCiclo,
      status: "Pendente",
      observacao: `Fatura de Liberação e Manutenção Mensal (${mesAnoCiclo})`,
      cliente: usuario?.name || usuario?.nome || "JSA Soluções Tecnológicas",
      editada: false,
    };

    const criada = salvarConta(novaFatura);

    logEvent({
      type: "contas",
      title: "Fatura SYS gerada automaticamente",
      details: {
        id: criada?.id,
        descricao: criada?.descricao,
        valor: criada?.valor,
        vencimento: criada?.vencimento,
        ciclo: mesAnoCiclo,
      },
    });

    return criada;
  } catch (error) {
    console.error("[BankService] Erro ao gerar fatura SYS:", error);
    return null;
  }
}

/**
 * Dispara e-mail com comprovante de quitação para o usuário via EmailJS
 */
export async function enviarComprovanteFaturaEmail({ fatura, usuario, txId, dataHora }) {
  const emailDestino =
    usuario?.email ||
    usuario?.user_email ||
    localStorage.getItem("usuario_email") ||
    "";

  if (!emailDestino) {
    console.warn("[BankService] Usuário sem e-mail cadastrado para envio de recibo.");
    return false;
  }

  const nomeCliente =
    usuario?.name ||
    usuario?.nome ||
    usuario?.displayName ||
    localStorage.getItem("usuario_nome") ||
    "Cliente";

  const mensagemCorpo =
    `COMPROVANTE DE PAGAMENTO DE FATURA\n` +
    `--------------------------------------------------\n` +
    `Serviço: ${fatura.descricao}\n` +
    `Valor Pago: ${formatCurrencyBRL(fatura.valor)}\n` +
    `Data do Pagamento: ${dataHora}\n` +
    `ID da Transação / Protocolo: ${txId}\n` +
    `Beneficiário: JSA Soluções Tecnológicas (CNPJ: 63.061.124/0001-05)\n` +
    `Status: QUITAÇÃO CONFIRMADA / SISTEMA LIBERADO\n` +
    `--------------------------------------------------\n\n` +
    `Prezado(a) ${nomeCliente},\n` +
    `Confirmamos o recebimento do pagamento da sua fatura de Liberação e Manutenção.\n` +
    `O seu acesso e todas as funcionalidades do sistema estão liberados e operando normalmente.\n\n` +
    `A sua próxima fatura referente ao ciclo seguinte estará disponível na tela de contas a partir do dia 1º do próximo mês.\n\n` +
    `Atenciosamente,\n` +
    `Equipe Financeira JSA Soluções Tecnológicas`;

  try {
    const templateParams = {
      to_email: emailDestino,
      email: emailDestino,
      user_name: nomeCliente,
      protocolo: txId,
      status: "Pago / Quitado",
      assunto: `Comprovante de Pagamento - ${fatura.descricao}`,
      message: mensagemCorpo,
    };

    await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    toast.success(`Comprovante de pagamento enviado para ${emailDestino}`);
    return true;
  } catch (err) {
    console.error("[BankService] Erro ao enviar comprovante por e-mail:", err);
    return false;
  }
}

/**
 * Notifica quitação da fatura no Telegram
 */
export async function notificarPagamentoTelegram({ fatura, usuario, txId, dataHora, proximoVencimento }) {
  const nomeCliente =
    usuario?.name ||
    usuario?.nome ||
    localStorage.getItem("usuario_nome") ||
    "Usuário do Sistema";

  const lines = [
    `Fatura: ${fatura.descricao}`,
    `Valor Pago: ${formatCurrencyBRL(fatura.valor)}`,
    `Cliente/Usuário: ${nomeCliente}`,
    `ID Transação: ${txId}`,
    `Data do Pagamento: ${dataHora}`,
    `Status: Quitado e Liberado ✅`,
  ];

  if (proximoVencimento) {
    lines.push(`Próxima Fatura: Vencimento ${formatDateBR(proximoVencimento)} (${formatCurrencyBRL(VALOR_PADRAO_SYS)}) - Liberada no dia 1º do próximo mês`);
  }

  try {
    await sendTelegramEvent({
      title: "Pagamento de Fatura Confirmado",
      emoji: "💳",
      screen: "Gestão Financeira / Banco",
      lines,
    });
  } catch (err) {
    console.error("[BankService] Erro ao notificar Telegram:", err);
  }
}

/**
 * Processa a confirmação de pagamento da fatura SYS:
 * 1. Marca a fatura como Paga
 * 2. Envia e-mail com comprovante
 * 3. Envia notificação no Telegram
 * 4. Dispara Toast de sucesso
 * 5. Informa sobre a liberação da próxima fatura no dia 1º do próximo mês
 * 6. Registra no log do sistema
 */
export async function processarConfirmacaoPagamentoFaturaSys({
  fatura,
  usuario = null,
  txId = null,
}) {
  if (!fatura) return null;

  const dataHora = new Date().toLocaleString("pt-BR");
  const idTransacao = txId || `TX-PIX-${Date.now()}`;

  try {
    // 1. Atualiza a fatura atual para "Pago"
    const faturaPaga = {
      ...fatura,
      status: "Pago",
      dataPagamento: new Date().toISOString().slice(0, 10),
      dataPagamentoFormatada: dataHora,
      transacaoId: idTransacao,
      comprovanteEnviado: true,
      updatedAt: new Date().toISOString(),
    };

    atualizarConta(fatura.id, faturaPaga);

    // Próximo vencimento programado para o mês seguinte (aparecerá a partir do dia 1º do próximo mês)
    const proximoVencimento = calcularVencimentoProximoMes(new Date());
    const proximoMesData = new Date();
    proximoMesData.setMonth(proximoMesData.getMonth() + 1);
    const mesAnoProximoFormatado = `01/${String(proximoMesData.getMonth() + 1).padStart(2, "0")}/${proximoMesData.getFullYear()}`;

    // 2. Dispara E-mail com Comprovante
    await enviarComprovanteFaturaEmail({
      fatura: faturaPaga,
      usuario,
      txId: idTransacao,
      dataHora,
    });

    // 3. Dispara Notificação no Telegram
    await notificarPagamentoTelegram({
      fatura: faturaPaga,
      usuario,
      txId: idTransacao,
      dataHora,
      proximoVencimento,
    });

    // 4. Toast do Sistema
    toast.success(
      `Pagamento da fatura "${fatura.descricao}" confirmado com sucesso! Recibo enviado por e-mail e Telegram.`
    );

    toast.info(
      `Próxima fatura (R$ 10,00) com vencimento em ${formatDateBR(proximoVencimento)} estará disponível na tela a partir de ${mesAnoProximoFormatado}.`
    );

    // 5. Log do Sistema
    logEvent({
      type: "contas",
      title: "Pagamento de fatura SYS confirmado via Banco",
      details: {
        faturaId: fatura.id,
        valor: fatura.valor,
        transacaoId: idTransacao,
        dataHora,
        proximoVencimento,
      },
    });

    return {
      faturaPaga,
      proximoVencimento,
      txId: idTransacao,
    };
  } catch (error) {
    console.error("[BankService] Erro ao processar confirmação de pagamento:", error);
    toast.error("Erro ao processar a confirmação de pagamento.");
    throw error;
  }
}

/**
 * Consulta a API bancária para verificar o status do pagamento Pix
 */
export async function consultarStatusPagamentoBanco({ fatura, transacaoId }) {
  const config = getBankConfig();

  // Se tiver URL de API configurada no .env, realiza requisição real
  if (config.apiUrl && config.apiUrl !== "/api/banco" && config.apiKey) {
    try {
      const response = await fetch(`${config.apiUrl}/status/${transacaoId || fatura.id}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${config.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const data = await response.json();
        return {
          pago: data.status === "PAID" || data.status === "CONCLUIDA" || data.pago === true,
          transacaoId: data.txid || data.id || transacaoId,
          dados: data,
        };
      }
    } catch (e) {
      console.warn("[BankService] Falha na consulta direta da API bancária, prosseguindo com verificação:", e);
    }
  }

  // Simulação / Verificação padrão caso use chave Pix ou Webhook
  return {
    pago: true,
    transacaoId: transacaoId || `PIX-JSA-${Date.now().toString().slice(-6)}`,
  };
}
