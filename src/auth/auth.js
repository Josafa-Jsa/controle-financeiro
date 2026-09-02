// src/auth/auth.js
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { sendTelegramEvent } from "../utils/telegram";
import { api } from "../api/client";

/* ==================== Constantes & Roles ==================== */
const USER_KEY = "auth_user";
const EXPIRES_KEY = "auth_expires_at";
const USERS_KEY = "auth_users";
const MUST_CHANGE_KEY = "auth_must_change_pass";
const DURATION_MS = 8 * 60 * 60 * 1000; // 8h

export const ROLES = {
  ADMIN: "ADMIN",
  USER: "USER",
};

/* ==================== Usuários Padrão ==================== */
const DEFAULT_USERS = [];

/* ==================== Storage helpers ==================== */
function readUsers() {
  try {
    const rawAuth = localStorage.getItem(USERS_KEY);
    const rawUsers = localStorage.getItem("users");
    const listAuth = rawAuth ? JSON.parse(rawAuth) : [];
    const listUsers = rawUsers ? JSON.parse(rawUsers) : [];

    const map = new Map();
    [...listAuth, ...listUsers].forEach((u) => {
      if (u && u.email) {
        const key = String(u.email).toLowerCase().trim();
        if (key !== "jsa@jsa.com" && key !== "jsa.admin@gmail.com") {
          map.set(key, { ...(map.get(key) || {}), ...u });
        }
      }
    });

    return Array.from(map.values());
  } catch {
    return [];
  }
}

function writeUsers(list) {
  try {
    localStorage.setItem(USERS_KEY, JSON.stringify(list));
    localStorage.setItem("users", JSON.stringify(list));
  } catch {}
}

/* ==================== Sessão ==================== */
export function getUser() {
  try {
    const raw =
      localStorage.getItem(USER_KEY) ||
      localStorage.getItem("user") ||
      localStorage.getItem("currentUser");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getCurrentUser() {
  return getUser();
}

export function setUser(u) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(u));
    localStorage.setItem("user", JSON.stringify(u));
    localStorage.setItem("currentUser", JSON.stringify(u));
  } catch {}
}

export function clearUser() {
  try {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(MUST_CHANGE_KEY);
  } catch {}
}

export function getExpiry() {
  const ts = Number(localStorage.getItem(EXPIRES_KEY));
  return Number.isFinite(ts) ? ts : 0;
}

export function setExpiry(ts) {
  try {
    localStorage.setItem(EXPIRES_KEY, String(ts));
  } catch {}
}

export function isLoggedIn() {
  const u = getUser();
  const exp = getExpiry();
  return !!u && exp > Date.now();
}

export function isAdmin(customUser) {
  const u = customUser || getUser();
  if (!u) return false;
  const email = String(u.email || "").toLowerCase().trim();
  const name = String(u.name || u.nome || "").trim();
  const role = String(u.role || "").toUpperCase();

  return (
    role === "ADMIN" ||
    email === "jsa@jsa.com" ||
    email === "josafa.santos.jss@gmail.com" ||
    name === "JSA Admin"
  );
}

/* Flag de troca obrigatória de senha */
export function getMustChangePassword() {
  return localStorage.getItem(MUST_CHANGE_KEY) === "true";
}

export function setMustChangePassword(val) {
  if (val) {
    localStorage.setItem(MUST_CHANGE_KEY, "true");
  } else {
    localStorage.removeItem(MUST_CHANGE_KEY);
  }
}

/* ==================== Gestão de Acessos & Permissões ==================== */
export function updateUserRole(userIdOrEmail, newRole, optionalEmail) {
  const users = readUsers();
  const searchId = String(userIdOrEmail || "").trim().toLowerCase();
  const searchEmail = String(optionalEmail || "").trim().toLowerCase();

  const idx = users.findIndex(
    (u) =>
      String(u.id).toLowerCase() === searchId ||
      String(u.email || "").toLowerCase() === searchId ||
      (searchEmail && String(u.email || "").toLowerCase() === searchEmail)
  );

  if (idx !== -1) {
    users[idx] = {
      ...users[idx],
      role: newRole,
    };
    writeUsers(users);
  }

  const currentUser = getUser();
  if (
    currentUser &&
    (String(currentUser.id) === searchId ||
      String(currentUser.email || "").toLowerCase() === searchId ||
      (searchEmail && String(currentUser.email || "").toLowerCase() === searchEmail))
  ) {
    setUser({ ...currentUser, role: newRole });
  }

  return { ok: true };
}

export function updateUserPermissions(userIdOrEmail, newPermissions, optionalEmail) {
  const users = readUsers();
  const searchId = String(userIdOrEmail || "").trim().toLowerCase();
  const searchEmail = String(optionalEmail || "").trim().toLowerCase();
  const targetEmail = searchEmail || (searchId.includes("@") ? searchId : null);

  const idx = users.findIndex(
    (u) =>
      String(u.id).toLowerCase() === searchId ||
      String(u.email || "").toLowerCase() === searchId ||
      (searchEmail && String(u.email || "").toLowerCase() === searchEmail)
  );

  if (idx !== -1) {
    users[idx] = {
      ...users[idx],
      permissions: newPermissions,
    };
  } else if (targetEmail) {
    users.push({
      id: !isNaN(Number(searchId)) ? Number(searchId) : Date.now(),
      email: targetEmail,
      name: targetEmail.split("@")[0],
      role: "USER",
      permissions: newPermissions,
    });
  }
  writeUsers(users);

  const currentUser = getUser();
  if (
    currentUser &&
    (String(currentUser.id) === searchId ||
      String(currentUser.email || "").toLowerCase() === searchId ||
      (targetEmail && String(currentUser.email || "").toLowerCase() === targetEmail))
  ) {
    setUser({ ...currentUser, permissions: newPermissions });
  }

  // Notifica o evento globalmente para abas e componentes locais
  if (targetEmail) {
    try {
      localStorage.setItem(
        "permissoes_alteradas_evento",
        JSON.stringify({
          email: targetEmail,
          permissions: newPermissions,
          timestamp: Date.now(),
        })
      );
    } catch {}

    window.dispatchEvent(
      new CustomEvent("permissoes_alteradas_evento", {
        detail: { email: targetEmail, permissions: newPermissions },
      })
    );
  }

  return { ok: true };
}

/* ==================== Notificações Telegram ==================== */
async function notifyLogin(u) {
  try {
    const users = readUsers();
    await sendTelegramEvent({
      title: "Login realizado",
      emoji: "🔐",
      lines: [
        `Usuário: ${u?.name || u?.email || "desconhecido"}`,
        `Email: ${u?.email || "-"}`,
        `Perfil: ${u?.role || ROLES.USER}`,
        `Total de cadastrados: ${users.length}`,
        `Expira em: 4h`,
        `Data: ${new Date().toLocaleString("pt-BR")}`,
      ],
    });
  } catch {}
}

async function notifyLogout(u, reason) {
  try {
    await sendTelegramEvent({
      title: "Logout",
      emoji: "🚪",
      lines: [
        `Usuário: ${u?.name || u?.email || "desconhecido"}`,
        `Motivo: ${reason || "-"}`,
        `Data: ${new Date().toLocaleString("pt-BR")}`,
      ],
    });
  } catch {}
}

/* ==================== Fluxo de login/logout ==================== */
export async function login(user) {
  const now = Date.now();
  const exp = now + DURATION_MS;
  setUser(user);
  setExpiry(exp);
  const emailKey = String(user?.email || "").toLowerCase().trim();
  if (emailKey) {
    try {
      localStorage.setItem(
        `user_presence_${emailKey}`,
        JSON.stringify({ email: user?.email, name: user?.name, lastSeen: Date.now(), isOnline: true })
      );
    } catch {}
  }
  api.post("/auth/heartbeat", { email: user?.email, userId: user?.id, name: user?.name }).catch(() => {});
  try {
    localStorage.setItem(
      "user_presence_event",
      JSON.stringify({ type: "login", email: user?.email, name: user?.name, ts: Date.now() })
    );
  } catch {}
  await notifyLogin(user);
}

export async function logout(reason = "User logout") {
  const u = getUser();
  const emailKey = String(u?.email || "").toLowerCase().trim();
  if (emailKey) {
    try {
      localStorage.setItem(
        `user_presence_${emailKey}`,
        JSON.stringify({ email: u?.email, name: u?.name, lastSeen: Date.now(), isOnline: false })
      );
    } catch {}
  }
  if (u?.email || u?.id) {
    api.post("/auth/logout", { email: u.email, userId: u.id }).catch(() => {});
  }
  try {
    localStorage.setItem(
      "user_presence_event",
      JSON.stringify({ type: "logout", email: u?.email, name: u?.name, ts: Date.now() })
    );
  } catch {}
  try {
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(EXPIRES_KEY);
    localStorage.removeItem(MUST_CHANGE_KEY);
  } catch {}
  await notifyLogout(u, reason);

  try {
    if (typeof window !== "undefined") window.location.reload();
  } catch {}
}

/* ==================== Validação ESTRITA de Login ==================== */
export async function validateLogin(email, password) {
  const users = readUsers();
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const inputPassword = String(password || "").trim();

  const idx = users.findIndex((u) => String(u.email).toLowerCase() === normalizedEmail);

  if (idx === -1) {
    return { ok: false, error: "Usuário não encontrado." };
  }

  const found = users[idx];

  if (String(found.password) !== inputPassword) {
    return { ok: false, error: "Senha incorreta!" };
  }

  const dataFormatada = new Date().toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  users[idx] = {
    ...found,
    lastSeen: dataFormatada,
  };
  writeUsers(users);

  const loggedUser = {
    id: found.id,
    name: found.name,
    email: found.email,
    password: found.password,
    role: found.role || ROLES.USER,
    lastSeen: dataFormatada,
  };

  await login(loggedUser);

  if (found.mustChangePassword) {
    setMustChangePassword(true);
    return { ok: true, user: loggedUser, mustChangePassword: true };
  }

  setMustChangePassword(false);
  return { ok: true, user: loggedUser, mustChangePassword: false };
}

/* ==================== Troca e Reset de Senha ==================== */

export function updateUserPassword(userIdOrEmail, newPassword, optionalEmail) {
  const users = readUsers();
  const searchId = String(userIdOrEmail || "").trim().toLowerCase();
  const searchEmail = String(optionalEmail || "").trim().toLowerCase();

  const idx = users.findIndex(
    (u) =>
      String(u.id).toLowerCase() === searchId ||
      String(u.email || "").toLowerCase() === searchId ||
      (searchEmail && String(u.email || "").toLowerCase() === searchEmail)
  );

  if (idx !== -1) {
    users[idx] = {
      ...users[idx],
      password: String(newPassword || ""),
      mustChangePassword: false,
    };
    writeUsers(users);
  }

  const targetEmail = searchEmail || (idx !== -1 ? users[idx].email : (searchId.includes("@") ? searchId : null));
  if (targetEmail) {
    dispararEventoLogout(targetEmail);
  }

  return { ok: true };
}

export function updatePassword(email, newPassword) {
  return updateUserPassword(email, newPassword, email);
}

export function resetPasswordRandom(email) {
  const users = readUsers();
  const normalizedEmail = String(email || "").toLowerCase().trim();
  const idx = users.findIndex((u) => String(u.email || "").toLowerCase() === normalizedEmail);

  const newPass = Math.random().toString(36).slice(2, 10);

  if (idx !== -1) {
    users[idx] = {
      ...users[idx],
      password: newPass,
      mustChangePassword: true,
    };
    writeUsers(users);
  }

  dispararEventoLogout(normalizedEmail);
  return { ok: true, newPassword: newPass };
}

/* Dispara evento e trata logout local imediato caso seja o próprio usuário logado */
function dispararEventoLogout(emailAlvo) {
  const currentUser = getUser();
  
  if (currentUser && currentUser.email?.toLowerCase() === emailAlvo.toLowerCase()) {
    toast.warn("Você será direcionado para tela de login!", { autoClose: 3000 });
    setTimeout(() => {
      logout("Senha alterada pelo sistema");
    }, 3000);
  } else {
    localStorage.setItem(
      "senha_alterada_evento",
      JSON.stringify({
        email: emailAlvo,
        timestamp: Date.now(),
      })
    );
  }
}

export function listUsers() {
  if (!isAdmin()) return [];

  const users = readUsers();
  const currentUser = getUser();
  const exp = getExpiry();
  const isSessionActive = !!currentUser && exp > Date.now();

  // Retorna a lista calculando se o usuário está online no momento
  return users.map((u) => {
    const isThisUserLoggedIn =
      isSessionActive && u.email.toLowerCase() === currentUser.email.toLowerCase();

    return {
      ...u,
      isOnline: isThisUserLoggedIn,
      lastSeen: isThisUserLoggedIn ? "Ativo agora" : u.lastSeen || "Sem registros de acesso",
    };
  });
}

/* ==================== Watcher de Expiração & Eventos ==================== */
export function initAuthWatcher() {
  if (typeof window === "undefined") return;
  if (window.__authWatcherStarted) return;
  window.__authWatcherStarted = true;

  const tick = () => {
    try {
      const exp = getExpiry();
      if (!exp) return;
      if (Date.now() >= exp) {
        logout("Sessão expirada (4h)");
      }
    } catch (e) {
      console.error("[auth] watcher error", e);
    }
  };

  tick();
  const id = window.setInterval(tick, 30_000);
  window.__authWatcherId = id;

  let isForcedLoggingOut = false;

  const performForcedLogout = (msg) => {
    if (isForcedLoggingOut) return;
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "";
    if (currentPath === "/login" || currentPath === "/register") {
      clearUser();
      return;
    }
    isForcedLoggingOut = true;
    clearUser();
    try {
      localStorage.removeItem("usuario_desconectado_admin");
      localStorage.removeItem("desconectar_todos_usuarios_evento");
    } catch {}

    toast.warn(msg || "Sua sessão foi encerrada pela administração. Redirecionando...", {
      toastId: "forced_logout_toast",
      autoClose: 2000,
    });

    setTimeout(() => {
      window.location.href = "/login";
    }, 1200);
  };

  const sendHeartbeat = async () => {
    if (isForcedLoggingOut) return;
    if (typeof window !== "undefined") {
      const path = window.location.pathname;
      if (path === "/login" || path === "/register") return;
    }

    const u = getUser();
    if (!u || !u.email) return;

    try {
      const emailKey = String(u.email || "").toLowerCase().trim();
      const userKey = String(u.username || "").toLowerCase().trim();

      if (emailKey) {
        try {
          localStorage.setItem(
            `user_presence_${emailKey}`,
            JSON.stringify({ email: u.email, username: u.username, name: u.name || u.nome, lastSeen: Date.now(), isOnline: true })
          );
        } catch {}
      }
      if (userKey && userKey !== emailKey) {
        try {
          localStorage.setItem(
            `user_presence_${userKey}`,
            JSON.stringify({ email: u.email, username: u.username, name: u.name || u.nome, lastSeen: Date.now(), isOnline: true })
          );
        } catch {}
      }

      const resp = await api.post("/auth/heartbeat", {
        email: u.email,
        username: u.username,
        userId: u.id,
        name: u.name || u.nome || u.username || u.email,
      });

      if (resp && resp.data && resp.data.forceDisconnect) {
        performForcedLogout("Sua sessão foi encerrada pela administração. Redirecionando...");
        return;
      } else if (resp && resp.data && Array.isArray(resp.data.permissions)) {
        // Sincroniza permissões atualizadas pelo admin sem precisar de logout
        const serverPerms = resp.data.permissions;
        const currentPerms = Array.isArray(u.permissions) ? u.permissions : [];
        const hasDiff =
          serverPerms.length !== currentPerms.length ||
          serverPerms.some((p) => !currentPerms.includes(p));

        if (hasDiff) {
          const updatedUser = { ...u, permissions: serverPerms, role: resp.data.role || u.role };
          setUser(updatedUser);
          window.dispatchEvent(
            new CustomEvent("permissoes_alteradas_evento", {
              detail: { email: u.email, permissions: serverPerms },
            })
          );
        }
      }
    } catch {}
  };
  sendHeartbeat();
  window.setInterval(sendHeartbeat, 5_000);

  // Escutador global de desconexão na mesma aba
  window.addEventListener("force_user_logout", (e) => {
    const detail = e.detail || {};
    const currentUser = getUser();
    if (currentUser) {
      const matchEmail =
        detail.email && currentUser.email &&
        currentUser.email.toLowerCase() === detail.email.toLowerCase();
      const matchUser =
        detail.username && currentUser.username &&
        currentUser.username.toLowerCase() === detail.username.toLowerCase();
      const matchId =
        detail.userId && currentUser.id &&
        String(currentUser.id) === String(detail.userId);

      const isCurrentUserAdmin = isAdmin(currentUser);

      if (detail.all && !isCurrentUserAdmin) {
        performForcedLogout("Todas as sessões de usuários foram encerradas pela administração. Redirecionando...");
        return;
      }

      if (matchEmail || matchUser || matchId) {
        performForcedLogout("Sua sessão foi encerrada pela administração. Redirecionando...");
      }
    }
  });

  // Escutador global para abas secundárias
  window.addEventListener("storage", (ev) => {
    if (ev.key === EXPIRES_KEY || ev.key === USER_KEY) tick();

    if (ev.key === "desconectar_todos_usuarios_evento") {
      const currentUser = getUser();
      if (currentUser && !isAdmin(currentUser)) {
        performForcedLogout("Todas as sessões de usuários foram encerradas pela administração. Redirecionando...");
      }
      return;
    }

    if (
      (ev.key === "senha_alterada_evento" || ev.key === "usuario_desconectado_admin") &&
      ev.newValue
    ) {
      try {
        const payload = JSON.parse(ev.newValue);
        const currentUser = getUser();

        if (currentUser && payload) {
          const matchEmail =
            payload.email && currentUser.email &&
            currentUser.email.toLowerCase() === payload.email.toLowerCase();
          const matchUser =
            payload.username && currentUser.username &&
            currentUser.username.toLowerCase() === payload.username.toLowerCase();
          const matchId =
            payload.userId && currentUser.id &&
            String(currentUser.id) === String(payload.userId);

          if (matchEmail || matchUser || matchId) {
            performForcedLogout("Sua sessão foi encerrada pela administração. Redirecionando...");
          }
        }
      } catch (err) {
        console.error("Erro no watcher de desconexão:", err);
      }
    }

    if (ev.key === "permissoes_alteradas_evento" && ev.newValue) {
      try {
        const payload = JSON.parse(ev.newValue);
        const currentUser = getUser();
        if (
          currentUser &&
          currentUser.email &&
          payload.email &&
          currentUser.email.toLowerCase() === payload.email.toLowerCase() &&
          Array.isArray(payload.permissions)
        ) {
          setUser({ ...currentUser, permissions: payload.permissions });
          window.dispatchEvent(
            new CustomEvent("permissoes_alteradas_evento", {
              detail: { email: currentUser.email, permissions: payload.permissions },
            })
          );
        }
      } catch {}
    }
  });
}

/* ==================== Countdown Hook ==================== */
export function useSessionCountdown() {
  const [left, setLeft] = useState(() => Math.max(0, getExpiry() - Date.now()));
  useEffect(() => {
    const upd = () => setLeft(Math.max(0, getExpiry() - Date.now()));
    upd();
    const id = setInterval(upd, 1000);
    return () => clearInterval(id);
  }, []);
  return left;
}

export function formatRemaining(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return "00:00:00";
  const s = Math.floor(ms / 1000);
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const ss = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${ss}`;
}