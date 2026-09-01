// src/pages/Auth/CompletarWhatsapp.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { getUser, setUser } from "../../auth/auth";
import bg from "../../assets/JSA.png";

const formatWhatsApp = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export default function CompletarWhatsapp() {
  const nav = useNavigate();
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const u = getUser();
    if (!u) {
      nav("/login", { replace: true });
      return;
    }

    if (u.whatsapp && u.whatsapp.trim().length >= 10) {
      nav("/", { replace: true });
      return;
    }

    setCurrentUser(u);
  }, [nav]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const digitsOnly = whatsapp.replace(/\D/g, "");
    if (!digitsOnly || digitsOnly.length < 10) {
      toast.warn("Por favor, insira um número de WhatsApp válido com DDD.");
      return;
    }

    setLoading(true);

    try {
      const whatsappLimpo = whatsapp.trim();
      const targetEmail = (currentUser?.email || currentUser?.username || "").toLowerCase();

      // 1. Atualiza na lista de usuários (localStorage "users")
      const raw = localStorage.getItem("users");
      const users = raw ? JSON.parse(raw) : [];
      const updatedUsers = users.map((u) => {
        if (String(u.email || "").toLowerCase() === targetEmail) {
          return {
            ...u,
            whatsapp: whatsappLimpo,
          };
        }
        return u;
      });

      localStorage.setItem("users", JSON.stringify(updatedUsers));

      // 2. Atualiza na sessão ativa do usuário
      const updatedSession = {
        ...currentUser,
        whatsapp: whatsappLimpo,
      };
      setUser(updatedSession);

      toast.success("WhatsApp cadastrado com sucesso!", {
        position: "top-right",
        autoClose: 1500,
      });

      setTimeout(() => {
        nav("/", { replace: true });
      }, 1500);
    } catch (err) {
      console.error("Erro ao salvar WhatsApp:", err);
      toast.error("Erro ao salvar o número. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="auth-wrap bg-jsa fade-in-page"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <div className="auth-card">
        <h1 className="auth-title" style={{ color: "#ff5b5b" }}>
          Atualização Cadastral
        </h1>
        <div className="auth-subtitle">JSA, Soluções Tecnológicas</div>

        <div
          style={{
            backgroundColor: "rgba(0, 200, 200, 0.12)",
            border: "1px solid #00c8c8",
            borderRadius: "8px",
            padding: "12px 14px",
            marginBottom: "18px",
            color: "#e4e4e7",
            fontSize: "13px",
            textAlign: "center",
            lineHeight: "1.5",
          }}
        >
          📱 <strong>Informe seu WhatsApp</strong> para vincular o atendimento e facilitar a abertura de chamados técnicos e suporte.
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="label required">Número de WhatsApp (com DDD)</label>
            <input
              className="input"
              type="tel"
              placeholder="(00) 00000-0000"
              value={whatsapp}
              onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
              autoFocus
              required
            />
          </div>

          <button
            className="btn"
            type="submit"
            disabled={loading}
            style={{
              background: "#ff5b5b",
              color: "#fff",
              width: "100%",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Salvando..." : "Salvar e Continuar"}
          </button>
        </form>

        <div className="auth-foot" style={{ marginTop: 20, fontSize: 12, opacity: 0.8 }}>
          Copyright © 2026 <b>JSA Soluções Tecnológicas</b>. All rights reserved.
        </div>
      </div>
    </div>
  );
}
