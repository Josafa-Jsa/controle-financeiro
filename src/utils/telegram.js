// // src/utils/telegram.js
// import { getUser } from "../auth/auth";

// /* ===============================
//    ENV / CONFIG
//    =============================== */

// function env() {
//   const token = String(import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "").trim();
//   const chatId = String(import.meta.env.VITE_TELEGRAM_CHAT_ID || "").trim();
//   const ADMIN_ONLY =
//     String(import.meta.env.VITE_TG_ADMIN_ONLY || "").toLowerCase() === "true";
//   const ADMIN_EMAIL = String(
//     import.meta.env.VITE_TG_ADMIN_EMAIL || "jsa@jsa.com"
//   ).toLowerCase();
//   const DEBUG =
//     String(import.meta.env.VITE_TG_DEBUG || "").toLowerCase() === "true";

//   return { token, chatId, ADMIN_ONLY, ADMIN_EMAIL, DEBUG };
// }

// function buildUrl(method) {
//   const { token } = env();
//   return `https://api.telegram.org/bot${token}/${method}`;
// }

// function validEnv() {
//   const { token, chatId, DEBUG } = env();
//   const ok = Boolean(token) && Boolean(chatId);
//   if (!ok && DEBUG) {
//     console.warn(
//       "[Telegram] Variáveis ausentes:",
//       { token: !!token, chatId: !!chatId },
//       "Defina VITE_TELEGRAM_BOT_TOKEN e VITE_TELEGRAM_CHAT_ID."
//     );
//   }
//   return ok;
// }

// /* ===============================
//    HELPERS
//    =============================== */

// function escapeHTML(s) {
//   return String(s ?? "")
//     .replace(/&/g, "&amp;")
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;");
// }

// function getActorName(u) {
//   const name = u?.name || u?.nome || "";
//   const email = u?.email || "";
//   return (name || email || "Usuário não identificado").trim();
// }

// export function formatCurrencyBRL(v) {
//   const n = Number(v ?? 0);
//   return new Intl.NumberFormat("pt-BR", {
//     style: "currency",
//     currency: "BRL",
//   }).format(n);
// }

// export function formatDateBR(d) {
//   try {
//     const date =
//       typeof d === "string" ? new Date(d.replace(/-/g, "/")) : new Date(d);
//     if (Number.isNaN(date.getTime())) return String(d ?? "");
//     const dd = String(date.getDate()).padStart(2, "0");
//     const mm = String(date.getMonth() + 1).padStart(2, "0");
//     const yyyy = date.getFullYear();
//     return `${dd}/${mm}/${yyyy}`;
//   } catch {
//     return String(d ?? "");
//   }
// }

// /* ===============================
//    QUEUE (retry automático)
//    =============================== */

// const QUEUE_KEY = "tg_queue";

// function loadQueue() {
//   try {
//     const raw = localStorage.getItem(QUEUE_KEY);
//     const arr = raw ? JSON.parse(raw) : [];
//     return Array.isArray(arr) ? arr : [];
//   } catch {
//     return [];
//   }
// }

// function saveQueue(arr) {
//   try {
//     localStorage.setItem(QUEUE_KEY, JSON.stringify(arr || []));
//   } catch {}
// }

// async function flushQueue() {
//   const { DEBUG } = env();
//   const q = loadQueue();
//   if (!q.length) return;

//   if (DEBUG) console.info(`[Telegram] Tentando reenviar fila (${q.length})…`);
//   const remaining = [];
//   for (const item of q) {
//     const ok = await postMessage(item);
//     if (!ok) remaining.push(item);
//   }
//   saveQueue(remaining);
//   if (DEBUG) {
//     if (remaining.length) {
//       console.warn(
//         `[Telegram] Fila parcialmente reenviada; restantes: ${remaining.length}`
//       );
//     } else {
//       console.info("[Telegram] Fila reenviada com sucesso.");
//     }
//   }
// }

// /* ===============================
//    POST baixo nível (tenta 2 formas)
//    =============================== */

// async function postForm(payload) {
//   // Forma mais compatível no navegador
//   const body = new URLSearchParams(payload).toString();
//   const resp = await fetch(buildUrl("sendMessage"), {
//     method: "POST",
//     headers: { "Content-Type": "application/x-www-form-urlencoded" },
//     body,
//   });
//   return resp.json();
// }

// async function postJSON(payload) {
//   const resp = await fetch(buildUrl("sendMessage"), {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(payload),
//   });
//   return resp.json();
// }

// async function postMessage({
//   chat_id,
//   text,
//   parse_mode,
//   disable_web_page_preview,
// }) {
//   try {
//     // 1) tenta x-www-form-urlencoded
//     const data1 = await postForm({
//       chat_id,
//       text,
//       parse_mode,
//       disable_web_page_preview,
//     });
//     if (data1?.ok) return true;

//     // 2) fallback JSON
//     const data2 = await postJSON({
//       chat_id,
//       text,
//       parse_mode,
//       disable_web_page_preview,
//     });
//     if (data2?.ok) return true;

//     console.error("[Telegram] Erro API", data1 || data2);
//     return false;
//   } catch (e) {
//     console.error("[Telegram] Falha de rede:", e);
//     return false;
//   }
// }

// /* ===============================
//    GATE / ADMIN ONLY
//    =============================== */

// function gateAllowsSend(force = false) {
//   const { ADMIN_ONLY, ADMIN_EMAIL, DEBUG } = env();
//   if (!ADMIN_ONLY || force) return true;

//   try {
//     const u = getUser?.();
//     const email = String(u?.email || "").toLowerCase();
//     const ok = email === ADMIN_EMAIL;
//     if (!ok && DEBUG) {
//       console.info(
//         "[Telegram] ADMIN_ONLY ativo; supresso para",
//         email || "(sem e-mail)"
//       );
//     }
//     return ok;
//   } catch {
//     return false;
//   }
// }

// /* ===============================
//    API DE ALTO NÍVEL
//    =============================== */

// /**
//  * Envia texto bruto (HTML escapado) ao Telegram.
//  * - Usa fila + retry se falhar.
//  * - Respeita ADMIN_ONLY, a menos que force=true.
//  */
// export async function sendTelegramMessage(text, { force = false } = {}) {
//   const { token, chatId, DEBUG } = env();

//   if (!validEnv()) return false;
//   if (!gateAllowsSend(force)) return false;

//   const payload = {
//     chat_id: chatId,
//     text: escapeHTML(text),
//     parse_mode: "HTML",
//     disable_web_page_preview: true,
//   };

//   if (DEBUG) console.debug("[Telegram] Enviando:", payload);

//   const ok = await postMessage(payload);
//   if (!ok) {
//     // guarda na fila para retry posterior
//     const q = loadQueue();
//     q.push(payload);
//     saveQueue(q);
//     if (DEBUG) console.warn("[Telegram] Mensagem enfileirada para retry.");
//   } else {
//     // se enviou, aproveita e tenta limpar a fila
//     flushQueue();
//   }
//   return ok;
// }

// /**
//  * Envia um “evento” com cabeçalho (emoji + título + ator) e linhas de corpo.
//  */
// export async function sendTelegramEvent({
//   title,
//   emoji = "",
//   lines = [],
//   force = false,
// }) {
//   const u = getUser?.();
//   const actor = getActorName(u);

//   const header = `${emoji ? `${emoji} ` : ""}${escapeHTML(
//     title
//   )} - ${escapeHTML(actor)}`.trim();

//   const body = Array.isArray(lines)
//     ? lines.map((l) => escapeHTML(l)).join("\n")
//     : escapeHTML(String(lines ?? ""));

//   const message = [header, body].filter(Boolean).join("\n");
//   return sendTelegramMessage(message, { force });
// }

// /* ===============================
//    NOTIFICAÇÕES PADRÃO
//    =============================== */

// export async function sendTelegramLoginNotice(userLike) {
//   const name = getActorName(userLike);
//   const when = new Date().toLocaleString("pt-BR");
//   const lines = [
//     `👤 Usuário: ${name}`,
//     userLike?.email ? `Email: ${userLike.email}` : "",
//     `Data/Hora: ${when}`,
//   ].filter(Boolean);

//   return sendTelegramEvent({
//     title: "Login efetuado",
//     emoji: "✅",
//     lines,
//   });
// }

// export async function sendTelegramLogoutNotice(userLike, reason = "Logout") {
//   const name = getActorName(userLike);
//   const when = new Date().toLocaleString("pt-BR");
//   const lines = [
//     `👤 Usuário: ${name}`,
//     userLike?.email ? `Email: ${userLike.email}` : "",
//     `Motivo: ${reason}`,
//     `Data/Hora: ${when}`,
//   ].filter(Boolean);

//   return sendTelegramEvent({
//     title: "Logout",
//     emoji: "🚪",
//     lines,
//   });
// }

// /* ===============================
//    SELF TEST
//    =============================== */

// export async function sendTelegramSelfTest() {
//   const { DEBUG } = env();
//   if (!validEnv()) return false;

//   const ok = await sendTelegramMessage(
//     "🔧 <b>Teste</b>: envio direto funcionando?"
//   );
//   if (!ok && DEBUG) {
//     console.warn(
//       "[Telegram] SelfTest falhou — verifique .env, rede e se o bot tem permissão no chat."
//     );
//   }
//   return ok;
// }

// /* ===============================
//    AUTO: tenta reenviar fila ao carregar o módulo
//    =============================== */
// flushQueue().catch(() => {});

// -------------------------------------------------------------------------


// // src/utils/telegram.js
// import { getUser } from "../auth/auth";
// import { logEvent } from "./logger";

// /* ===============================
//    ENV / CONFIG
//    =============================== */

// function env() {
//   const token = String(import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "").trim();
//   const chatId = String(import.meta.env.VITE_TELEGRAM_CHAT_ID || "").trim();
//   const ADMIN_ONLY =
//     String(import.meta.env.VITE_TG_ADMIN_ONLY || "").toLowerCase() === "true";
//   const ADMIN_EMAIL = String(
//     import.meta.env.VITE_TG_ADMIN_EMAIL || "jsa@jsa.com"
//   ).toLowerCase();
//   const DEBUG =
//     String(import.meta.env.VITE_TG_DEBUG || "").toLowerCase() === "true";

//   return { token, chatId, ADMIN_ONLY, ADMIN_EMAIL, DEBUG };
// }

// function buildUrl(method) {
//   const { token } = env();
//   return `https://api.telegram.org/bot${token}/${method}`;
// }

// function validEnv() {
//   const { token, chatId, DEBUG } = env();
//   const ok = Boolean(token) && Boolean(chatId);
//   if (!ok && DEBUG) {
//     console.warn(
//       "[Telegram] Variáveis ausentes:",
//       { token: !!token, chatId: !!chatId },
//       "Defina VITE_TELEGRAM_BOT_TOKEN e VITE_TELEGRAM_CHAT_ID."
//     );
//   }
//   return ok;
// }

// /* ===============================
//    HELPERS
//    =============================== */

// function escapeHTML(s) {
//   return String(s ?? "")
//     .replace(/&/g, "&amp;")
//     .replace(/</g, "&lt;")
//     .replace(/>/g, "&gt;");
// }

// function getActorName(u) {
//   const name = u?.name || u?.nome || "";
//   const email = u?.email || "";
//   return (name || email || "Usuário não identificado").trim();
// }

// export function formatCurrencyBRL(v) {
//   const n = Number(v ?? 0);
//   return new Intl.NumberFormat("pt-BR", {
//     style: "currency",
//     currency: "BRL",
//   }).format(n);
// }

// export function formatDateBR(d) {
//   try {
//     const date =
//       typeof d === "string" ? new Date(d.replace(/-/g, "/")) : new Date(d);
//     if (Number.isNaN(date.getTime())) return String(d ?? "");
//     const dd = String(date.getDate()).padStart(2, "0");
//     const mm = String(date.getMonth() + 1).padStart(2, "0");
//     const yyyy = date.getFullYear();
//     return `${dd}/${mm}/${yyyy}`;
//   } catch {
//     return String(d ?? "");
//   }
// }

// /* ===============================
//    QUEUE (retry automático)
//    =============================== */

// const QUEUE_KEY = "tg_queue";

// function loadQueue() {
//   try {
//     const raw = localStorage.getItem(QUEUE_KEY);
//     const arr = raw ? JSON.parse(raw) : [];
//     return Array.isArray(arr) ? arr : [];
//   } catch {
//     return [];
//   }
// }

// function saveQueue(arr) {
//   try {
//     localStorage.setItem(QUEUE_KEY, JSON.stringify(arr || []));
//   } catch {}
// }

// async function flushQueue() {
//   const { DEBUG } = env();
//   const q = loadQueue();
//   if (!q.length) return;

//   if (DEBUG) console.info(`[Telegram] Tentando reenviar fila (${q.length})…`);
//   const remaining = [];
//   for (const item of q) {
//     const ok = await postMessage(item);
//     if (!ok) remaining.push(item);
//   }
//   saveQueue(remaining);
//   if (DEBUG) {
//     if (remaining.length) {
//       console.warn(
//         `[Telegram] Fila parcialmente reenviada; restantes: ${remaining.length}`
//       );
//     } else {
//       console.info("[Telegram] Fila reenviada com sucesso.");
//     }
//   }
// }

// /* ===============================
//    POST baixo nível (tenta 2 formas)
//    =============================== */

// async function postForm(payload) {
//   const body = new URLSearchParams(payload).toString();
//   const resp = await fetch(buildUrl("sendMessage"), {
//     method: "POST",
//     headers: { "Content-Type": "application/x-www-form-urlencoded" },
//     body,
//   });
//   return resp.json();
// }

// async function postJSON(payload) {
//   const resp = await fetch(buildUrl("sendMessage"), {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify(payload),
//   });
//   return resp.json();
// }

// async function postMessage({
//   chat_id,
//   text,
//   parse_mode,
//   disable_web_page_preview,
// }) {
//   try {
//     const data1 = await postForm({
//       chat_id,
//       text,
//       parse_mode,
//       disable_web_page_preview,
//     });
//     if (data1?.ok) return true;

//     const data2 = await postJSON({
//       chat_id,
//       text,
//       parse_mode,
//       disable_web_page_preview,
//     });
//     if (data2?.ok) return true;

//     console.error("[Telegram] Erro API", data1 || data2);
//     return false;
//   } catch (e) {
//     console.error("[Telegram] Falha de rede:", e);
//     return false;
//   }
// }

// /* ===============================
//    GATE / ADMIN ONLY
//    =============================== */

// function gateAllowsSend(force = false) {
//   const { ADMIN_ONLY, ADMIN_EMAIL, DEBUG } = env();
//   if (!ADMIN_ONLY || force) return true;

//   try {
//     const u = getUser?.();
//     const email = String(u?.email || "").toLowerCase();
//     const ok = email === ADMIN_EMAIL;
//     if (!ok && DEBUG) {
//       console.info(
//         "[Telegram] ADMIN_ONLY ativo; supresso para",
//         email || "(sem e-mail)"
//       );
//     }
//     return ok;
//   } catch {
//     return false;
//   }
// }

// /* ===============================
//    API DE ALTO NÍVEL
//    =============================== */

// export async function sendTelegramMessage(text, { force = false } = {}) {
//   const { chatId, DEBUG } = env();

//   if (!validEnv()) return false;
//   if (!gateAllowsSend(force)) return false;

//   const payload = {
//     chat_id: chatId,
//     text: escapeHTML(text),
//     parse_mode: "HTML",
//     disable_web_page_preview: true,
//   };

//   if (DEBUG) console.debug("[Telegram] Enviando:", payload);

//   const ok = await postMessage(payload);
//   if (!ok) {
//     const q = loadQueue();
//     q.push(payload);
//     saveQueue(q);
//     if (DEBUG) console.warn("[Telegram] Mensagem enfileirada para retry.");
//   } else {
//     flushQueue();
//   }
//   return ok;
// }

// /**
//  * Envia evento ao Telegram E REGISTRA AUTOMATICAMENTE NOS LOGS DO SISTEMA
//  */
// export async function sendTelegramEvent({
//   title,
//   emoji = "",
//   lines = [],
//   screen = "Sistema",
//   force = false,
// }) {
//   const u = getUser?.();
//   const actor = getActorName(u);

//   // 1. GRAVA NO LOG DO SISTEMA LOCAL
//   try {
//     const linesArr = Array.isArray(lines) ? lines : [lines];
//     logEvent({
//       type: "telegram",
//       title: `${emoji ? `${emoji} ` : ""}${title}`,
//       screen: screen,
//       details: linesArr.reduce((acc, curr, idx) => {
//         acc[`Item ${idx + 1}`] = curr;
//         return acc;
//       }, {}),
//     });
//   } catch (e) {
//     console.error("[Telegram] Erro ao gravar log automático:", e);
//   }

//   // 2. MONTA A MENSAGEM E ENVIA AO BOT
//   const header = `${emoji ? `${emoji} ` : ""}${escapeHTML(
//     title
//   )} - ${escapeHTML(actor)}`.trim();

//   const body = Array.isArray(lines)
//     ? lines.map((l) => escapeHTML(l)).join("\n")
//     : escapeHTML(String(lines ?? ""));

//   const message = [header, body].filter(Boolean).join("\n");
//   return sendTelegramMessage(message, { force });
// }

// /* ===============================
//    NOTIFICAÇÕES PADRÃO
//    =============================== */

// export async function sendTelegramLoginNotice(userLike) {
//   const name = getActorName(userLike);
//   const when = new Date().toLocaleString("pt-BR");
//   const lines = [
//     `👤 Usuário: ${name}`,
//     userLike?.email ? `Email: ${userLike.email}` : "",
//     `Data/Hora: ${when}`,
//   ].filter(Boolean);

//   return sendTelegramEvent({
//     title: "Login efetuado",
//     emoji: "✅",
//     screen: "Login",
//     lines,
//   });
// }

// export async function sendTelegramLogoutNotice(userLike, reason = "Logout") {
//   const name = getActorName(userLike);
//   const when = new Date().toLocaleString("pt-BR");
//   const lines = [
//     `👤 Usuário: ${name}`,
//     userLike?.email ? `Email: ${userLike.email}` : "",
//     `Motivo: ${reason}`,
//     `Data/Hora: ${when}`,
//   ].filter(Boolean);

//   return sendTelegramEvent({
//     title: "Logout",
//     emoji: "🚪",
//     screen: "Navbar",
//     lines,
//   });
// }

// /* ===============================
//    SELF TEST
//    =============================== */

// export async function sendTelegramSelfTest() {
//   const { DEBUG } = env();
//   if (!validEnv()) return false;

//   const ok = await sendTelegramMessage(
//     "🔧 <b>Teste</b>: envio direto funcionando?"
//   );
//   if (!ok && DEBUG) {
//     console.warn(
//       "[Telegram] SelfTest falhou — verifique .env, rede e se o bot tem permissão no chat."
//     );
//   }
//   return ok;
// }

// flushQueue().catch(() => {});



// src/utils/telegram.js
import { getUser } from "../auth/auth";
import { logEvent } from "./logger";

/* ===============================
   ENV / CONFIG
   =============================== */

function env() {
  const token = String(import.meta.env.VITE_TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = String(import.meta.env.VITE_TELEGRAM_CHAT_ID || "").trim();
  const ADMIN_ONLY =
    String(import.meta.env.VITE_TG_ADMIN_ONLY || "").toLowerCase() === "true";
  const ADMIN_EMAIL = String(
    import.meta.env.VITE_TG_ADMIN_EMAIL || "jsa@jsa.com"
  ).toLowerCase();
  const DEBUG =
    String(import.meta.env.VITE_TG_DEBUG || "").toLowerCase() === "true";

  return { token, chatId, ADMIN_ONLY, ADMIN_EMAIL, DEBUG };
}

function buildUrl(method) {
  const { token } = env();
  return `https://api.telegram.org/bot${token}/${method}`;
}

function validEnv() {
  const { token, chatId, DEBUG } = env();
  const ok = Boolean(token) && Boolean(chatId);
  if (!ok && DEBUG) {
    console.warn(
      "[Telegram] Variáveis ausentes:",
      { token: !!token, chatId: !!chatId },
      "Defina VITE_TELEGRAM_BOT_TOKEN e VITE_TELEGRAM_CHAT_ID."
    );
  }
  return ok;
}

/* ===============================
   HELPERS
   =============================== */

function escapeHTML(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function getActorName(u) {
  const name = u?.name || u?.nome || u?.displayName || "";
  const email = u?.email || "";
  return (name || email || "Usuário do Sistema").trim();
}

export function formatCurrencyBRL(v) {
  const n = Number(v ?? 0);
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(n);
}

export function formatDateBR(d) {
  try {
    const date =
      typeof d === "string" ? new Date(d.replace(/-/g, "/")) : new Date(d);
    if (Number.isNaN(date.getTime())) return String(d ?? "");
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return String(d ?? "");
  }
}

/* ===============================
   QUEUE (retry automático)
   =============================== */

const QUEUE_KEY = "tg_queue";

function loadQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function saveQueue(arr) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(arr || []));
  } catch {}
}

async function flushQueue() {
  const { DEBUG } = env();
  const q = loadQueue();
  if (!q.length) return;

  if (DEBUG) console.info(`[Telegram] Tentando reenviar fila (${q.length})…`);
  const remaining = [];
  for (const item of q) {
    const ok = await postMessage(item);
    if (!ok) remaining.push(item);
  }
  saveQueue(remaining);
  if (DEBUG) {
    if (remaining.length) {
      console.warn(
        `[Telegram] Fila parcialmente reenviada; restantes: ${remaining.length}`
      );
    } else {
      console.info("[Telegram] Fila reenviada com sucesso.");
    }
  }
}

/* ===============================
   POST baixo nível
   =============================== */

async function postForm(payload) {
  const body = new URLSearchParams(payload).toString();
  const resp = await fetch(buildUrl("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  return resp.json();
}

async function postJSON(payload) {
  const resp = await fetch(buildUrl("sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return resp.json();
}

async function postMessage({
  chat_id,
  text,
  parse_mode,
  disable_web_page_preview,
}) {
  try {
    const data1 = await postForm({
      chat_id,
      text,
      parse_mode,
      disable_web_page_preview,
    });
    if (data1?.ok) return true;

    const data2 = await postJSON({
      chat_id,
      text,
      parse_mode,
      disable_web_page_preview,
    });
    if (data2?.ok) return true;

    console.error("[Telegram] Erro API", data1 || data2);
    return false;
  } catch (e) {
    console.error("[Telegram] Falha de rede:", e);
    return false;
  }
}

/* ===============================
   GATE / ADMIN ONLY
   =============================== */

function gateAllowsSend(force = false) {
  const { ADMIN_ONLY, ADMIN_EMAIL, DEBUG } = env();
  if (!ADMIN_ONLY || force) return true;

  try {
    const u = getUser?.();
    const email = String(u?.email || "").toLowerCase();
    const ok = email === ADMIN_EMAIL;
    if (!ok && DEBUG) {
      console.info(
        "[Telegram] ADMIN_ONLY ativo; supresso para",
        email || "(sem e-mail)"
      );
    }
    return ok;
  } catch {
    return false;
  }
}

/* ===============================
   API DE ALTO NÍVEL
   =============================== */

export async function sendTelegramMessage(text, { force = false } = {}) {
  const { chatId, DEBUG } = env();

  if (!validEnv()) return false;
  if (!gateAllowsSend(force)) return false;

  const payload = {
    chat_id: chatId,
    text: escapeHTML(text),
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };

  if (DEBUG) console.debug("[Telegram] Enviando:", payload);

  const ok = await postMessage(payload);
  if (!ok) {
    const q = loadQueue();
    q.push(payload);
    saveQueue(q);
    if (DEBUG) console.warn("[Telegram] Mensagem enfileirada para retry.");
  } else {
    flushQueue();
  }
  return ok;
}

/**
 * Envia evento ao Telegram E REGISTRA AUTOMATICAMENTE NOS LOGS DO SISTEMA
 */
export async function sendTelegramEvent(params) {
  let title = "Notificação";
  let emoji = "";
  let lines = [];
  let screen = "Sistema";
  let force = false;

  if (typeof params === "string") {
    const rawLines = params.split("\n").filter((l) => l.trim().length > 0);
    const firstLine = rawLines[0] || "Notificação";
    
    // Tenta capturar emoji no início da primeira linha
    const matchEmoji = firstLine.match(/^([\uD800-\uDBFF][\uDC00-\uDFFF]|[\u2600-\u27BF]|\u2B50|\u2705|\u274C|\u26A0\uFE0F|\uD83D[\uDC00-\uDFFF]|\uD83C[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF])/);
    if (matchEmoji) {
      emoji = matchEmoji[0];
      title = firstLine.replace(emoji, "").replace(/^[\s*_-]+/, "").replace(/[\s*_-]+$/, "").trim();
    } else {
      title = firstLine.replace(/^[\s*_-]+/, "").replace(/[\s*_-]+$/, "").trim();
    }
    lines = rawLines.slice(1);
  } else if (params && typeof params === "object") {
    title = params.title || "Notificação";
    emoji = params.emoji || "";
    lines = params.lines || [];
    screen = params.screen || "Sistema";
    force = Boolean(params.force);
  }

  const u = getUser?.();
  const actor = getActorName(u);

  // 1. GRAVA NO LOG DO SISTEMA LOCAL
  try {
    const linesArr = Array.isArray(lines) ? lines : [lines];
    logEvent({
      type: "telegram",
      title: `${emoji ? `${emoji} ` : ""}${title}`,
      screen: screen,
      user: u,
      details: linesArr.reduce((acc, curr, idx) => {
        acc[`Item ${idx + 1}`] = curr;
        return acc;
      }, {}),
    });
  } catch (e) {
    console.error("[Telegram] Erro ao gravar log automático:", e);
  }

  // 2. MONTA A MENSAGEM E ENVIA AO BOT
  const header = `${emoji ? `${emoji} ` : ""}${escapeHTML(
    title
  )} - ${escapeHTML(actor)}`.trim();

  const body = Array.isArray(lines)
    ? lines.map((l) => escapeHTML(l)).join("\n")
    : escapeHTML(String(lines ?? ""));

  const message = [header, body].filter(Boolean).join("\n");
  return sendTelegramMessage(message, { force });
}

/* ===============================
   NOTIFICAÇÕES PADRÃO
   =============================== */

export async function sendTelegramLoginNotice(userLike) {
  const name = getActorName(userLike);
  const when = new Date().toLocaleString("pt-BR");
  const lines = [
    `👤 Usuário: ${name}`,
    userLike?.email ? `Email: ${userLike.email}` : "",
    `Data/Hora: ${when}`,
  ].filter(Boolean);

  return sendTelegramEvent({
    title: "Login efetuado",
    emoji: "✅",
    screen: "Login",
    lines,
  });
}

export async function sendTelegramLogoutNotice(userLike, reason = "Logout") {
  const name = getActorName(userLike);
  const when = new Date().toLocaleString("pt-BR");
  const lines = [
    `👤 Usuário: ${name}`,
    userLike?.email ? `Email: ${userLike.email}` : "",
    `Motivo: ${reason}`,
    `Data/Hora: ${when}`,
  ].filter(Boolean);

  return sendTelegramEvent({
    title: "Logout",
    emoji: "🚪",
    screen: "Navbar",
    lines,
  });
}

/* ===============================
   SELF TEST
   =============================== */

export async function sendTelegramSelfTest() {
  const { DEBUG } = env();
  if (!validEnv()) return false;

  const ok = await sendTelegramMessage(
    "🔧 <b>Teste</b>: envio direto funcionando?"
  );
  if (!ok && DEBUG) {
    console.warn(
      "[Telegram] SelfTest falhou — verifique .env, rede e se o bot tem permissão no chat."
    );
  }
  return ok;
}

flushQueue().catch(() => {});