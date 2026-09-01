import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { login } from "../../auth/auth";
import bg from "../../assets/JSA.png";

export default function ResetPassword() {
  const nav = useNavigate();
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [show, setShow] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();

    if (novaSenha.length < 6) {
      toast.warn("A senha deve ter no mínimo 6 caracteres.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast.error("As senhas não coincidem.");
      return;
    }

    const rawCurrentUser = localStorage.getItem("currentUser");
    if (!rawCurrentUser) {
      toast.error("Sessão expirada. Faça login novamente.");
      nav("/login");
      return;
    }

    const currentUser = JSON.parse(rawCurrentUser);
    const userEmail = String(currentUser.email || "").toLowerCase();

    // 1. Atualiza no array de usuários cadastrados
    const rawUsers = localStorage.getItem("users");
    let users = rawUsers ? JSON.parse(rawUsers) : [];

    users = users.map((u) => {
      if (String(u.email || "").toLowerCase() === userEmail) {
        return {
          ...u,
          password: novaSenha,
          mustChangePassword: false, // Remove a flag provisória
        };
      }
      return u;
    });

    localStorage.setItem("users", JSON.stringify(users));

    // 2. Registra o login ativo no auth.js
    const nomeAmigavel =
      userEmail === "jsa@jsa.com" || userEmail === "jsa.admin@gmail.com"
        ? "JSA Admin"
        : (userEmail.split("@")[0] || "Usuário")
            .replace(/\./g, " ")
            .replace(/(^|\s)\S/g, (l) => l.toUpperCase());

    await login({ email: userEmail, nome: nomeAmigavel, lembrar: true });

    toast.success("Nova senha cadastrada com sucesso!", {
      position: "top-right",
      autoClose: 1500,
    });

    setTimeout(() => {
      nav("/"); // Redireciona para o painel principal
    }, 1500);
  };

  return (
    <div 
      className="auth-wrap bg-jsa fade-in-page"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat"
      }}
    >
      <div className="auth-card">
        <h1 className="auth-title" style={{ color: "#ff5b5b" }}>Cadastrar Nova Senha</h1>
        <div className="auth-subtitle">Sua senha é provisória. Digite uma nova senha para acessar.</div>

        <form onSubmit={handleUpdatePassword}>
          <div className="form-group" style={{ marginBottom: 12 }}>
            <label className="label required">Nova Senha</label>
            <div className="input-with-icon">
              <input
                className="input"
                type={show ? "text" : "password"}
                placeholder="Digite sua nova senha"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
                autoFocus
                required
              />
              <button
                type="button"
                className="eye"
                onClick={() => setShow((s) => !s)}
              >
                {show ? "🫣" : "👁️"}
              </button>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 16 }}>
            <label className="label required">Confirmar Nova Senha</label>
            <input
              className="input"
              type={show ? "text" : "password"}
              placeholder="Confirme a nova senha"
              value={confirmarSenha}
              onChange={(e) => setConfirmarSenha(e.target.value)}
              required
            />
          </div>

          <button className="btn" type="submit" style={{ background: "#ff5b5b", color: "#fff", width: "100%" }}>
            Salvar e Entrar no Sistema
          </button>
        </form>

        <div className="auth-foot" style={{ marginTop: 16, fontSize: 12, opacity: 0.8 }}>
          Copyright © 2026 <b>JSA, Soluções Tecnológicas</b>. All rights reserved.
        </div>
      </div>
    </div>
  );
}