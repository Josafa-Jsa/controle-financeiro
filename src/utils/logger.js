// src/utils/logger.js
import { getUser } from "../auth/auth";
import { api } from "../api/client";

const LOG_KEY = "app_logs";
const MAX_LOGS = 5000; // limite duro
const TRIM_TO = 4000; // quando passar do limite, aparar para isso

// Sincroniza logs do backend
export async function sincronizarLogsDoServidor() {
  try {
    const resp = await api.get("/logs");
    if (Array.isArray(resp.data)) {
      _write(resp.data);
      return resp.data;
    }
  } catch (e) {
    // Modo offline resiliente
  }
  return _read();
}

/* ================= Storage ================= */
function _read() {
  try {
    const raw = localStorage.getItem(LOG_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function _write(list) {
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Erro ao escrever no localStorage:", e);
  }
}

function _id() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

/* =============== Sanitização & Serialização =============== */
const SENSITIVE_KEYS = [
  "password",
  "senha",
  "pass",
  "newpassword",
  "oldpassword",
  "token",
  "accesstoken",
  "refreshtoken",
  "authorization",
  "auth",
  "apikey",
  "api_key",
  "secret",
];

function _isSensitiveKey(k) {
  const s = String(k || "")
    .toLowerCase()
    .replace(/[\s_-]/g, "");
  return SENSITIVE_KEYS.includes(s);
}

/** Remove/mascara dados sensíveis recursivamente e evita loops. */
function _deepSanitize(obj, seen = new WeakSet()) {
  if (obj === null || typeof obj !== "object") return obj;
  if (seen.has(obj)) return "[Circular]";
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((v) => _deepSanitize(v, seen));
  }

  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (_isSensitiveKey(k)) {
      out[k] = "***";
    } else {
      out[k] = _deepSanitize(v, seen);
    }
  }
  return out;
}

/** Transforma valores não serializáveis e Error em plain object. */
function _safeSerialize(details) {
  const seen = new WeakSet();
  try {
    const sanitized = _deepSanitize(details);
    const json = JSON.stringify(sanitized, (key, val) => {
      if (val instanceof Error) {
        const e = {};
        Object.getOwnPropertyNames(val).forEach((k) => (e[k] = val[k]));
        return e;
      }
      if (typeof val === "bigint") return val.toString();
      if (typeof val === "function" || typeof val === "symbol")
        return undefined;
      if (typeof val === "object" && val !== null) {
        if (seen.has(val)) return "[Circular]";
        seen.add(val);
      }
      return val;
    });
    return JSON.parse(json);
  } catch {
    try {
      return { _raw: String(details) };
    } catch {
      return { _raw: "[Unserializable]" };
    }
  }
}

/* ================= HELPER DE USUÁRIO ================= */
function _resolveUserData(providedUser = null) {
  const u = providedUser || getUser?.() || {};

  const name = (
    u?.name ||
    u?.nome ||
    u?.displayName ||
    u?.user_metadata?.full_name ||
    u?.user_metadata?.name ||
    (u?.email ? u.email.split("@")[0] : "")
  ).trim();

  const email = (u?.email || u?.user_email || "").trim();

  return {
    id: u?.id || u?.uid || null,
    name: name || "Usuário do Sistema",
    email: email || "sem_email@sistema.com",
  };
}

/* ================= API DE LOGS ================= */

/**
 * Registra um evento no log.
 * @param {Object} p
 * @param {string} p.type     - Categoria/Módulo (ex: "Atendimento", "Contas", "Simulador", "Notas Fiscais", "O.S", "Usuários", "Sistema")
 * @param {string} p.title    - Ação curta executada (ex: "Criar Chamado", "Excluir Nota")
 * @param {string} p.screen   - Nome da tela onde ocorreu a ação
 * @param {Object|string} p.details - Dados detalhados da ação
 * @param {Object} p.user     - Usuário customizado (opcional)
 */
export function logEvent({
  type = "Sistema",
  title = "Ação realizada",
  screen = "Sistema",
  details = {},
  user = null,
}) {
  const uData = _resolveUserData(user);
  const now = new Date().toISOString();

  const item = {
    id: _id(),
    ts: now,
    formattedDate: new Date().toLocaleString("pt-BR"),
    type,
    title,
    screen,
    details: typeof details === "string" ? details : _safeSerialize(details),
    userId: uData.id,
    userName: uData.name,
    userEmail: uData.email,
  };

  const list = _read();
  list.unshift(item); // Adiciona o mais recente no topo

  // Poda se ultrapassar o limite
  if (list.length > MAX_LOGS) {
    const excess = list.length - TRIM_TO;
    if (excess > 0) list.splice(TRIM_TO, excess);
  }

  _write(list);

  // Persiste no banco de dados via API
  api.post("/logs", item).catch((e) =>
    console.warn("Aviso ao persistir log no banco via API:", e.message)
  );

  return item;
}

/** Retorna todos os logs em ordem decrescente. */
export function getLogs() {
  const list = _read();
  return list.sort((a, b) => new Date(b.ts) - new Date(a.ts));
}

/** Filtra logs por Tela / Módulo especifico. */
export function getLogsByScreen(screenName) {
  const search = String(screenName || "").toLowerCase();
  return getLogs().filter(
    (l) =>
      String(l.screen || "").toLowerCase() === search ||
      String(l.type || "").toLowerCase() === search
  );
}

/** Limpa todos os logs do localStorage. */
export function clearLogs() {
  _write([]);
}

/** Agrupa por usuário (email). */
export function groupByUser(logs) {
  return logs.reduce((acc, l) => {
    const k = l.userEmail || "sem_email@sistema.com";
    (acc[k] ||= []).push(l);
    return acc;
  }, {});
}

/** Filtros auxiliares */
export function getLogsForUser(email) {
  return getLogs().filter(
    (l) =>
      (l.userEmail || "").toLowerCase() === String(email || "").toLowerCase()
  );
}

export function getLogsByType(type) {
  const t = String(type || "").toLowerCase();
  return getLogs().filter((l) => String(l.type || "").toLowerCase() === t);
}

/** Remove logs mais antigos que N dias. */
export function purgeLogsOlderThan(days = 90) {
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const list = _read().filter((l) => {
    const t = new Date(l.ts).getTime();
    return Number.isFinite(t) && t >= cutoff;
  });
  _write(list);
  return list.length;
}

/* ================= EXPORTAR PARA ARQUIVO TXT ================= */

/**
 * Gera e realiza o download do arquivo .txt com os logs de uma tela específica.
 * @param {string} screenName - Nome do módulo/tela (ex: "Atendimento", "Contas")
 */
export function exportLogsToTXT(screenName) {
  const screenLogs = screenName ? getLogsByScreen(screenName) : getLogs();

  if (screenLogs.length === 0) {
    alert(`Não há registros de log para a tela: ${screenName || "Geral"}`);
    return;
  }

  let content = `========================================================\n`;
  content += `JSA TI - HISTÓRICO DE LOGS DO SISTEMA\n`;
  content += `TELA / MÓDULO: ${String(screenName || "GERAL").toUpperCase()}\n`;
  content += `DATA DO GERAMENTO: ${new Date().toLocaleString("pt-BR")}\n`;
  content += `========================================================\n\n`;

  screenLogs.forEach((l) => {
    const strDetails =
      typeof l.details === "object" ? JSON.stringify(l.details) : l.details;

    content += `[${l.formattedDate || l.ts}] | USUÁRIO: ${l.userName} (${l.userEmail})\n`;
    content += `AÇÃO: ${l.title} | TELA: ${l.screen}\n`;
    content += `DETALHES: ${strDetails}\n`;
    content += `--------------------------------------------------------\n`;
  });

  const fileName = `Log_${String(screenName || "Geral").replace(/\s+/g, "_")}.txt`;
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  link.click();
}