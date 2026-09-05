import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { login } from "../../auth/auth";
import { api } from "../../api/client";
import { useSystemStatus, isManutencaoGeral } from "../../services/systemStatusService";
import bg from "../../assets/JSA.png";

const SAVED_LOGINS_KEY = "jsa_saved_login_emails";

function getSavedLogins() {
  try {
    const raw = localStorage.getItem(SAVED_LOGINS_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveLoginToHistory(loginStr) {
  if (!loginStr || typeof loginStr !== "string") return;
  const trimmed = loginStr.trim().toLowerCase();
  if (!trimmed) return;
  try {
    const list = getSavedLogins();
    const filtered = list.filter((item) => item.toLowerCase() !== trimmed);
    const updated = [trimmed, ...filtered].slice(0, 10);
    localStorage.setItem(SAVED_LOGINS_KEY, JSON.stringify(updated));
    localStorage.setItem("jsa_last_login_email", trimmed);
  } catch (e) {
    console.warn("Erro ao salvar histórico de login:", e);
  }
}

function removeLoginFromHistory(loginStr) {
  try {
    const list = getSavedLogins();
    const updated = list.filter((item) => item.toLowerCase() !== String(loginStr).toLowerCase());
    localStorage.setItem(SAVED_LOGINS_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export default function Login() {
  const nav = useNavigate();
  const systemStatus = useSystemStatus();
  const isGeral = isManutencaoGeral(systemStatus);

  const [loginInput, setLoginInput] = useState("");
  const [senha, setSenha] = useState("");
  const [lembrar, setLembrar] = useState(false);
  const [show, setShow] = useState(false);

  // Estados de sugestão de e-mails salvos
  const [savedLogins, setSavedLogins] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const containerRef = useRef(null);
  const passwordInputRef = useRef(null);

  useEffect(() => {
    const list = getSavedLogins();
    setSavedLogins(list);

    // Carrega o último e-mail utilizado se houver
    const lastEmail = localStorage.getItem("jsa_last_login_email");
    if (lastEmail && !loginInput) {
      setLoginInput(lastEmail);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fechar sugestões ao clicar fora do componente
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const normalizeUsername = (str) => {
    if (!str) return "";
    return String(str)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ".");
  };

  const handleSelectLogin = (selected) => {
    setLoginInput(selected);
    setShowSuggestions(false);
    if (passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  };

  const handleRemoveSavedLogin = (e, item) => {
    e.stopPropagation();
    const updated = removeLoginFromHistory(item);
    setSavedLogins(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!loginInput || !senha) return;

    const targetLogin = loginInput.trim().toLowerCase();

    // Salva o e-mail/usuário no histórico para sugestões futuras
    saveLoginToHistory(targetLogin);

    // Bloqueia login para usuários comuns caso o sistema esteja em manutenção geral
    if (isGeral) {
      const isKnownAdmin =
        targetLogin === "jsa@jsa.com" ||
        targetLogin === "jsa.admin" ||
        targetLogin === "josafa.santos.jss@gmail.com";

      if (!isKnownAdmin) {
        try {
          const raw = localStorage.getItem("users");
          const users = raw ? JSON.parse(raw) : [];
          const matchedUser = users.find((u) => {
            const uEmail = String(u.email || "").toLowerCase().trim();
            const uUsername = String(u.username || "").toLowerCase().trim();
            return uEmail === targetLogin || uUsername === targetLogin;
          });

          const isLocalAdmin = matchedUser && (
            matchedUser.role === "admin" ||
            matchedUser.role === "ADMIN" ||
            matchedUser.name === "JSA Admin" ||
            (Array.isArray(matchedUser.permissions) && matchedUser.permissions.includes("*"))
          );

          if (!isLocalAdmin) {
            toast.error("🔒 Login temporariamente bloqueado!", {
              toastId: "login-manutencao-geral-block",
              autoClose: 6000,
            });
            return;
          }
        } catch {
          toast.error("🔒 Login temporariamente bloqueado!", {
            toastId: "login-manutencao-geral-block",
            autoClose: 6000,
          });
          return;
        }
      }
    }

    try {
      // 1. Tenta autenticar diretamente no Banco de Dados MySQL via API
      const resp = await api.post("/auth/login", {
        loginInput: targetLogin,
        username: targetLogin,
        email: targetLogin,
        password: senha,
      });

      const user = resp.data;

      const isAdminUser =
        targetLogin === "jsa@jsa.com" ||
        targetLogin === "jsa.admin" ||
        targetLogin === "josafa.santos.jss@gmail.com" ||
        user.role === "admin" ||
        user.role === "ADMIN" ||
        user.name === "JSA Admin" ||
        (Array.isArray(user.permissions) && user.permissions.includes("*"));

      if (isGeral && !isAdminUser) {
        toast.error("🔒 Login temporariamente bloqueado!", {
          toastId: "login-manutencao-geral-block",
          autoClose: 6000,
        });
        return;
      }

      if (user.mustChangePassword) {
        localStorage.setItem("currentUser", JSON.stringify(user));
        toast.info("Senha provisória validada! Redirecionando...", {
          position: "top-right",
          autoClose: 1000,
        });
        setTimeout(() => {
          nav("/reset-password");
        }, 1000);
        return;
      }

      const nomeAmigavel =
        user.name ||
        (targetLogin === "jsa@jsa.com" || targetLogin === "jsa.admin" ? "JSA Admin" : targetLogin.split("@")[0]);

      const standardPerms = ["chamados"];
      const resolvedPermissions =
        user.permissions && user.permissions.length > 0
          ? user.permissions
          : standardPerms;

      await login({
        id: user.id,
        email: user.email,
        username: user.username || targetLogin,
        nome: nomeAmigavel,
        name: nomeAmigavel,
        role: user.role === "admin" ? "ADMIN" : "USER",
        filial: user.filial || "Filial 1",
        permissions: resolvedPermissions,
        whatsapp: user.whatsapp || "",
        lembrar,
      });

      localStorage.setItem("currentUser", JSON.stringify(user));
      sessionStorage.setItem("play_login_intro", "true");

      toast.success("Acesso liberado!", {
        position: "top-right",
        autoClose: 1000,
      });

      nav("/dashboard", { replace: true });

    } catch (apiErr) {
      if (apiErr.response) {
        if (apiErr.response.status === 401) {
          toast.error(apiErr.response.data?.error || "Usuário ou senha incorretos.");
          return;
        }
        if (apiErr.response.status === 403) {
          toast.error(apiErr.response.data?.error || "Acesso bloqueado pela administração.");
          return;
        }
      }

      // Fallback local se o servidor estiver offline
      const raw = localStorage.getItem("users");
      const users = raw ? JSON.parse(raw) : [];
      const user = users.find((u) => {
        const uEmail = String(u.email || "").toLowerCase().trim();
        const uUsername = String(u.username || "").toLowerCase().trim();
        const uNameNorm = normalizeUsername(u.name || u.nomeCompleto || "");
        return (
          uEmail === targetLogin ||
          uUsername === targetLogin ||
          uNameNorm === targetLogin ||
          String(u.name || "").toLowerCase().trim() === targetLogin
        );
      });

      const isAdminFixed = (targetLogin === "jsa@jsa.com" || targetLogin === "jsa.admin" || targetLogin === "josafa.santos.jss@gmail.com") && (senha === "admin" || senha === "123456");

      const isAdminLocal =
        isAdminFixed ||
        user?.role === "admin" ||
        user?.role === "ADMIN" ||
        user?.name === "JSA Admin" ||
        (Array.isArray(user?.permissions) && user?.permissions.includes("*"));

      if (isGeral && !isAdminLocal) {
        toast.error("🔒 Login temporariamente bloqueado!", {
          toastId: "login-manutencao-geral-block",
          autoClose: 6000,
        });
        return;
      }

      if (!isAdminFixed) {
        if (!user || !user.password || user.password !== senha) {
          toast.error("Usuário ou senha incorretos.");
          return;
        }
      }

      const nomeAmigavel =
        targetLogin === "jsa@jsa.com" || targetLogin === "jsa.admin" ? "JSA Admin" : (user?.name || "Usuário");

      const fallbackPermissions = isAdminFixed
        ? ["*"]
        : (Array.isArray(user?.permissions) && user.permissions.length > 0)
        ? user.permissions
        : ["chamados"];

      await login({
        email: user?.email || targetLogin,
        username: user?.username || targetLogin,
        nome: nomeAmigavel,
        role: isAdminFixed ? "ADMIN" : (user?.role || "USER"),
        filial: user?.filial || "Filial 1",
        permissions: fallbackPermissions,
        lembrar,
      });

      sessionStorage.setItem("play_login_intro", "true");

      toast.success("Acesso liberado!", {
        position: "top-right",
        autoClose: 1000,
      });

      nav("/dashboard", { replace: true });
    }
  };

  const filteredSuggestions = savedLogins.filter((item) =>
    !loginInput || item.toLowerCase().includes(loginInput.toLowerCase().trim())
  );

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
        <h1 className="auth-title">JSA Soluções Tecnológicas</h1>
        <div className="auth-subtitle">Tela de Login</div>

        {/* Banner de Bloqueio em Manutenção Geral */}
        {isGeral && (
          <div
            style={{
              background: "linear-gradient(135deg, rgba(245, 158, 11, 0.22), rgba(180, 83, 9, 0.28))",
              border: "1.5px solid #f59e0b",
              borderRadius: "12px",
              padding: "14px 16px",
              marginBottom: "18px",
              textAlign: "center",
              boxShadow: "0 0 20px rgba(245, 158, 11, 0.25)",
            }}
          >
            <div style={{ fontSize: "26px", marginBottom: "4px" }}>🛠️</div>
            <strong
              style={{
                color: "#fef08a",
                fontSize: "0.98rem",
                display: "block",
                fontWeight: 800,
                letterSpacing: "0.4px",
                textTransform: "uppercase"
              }}
            >
              Sistema em Manutenção em Múltiplas Telas!
            </strong>
            <p
              style={{
                color: "#fef9c3",
                fontSize: "0.82rem",
                margin: "6px 0 0",
                lineHeight: "1.4"
              }}
            >
              {systemStatus.mensagem || "O acesso ao sistema está temporariamente bloqueado para usuários comuns devido a manutenção geral. Apenas administradores autorizados conseguem efetuar login para suporte."}
            </p>
            <div
              style={{
                marginTop: "10px",
                fontSize: "0.74rem",
                color: "#fde68a",
                fontWeight: 600,
                background: "rgba(0, 0, 0, 0.3)",
                padding: "3px 10px",
                borderRadius: "12px",
                display: "inline-block",
              }}
            >
              🔒 Login temporariamente bloqueado!
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Campo de Usuário / E-mail com Dropdown de Seleção Salva */}
          <div className="form-group" style={{ marginBottom: 12, position: "relative" }} ref={containerRef}>
            <label className="label required">Usuário (nome.sobrenome) ou E-mail</label>
            <input
              className="input"
              type="text"
              list="jsa-saved-emails"
              placeholder="Ex: josafa.santos ou seu.email@exemplo.com"
              value={loginInput}
              onChange={(e) => {
                setLoginInput(e.target.value);
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onClick={() => setShowSuggestions(true)}
              autoFocus
              required
              autoComplete="username"
            />

            {/* Datalist nativo para navegadores que suportam preenchimento rápido */}
            <datalist id="jsa-saved-emails">
              {savedLogins.map((email) => (
                <option key={email} value={email} />
              ))}
            </datalist>

            {/* Dropdown Interativo de E-mails Salvos no Dispositivo */}
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  background: "#181d24",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  marginTop: "4px",
                  maxHeight: "180px",
                  overflowY: "auto",
                  zIndex: 1000,
                  boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                }}
              >
                <div
                  style={{
                    padding: "6px 10px",
                    fontSize: "11px",
                    color: "#94a3b8",
                    borderBottom: "1px solid #283340",
                    fontWeight: 600,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>💾 Contas salvas neste dispositivo:</span>
                  <span style={{ fontSize: "10px", color: "#64748b" }}>Clique para selecionar</span>
                </div>

                {filteredSuggestions.map((item) => (
                  <div
                    key={item}
                    onClick={() => handleSelectLogin(item)}
                    style={{
                      padding: "8px 12px",
                      fontSize: "13px",
                      color: "#f1f5f9",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      borderBottom: "1px solid rgba(255,255,255,0.04)",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#242b35")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                      <span style={{ fontSize: "14px" }}>{item.includes("@") ? "✉️" : "👤"}</span>
                      <span style={{ fontWeight: 600, whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden" }}>
                        {item}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleRemoveSavedLogin(e, item)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#94a3b8",
                        cursor: "pointer",
                        fontSize: "13px",
                        padding: "2px 6px",
                        borderRadius: "4px",
                      }}
                      title="Remover das contas salvas"
                      onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
                      onMouseLeave={(e) => (e.currentTarget.style.color = "#94a3b8")}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="form-group" style={{ marginBottom: 8 }}>
            <label className="label required">Senha</label>
            <div className="input-with-icon">
              <input
                ref={passwordInputRef}
                className="input"
                type={show ? "text" : "password"}
                placeholder="Senha"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                required
              />
              <button
                type="button"
                className="eye"
                onClick={() => setShow((s) => !s)}
                aria-label="Mostrar/ocultar senha"
              >
                {show ? "🫣" : "👁️"}
              </button>
            </div>
          </div>

          <div className="auth-actions-row">
            <label className="auth-remember">
              <input
                type="checkbox"
                checked={lembrar}
                onChange={(e) => setLembrar(e.target.checked)}
              />
              Lembrar-me
            </label>

            <Link to="/forgot" className="link">Esqueci a senha</Link>
          </div>

          <button className="btn" type="submit" style={{ background: "#ff5b5b", color: "#fff", width: "100%" }}>
            Entrar
          </button>
        </form>

        <div className="auth-foot" style={{ marginTop: 16 }}>
          Não tem conta? <Link to="/register" className="link">Criar conta</Link>
        </div>

        <div className="auth-foot" style={{ marginTop: 8, fontSize: 12, opacity: 0.8 }}>
          Copyright © 2026 <b>JSA Soluções Tecnológicas</b>. All rights reserved.
        </div>
      </div>
    </div>
  );
}