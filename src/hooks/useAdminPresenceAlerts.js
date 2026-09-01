// src/hooks/useAdminPresenceAlerts.js
import { useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { getUser, isAdmin } from "../auth/auth";
import { api } from "../api/client";

export function useAdminPresenceAlerts() {
  const previousOnlineMapRef = useRef(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    const user = getUser();
    if (!user || !isAdmin()) return;

    const currentAdminEmail = String(user.email || "").toLowerCase();

    // 1. Escuta eventos instantâneos via storage (entre abas / sessões no mesmo navegador)
    const handleStoragePresence = (ev) => {
      if (ev.key === "user_presence_event" && ev.newValue) {
        try {
          const payload = JSON.parse(ev.newValue);
          const targetEmail = String(payload.email || "").toLowerCase();

          if (targetEmail && targetEmail !== currentAdminEmail) {
            const userName = payload.name || targetEmail;
            if (payload.type === "login") {
              toast.info(`🟢 Usuário ${userName} está Conectado`, {
                toastId: `presence-login-${targetEmail}`,
                position: "top-right",
                autoClose: 4000,
              });
            } else if (payload.type === "logout") {
              toast.warn(`⚪ Usuário ${userName} foi Desconectado`, {
                toastId: `presence-logout-${targetEmail}`,
                position: "top-right",
                autoClose: 4000,
              });
            }
          }
        } catch (e) {}
      }
    };

    window.addEventListener("storage", handleStoragePresence);

    // 2. Consulta contínua ao banco de dados MySQL via API para capturar conexões e desconexões de qualquer máquina/rede
    const checkPresenceChanges = async () => {
      try {
        const resp = await api.get("/users");
        if (!Array.isArray(resp.data)) return;

        const currentOnlineMap = {};
        const currentNamesMap = {};

        resp.data.forEach((u) => {
          const email = String(u.email || "").toLowerCase();
          if (email) {
            const onlineState = Boolean(u.isOnline || u.is_currently_online || u.online);
            currentOnlineMap[email] = onlineState;
            currentNamesMap[email] = u.name || email;
          }
        });

        // Notifica páginas abertas com os dados mais recentes do banco
        try {
          window.dispatchEvent(new CustomEvent("users_presence_updated", { detail: resp.data }));
        } catch (e) {}

        // Na primeira execução inicializamos o mapa de status sem disparar toasts
        if (!isInitializedRef.current || !previousOnlineMapRef.current) {
          previousOnlineMapRef.current = currentOnlineMap;
          isInitializedRef.current = true;
          return;
        }

        const prevMap = previousOnlineMapRef.current;

        Object.keys(currentOnlineMap).forEach((email) => {
          // Não dispara alerta do próprio administrador para si mesmo
          if (email === currentAdminEmail) return;

          const wasOnline = Boolean(prevMap[email]);
          const isNowOnline = Boolean(currentOnlineMap[email]);
          const userName = currentNamesMap[email] || email;

          if (!wasOnline && isNowOnline) {
            toast.info(`🟢 Usuário ${userName} está Conectado`, {
              toastId: `presence-login-${email}`,
              position: "top-right",
              autoClose: 4000,
            });
          } else if (wasOnline && !isNowOnline) {
            toast.warn(`⚪ Usuário ${userName} foi Desconectado`, {
              toastId: `presence-logout-${email}`,
              position: "top-right",
              autoClose: 4000,
            });
          }
        });

        previousOnlineMapRef.current = currentOnlineMap;
      } catch (err) {
        // Ignora falhas pontuais de conexão
      }
    };

    checkPresenceChanges();
    const intervalId = setInterval(checkPresenceChanges, 3000);

    return () => {
      window.removeEventListener("storage", handleStoragePresence);
      clearInterval(intervalId);
    };
  }, []);
}
