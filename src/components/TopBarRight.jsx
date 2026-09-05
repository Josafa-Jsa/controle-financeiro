// src/components/TopBarRight.jsx
import React from "react";
import { useSessionCountdown, formatRemaining, getUser, isAdmin } from "../auth/auth";

export default function TopBarRight() {
  const msLeft = useSessionCountdown(); // atualiza a cada 1s (0 para Admin)
  const user = getUser();
  const isUserAdmin = isAdmin(user);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {user && (
        <span
          style={{
            fontSize: 12,
            padding: "4px 8px",
            borderRadius: 4,
            background: isUserAdmin ? "#854d0e" : "#334155",
            color: "#fff",
            fontWeight: "bold",
          }}
        >
          {isUserAdmin ? "👑 Admin" : "👤 Usuário"}
        </span>
      )}
      {!isUserAdmin && msLeft > 0 && (
        <small className="session-badge" title="Tempo restante de conexão (limite de 8 horas)">
          ⏱️ Sessão expira em {formatRemaining(msLeft)}
        </small>
      )}
    </div>
  );
}
