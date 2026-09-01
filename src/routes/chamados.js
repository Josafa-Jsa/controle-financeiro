// server/routes/chamados.js
const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");
const axios = require("axios");

/* ===============================
   CONFIGURAÇÃO DO TELEGRAM & SMTP
   =============================== */

// Lê do .env ou usa os valores exatos configurados no seu .env
const TELEGRAM_BOT_TOKEN =
  process.env.TELEGRAM_BOT_TOKEN ||
  process.env.VITE_TELEGRAM_BOT_TOKEN ||
  "8379610153:AAET9Cy4M77eb1zpUms__6_R8GG2tsniFas";

const TELEGRAM_CHAT_ID =
  process.env.TELEGRAM_CHAT_ID ||
  process.env.VITE_TELEGRAM_CHAT_ID ||
  "-4822585041";

// Configuração do Transportador Nodemailer
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || "jsa@jsa.com";
const SMTP_PASS = process.env.SMTP_PASS || "";

const transporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_PORT === 465,
  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },
});

/* ===============================
   HELPERS
   =============================== */

function escapeHTML(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendTelegramNotification(text) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("[Telegram] Token ou Chat ID não definidos.");
    return false;
  }

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    const response = await axios.post(url, {
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    });
    return response.data?.ok;
  } catch (error) {
    console.error(
      "[Telegram] Erro no envio:",
      error?.response?.data || error.message
    );
    return false;
  }
}

/* ===============================
   ROTAS
   =============================== */

/**
 * 1. POST /api/chamados/enviar-email-abertura
 * Dispara e-mail com protocolo ao criar o chamado
 */
router.post("/enviar-email-abertura", async (req, res) => {
  const { to, protocolo, assunto, descricao } = req.body;

  if (!to || !protocolo) {
    return res.status(400).json({ error: "Campos 'to' e 'protocolo' são obrigatórios." });
  }

  try {
    if (SMTP_PASS) {
      await transporter.sendMail({
        from: `"JSA Soluções Tecnológicas" <${SMTP_USER}>`,
        to: to,
        subject: `Abertura de Chamado - Protocolo ${protocolo}`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #ff5b5b; border-bottom: 2px solid #ff5b5b; padding-bottom: 8px;">JSA Soluções Tecnológicas</h2>
            <p>Olá,</p>
            <p>Seu chamado foi registrado com sucesso em nosso sistema!</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Número do Protocolo:</strong> <span style="color: #2563eb; font-weight: bold;">${escapeHTML(protocolo)}</span></p>
              <p style="margin: 5px 0;"><strong>Assunto:</strong> ${escapeHTML(assunto)}</p>
              <p style="margin: 5px 0;"><strong>Descrição:</strong> ${escapeHTML(descricao)}</p>
            </div>

            <p>Nossa equipe técnica já foi notificada e em breve iniciará o atendimento.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <small style="color: #777;">Esta é uma mensagem automática.</small>
          </div>
        `,
      });
    } else {
      console.warn("[SMTP] E-mail não enviado: SMTP_PASS não configurada no servidor.");
    }

    return res.status(200).json({ success: true, message: "Abertura processada." });
  } catch (error) {
    console.error("[Email] Erro no e-mail de abertura:", error);
    return res.status(500).json({ error: "Erro ao enviar e-mail.", details: error.message });
  }
});

/**
 * 2. POST /api/chamados/finalizar
 * Notifica o grupo do Telegram (-4822585041) e envia e-mail de conclusão ao cliente
 */
router.post("/finalizar", async (req, res) => {
  const { protocolo, dataHora, tecnico, servicoRealizado, clienteEmail } = req.body;

  if (!protocolo || !tecnico || !servicoRealizado) {
    return res.status(400).json({ error: "Dados insuficientes para finalizar o chamado." });
  }

  try {
    const dataConclusao = dataHora || new Date().toLocaleString("pt-BR");

    // A) Notifica no Telegram
    const msgTelegram = [
      `<b>🔴 CHAMADO FINALIZADO - JSA SOLUÇÕES</b>`,
      `<b>📌 Protocolo:</b> ${escapeHTML(protocolo)}`,
      `<b>📅 Data/Hora:</b> ${escapeHTML(dataConclusao)}`,
      `<b>👨‍🔧 Técnico Responsável:</b> ${escapeHTML(tecnico)}`,
      `<b>🛠️ Serviço Realizado:</b> ${escapeHTML(servicoRealizado)}`,
    ].join("\n");

    const telegramOk = await sendTelegramNotification(msgTelegram);

    // B) E-mail para o cliente
    if (clienteEmail && SMTP_PASS) {
      await transporter.sendMail({
        from: `"JSA Soluções Tecnológicas" <${SMTP_USER}>`,
        to: clienteEmail,
        subject: `Chamado Finalizado - Protocolo ${protocolo}`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
            <h2 style="color: #22c55e; border-bottom: 2px solid #22c55e; padding-bottom: 8px;">JSA Soluções Tecnológicas</h2>
            <p>Seu chamado foi <strong>FINALIZADO</strong> com sucesso!</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <p style="margin: 5px 0;"><strong>Protocolo:</strong> ${escapeHTML(protocolo)}</p>
              <p style="margin: 5px 0;"><strong>Data/Hora de Conclusão:</strong> ${escapeHTML(dataConclusao)}</p>
              <p style="margin: 5px 0;"><strong>Técnico Responsável:</strong> ${escapeHTML(tecnico)}</p>
              <p style="margin: 5px 0;"><strong>Serviço Realizado:</strong> ${escapeHTML(servicoRealizado)}</p>
            </div>

            <p>Agradecemos a confiança!</p>
          </div>
        `,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Chamado finalizado!",
      telegramSent: telegramOk,
    });
  } catch (error) {
    console.error("[Chamados] Erro ao finalizar:", error);
    return res.status(500).json({ error: "Erro ao finalizar chamado.", details: error.message });
  }
});

module.exports = router;