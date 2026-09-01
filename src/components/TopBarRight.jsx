// src/components/TopBarRight.jsx
import React from "react";
import { useSessionCountdown, formatRemaining } from "../auth/auth";

export default function TopBarRight() {
  const msLeft = useSessionCountdown(); // atualiza a cada 1s
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      {msLeft > 0 && (
        <small className="session-badge">
          Sessão expira em {formatRemaining(msLeft)}
        </small>
      )}
      {/* aqui fica seu menu de usuário/botão sair */}
    </div>
  );
}
