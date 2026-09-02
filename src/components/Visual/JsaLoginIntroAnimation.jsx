// src/components/Visual/JsaLoginIntroAnimation.jsx
import React, { useEffect, useState } from "react";
import { getUser, isAdmin } from "../../auth/auth";
import "./JsaLoginIntroAnimation.css";

export default function JsaLoginIntroAnimation({ onComplete = () => { } }) {
  const [animationPhase, setAnimationPhase] = useState("center"); // 'center' | 'glide'
  const [fadeOutOverlay, setFadeOutOverlay] = useState(false);
  const [isPrevencaoUser, setIsPrevencaoUser] = useState(false);

  useEffect(() => {
    // Verifica se o usuário autenticado tem acesso à tela de Prevenção
    try {
      const u = getUser() || JSON.parse(localStorage.getItem("user") || localStorage.getItem("currentUser") || "{}");
      const permissions = Array.isArray(u?.permissions || u?.permissoes)
        ? (u.permissions || u.permissoes)
        : [];
      
      const hasBigMaster =
        permissions.includes("prevencao") ||
        permissions.includes("uniformes") ||
        permissions.includes("controle-uniformes");
      setIsPrevencaoUser(hasBigMaster);
    } catch {
      setIsPrevencaoUser(false);
    }

    // Fase 1: Permanece centralizado em destaque por 1.6 segundos
    const timer1 = setTimeout(() => {
      setAnimationPhase("glide"); // Inicia o deslocamento para o canto superior esquerdo
    }, 1600);

    // Fase 2: O fundo escuro se dissipa aos 2.4 segundos revelando a tela
    const timer2 = setTimeout(() => {
      setFadeOutOverlay(true);
    }, 2400);

    // Fase 3: Conclusão exata aos 3 segundos (3000ms)
    const timer3 = setTimeout(() => {
      onComplete();
    }, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  return (
    <div className={`jsa-intro-overlay ${fadeOutOverlay ? "fade-out" : ""}`}>
      <div
        className="jsa-intro-glow"
        style={
          isPrevencaoUser
            ? { background: "radial-gradient(circle, rgba(0, 210, 255, 0.35) 0%, rgba(0, 0, 0, 0) 70%)" }
            : undefined
        }
      />

      <div
        className={`jsa-intro-brand-container ${
          animationPhase === "center" ? "state-center" : "state-top-left"
        }`}
      >
        <h1
          className="jsa-intro-title"
          style={
            isPrevencaoUser
              ? {
                  background: "linear-gradient(135deg, #00d2ff 0%, #3b82f6 50%, #6366f1 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  textShadow: "0 0 40px rgba(0, 210, 255, 0.6)",
                }
              : undefined
          }
        >
          {isPrevencaoUser ? (
            <>
              <span>🛒</span> Big Master Supermercados
            </>
          ) : (
            <>
              <span>🚀</span> JSA Soluções Tecnológicas
            </>
          )}
        </h1>

        <div className={`jsa-intro-subtitle ${animationPhase !== "center" ? "hide" : ""}`}>
          {isPrevencaoUser
            ? "Prevenção de Perdas, Segurança & Gestão Operacional"
            : "Gestão Financeira, Segurança e Tecnologia"}
        </div>
      </div>
    </div>
  );
}
