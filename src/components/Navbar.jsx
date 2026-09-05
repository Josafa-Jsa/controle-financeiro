import React, { useEffect, useState, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { logout, getUser, setUser } from "../auth/auth";
import { api } from "../api/client";
import { useSystemStatus, verificarManutencaoTela } from "../services/systemStatusService";
import ModalEditarTema from "./Modais/ModalEditarTema";
import brasaoImg from "../assets/brasao.png";
import "./Visual/Navbar.css";

// --- CONFIGURAÇÕES E CONSTANTES DE SESSÃO ---
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000; // 8 Horas
const BANNER_DURATION_MS = 90 * 1000; // 1m 30s
const ADMIN_EMAIL = "jsa@jsa.com";
// -------------------------------------------------

const formatWhatsApp = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

export default function Navbar({ onOpenAccessModal }) {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const systemStatus = useSystemStatus();

  // Estados do Usuário e Permissões
  const [userPermissions, setUserPermissions] = useState([]);
  const [userName, setUserName] = useState("Usuário");
  const [isFullAccess, setIsFullAccess] = useState(false);
  const [timeLeft, setTimeLeft] = useState("08:00:00");
  const [userAvatar, setUserAvatar] = useState("");
  const [currentUserData, setCurrentUserData] = useState(null);

  // Estados de Modais e Overlays
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showThemeModal, setShowThemeModal] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Estados do Formulário do Perfil
  const [editName, setEditName] = useState("");
  const [editAvatar, setEditAvatar] = useState("");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  /* ===================================================== */
  /* NAVEGAÇÃO COM CARREGAMENTO E TOAST                   */
  /* ===================================================== */
  const renderMaintenanceBadge = (path) => {
    const status = verificarManutencaoTela(path, systemStatus);
    if (!status?.emManutencao) return null;
    const badgeTitle = status.isGeral
      ? "Sistema em Manutenção em Múltiplas Telas!"
      : `${status.nomeTela} Em Manutenção...`;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "2px",
          marginLeft: "6px",
          padding: "1px 6px",
          borderRadius: "10px",
          fontSize: "0.68rem",
          fontWeight: 700,
          backgroundColor: "rgba(245, 158, 11, 0.2)",
          color: "#f59e0b",
          border: "1px solid rgba(245, 158, 11, 0.45)",
          letterSpacing: "0.2px",
          verticalAlign: "middle",
        }}
        title={badgeTitle}
      >
        🟡 Ajuste
      </span>
    );
  };

  const handleNavClick = (e, path, label) => {
    e.preventDefault();
    setMobileMenuOpen(false);

    if (location.pathname === path) {
      toast.info(`Você já está na tela: ${label}`);
      return;
    }

    const checkManutencao = verificarManutencaoTela(path, systemStatus);
    if (checkManutencao?.emManutencao && !isFullAccess) {
      const msgManutencao = checkManutencao.isGeral
        ? "⚠️ Sistema em Manutenção em Múltiplas Telas! O acesso está temporariamente bloqueado."
        : `⚠️ ${checkManutencao.nomeTela} Em Manutenção... O acesso está bloqueado.`;
      toast.warn(msgManutencao, {
        toastId: `manutencao-${path}`,
      });
    } else {
      toast.info(`📍 Acessando: ${label}`);
    }

    setLoadingText(`Redirecionando para ${label}...`);
    setIsNavigating(true);

    setTimeout(() => {
      setIsNavigating(false);
      navigate(path);
    }, 450);
  };

  /* ===================================================== */
  /* LOGOUT COM ANIMAÇÃO E NOTIFICAÇÃO                    */
  /* ===================================================== */
  const handleLogout = () => {
    const nameToDisconnect = userName;
    toast.warn(`Encerrando sessão de ${nameToDisconnect}...`);
    setLoadingText("Encerrando sessão de usuário...");
    setIsNavigating(true);

    setTimeout(() => {
      setIsNavigating(false);
      localStorage.removeItem("session_start_time");
      localStorage.removeItem("has_seen_banner");
      logout();
      toast.info(`${nameToDisconnect} desconectado com sucesso.`);
      navigate("/login", { replace: true });
    }, 600);
  };

  /* ===================================================== */
  /* CONTROLE DO BANNER DE PRIMEIRO ACESSO                 */
  /* ===================================================== */
  useEffect(() => {
    const hasSeenBanner = localStorage.getItem("has_seen_banner");

    if (!hasSeenBanner) {
      setShowBanner(true);

      const bannerTimer = setTimeout(() => {
        setShowBanner(false);
        localStorage.setItem("has_seen_banner", "true");
      }, BANNER_DURATION_MS);

      return () => clearTimeout(bannerTimer);
    }
  }, []);

  /* ===================================================== */
  /* CARREGAMENTO DE DADOS DO USUÁRIO                       */
  /* ===================================================== */
  useEffect(() => {
    const authUser = getUser?.() || {};
    let sessionRaw = {};

    try {
      sessionRaw = JSON.parse(
        localStorage.getItem("user") ||
        localStorage.getItem("auth") ||
        "{}"
      );
    } catch (error) {
      console.error("Erro ao carregar sessão:", error);
      sessionRaw = {};
    }

    const rawUser = sessionRaw.user || sessionRaw.data || sessionRaw;
    const user = { ...rawUser, ...authUser };

    const email = String(user.email || "").toLowerCase().trim();

    // Busca permissões ativas priorizando o authUser / sessão do usuário logado
    let permissions = [];
    if (Array.isArray(authUser.permissions) && authUser.permissions.length > 0) {
      permissions = authUser.permissions;
    } else if (Array.isArray(user.permissions) && user.permissions.length > 0) {
      permissions = user.permissions;
    } else if (Array.isArray(user.permissoes) && user.permissoes.length > 0) {
      permissions = user.permissoes;
    } else {
      try {
        const rawUsers = JSON.parse(localStorage.getItem("users") || "[]");
        const matched = rawUsers.find((u) => 
          (email && String(u?.email || "").toLowerCase().trim() === email) ||
          (user.username && String(u?.username || "").toLowerCase().trim() === String(user.username).toLowerCase().trim()) ||
          (user.id && String(u?.id) === String(user.id))
        );
        if (matched && Array.isArray(matched.permissions) && matched.permissions.length > 0) {
          permissions = matched.permissions;
        }
      } catch { }
    }

    const isAdminAcc =
      email === "jsa@jsa.com" ||
      email === "josafa.santos.jss@gmail.com" ||
      user.name === "JSA Admin" ||
      user.role === "ADMIN" ||
      user.role === "admin";

    if (!isAdminAcc) {
      permissions = permissions.filter((p) => p !== "*");
    }

    setUserPermissions(permissions);

    const resolvedName = String(
      user.name ||
      user.nome ||
      user.displayName ||
      user.nomeUsuario ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      (email ? email.split("@")[0] : "") ||
      user.username ||
      "Usuário"
    ).trim();

    setUserName(resolvedName || "Usuário");
    setUserAvatar(
      user.avatar || user.foto || user.user_metadata?.avatar_url || ""
    );
  }, [location]);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setShowProfileModal(false);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  useEffect(() => {
    const authUser = getUser?.() || {};
    const email = String(authUser.email || "").toLowerCase().trim();
    const name = String(authUser.name || authUser.nome || "").trim();

    const isAdminUser =
      email === "jsa@jsa.com" ||
      email === "josafa.santos.jss@gmail.com" ||
      name === "JSA Admin";

    setIsFullAccess(isAdminUser);
  }, [location]);

  useEffect(() => {
    const handlePermissionsUpdated = (e) => {
      const targetEmail = e.detail?.email;
      const newPerms = e.detail?.permissions;
      const currentUser = getUser();
      const currentEmail = String(currentUser?.email || "").toLowerCase().trim();

      if (
        !targetEmail ||
        (currentEmail && targetEmail.toLowerCase() === currentEmail)
      ) {
        if (Array.isArray(newPerms)) {
          const isAdminAcc =
            currentEmail === "jsa@jsa.com" ||
            currentEmail === "josafa.santos.jss@gmail.com" ||
            currentUser?.name === "JSA Admin";
          setUserPermissions(isAdminAcc ? newPerms : newPerms.filter((p) => p !== "*"));
        }
      }
    };

    window.addEventListener("permissoes_alteradas_evento", handlePermissionsUpdated);
    return () => window.removeEventListener("permissoes_alteradas_evento", handlePermissionsUpdated);
  }, []);

  /* ===================================================== */
  /* TIMING DA SESSÃO E CONTAGEM REGRESSIVA               */
  /* ===================================================== */
  useEffect(() => {
    let startTime = localStorage.getItem("session_start_time");

    if (!startTime) {
      startTime = Date.now().toString();
      localStorage.setItem("session_start_time", startTime);
    }

    const startTimestamp = parseInt(startTime, 10);

    if (!Number.isFinite(startTimestamp)) {
      const novoInicio = Date.now().toString();
      localStorage.setItem("session_start_time", novoInicio);
      startTime = novoInicio;
    }

    const updateTimer = () => {
      const elapsed = Date.now() - parseInt(startTime, 10);
      const remaining = SESSION_DURATION_MS - elapsed;

      if (remaining <= 0) {
        localStorage.removeItem("session_start_time");
        localStorage.removeItem("has_seen_banner");
        logout();
        navigate("/login", { replace: true });
        return;
      }

      const totalSeconds = Math.floor(remaining / 1000);
      const hours = Math.floor(totalSeconds / 3600);
      const minutes = Math.floor((totalSeconds % 3600) / 60);
      const seconds = totalSeconds % 60;

      const formatted = `${String(hours).padStart(2, "0")}:${String(
        minutes
      ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

      setTimeLeft(formatted);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [navigate]);

  /* ===================================================== */
  /* CHECKER DE PERMISSÕES                                 */
  /* ===================================================== */
  const canAccess = (permissionKey) => {
    // Administrador tem acesso irrestrito a todas as telas
    if (isFullAccess) return true;

    // Páginas restritas exclusivamente a Administradores
    if (permissionKey === "usuarios" || permissionKey === "logs" || permissionKey === "admin") {
      return false;
    }

    // Se o usuário estiver explicitamente bloqueado
    if (currentUserData?.blocked) return false;

    // 🔒 TELA FIXA / PADRÃO PARA TODOS OS USUÁRIOS: Atendimento/Chamados
    if (
      permissionKey === "chamados" ||
      permissionKey === "atendimento"
    ) {
      return true;
    }

    // Dashboard agora depende da permissão concedida pelo Administrador
    if (permissionKey === "dashboard" || permissionKey === "inicio") {
      return (
        userPermissions.includes("dashboard") ||
        userPermissions.includes("inicio")
      );
    }

    // Para todas as demais telas, o acesso necessita de liberação pelo Admin
    if (permissionKey === "ordem-servico" || permissionKey === "os") {
      return (
        userPermissions.includes("ordem-servico") ||
        userPermissions.includes("os")
      );
    }

    return userPermissions.includes(permissionKey);
  };

  /* ===================================================== */
  /* GERENCIAMENTO DO MODAL DE PERFIL                      */
  /* ===================================================== */
  const handleOpenProfileModal = () => {
    setEditName(userName);
    setEditAvatar(userAvatar);
    setEditWhatsapp(
      currentUserData?.whatsapp ||
      currentUserData?.telefone ||
      localStorage.getItem("usuario_whatsapp") ||
      ""
    );
    setCurrentPassword("");
    setEditPassword("");
    setConfirmPassword("");
    setShowProfileModal(true);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Selecione um arquivo de imagem válido.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;

      img.onload = () => {
        const MAX_WIDTH = 250;
        const MAX_HEIGHT = 250;

        let width = img.width;
        let height = img.height;

        if (width > height && width > MAX_WIDTH) {
          height = height * (MAX_WIDTH / width);
          width = MAX_WIDTH;
        } else if (height >= width && height > MAX_HEIGHT) {
          width = width * (MAX_HEIGHT / height);
          height = MAX_HEIGHT;
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(width);
        canvas.height = Math.round(height);

        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);

        setEditAvatar(compressedBase64);
        toast.info("Foto de perfil selecionada!");
      };
    };

    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e) => {
    e.preventDefault();

    // Validação de alteração de senha
    const isChangingPassword = Boolean(currentPassword || editPassword || confirmPassword);
    if (isChangingPassword) {
      if (!currentPassword) {
        toast.warn("Por favor, digite sua Senha Antiga para autorizar a alteração.");
        return;
      }
      if (editPassword !== confirmPassword) {
        toast.error("A nova senha e a repetição de senha não coincidem!");
        return;
      }
      if (editPassword.length < 3) {
        toast.warn("A nova senha deve ter no mínimo 3 caracteres.");
        return;
      }
    }

    const updatedUser = {
      ...currentUserData,
      name: editName,
      nome: editName,
      avatar: editAvatar,
      foto: editAvatar,
      whatsapp: editWhatsapp,
      ...(editPassword ? { password: editPassword } : {}),
    };

    try {
      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      localStorage.setItem("usuario_nome", editName);
      if (editWhatsapp) {
        localStorage.setItem("usuario_whatsapp", editWhatsapp);
      }

      const rawUsers = localStorage.getItem("users");
      if (rawUsers) {
        try {
          const usersList = JSON.parse(rawUsers);
          if (Array.isArray(usersList)) {
            const updatedList = usersList.map((u) => {
              if (
                u.email === updatedUser.email ||
                u.id === updatedUser.id
              ) {
                return {
                  ...u,
                  name: editName,
                  nome: editName,
                  avatar: editAvatar,
                  foto: editAvatar,
                  whatsapp: editWhatsapp,
                  ...(editPassword ? { password: editPassword } : {}),
                };
              }
              return u;
            });

            localStorage.setItem("users", JSON.stringify(updatedList));
          }
        } catch (error) {
          console.error("Erro ao atualizar lista de usuários:", error);
        }
      }

      setCurrentUserData(updatedUser);
      setUserName(editName);
      setUserAvatar(editAvatar);
      setShowProfileModal(false);

      // Sincroniza foto/avatar e dados no banco de dados via API
      api.put(`/users/${updatedUser.id || updatedUser.email}`, {
        name: editName,
        email: updatedUser.email,
        avatar: editAvatar,
        whatsapp: editWhatsapp,
        ...(editPassword ? { password: editPassword } : {}),
      }).catch((err) => console.warn("Aviso ao sincronizar perfil com API:", err.message));

      try {
        window.dispatchEvent(new CustomEvent("profile_avatar_updated", { detail: updatedUser }));
      } catch (e) { }

      toast.success("✅ Alteração de perfil realizada com sucesso!", {
        position: "top-right",
        autoClose: 3500,
      });
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      toast.error("Erro ao salvar alterações no perfil.");
    }
  };

  /* ===================================================== */
  /* RENDERIZAÇÃO                                          */
  /* ===================================================== */
  return (
    <header className="navbar-header">
      <nav className="navbar-container">
        {/* MARCA */}
        <div className="brand-title">
          <Link
            to="/"
            onClick={(e) => handleNavClick(e, "/", "Início")}
            className="brand-link"
          >
            {userPermissions.includes("prevencao") || userPermissions.includes("uniformes") || userPermissions.includes("controle-uniformes") || userPermissions.includes("controle-notas")
              ? "🛒 Big Master Supermercados"
              : "JSA Soluções Tecnológicas"}
          </Link>
        </div>

        {/* MENU */}
        <div className="menu-group">
          {canAccess("dashboard") && (
            <Link
              to="/dashboard"
              onClick={(e) => handleNavClick(e, "/dashboard", "Dashboard")}
              className={`nav-link ${location.pathname === "/dashboard" ? "active" : ""
                }`}
            >
              📊 Dashboard{renderMaintenanceBadge("/dashboard")}
            </Link>
          )}

          {canAccess("chamados") && (
            <Link
              to="/chamados"
              onClick={(e) => handleNavClick(e, "/chamados", "Atendimentos / Chamados")}
              className={`nav-link ${location.pathname === "/chamados" ? "active" : ""
                }`}
            >
              🎧 Atendimentos{renderMaintenanceBadge("/chamados")}
            </Link>
          )}

          {canAccess("contas") && (
            <Link
              to="/contas"
              onClick={(e) => handleNavClick(e, "/contas", "Gestão de Contas")}
              className={`nav-link ${location.pathname === "/contas" ? "active" : ""
                }`}
            >
              💳 Gestão de Contas{renderMaintenanceBadge("/contas")}
            </Link>
          )}

          {canAccess("fluxo") && (
            <Link
              to="/fluxo"
              onClick={(e) => handleNavClick(e, "/fluxo", "Fluxo de Caixa")}
              className={`nav-link ${location.pathname === "/fluxo" ? "active" : ""
                }`}
            >
              📈 Fluxo de Caixa{renderMaintenanceBadge("/fluxo")}
            </Link>
          )}

          {canAccess("simulador") && (
            <Link
              to="/simulador"
              onClick={(e) => handleNavClick(e, "/simulador", "Simulador de Créditos")}
              className={`nav-link ${location.pathname === "/simulador" ? "active" : ""
                }`}
            >
              🧮 Simulador{renderMaintenanceBadge("/simulador")}
            </Link>
          )}

          {canAccess("notas") && (
            <Link
              to="/notas"
              onClick={(e) => handleNavClick(e, "/notas", "Notas Fiscais")}
              className={`nav-link ${location.pathname === "/notas" ? "active" : ""
                }`}
            >
              📑 Notas Fiscais{renderMaintenanceBadge("/notas")}
            </Link>
          )}

          {canAccess("controle-notas") && (
            <Link
              to="/controle-notas"
              onClick={(e) => handleNavClick(e, "/controle-notas", "Controle de Notas")}
              className={`nav-link ${location.pathname === "/controle-notas" ? "active" : ""
                }`}
            >
              📋 Controle de Notas{renderMaintenanceBadge("/controle-notas")}
            </Link>
          )}

          {canAccess("ordem-servico") && (
            <Link
              to="/ordem-servico"
              onClick={(e) => handleNavClick(e, "/ordem-servico", "Ordem de Serviços")}
              className={`nav-link ${location.pathname === "/ordem-servico" ? "active" : ""
                }`}
            >
              🛠️ O.S{renderMaintenanceBadge("/ordem-servico")}
            </Link>
          )}

          {canAccess("contratos") && (
            <Link
              to="/contratos"
              onClick={(e) => handleNavClick(e, "/contratos", "Gestão de Contratos")}
              className={`nav-link ${location.pathname === "/contratos" ? "active" : ""
                }`}
            >
              📝 Contratos{renderMaintenanceBadge("/contratos")}
            </Link>
          )}

          {canAccess("contrato-internet") && (
            <Link
              to="/contrato-internet"
              onClick={(e) => handleNavClick(e, "/contrato-internet", "Contrato Internet")}
              className={`nav-link ${location.pathname === "/contrato-internet" ? "active" : ""
                }`}
            >
              🌐 Internet{renderMaintenanceBadge("/contrato-internet")}
            </Link>
          )}

          {canAccess("estoque") && (
            <Link
              to="/estoque"
              onClick={(e) => handleNavClick(e, "/estoque", "Controle de Estoque")}
              className={`nav-link ${location.pathname === "/estoque" ? "active" : ""
                }`}
            >
              📦 Estoque{renderMaintenanceBadge("/estoque")}
            </Link>
          )}

          {canAccess("prevencao") && (
            <Link
              to="/prevencao"
              onClick={(e) => handleNavClick(e, "/prevencao", "Prevenção de Perdas")}
              className={`nav-link ${location.pathname === "/prevencao" ? "active" : ""
                }`}
            >
              🛡️ Prevenção{renderMaintenanceBadge("/prevencao")}
            </Link>
          )}

          {canAccess("uniformes") && (
            <Link
              to="/uniformes"
              onClick={(e) => handleNavClick(e, "/uniformes", "Controle de Uniformes")}
              className={`nav-link ${location.pathname === "/uniformes" ? "active" : ""
                }`}
            >
              👔 Uniformes{renderMaintenanceBadge("/uniformes")}
            </Link>
          )}

          {canAccess("usuarios") && (
            <Link
              to="/admin/users"
              onClick={(e) => handleNavClick(e, "/admin/users", "Gerenciamento de Usuários")}
              className={`nav-link ${location.pathname === "/admin/users" ? "active" : ""
                }`}
            >
              👥 Usuários{renderMaintenanceBadge("/admin/users")}
            </Link>
          )}

          {canAccess("logs") && (
            <Link
              to="/admin/log"
              onClick={(e) => handleNavClick(e, "/admin/log", "Logs do Sistema")}
              className={`nav-link ${location.pathname === "/admin/log" ? "active" : ""
                }`}
            >
              📜 Logs{renderMaintenanceBadge("/admin/log")}
            </Link>
          )}
        </div>

        {/* ÁREA DO USUÁRIO */}
        <div className="user-area">
          {onOpenAccessModal && isFullAccess && (
            <button
              onClick={onOpenAccessModal}
              className="access-btn"
              title="Conceder ou cadastrar novos acessos"
            >
              ⚙️ Conceder / Criar Acesso
            </button>
          )}

          {/* TEMPO DE SESSÃO */}
          <div className="timer-badge" title="Sessão expira em">
            ⏳ {timeLeft}
          </div>

          {/* AVATAR */}
          <button
            onClick={handleOpenProfileModal}
            className="avatar-btn"
            title="Clique para editar seu perfil"
          >
            {userAvatar ? (
              <img
                src={userAvatar}
                alt="Perfil"
                className="avatar-img"
              />
            ) : (
              <span className="avatar-icon">👤</span>
            )}
          </button>

          {/* NOME */}
          <span className="user-name-text">
            Bem vindo, {userName}
          </span>

          {/* BOTÃO HAMBÚRGUER MOBILE / TABLET / SMARTPHONE */}
          <button
            type="button"
            className="mobile-hamburger-btn"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            title="Menu de Navegação"
            aria-label="Abrir Menu de Navegação"
          >
            {mobileMenuOpen ? "✕" : "☰"}
          </button>

          {/* SAIR */}
          <button onClick={handleLogout} className="logout-btn">
            Sair
          </button>
        </div>

        {/* OVERLAY DA ANIMAÇÃO DA AMPULHETA */}
        {isNavigating && (
          <div className="nav-loading-overlay">
            <div className="nav-loading-card">
              <div className="nav-hourglass-icon">⏳</div>
              <h3 className="nav-loading-title">Aguarde...</h3>
              <p className="nav-loading-subtitle">{loadingText}</p>
            </div>
          </div>
        )}

        {/* MODAL DE PERFIL */}
        {showProfileModal && (
          <div
            className="modal-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setShowProfileModal(false);
              }
            }}
          >
            <div className="modal-content" style={{ maxWidth: "440px" }}>
              <h3 className="modal-title">👤 Editar Perfil</h3>

              {/* Avatar com botão Alterar Tema ao lado */}
              <div className="modal-avatar-container-with-actions">
                <div
                  className="modal-avatar-wrapper"
                  onClick={() => fileInputRef.current?.click()}
                  title="Clique para alterar sua foto de perfil"
                >
                  {editAvatar ? (
                    <img
                      src={editAvatar}
                      alt="Preview Avatar"
                      className="modal-avatar-img"
                    />
                  ) : (
                    <div className="modal-avatar-placeholder">👤</div>
                  )}
                  <div className="avatar-edit-overlay">
                    <span className="avatar-pencil-icon">✏️</span>
                    <span className="avatar-edit-hint">Editar</span>
                  </div>
                </div>

                <button
                  type="button"
                  className="btn-modal-alterar-tema"
                  onClick={() => setShowThemeModal(true)}
                  title="Personalizar cores e tema do sistema"
                >
                  <span>🎨</span>
                  <span>Alterar Tema</span>
                </button>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  style={{ display: "none" }}
                />
              </div>

              <form onSubmit={handleSaveProfile}>
                <div className="field-group">
                  <label className="field-label">Nome Completo:</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    required
                    className="form-input"
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Número do WhatsApp:</label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(formatWhatsApp(e.target.value))}
                    className="form-input"
                  />
                </div>

                <div style={{ margin: "14px 0 10px", borderTop: "1px solid #334155", paddingTop: "12px" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>
                    🔒 Alteração de Senha (Opcional)
                  </span>
                </div>

                <div className="field-group">
                  <label className="field-label">Senha Antiga:</label>
                  <input
                    type="password"
                    placeholder="Digite sua senha atual"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Nova Senha:</label>
                  <input
                    type="password"
                    placeholder="Digite a nova senha"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="field-group">
                  <label className="field-label">Repetir Senha:</label>
                  <input
                    type="password"
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    onClick={() => setShowProfileModal(false)}
                    className="btn-cancel"
                  >
                    Cancelar
                  </button>
                  <button type="submit" className="btn-save">
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </nav>

      {/* MENU RESPONSIVO MOBILE / TABLET / SMARTPHONE */}
      {mobileMenuOpen && (
        <div className="mobile-navbar-dropdown" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-navbar-content" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-navbar-header">
              <span className="mobile-navbar-title">📱 Menu do Sistema</span>
              <button
                type="button"
                className="mobile-navbar-close"
                onClick={() => setMobileMenuOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="mobile-navbar-links">
              {canAccess("dashboard") && (
                <Link
                  to="/dashboard"
                  onClick={(e) => handleNavClick(e, "/dashboard", "Dashboard")}
                  className={`mobile-nav-item ${location.pathname === "/dashboard" ? "active" : ""}`}
                >
                  <span>📊</span> Dashboard{renderMaintenanceBadge("/dashboard")}
                </Link>
              )}
              {canAccess("chamados") && (
                <Link
                  to="/chamados"
                  onClick={(e) => handleNavClick(e, "/chamados", "Atendimentos / Chamados")}
                  className={`mobile-nav-item ${location.pathname === "/chamados" ? "active" : ""}`}
                >
                  <span>🎧</span> Atendimentos{renderMaintenanceBadge("/chamados")}
                </Link>
              )}
              {canAccess("contas") && (
                <Link
                  to="/contas"
                  onClick={(e) => handleNavClick(e, "/contas", "Gestão de Contas")}
                  className={`mobile-nav-item ${location.pathname === "/contas" ? "active" : ""}`}
                >
                  <span>💳</span> Gestão de Contas{renderMaintenanceBadge("/contas")}
                </Link>
              )}
              {canAccess("fluxo") && (
                <Link
                  to="/fluxo"
                  onClick={(e) => handleNavClick(e, "/fluxo", "Fluxo de Caixa")}
                  className={`mobile-nav-item ${location.pathname === "/fluxo" ? "active" : ""}`}
                >
                  <span>📈</span> Fluxo de Caixa{renderMaintenanceBadge("/fluxo")}
                </Link>
              )}
              {canAccess("simulador") && (
                <Link
                  to="/simulador"
                  onClick={(e) => handleNavClick(e, "/simulador", "Simulador de Créditos")}
                  className={`mobile-nav-item ${location.pathname === "/simulador" ? "active" : ""}`}
                >
                  <span>🧮</span> Simulador{renderMaintenanceBadge("/simulador")}
                </Link>
              )}
              {canAccess("notas") && (
                <Link
                  to="/notas"
                  onClick={(e) => handleNavClick(e, "/notas", "Notas Fiscais")}
                  className={`mobile-nav-item ${location.pathname === "/notas" ? "active" : ""}`}
                >
                  <span>📑</span> Notas Fiscais{renderMaintenanceBadge("/notas")}
                </Link>
              )}
              {canAccess("controle-notas") && (
                <Link
                  to="/controle-notas"
                  onClick={(e) => handleNavClick(e, "/controle-notas", "Controle de Notas")}
                  className={`mobile-nav-item ${location.pathname === "/controle-notas" ? "active" : ""}`}
                >
                  <span>📋</span> Controle de Notas{renderMaintenanceBadge("/controle-notas")}
                </Link>
              )}
              {canAccess("ordem-servico") && (
                <Link
                  to="/ordem-servico"
                  onClick={(e) => handleNavClick(e, "/ordem-servico", "Ordem de Serviços")}
                  className={`mobile-nav-item ${location.pathname === "/ordem-servico" ? "active" : ""}`}
                >
                  <span>🛠️</span> O.S{renderMaintenanceBadge("/ordem-servico")}
                </Link>
              )}
              {canAccess("contratos") && (
                <Link
                  to="/contratos"
                  onClick={(e) => handleNavClick(e, "/contratos", "Gestão de Contratos")}
                  className={`mobile-nav-item ${location.pathname === "/contratos" ? "active" : ""}`}
                >
                  <span>📝</span> Contratos{renderMaintenanceBadge("/contratos")}
                </Link>
              )}
              {canAccess("contrato-internet") && (
                <Link
                  to="/contrato-internet"
                  onClick={(e) => handleNavClick(e, "/contrato-internet", "Contrato Internet")}
                  className={`mobile-nav-item ${location.pathname === "/contrato-internet" ? "active" : ""}`}
                >
                  <span>🌐</span> Internet{renderMaintenanceBadge("/contrato-internet")}
                </Link>
              )}
              {canAccess("estoque") && (
                <Link
                  to="/estoque"
                  onClick={(e) => handleNavClick(e, "/estoque", "Controle de Estoque")}
                  className={`mobile-nav-item ${location.pathname === "/estoque" ? "active" : ""}`}
                >
                  <span>📦</span> Estoque{renderMaintenanceBadge("/estoque")}
                </Link>
              )}
              {canAccess("prevencao") && (
                <Link
                  to="/prevencao"
                  onClick={(e) => handleNavClick(e, "/prevencao", "Prevenção de Perdas")}
                  className={`mobile-nav-item ${location.pathname === "/prevencao" ? "active" : ""}`}
                >
                  <span>🛡️</span> Prevenção{renderMaintenanceBadge("/prevencao")}
                </Link>
              )}
              {canAccess("uniformes") && (
                <Link
                  to="/uniformes"
                  onClick={(e) => handleNavClick(e, "/uniformes", "Controle de Uniformes")}
                  className={`mobile-nav-item ${location.pathname === "/uniformes" ? "active" : ""}`}
                >
                  <span>👔</span> Uniformes{renderMaintenanceBadge("/uniformes")}
                </Link>
              )}
              {canAccess("usuarios") && (
                <Link
                  to="/admin/users"
                  onClick={(e) => handleNavClick(e, "/admin/users", "Gerenciamento de Usuários")}
                  className={`mobile-nav-item ${location.pathname === "/admin/users" ? "active" : ""}`}
                >
                  <span>👥</span> Usuários{renderMaintenanceBadge("/admin/users")}
                </Link>
              )}
              {canAccess("logs") && (
                <Link
                  to="/admin/log"
                  onClick={(e) => handleNavClick(e, "/admin/log", "Logs do Sistema")}
                  className={`mobile-nav-item ${location.pathname === "/admin/log" ? "active" : ""}`}
                >
                  <span>📜</span> Logs{renderMaintenanceBadge("/admin/log")}
                </Link>
              )}
              <div className="mobile-nav-divider"></div>
              <button
                type="button"
                className="mobile-nav-item logout"
                onClick={handleLogout}
              >
                <span>🚪</span> Sair da Conta
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EDIÇÃO DE TEMA */}
      <ModalEditarTema
        isOpen={showThemeModal}
        onClose={() => setShowThemeModal(false)}
      />
    </header>
  );
}