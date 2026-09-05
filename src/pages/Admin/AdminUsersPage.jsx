import React, { useState, useEffect, useRef, useMemo } from "react";
import { toast } from "react-toastify";
import {
  listUsers,
  updateUserRole,
  updateUserPassword,
  updateUserPermissions,
  resetPasswordRandom,
  ROLES,
  getUser,
} from "../../auth/auth";
import { api } from "../../api/client";
import { sendTelegramEvent } from "../../utils/telegram";
import { salvarConta, listarContas, sincronizarContasDoServidor } from "../../services/contasService";
import { calcularVencimentoMesAtual } from "../../services/bankPaymentService";
import "../../components/Visual/Admin.css";

export const FILIAIS = [
  "Filial 1",
  "Filial 2",
  "Filial 3",
  "Filial 4",
  "Filial 5",
  "Filial 6",
  "Filial 7",
  "Filial Particular",
];

export const SYSTEM_SCREENS = [
  { key: "dashboard", label: "Dashboard Principal", icon: "📊", path: "/dashboard", desc: "Indicadores, gráficos e resumo financeiro", isFixed: false },
  { key: "chamados", label: "Atendimento & Chamados", icon: "🎧", path: "/chamados", desc: "Suporte e abertura de chamados técnicos", isFixed: true },
  { key: "contas", label: "Gestão de Contas", icon: "💳", path: "/contas", desc: "Contas a pagar e receber, lançamentos", isFixed: false },
  { key: "fluxo", label: "Fluxo de Caixa", icon: "📈", path: "/fluxo", desc: "Entradas, saídas e projeções financeiras", isFixed: false },
  { key: "simulador", label: "Simulador de Créditos", icon: "🧮", path: "/simulador", desc: "Simulação de taxas, parcelas e juros", isFixed: false },
  { key: "notas", label: "Notas Fiscais (NF-e)", icon: "📑", path: "/notas", desc: "Emissão, consulta e upload de NF-e", isFixed: false },
  { key: "controle-notas", label: "Controle de Notas", icon: "📋", path: "/controle-notas", desc: "Registro, conferência e entrega de notas recebidas", isFixed: false },
  { key: "ordem-servico", label: "Ordem de Serviço (O.S)", icon: "🛠️", path: "/ordem-servico", desc: "Abertura, acompanhamento e fechamento de O.S", isFixed: false },
  { key: "contratos", label: "Gestão de Contratos", icon: "📝", path: "/contratos", desc: "Contratos gerais e clientes", isFixed: false },
  { key: "contrato-internet", label: "Contrato Internet / Provedor", icon: "🌐", path: "/contrato-internet", desc: "Planos e contratos de internet", isFixed: false },
  { key: "estoque", label: "Controle de Estoque", icon: "📦", path: "/estoque", desc: "Produtos, itens e movimentações", isFixed: false },
  { key: "prevencao", label: "Prevenção de Perdas", icon: "🛡️", path: "/prevencao", desc: "Registro e gestão de ocorrências e segurança", isFixed: false },
  { key: "uniformes", label: "Controle de Uniformes", icon: "👔", path: "/uniformes", desc: "Estoque de uniformes novos e usados por departamento", isFixed: false },
];

const FIXED_SCREEN_KEYS = ["chamados"];

const formatWhatsApp = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

const formatCPF = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  }
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
};

const validarCPF = (cpf) => {
  const clean = String(cpf || "").replace(/\D/g, "");
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean.charAt(i), 10) * (10 - i);
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean.charAt(i), 10) * (11 - i);
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
};

function formatarTempo(segundos) {
  if (segundos === null || segundos === undefined || isNaN(segundos)) {
    return "Sem registros";
  }
  const s = Math.max(0, Math.floor(segundos));
  if (s < 60) return `${s} seg${s === 1 ? "" : "s"}`;
  const min = Math.floor(s / 60);
  if (min < 60) {
    const restoS = s % 60;
    return restoS > 0 ? `${min} min ${restoS}s` : `${min} min`;
  }
  const horas = Math.floor(min / 60);
  const restoMin = min % 60;
  if (horas < 24) {
    return restoMin > 0 ? `${horas}h ${restoMin}m` : `${horas}h`;
  }
  const dias = Math.floor(horas / 24);
  const restoH = horas % 24;
  return restoH > 0 ? `${dias}d ${restoH}h` : `${dias} dia${dias > 1 ? "s" : ""}`;
}

function formatarDataHora(dt) {
  if (!dt) return "Sem registros";
  try {
    const d = new Date(dt);
    if (isNaN(d.getTime())) return "Sem registros";
    return d.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return String(dt);
  }
}

function obterIniciais(nome) {
  if (!nome || typeof nome !== "string") return "👤";
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function UserAvatarView({ user, isOnline }) {
  const [imgError, setImgError] = useState(false);
  const avatarSrc = user.avatar || user.foto;

  useEffect(() => {
    setImgError(false);
  }, [avatarSrc]);

  return (
    <div className="user-avatar-wrapper">
      {avatarSrc && !imgError ? (
        <img
          src={avatarSrc}
          alt={user.name}
          className="user-card-avatar-img"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="user-card-avatar-placeholder">
          <span>{obterIniciais(user.name)}</span>
        </div>
      )}
      <span
        className={`user-avatar-status-dot ${isOnline ? "online" : "offline"}`}
        title={isOnline ? "Online agora" : "Offline"}
      />
    </div>
  );
}

function MiniAvatarItem({ user }) {
  const [imgErr, setImgErr] = useState(false);
  const src = user.avatar || user.foto;
  if (src && !imgErr) {
    return (
      <img
        src={src}
        alt={user.name}
        className="filial-card-avatar-mini"
        title={user.name}
        onError={() => setImgErr(true)}
      />
    );
  }
  return (
    <div className="filial-card-avatar-mini" title={user.name}>
      {obterIniciais(user.name)}
    </div>
  );
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [loadingUser, setLoadingUser] = useState(null);
  const [nowTs, setNowTs] = useState(Date.now());

  // Estados do Modal de Edição de Acesso
  const [selectedUser, setSelectedUser] = useState(null);
  const [manualPassword, setManualPassword] = useState("");
  const [editAvatar, setEditAvatar] = useState(null);
  const [editFilial, setEditFilial] = useState("Filial 1");
  const [selectedPermissions, setSelectedPermissions] = useState(FIXED_SCREEN_KEYS);
  const [feedbackMsg, setFeedbackMsg] = useState({ text: "", type: "" });
  const modalFileInputRef = useRef(null);

  const gerarUsername = (texto) => {
    if (!texto) return "";
    const semAcentos = String(texto)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
    const partes = semAcentos.split(/\s+/).filter(Boolean);
    if (partes.length === 0) return "";
    if (partes.length === 1) return partes[0];
    return `${partes[0]}.${partes[partes.length - 1]}`;
  };

  // Estados do Modal de Cadastro de Novo Usuário pelo Admin
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newUserData, setNewUserData] = useState({
    nomeCompleto: "",
    username: "",
    cpf: "",
    dataNascimento: "",
    email: "",
    whatsapp: "",
    filial: "Filial 1",
    senha: "",
    confirmarSenha: "",
  });

  // Estados do Modal de Desconexão Geral
  const [showDisconnectAllModal, setShowDisconnectAllModal] = useState(false);
  const [isDisconnectingAll, setIsDisconnectingAll] = useState(false);

  const isMasterAdminAccount = (u) => {
    if (!u) return false;
    const email = String(u.email || "").toLowerCase().trim();
    const name = String(u.name || "").trim();
    return email === "jsa@jsa.com" || email === "josafa.santos.jss@gmail.com" || name === "JSA Admin";
  };

  const loadUsers = async () => {
    let apiList = [];
    try {
      const resp = await api.get("/users");
      if (Array.isArray(resp.data)) {
        apiList = resp.data;
      }
    } catch (e) {
      console.warn("Aviso ao buscar usuários via API:", e);
    }

    // Coleta todas as fontes locais de usuários já cadastrados ou logados
    let rawLocalUsers = [];
    try {
      const u1 = JSON.parse(localStorage.getItem("users") || "[]");
      if (Array.isArray(u1)) rawLocalUsers.push(...u1);
    } catch { }

    try {
      const u2 = JSON.parse(localStorage.getItem("auth_users") || "[]");
      if (Array.isArray(u2)) rawLocalUsers.push(...u2);
    } catch { }

    try {
      const u3 = JSON.parse(localStorage.getItem("user") || "null");
      if (u3 && u3.email) rawLocalUsers.push(u3);
    } catch { }

    try {
      const u4 = JSON.parse(localStorage.getItem("currentUser") || "null");
      if (u4 && u4.email) rawLocalUsers.push(u4);
    } catch { }

    const authList = listUsers() || [];
    rawLocalUsers.push(...authList);

    // Mapa unificado de todos os usuários indexado por e-mail
    const usersMap = new Map();

    // 1. Adiciona todos os usuários locais como base
    rawLocalUsers.forEach((lu) => {
      if (!lu || !lu.email) return;
      const emailKey = String(lu.email).trim().toLowerCase();

      let isLocalOnline = false;
      let localLastSeen = lu.lastSeenAt || lu.lastActive || lu.createdAt || null;
      try {
        const pRaw = localStorage.getItem(`user_presence_${emailKey}`);
        if (pRaw) {
          const p = JSON.parse(pRaw);
          if (p && p.lastSeen) {
            localLastSeen = new Date(p.lastSeen).toISOString();
            if (p.isOnline && Date.now() - p.lastSeen < 30000) {
              isLocalOnline = true;
            }
          }
        }
      } catch { }

      if (!usersMap.has(emailKey)) {
        usersMap.set(emailKey, {
          id: lu.id || Date.now(),
          name: lu.name || lu.nome || lu.nomeCompleto || emailKey.split("@")[0],
          surname: lu.surname || "",
          username: lu.username || "",
          email: lu.email,
          password: lu.password || lu.senha || "",
          whatsapp: lu.whatsapp || lu.telefone || "",
          telefone: lu.telefone || lu.cpf || "",
          role: "USER",
          filial: lu.filial || "Filial 1",
          permissions: lu.permissions || FIXED_SCREEN_KEYS,
          avatar: lu.avatar || lu.foto || null,
          foto: lu.avatar || lu.foto || null,
          isOnline: isLocalOnline,
          lastLoginAt: lu.lastLoginAt || lu.createdAt || null,
          lastSeenAt: localLastSeen,
          createdAt: lu.createdAt || null,
        });
      }
    });

    // 2. Sobrepõe com os dados de presença e dados em tempo real da API do MySQL
    apiList.forEach((au) => {
      if (!au || !au.email) return;
      const emailKey = String(au.email).trim().toLowerCase();
      const existing = usersMap.get(emailKey) || {};

      let isLocalOnline = false;
      let localLastSeen = null;
      try {
        const pRaw = localStorage.getItem(`user_presence_${emailKey}`);
        if (pRaw) {
          const p = JSON.parse(pRaw);
          if (p && p.lastSeen) {
            localLastSeen = new Date(p.lastSeen).toISOString();
            if (p.isOnline && Date.now() - p.lastSeen < 30000) {
              isLocalOnline = true;
            }
          }
        }
      } catch { }

      // Se veio da API MySQL, respeita o status retornado do servidor
      const isOnlineFinal = au.isOnline !== undefined ? Boolean(au.isOnline) : isLocalOnline;

      usersMap.set(emailKey, {
        ...existing,
        ...au,
        id: au.id || existing.id,
        name: au.name || existing.name || emailKey.split("@")[0],
        username: au.username || existing.username || "",
        email: au.email,
        password: existing.password || au.password || au.senha || "",
        whatsapp: au.whatsapp || existing.whatsapp || "",
        filial: au.filial || existing.filial || "Filial 1",
        avatar: au.avatar || existing.avatar || null,
        foto: au.avatar || existing.foto || null,
        permissions: au.permissions || existing.permissions || FIXED_SCREEN_KEYS,
        isOnline: isOnlineFinal,
        lastLoginAt: au.lastLoginAt || existing.lastLoginAt,
        lastSeenAt: au.lastSeenAt || localLastSeen || existing.lastSeenAt,
      });
    });

    // 3. Sincroniza em segundo plano no MySQL os usuários locais que ainda não constavam no banco
    usersMap.forEach((userObj, emailKey) => {
      const inApi = apiList.some((au) => String(au.email || "").trim().toLowerCase() === emailKey);
      if (!inApi && userObj.email) {
        api.post("/users", {
          name: userObj.name,
          email: userObj.email,
          password: userObj.password || "123456",
          whatsapp: userObj.whatsapp || null,
          telefone: userObj.telefone || null,
          role: isMasterAdminAccount(userObj) ? "admin" : "user",
          filial: userObj.filial || "Filial 1",
          avatar: userObj.avatar || null,
          permissions: userObj.permissions || FIXED_SCREEN_KEYS,
        }).catch(() => { });
      }
    });

    // 4. Remove contas dummy/fantasmas e duplicatas inválidas
    usersMap.delete("jsa.admin@gmail.com");
    usersMap.delete("symoncruz48@gmail.com");

    // Limpa do localStorage
    try {
      const raw = localStorage.getItem("users");
      if (raw) {
        const filtered = JSON.parse(raw).filter(
          (u) =>
            u &&
            String(u.email || "").toLowerCase() !== "symoncruz48@gmail.com" &&
            String(u.email || "").toLowerCase() !== "jsa.admin@gmail.com"
        );
        localStorage.setItem("users", JSON.stringify(filtered));
      }
    } catch { }

    const currentLoggedUser = getUser();

    // 5. REGRA RESTRITA: ÚNICO USUÁRIO COM ACESSO COMPLETO / ADMIN É O JSA ADMIN
    usersMap.forEach((u, key) => {
      if (isMasterAdminAccount(u) || key === "jsa@jsa.com" || key === "josafa.santos.jss@gmail.com") {
        u.role = ROLES.ADMIN;
        u.name = "JSA Admin";
        u.isOnline = true;
        u.lastSeenAt = new Date().toISOString();
        if (currentLoggedUser?.avatar) u.avatar = currentLoggedUser.avatar;
        if (currentLoggedUser?.foto) u.foto = currentLoggedUser.foto;
      } else {
        u.role = ROLES.USER;
      }
    });

    // Ordena: JSA Admin primeiro, depois usuários online, depois por nome
    const allUsersArray = Array.from(usersMap.values()).sort((a, b) => {
      const aIsMaster = isMasterAdminAccount(a);
      const bIsMaster = isMasterAdminAccount(b);
      if (aIsMaster && !bIsMaster) return -1;
      if (!aIsMaster && bIsMaster) return 1;

      if (a.isOnline === b.isOnline) {
        return (a.name || "").localeCompare(b.name || "");
      }
      return a.isOnline ? -1 : 1;
    });

    setUsers(allUsersArray);
  };

  useEffect(() => {
    loadUsers();

    // Atualiza o relógio a cada 1 segundo para tickers ao vivo
    const timerInterval = setInterval(() => {
      setNowTs(Date.now());
    }, 1000);

    // Consulta os status no banco a cada 5 segundos
    const pollInterval = setInterval(() => {
      loadUsers();
    }, 5000);

    // Escuta atualizações imediatas de status e foto de perfil
    const handleAvatarUpdate = () => loadUsers();
    window.addEventListener("profile_avatar_updated", handleAvatarUpdate);
    window.addEventListener("users_presence_updated", handleAvatarUpdate);
    window.addEventListener("storage", handleAvatarUpdate);

    return () => {
      clearInterval(timerInterval);
      clearInterval(pollInterval);
      window.removeEventListener("profile_avatar_updated", handleAvatarUpdate);
      window.removeEventListener("users_presence_updated", handleAvatarUpdate);
      window.removeEventListener("storage", handleAvatarUpdate);
    };
  }, []);

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.username?.toLowerCase().includes(term) ||
      u.filial?.toLowerCase().includes(term) ||
      u.role?.toLowerCase().includes(term)
    );
  });

  // Estados e agrupamento para os 8 Containers de Filiais
  const [filialModalOpen, setFilialModalOpen] = useState(null);
  const [filialModalSearch, setFilialModalSearch] = useState("");
  const [filtroFilialAtiva, setFiltroFilialAtiva] = useState("TODAS");

  // Agrupamento de TODOS os usuários por Filial para os 8 Containers
  const allUsersByFilial = useMemo(() => {
    const map = {};
    FILIAIS.forEach((f) => {
      map[f] = [];
    });
    users.forEach((u) => {
      const uFilial = u.filial && FILIAIS.includes(u.filial) ? u.filial : "Filial 1";
      if (!map[uFilial]) map[uFilial] = [];
      map[uFilial].push(u);
    });
    return map;
  }, [users]);

  // Usuários exibidos dentro do Modal da Filial Aberta (com suporte a busca local)
  const usersDaFilialAtual = useMemo(() => {
    if (!filialModalOpen) return [];
    const baseList = allUsersByFilial[filialModalOpen] || [];
    if (!filialModalSearch.trim()) return baseList;
    const term = filialModalSearch.toLowerCase().trim();
    return baseList.filter((u) => (
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.username?.toLowerCase().includes(term) ||
      u.whatsapp?.includes(term) ||
      u.role?.toLowerCase().includes(term)
    ));
  }, [allUsersByFilial, filialModalOpen, filialModalSearch]);

  const handleOpenFilialModal = (filial) => {
    setFilialModalOpen(filial);
    setFilialModalSearch("");
  };

  const handleOpenCreateForFilial = (filial) => {
    setNewUserData((prev) => ({
      ...prev,
      filial: filial && FILIAIS.includes(filial) ? filial : "Filial 1",
    }));
    setShowCreateModal(true);
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        if (selectedUser) {
          setSelectedUser(null);
        } else if (showCreateModal) {
          setShowCreateModal(false);
        } else if (showDisconnectAllModal) {
          setShowDisconnectAllModal(false);
        } else if (filialModalOpen) {
          setFilialModalOpen(null);
        }
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [selectedUser, showCreateModal, showDisconnectAllModal, filialModalOpen]);

  const handleOpenEdit = (user) => {
    setLoadingUser(user);
    setIsLoading(true);

    setTimeout(() => {
      setIsLoading(false);
      setSelectedUser(user);
      setManualPassword("");
      setEditAvatar(user.avatar || user.foto || null);
      setEditFilial(user.filial || "Filial 1");
      setFeedbackMsg({ text: "", type: "" });

      const validKeys = SYSTEM_SCREENS.map((s) => s.key);
      let rawPerms = [];
      if (user.permissions && Array.isArray(user.permissions)) {
        rawPerms = user.permissions;
      } else if (typeof user.permissions === "string") {
        try {
          rawPerms = JSON.parse(user.permissions);
        } catch { }
      }

      let perms = [];
      if (rawPerms.includes("*")) {
        perms = [...validKeys];
      } else {
        // Normaliza legados ('os' -> 'ordem-servico', 'inicio' -> 'dashboard') e filtra estritamente chaves válidas
        const normalized = rawPerms
          .map((k) => (k === "os" ? "ordem-servico" : k === "inicio" ? "dashboard" : k))
          .filter((k) => validKeys.includes(k));

        perms = Array.from(new Set([...normalized, ...FIXED_SCREEN_KEYS]));
      }

      setSelectedPermissions(perms);
      setLoadingUser(null);
    }, 1000);
  };

  const handleModalAvatarUpload = (e) => {
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
        toast.info("Foto selecionada! Clique em Salvar Alterações para confirmar.");
      };
    };

    reader.readAsDataURL(file);
  };

  // Alternar permissão de tela (telas fixas não podem ser desmarcadas)
  const handleTogglePermission = (screenKey) => {
    if (FIXED_SCREEN_KEYS.includes(screenKey)) {
      toast.info("🔒 Esta tela é padrão e fixa para todos os usuários.");
      return;
    }
    setSelectedPermissions((prev) => {
      if (prev.includes(screenKey)) {
        return prev.filter((k) => k !== screenKey);
      } else {
        return [...prev, screenKey];
      }
    });
  };

  const handleSelectAllPermissions = () => {
    setSelectedPermissions(SYSTEM_SCREENS.map((s) => s.key));
  };

  const handleClearAllPermissions = () => {
    setSelectedPermissions([...FIXED_SCREEN_KEYS]);
    toast.info("Mantida apenas a opção fixa padrão (Atendimento & Chamados).");
  };

  // Dispara o evento de revogação via localStorage
  const notificarLogoutUsuario = (email) => {
    localStorage.setItem(
      "senha_alterada_evento",
      JSON.stringify({
        email: email,
        timestamp: Date.now(),
      })
    );
  };

  // Função para desconectar usuário
  const handleDisconnectUser = async (user) => {
    if (isMasterAdminAccount(user)) {
      toast.warn("O Administrador Principal (JSA Admin) não pode ser desconectado por terceiros.");
      return;
    }

    const targetEmail = String(user.email || "").toLowerCase().trim();
    const targetUsername = String(user.username || "").toLowerCase().trim();
    const targetName = user.name || user.username || targetEmail;
    const targetId = user.id;

    // 1. Atualiza imediatamente a lista em tela para desconectado
    setUsers((prev) =>
      prev.map((u) => {
        const uEmail = String(u.email || "").toLowerCase().trim();
        const uUser = String(u.username || "").toLowerCase().trim();
        if (
          (targetEmail && uEmail === targetEmail) ||
          (targetUsername && uUser === targetUsername) ||
          (targetId && u.id === targetId)
        ) {
          return {
            ...u,
            isOnline: false,
            lastSeenAt: new Date().toISOString(),
          };
        }
        return u;
      })
    );

    // 2. Limpa dados de presença local
    try {
      if (targetEmail) {
        localStorage.removeItem(`user_presence_${targetEmail}`);
        localStorage.setItem(`user_presence_${targetEmail}`, JSON.stringify({ isOnline: false, lastSeen: Date.now() }));
      }
      if (targetUsername) {
        localStorage.removeItem(`user_presence_${targetUsername}`);
        localStorage.setItem(`user_presence_${targetUsername}`, JSON.stringify({ isOnline: false, lastSeen: Date.now() }));
      }
    } catch { }

    // 3. Atualiza nos arrays locais de usuários
    try {
      const raw = localStorage.getItem("users");
      if (raw) {
        const list = JSON.parse(raw);
        const updatedList = list.map((lu) => {
          const luEmail = String(lu.email || "").toLowerCase().trim();
          const luUser = String(lu.username || "").toLowerCase().trim();
          if (
            (targetEmail && luEmail === targetEmail) ||
            (targetUsername && luUser === targetUsername) ||
            (targetId && lu.id === targetId)
          ) {
            return { ...lu, isOnline: false, lastSeenAt: new Date().toISOString() };
          }
          return lu;
        });
        localStorage.setItem("users", JSON.stringify(updatedList));
      }
    } catch { }

    // 4. Envia para o backend MySQL com force: true
    try {
      await api.post("/auth/logout", {
        email: targetEmail,
        username: targetUsername,
        userId: targetId,
        force: true,
      });
    } catch (e) {
      console.warn("Aviso na API de logout:", e);
    }

    // 5. Notifica abas locais e máquinas remotas
    notificarLogoutUsuario(targetEmail);
    try {
      localStorage.setItem(
        "usuario_desconectado_admin",
        JSON.stringify({
          email: targetEmail,
          username: targetUsername,
          userId: targetId,
          timestamp: Date.now(),
        })
      );
    } catch { }

    window.dispatchEvent(
      new CustomEvent("force_user_logout", {
        detail: { email: targetEmail, username: targetUsername, userId: targetId },
      })
    );
    window.dispatchEvent(new CustomEvent("users_presence_updated"));

    toast.success(`Usuário ${targetName} foi desconectado com sucesso!`);

    await sendTelegramEvent({
      title: "Usuário Desconectado pelo Admin",
      emoji: "🚫",
      lines: [
        `Usuário: ${targetName}`,
        `Login: ${targetUsername || targetEmail}`,
        `Perfil: USER`,
        `Ação: Redirecionamento forçado para tela de login`,
      ],
    });

    setTimeout(() => {
      loadUsers();
    }, 500);
  };

  // Abre o Modal Customizado do Sistema para Desconexão Geral
  const handleDisconnectAllUsers = () => {
    setShowDisconnectAllModal(true);
  };

  // Executa a Desconexão Geral após confirmação no Modal do Sistema
  const handleConfirmDisconnectAll = async () => {
    setIsDisconnectingAll(true);
    try {
      // 1. Atualiza imediatamente a lista em tela para desconectados (exceto Master Admin)
      setUsers((prev) =>
        prev.map((u) => {
          if (isMasterAdminAccount(u)) return u;
          return {
            ...u,
            isOnline: false,
            lastSeenAt: new Date().toISOString(),
          };
        })
      );

      // 2. Limpa dados de presença local dos usuários
      try {
        const raw = localStorage.getItem("users");
        if (raw) {
          const list = JSON.parse(raw);
          const updated = list.map((lu) => {
            const emailKey = String(lu.email || "").toLowerCase().trim();
            if (emailKey !== "jsa@jsa.com" && emailKey !== "josafa.santos.jss@gmail.com") {
              try {
                localStorage.removeItem(`user_presence_${emailKey}`);
                localStorage.setItem(`user_presence_${emailKey}`, JSON.stringify({ isOnline: false, lastSeen: Date.now() }));
              } catch {}
              return { ...lu, isOnline: false, lastSeenAt: new Date().toISOString() };
            }
            return lu;
          });
          localStorage.setItem("users", JSON.stringify(updated));
        }
      } catch {}

      // 3. Executa a requisição no Backend MySQL para forçar logout de todos
      try {
        await api.post("/auth/disconnect-all");
      } catch (e) {
        console.warn("Aviso na API de disconnect-all:", e);
      }

      // 4. Notifica as outras abas e conexões em tempo real
      localStorage.setItem(
        "desconectar_todos_usuarios_evento",
        JSON.stringify({
          timestamp: Date.now(),
        })
      );

      window.dispatchEvent(
        new CustomEvent("force_user_logout", {
          detail: { all: true },
        })
      );
      window.dispatchEvent(new CustomEvent("users_presence_updated"));

      toast.success("✅ Todos os usuários foram desconectados com sucesso!");

      await sendTelegramEvent({
        title: "Desconexão Geral de Usuários",
        emoji: "🚨",
        lines: [
          "Ação: Desconectar TODOS os usuários",
          "Executado por: JSA Admin",
          "Status: Todos os operadores desconectados e enviados para o login",
        ],
      });

      setShowDisconnectAllModal(false);
      setTimeout(() => {
        loadUsers();
      }, 500);
    } catch (err) {
      console.error("Erro ao desconectar todos:", err);
      toast.error("Erro ao desconectar todos os usuários.");
    } finally {
      setIsDisconnectingAll(false);
    }
  };

  // Envio de Relatório Completo de Usuários e Credenciais para o Telegram (Exclusivo Admin)
  const handleEnviarRelatorioTelegram = async () => {
    const currentLogged = getUser();
    if (!currentLogged || !isMasterAdminAccount(currentLogged)) {
      toast.error("Acesso restrito: apenas o Administrador Principal pode emitir este relatório.");
      return;
    }

    if (!users || users.length === 0) {
      toast.warn("Nenhum usuário cadastrado para gerar o relatório.");
      return;
    }

    toast.info("Enviando relatório completo de usuários para o Telegram...");

    const linhasRelatorio = [
      `📊 <b>RESUMO GERAL DO SISTEMA</b>`,
      `Total Cadastrados: <b>${totalCadastrados}</b>`,
      `🟢 Online Agora: <b>${totalOnline}</b>`,
      `⚪ Desconectados: <b>${totalOffline}</b>`,
      `📅 Data/Hora: <b>${new Date().toLocaleString("pt-BR")}</b>`,
      `------------------------------------------`,
      `👥 <b>RELAÇÃO DE USUÁRIOS & CREDENCIAIS</b>`,
    ];

    users.forEach((u, index) => {
      const isOnline = Boolean(u.isOnline || u.is_currently_online || u.online);
      const userLogin = u.username || `${u.name?.toLowerCase().replace(/\s+/g, "") || "usuario"}.${u.surname?.toLowerCase().replace(/\s+/g, "") || ""}`;
      const statusIcon = isOnline ? "🟢 [ONLINE]" : "⚪ [OFFLINE]";
      const senhaInfo = u.password || u.senha || "(Criptografada / Não exposta)";

      linhasRelatorio.push(
        `\n<b>#${index + 1} - ${u.name || "Sem Nome"} ${u.surname || ""}</b>`,
        `  • <b>Login:</b> <code>${userLogin}</code>`,
        `  • <b>E-mail:</b> ${u.email || "-"}`,
        `  • <b>Senha:</b> <code>${senhaInfo}</code>`,
        `  • <b>Perfil:</b> ${isMasterAdminAccount(u) ? "👑 ADMIN (Master)" : "👤 USUÁRIO"}`,
        `  • <b>Status:</b> ${statusIcon}`,
        `  • <b>WhatsApp:</b> ${u.whatsapp || "-"}`
      );
    });

    try {
      await sendTelegramEvent({
        title: "Relatório de Usuários & Credenciais (Exclusivo Admin)",
        emoji: "🔐",
        screen: "Admin Usuários",
        lines: linhasRelatorio,
      });

      toast.success("Relatório com todos os usuários e credenciais enviado para o Telegram!");
    } catch (err) {
      console.error("Erro ao enviar relatório para o Telegram:", err);
      toast.error("Erro ao enviar relatório para o Telegram.");
    }
  };

  // Gerar Senha Aleatória no Campo
  const handleGenerateRandomPassword = () => {
    if (!selectedUser) return;
    const res = resetPasswordRandom(selectedUser.email);
    if (res && res.newPassword) {
      setManualPassword(res.newPassword);
      toast.success(`Nova senha gerada: ${res.newPassword}`);
      setFeedbackMsg({
        text: `Nova senha gerada: ${res.newPassword}`,
        type: "success",
      });
    }
  };

  // Salvar Todas as Alterações do Modal de Edição
  const handleSaveAll = async () => {
    if (!selectedUser) return;
    let changesMade = [];

    const targetEmail = selectedUser.email;
    const targetId = selectedUser.id;
    const isMasterAdmin = isMasterAdminAccount(selectedUser);
    const validKeys = SYSTEM_SCREENS.map((s) => s.key);

    const sanitizedSelected = selectedPermissions
      .map((k) => (k === "os" ? "ordem-servico" : k === "inicio" ? "dashboard" : k))
      .filter((k) => validKeys.includes(k));

    const finalPermissions = isMasterAdmin
      ? ["*"]
      : Array.from(new Set([...sanitizedSelected, ...FIXED_SCREEN_KEYS]));

    const totalTelasLiberadas = finalPermissions.includes("*")
      ? SYSTEM_SCREENS.length
      : finalPermissions.length;

    try {
      const payload = {
        id: targetId,
        name: selectedUser.name,
        surname: selectedUser.surname || null,
        username: selectedUser.username || null,
        email: targetEmail,
        role: isMasterAdmin ? "admin" : "user",
        filial: editFilial || "Filial 1",
        permissions: finalPermissions,
      };
      if (manualPassword.trim()) {
        payload.password = manualPassword.trim();
      }
      if (editAvatar !== undefined) {
        payload.avatar = editAvatar;
      }

      await api.put(`/users/${targetId || targetEmail || selectedUser.username || selectedUser.name}`, {
        ...payload,
        email: targetEmail,
      });
    } catch (apiErr) {
      console.warn("Aviso ao salvar usuário via API:", apiErr);
    }

    // 1. Atualizar Permissões e Filial no auth
    updateUserRole(targetId, isMasterAdmin ? ROLES.ADMIN : ROLES.USER, targetEmail);
    updateUserPermissions(targetId, finalPermissions, targetEmail);

    try {
      const rawUsers = localStorage.getItem("users");
      if (rawUsers) {
        const list = JSON.parse(rawUsers);
        const updated = list.map((u) => {
          const matchId = targetId && String(u.id) === String(targetId);
          const matchEmail = targetEmail && String(u.email || "").toLowerCase() === String(targetEmail).toLowerCase();
          const matchUser = selectedUser.username && String(u.username || "").toLowerCase() === String(selectedUser.username).toLowerCase();
          const matchName = selectedUser.name && String(u.name || "").toLowerCase() === String(selectedUser.name).toLowerCase();

          if (matchId || matchEmail || matchUser || matchName) {
            return {
              ...u,
              permissions: finalPermissions,
              role: isMasterAdmin ? "admin" : "user",
              filial: editFilial || "Filial 1",
              avatar: editAvatar !== undefined ? editAvatar : u.avatar,
              foto: editAvatar !== undefined ? editAvatar : u.foto,
            };
          }
          return u;
        });
        localStorage.setItem("users", JSON.stringify(updated));
        localStorage.setItem("auth_users", JSON.stringify(updated));
      }

      const curr = getUser();
      if (
        curr &&
        ((targetEmail && String(curr.email || "").toLowerCase() === String(targetEmail).toLowerCase()) ||
          (targetId && String(curr.id) === String(targetId)))
      ) {
        const updatedCurr = {
          ...curr,
          permissions: finalPermissions,
          role: isMasterAdmin ? "admin" : "user",
          filial: editFilial || "Filial 1",
        };
        if (editAvatar !== undefined) {
          updatedCurr.avatar = editAvatar;
          updatedCurr.foto = editAvatar;
        }
        localStorage.setItem("auth_user", JSON.stringify(updatedCurr));
        localStorage.setItem("user", JSON.stringify(updatedCurr));
        localStorage.setItem("currentUser", JSON.stringify(updatedCurr));
      }
    } catch { }

    // Atualiza imediatamente a lista em tela
    setUsers((prev) =>
      prev.map((u) => {
        const matchId = targetId && String(u.id) === String(targetId);
        const matchEmail = targetEmail && String(u.email || "").toLowerCase() === String(targetEmail).toLowerCase();
        const matchUser = selectedUser.username && String(u.username || "").toLowerCase() === String(selectedUser.username).toLowerCase();
        const matchName = selectedUser.name && String(u.name || "").toLowerCase() === String(selectedUser.name).toLowerCase();

        if (matchId || matchEmail || matchUser || matchName) {
          return {
            ...u,
            permissions: finalPermissions,
            role: isMasterAdmin ? "admin" : "user",
            filial: editFilial || "Filial 1",
            avatar: editAvatar !== undefined ? editAvatar : u.avatar,
            foto: editAvatar !== undefined ? editAvatar : u.foto,
          };
        }
        return u;
      })
    );

    changesMade.push(`Perfil: ${isMasterAdmin ? "ADMIN" : "USER"}`);
    changesMade.push(`Filial: ${editFilial || "Filial 1"}`);
    changesMade.push(`Telas: ${finalPermissions.includes("*") ? "Todas" : `${totalTelasLiberadas} ${totalTelasLiberadas === 1 ? 'liberada' : 'liberadas'}`}`);

    // 2. Atualizar Avatar na lista de usuários
    if (editAvatar !== undefined) {
      try {
        window.dispatchEvent(
          new CustomEvent("profile_avatar_updated", {
            detail: { email: targetEmail, avatar: editAvatar },
          })
        );
        changesMade.push("Foto atualizada");
      } catch { }
    }

    // 3. Atualizar Senha se preenchida/gerada
    if (manualPassword.trim()) {
      updateUserPassword(targetId, manualPassword.trim(), targetEmail);
      changesMade.push("Senha atualizada");
      notificarLogoutUsuario(selectedUser.email);
    }

    await sendTelegramEvent({
      title: "Permissões e Filial de Usuário Atualizadas",
      emoji: "🛡️",
      lines: [
        `Usuário: ${selectedUser.name}`,
        `Email: ${selectedUser.email}`,
        `Perfil: ${isMasterAdmin ? "ADMIN" : "USER"}`,
        `Filial: ${editFilial || "Filial 1"}`,
        `Telas Liberadas: ${finalPermissions.includes("*") ? "Todas (*)" : finalPermissions.join(", ")}`,
      ],
    });

    toast.success(`Alterações salvas com sucesso! (${changesMade.join(" | ")})`);
    setFeedbackMsg({
      text: `Alterações salvas com sucesso! (${changesMade.join(" | ")})`,
      type: "success",
    });
    loadUsers();
    setTimeout(() => {
      setSelectedUser(null);
    }, 1200);
  };

  // Cadastro de Novo Usuário pelo Admin
  const handleCreateUserSubmit = async (e) => {
    e.preventDefault();
    const { nomeCompleto, cpf, dataNascimento, email, whatsapp, senha, confirmarSenha } = newUserData;

    if (
      !nomeCompleto.trim() ||
      !email.trim() ||
      !whatsapp.trim() ||
      !senha ||
      !confirmarSenha
    ) {
      toast.warn("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    const partesNome = nomeCompleto.trim().split(/\s+/);
    if (partesNome.length < 2) {
      toast.warn("Por favor, informe o Nome Completo (Nome e Sobrenome).");
      return;
    }

    // CPF é opcional no cadastro feito pelo Admin
    if (cpf.trim() && !validarCPF(cpf)) {
      toast.error("CPF informado é inválido. Verifique os números digitados ou deixe em branco.");
      return;
    }

    if (senha !== confirmarSenha) {
      toast.error("As senhas digitadas não coincidem.");
      return;
    }

    if (senha.length < 3) {
      toast.warn("A senha deve ter no mínimo 3 caracteres.");
      return;
    }

    setIsCreating(true);
    const targetEmail = email.trim().toLowerCase();
    const targetNome = nomeCompleto.trim();
    const targetUsername = (newUserData.username?.trim() || gerarUsername(targetNome)).toLowerCase().replace(/\s+/g, ".");
    const targetCpf = cpf.trim();
    const targetWhatsapp = whatsapp.trim();
    const targetFilial = newUserData.filial || "Filial 1";
    const defaultPerms = [...FIXED_SCREEN_KEYS];

    try {
      try {
        await api.post("/users", {
          name: targetNome,
          username: targetUsername,
          email: targetEmail,
          password: senha,
          whatsapp: targetWhatsapp,
          telefone: targetCpf,
          role: "user",
          filial: targetFilial,
          permissions: defaultPerms,
        });
      } catch (apiErr) {
        if (apiErr.response && apiErr.response.status === 409) {
          toast.error(apiErr.response.data?.error || "Este usuário ou e-mail já está cadastrado!");
          setIsCreating(false);
          return;
        }
        console.warn("Aviso ao salvar usuário via API:", apiErr);
      }

      // Salva no localStorage
      const raw = localStorage.getItem("users");
      const usersList = raw ? JSON.parse(raw) : [];
      const newUserObj = {
        id: Date.now(),
        name: targetNome,
        nome: targetNome,
        username: targetUsername,
        cpf: targetCpf,
        documento: targetCpf,
        dataNascimento,
        email: targetEmail,
        whatsapp: targetWhatsapp,
        filial: targetFilial,
        password: senha,
        role: ROLES.USER,
        permissions: defaultPerms,
        createdAt: new Date().toISOString(),
      };

      const semEsse = usersList.filter((u) => {
        const uEmail = String(u.email || "").toLowerCase();
        const uUser = String(u.username || "").toLowerCase();
        return uEmail !== targetEmail && uUser !== targetUsername;
      });
      semEsse.push(newUserObj);
      localStorage.setItem("users", JSON.stringify(semEsse));

      await sendTelegramEvent({
        title: "Novo Usuário Cadastrado pelo Admin",
        emoji: "👤",
        screen: "Admin / Usuários",
        lines: [
          `Nome: ${targetNome}`,
          `CPF: ${targetCpf}`,
          `E-mail: ${targetEmail}`,
          `WhatsApp: ${targetWhatsapp}`,
          `Filial: ${targetFilial}`,
          `Perfil: USUÁRIO`,
          `Telas Padrão: Atendimento & Chamados`,
        ],
      });

      toast.success(`Usuário ${targetNome} cadastrado com sucesso!`);
      setShowCreateModal(false);
      setNewUserData({
        nomeCompleto: "",
        cpf: "",
        dataNascimento: "",
        email: "",
        whatsapp: "",
        senha: "",
        confirmarSenha: "",
      });
      loadUsers();
    } catch (err) {
      toast.error("Erro ao cadastrar usuário. Tente novamente.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleGerarFaturaManual = async (targetUser) => {
    if (!targetUser) return;
    try {
      const filialUser = targetUser.filial || "Filial 1";
      const isAdmin = targetUser.role === "admin" || targetUser.role === "ADMIN";
      const isFilialParticular = filialUser === "Filial Particular";

      if (!isAdmin && !isFilialParticular) {
        toast.info(`Apenas usuários da Filial Particular ou Administradores possuem cobrança de manutenção do sistema.`);
        return;
      }

      const hoje = new Date();
      const mesAnoAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}`;
      const vencimentoCiclo = calcularVencimentoMesAtual(hoje);

      const userEmail = String(targetUser.email || "").toLowerCase().trim();
      const userId = String(targetUser.id || "").trim();
      const userName = targetUser.name || targetUser.nome || targetUser.username || "Usuário";

      toast.info(`Verificando fatura de ${mesAnoAtual} para ${userName}...`);

      // 1. Sincroniza e busca faturas existentes
      const contasExistentes = (await sincronizarContasDoServidor()) || listarContas() || [];

      // 2. Checa se já existe fatura SYS deste mês para o usuário
      const jaExiste = contasExistentes.some((c) => {
        if (c.descricao !== "SYS_Liberação e Manutenção" || c.tipo !== "Pagar") return false;
        const cVenc = String(c.vencimento || "").slice(0, 7);
        if (cVenc !== mesAnoAtual) return false;

        const cEmail = String(c.userEmail || "").toLowerCase().trim();
        const cId = String(c.userId || "").trim();

        if (userEmail && cEmail && cEmail === userEmail) return true;
        if (userId && cId && cId === userId) return true;
        if (!cEmail && !cId && c.cliente === userName) return true;
        return false;
      });

      if (jaExiste) {
        toast.info(
          `A fatura SYS de ${mesAnoAtual} já está gerada para ${userName} e disponível na tela Contas.`
        );
        return;
      }

      // 3. Cria a nova fatura com status Pendente
      const novaFatura = {
        id: Date.now(),
        descricao: "SYS_Liberação e Manutenção",
        tipo: "Pagar",
        valor: 10.00,
        vencimento: vencimentoCiclo,
        status: "Pendente",
        observacao: `Fatura de Liberação e Manutenção Mensal (${mesAnoAtual})`,
        cliente: userName,
        userEmail: userEmail,
        userId: userId,
        filial: filialUser,
        editada: false,
      };

      const salva = await salvarConta(novaFatura, { silencioso: true });

      // Garante persistência no backend via API
      try {
        await api.post("/contas", salva || novaFatura);
      } catch (apiErr) {
        console.warn("Aviso ao persistir fatura gerada manualmente na API:", apiErr);
      }

      toast.success(
        `💳 Fatura de ${mesAnoAtual} (R$ 10,00) gerada com sucesso para ${userName}! Já está disponível na tela Contas do usuário.`
      );

      // 4. Notifica no Telegram
      sendTelegramEvent({
        title: "Fatura SYS Gerada Manualmente",
        emoji: "💳",
        screen: "Admin / Gerenciador de Usuários",
        lines: [
          `Colaborador: ${userName}`,
          `E-mail: ${userEmail || "Não informado"}`,
          `Filial: ${filialUser}`,
          `Valor: R$ 10,00`,
          `Vencimento: ${vencimentoCiclo}`,
          `Ciclo: ${mesAnoAtual}`,
        ],
      }).catch(() => {});

    } catch (err) {
      console.error("Erro ao gerar fatura manual:", err);
      toast.error("Erro ao gerar fatura para o usuário.");
    }
  };

  const totalCadastrados = users.length;
  const totalOnline = users.filter((u) => Boolean(u.isOnline || u.is_currently_online || u.online)).length;
  const totalOffline = Math.max(0, totalCadastrados - totalOnline);

  return (
    <div className="admin-container fade-in-page">
      {/* Header */}
      <div className="admin-header">
        <div>
          <h1 className="admin-title">👥 Usuários & Gerenciador de Telas</h1>
          <p className="admin-subtitle">
            Painel exclusivo do <strong>JSA Admin</strong> para liberação de módulos e monitoramento de presença em tempo real.
          </p>
        </div>
      </div>

      {/* Painel de Estatísticas em Tempo Real (Total, Online, Offline) */}
      <div className="users-stats-bar">
        <div className="stat-chip total">
          <span className="stat-icon">👥</span>
          <div className="stat-info">
            <span className="stat-label">Cadastrados</span>
            <span className="stat-value">{totalCadastrados}</span>
          </div>
        </div>

        <div className="stat-chip online">
          <span className="stat-icon">🟢</span>
          <div className="stat-info">
            <span className="stat-label">Conectados (Online)</span>
            <span className="stat-value" style={{ color: "#4ade80" }}>{totalOnline}</span>
          </div>
        </div>

        <div className="stat-chip offline">
          <span className="stat-icon">⚪</span>
          <div className="stat-info">
            <span className="stat-label">Desconectados (Offline)</span>
            <span className="stat-value" style={{ color: "#f87171" }}>{totalOffline}</span>
          </div>
        </div>
      </div>

      {/* Control Bar */}
      <div className="control-bar">
        <div className="search-box">
          <input
            type="text"
            placeholder="Buscar por nome ou e-mail..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <button className="search-btn" onClick={loadUsers}>
            🔄 Atualizar
          </button>
          <button
            className="create-user-btn"
            onClick={() => setShowCreateModal(true)}
          >
            ➕ Cadastrar Usuário
          </button>
          <button
            type="button"
            className="disconnect-all-btn"
            onClick={handleDisconnectAllUsers}
            title="Desconectar todos os operadores imediatamente (exceto Admin)"
            style={{
              background: "linear-gradient(135deg, #dc2626, #991b1b)",
              color: "#fff",
              border: "1px solid #ef4444",
              padding: "9px 16px",
              borderRadius: "8px",
              fontWeight: "bold",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              boxShadow: "0 2px 10px rgba(220, 38, 38, 0.3)",
              transition: "all 0.2s ease",
            }}
          >
            🚫 Desconectar Todos
          </button>
          {/* <button
            className="telegram-btn"
            onClick={handleEnviarRelatorioTelegram}
            title="Enviar relatório completo de usuários e credenciais para o Telegram (Exclusivo Admin)"
          >
            📲 Relatório no Telegram
          </button> */}
        </div>
      </div>

      {/* Barra de Navegação e Acesso Rápido às 8 Filiais */}
      <div
        className="filiais-nav-bar"
        style={{
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
          marginBottom: "22px",
          alignItems: "center",
          background: "rgba(15, 23, 42, 0.75)",
          padding: "12px 18px",
          borderRadius: "12px",
          border: "1px solid rgba(56, 189, 248, 0.2)",
          boxShadow: "0 4px 16px rgba(0, 0, 0, 0.25)",
        }}
      >
        <span style={{ fontSize: "12.5px", color: "#94a3b8", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
          <span>🏢</span> Containers por Filial:
        </span>

        <button
          type="button"
          onClick={() => setFiltroFilialAtiva("TODAS")}
          style={{
            background: filtroFilialAtiva === "TODAS" ? "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)" : "rgba(30, 41, 59, 0.7)",
            color: filtroFilialAtiva === "TODAS" ? "#ffffff" : "#cbd5e1",
            border: `1px solid ${filtroFilialAtiva === "TODAS" ? "#38bdf8" : "rgba(255, 255, 255, 0.1)"}`,
            padding: "5px 12px",
            borderRadius: "20px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          🌐 Todas as 8 Filiais ({searchTerm.trim() ? filteredUsers.length : users.length})
        </button>

        {FILIAIS.map((f) => {
          const count = allUsersByFilial[f]?.length || 0;
          const isSelected = filtroFilialAtiva === f;
          return (
            <button
              key={f}
              type="button"
              onClick={() => handleOpenFilialModal(f)}
              style={{
                background: isSelected ? "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)" : "rgba(30, 41, 59, 0.7)",
                color: isSelected ? "#ffffff" : "#cbd5e1",
                border: `1px solid ${isSelected ? "#38bdf8" : "rgba(255, 255, 255, 0.1)"}`,
                padding: "5px 12px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
              title={`Clique para abrir o modal de usuários da ${f}`}
            >
              <span>{f}</span>
              <span style={{ fontSize: "11px", opacity: 0.9, background: "rgba(0,0,0,0.35)", padding: "1px 6px", borderRadius: "10px", fontWeight: 700 }}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Os 8 Containers Individuais das Filiais em Grid */}
      <div className="filiais-grid-dashboard">
        {(filtroFilialAtiva === "TODAS" ? FILIAIS : [filtroFilialAtiva]).map((filial) => {
          const filialUsers = allUsersByFilial[filial] || [];
          const onlineCount = filialUsers.filter((u) => Boolean(u.isOnline || u.is_currently_online || u.online)).length;

          // Se houver busca no campo principal, checa correspondências nesta filial
          const matchingSearchCount = searchTerm.trim()
            ? filteredUsers.filter((u) => {
                const uFilial = u.filial && FILIAIS.includes(u.filial) ? u.filial : "Filial 1";
                return uFilial === filial;
              }).length
            : null;

          return (
            <div
              key={filial}
              className="filial-container-card"
              onClick={() => handleOpenFilialModal(filial)}
              title={`Clique para abrir o modal com os usuários cadastrados de ${filial}`}
            >
              <div>
                <div className="filial-card-header">
                  <div className="filial-card-icon-wrap">
                    🏢
                  </div>
                  <span className={`filial-card-online-badge ${onlineCount > 0 ? "online" : "offline"}`}>
                    <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: onlineCount > 0 ? "#4ade80" : "#64748b" }} />
                    {onlineCount > 0 ? `${onlineCount} Online` : "0 Online"}
                  </span>
                </div>

                <div style={{ marginTop: "14px" }}>
                  <h3 className="filial-card-title">{filial}</h3>
                  <p className="filial-card-desc">Clique para abrir o modal e gerenciar acessos</p>
                </div>
              </div>

              {/* Estatísticas do Container */}
              <div className="filial-card-stats-row">
                <div className="filial-card-stat-col">
                  <span className="filial-card-stat-label">Cadastrados</span>
                  <span className="filial-card-stat-value">
                    {filialUsers.length} {filialUsers.length === 1 ? "usuário" : "usuários"}
                  </span>
                </div>
                <div className="filial-card-stat-col" style={{ borderLeft: "1px solid rgba(255,255,255,0.08)", paddingLeft: "10px" }}>
                  <span className="filial-card-stat-label">Presença</span>
                  <span className="filial-card-stat-value" style={{ color: onlineCount > 0 ? "#4ade80" : "#94a3b8", fontSize: "13px" }}>
                    {onlineCount > 0 ? `🟢 ${onlineCount} ativo(s)` : "⚪ Offline"}
                  </span>
                </div>
              </div>

              {/* Pré-visualização de Avatares dos Colaboradores */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div className="filial-card-avatars-preview">
                  {filialUsers.slice(0, 4).map((u) => (
                    <MiniAvatarItem key={u.id || u.email} user={u} />
                  ))}
                  {filialUsers.length > 4 && (
                    <div className="filial-card-avatar-more">
                      +{filialUsers.length - 4}
                    </div>
                  )}
                  {filialUsers.length === 0 && (
                    <span style={{ fontSize: "11px", color: "#64748b", fontStyle: "italic" }}>
                      Nenhum colaborador
                    </span>
                  )}
                </div>

                {matchingSearchCount !== null && (
                  <span
                    style={{
                      fontSize: "11px",
                      background: matchingSearchCount > 0 ? "rgba(56, 189, 248, 0.2)" : "rgba(100, 116, 139, 0.2)",
                      color: matchingSearchCount > 0 ? "#38bdf8" : "#94a3b8",
                      padding: "2px 6px",
                      borderRadius: "6px",
                      fontWeight: 700,
                    }}
                  >
                    🔍 {matchingSearchCount} resultado{matchingSearchCount === 1 ? "" : "s"}
                  </span>
                )}
              </div>

              {/* Botão de Ação do Card */}
              <button
                type="button"
                className="filial-card-action-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpenFilialModal(filial);
                }}
              >
                <span>👥 Ver Usuários da Filial</span>
                <span>➔</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* MODAL DE USUÁRIOS DA FILIAL CLICADA */}
      {filialModalOpen && (
        <div
          className="filial-modal-overlay"
          onClick={() => setFilialModalOpen(null)}
        >
          <div
            className="filial-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header do Modal */}
            <div className="filial-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    width: "44px",
                    height: "44px",
                    borderRadius: "12px",
                    background: "linear-gradient(135deg, rgba(56, 189, 248, 0.2), rgba(37, 99, 235, 0.25))",
                    border: "1px solid rgba(56, 189, 248, 0.4)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "22px",
                    flexShrink: 0,
                  }}
                >
                  🏢
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <h2 style={{ margin: 0, fontSize: "19px", color: "#f8fafc", fontWeight: 800 }}>
                      {filialModalOpen}
                    </h2>
                    <span
                      style={{
                        fontSize: "11.5px",
                        padding: "2px 8px",
                        borderRadius: "12px",
                        background: usersDaFilialAtual.length > 0 ? "rgba(56, 189, 248, 0.15)" : "rgba(148, 163, 184, 0.1)",
                        color: usersDaFilialAtual.length > 0 ? "#38bdf8" : "#94a3b8",
                        border: `1px solid ${usersDaFilialAtual.length > 0 ? "rgba(56, 189, 248, 0.3)" : "rgba(148, 163, 184, 0.2)"}`,
                        fontWeight: 700,
                      }}
                    >
                      {usersDaFilialAtual.length} {usersDaFilialAtual.length === 1 ? "usuário" : "usuários"}
                    </span>
                    {usersDaFilialAtual.filter((u) => Boolean(u.isOnline || u.is_currently_online || u.online)).length > 0 && (
                      <span
                        style={{
                          fontSize: "11.5px",
                          padding: "2px 8px",
                          borderRadius: "12px",
                          background: "rgba(34, 197, 94, 0.15)",
                          color: "#4ade80",
                          border: "1px solid rgba(34, 197, 94, 0.3)",
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#4ade80" }} />
                        {usersDaFilialAtual.filter((u) => Boolean(u.isOnline || u.is_currently_online || u.online)).length} online
                      </span>
                    )}
                  </div>
                  <p style={{ margin: "2px 0 0 0", fontSize: "12px", color: "#94a3b8" }}>
                    Usuários cadastrados e designados para a {filialModalOpen}
                  </p>
                </div>
              </div>

              {/* Barra de Ações do Header do Modal */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <input
                  type="text"
                  placeholder={`Buscar em ${filialModalOpen}...`}
                  value={filialModalSearch}
                  onChange={(e) => setFilialModalSearch(e.target.value)}
                  style={{
                    background: "rgba(15, 23, 42, 0.8)",
                    border: "1px solid #334155",
                    borderRadius: "8px",
                    color: "#fff",
                    padding: "7px 12px",
                    fontSize: "12.5px",
                    outline: "none",
                    minWidth: "180px",
                  }}
                />

                <button
                  type="button"
                  onClick={() => handleOpenCreateForFilial(filialModalOpen)}
                  style={{
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    border: "none",
                    color: "#fff",
                    borderRadius: "8px",
                    padding: "7px 12px",
                    fontSize: "12px",
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "5px",
                    whiteSpace: "nowrap",
                  }}
                  title="Cadastrar novo usuário diretamente nesta filial"
                >
                  ➕ Novo Usuário
                </button>

                <button
                  type="button"
                  onClick={() => setFilialModalOpen(null)}
                  className="close-btn"
                  style={{
                    fontSize: "22px",
                    lineHeight: 1,
                    padding: "4px 8px",
                    color: "#94a3b8",
                    cursor: "pointer",
                  }}
                  title="Fechar (ESC)"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Corpo do Modal: Grid com os Cards Originais dos Usuários */}
            <div className="filial-modal-body">
              {usersDaFilialAtual.length === 0 ? (
                <div
                  style={{
                    textAlign: "center",
                    padding: "48px 20px",
                    background: "rgba(15, 23, 42, 0.4)",
                    borderRadius: "12px",
                    border: "1px dashed rgba(255, 255, 255, 0.12)",
                    color: "#94a3b8",
                    fontSize: "14px",
                  }}
                >
                  <span style={{ fontSize: "36px", display: "block", marginBottom: "10px" }}>👥</span>
                  Nenhum usuário encontrado para a <strong>{filialModalOpen}</strong>
                  {filialModalSearch ? ` com o termo "${filialModalSearch}"` : ""}.
                  <div style={{ marginTop: "16px" }}>
                    <button
                      type="button"
                      onClick={() => handleOpenCreateForFilial(filialModalOpen)}
                      className="create-user-btn"
                      style={{ margin: "0 auto", display: "inline-flex" }}
                    >
                      ➕ Cadastrar Usuário para {filialModalOpen}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="users-grid">
                  {usersDaFilialAtual.map((u) => {
                    const isMasterAdmin = isMasterAdminAccount(u);
                    const isOnline = Boolean(u.isOnline || u.is_currently_online || u.online);

                    // Cálculo do tempo de atividade (Online)
                    let tempoAtivoTexto = "-";
                    if (isOnline) {
                      const loginTs = u.lastLoginAt
                        ? new Date(u.lastLoginAt).getTime()
                        : (u.lastSeenAt ? new Date(u.lastSeenAt).getTime() : nowTs);
                      const segsAtivo = Math.max(0, Math.floor((nowTs - loginTs) / 1000));
                      tempoAtivoTexto = `Ativo há ${formatarTempo(segsAtivo)}`;
                    }

                    // Cálculo do tempo de inatividade (Offline)
                    let tempoInativoTexto = "-";
                    if (!isOnline) {
                      const ultimoVistoTs = u.lastSeenAt
                        ? new Date(u.lastSeenAt).getTime()
                        : (u.lastLogoutAt
                          ? new Date(u.lastLogoutAt).getTime()
                          : (u.lastLoginAt
                            ? new Date(u.lastLoginAt).getTime()
                            : (u.createdAt ? new Date(u.createdAt).getTime() : null)));

                      if (ultimoVistoTs) {
                        const segsInativo = Math.max(0, Math.floor((nowTs - ultimoVistoTs) / 1000));
                        tempoInativoTexto = `Offline há ${formatarTempo(segsInativo)}`;
                      } else {
                        tempoInativoTexto = "Sem registros de acesso";
                      }
                    }

                    return (
                      <div key={u.id || u.email} className="user-card" style={{ borderColor: isOnline ? "#38a169" : "#2a2a2a" }}>
                        {/* Header do Card */}
                        <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <div>
                            {isOnline ? (
                              <span className="status-badge status-online">
                                <span className="status-dot"></span> Online
                              </span>
                            ) : (
                              <span className="status-badge status-offline">
                                <span className="status-dot"></span> Offline
                              </span>
                            )}
                          </div>

                          <div>
                            {isMasterAdmin ? (
                              <span className="badge-admin">👑 JSA ADMIN</span>
                            ) : (
                              <span className="badge-user">👤 USUÁRIO</span>
                            )}
                          </div>
                        </div>

                        {/* Informações do Usuário */}
                        <div className="card-body">
                          {/* Topo do Card: Avatar do Usuário com Indicador */}
                          <div className="user-card-top">
                            <UserAvatarView user={u} isOnline={isOnline} />

                            <div className="user-card-title-group">
                              <h3 className="user-name" title={`${u.name} ${u.surname || ""}`}>
                                {u.name} {u.surname ? u.surname : ""}
                              </h3>
                              <span className="user-subtitle">ID #{u.id}</span>
                            </div>
                          </div>

                          <p className="user-detail">
                            <strong>Usuário (Login):</strong> <span style={{ color: "#38bdf8", fontFamily: "monospace", fontWeight: 700 }}>{u.username || `${u.name?.toLowerCase().replace(/\s+/g, '') || 'usuario'}.${u.surname?.toLowerCase().replace(/\s+/g, '') || ''}`}</span>
                          </p>
                          <p className="user-detail">
                            <strong>E-mail:</strong> {u.email}
                          </p>
                          <p className="user-detail" style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <strong>🏢 Filial:</strong>{" "}
                            <span
                              style={{
                                color: "#38bdf8",
                                fontWeight: 700,
                                background: "rgba(56, 189, 248, 0.12)",
                                border: "1px solid rgba(56, 189, 248, 0.3)",
                                borderRadius: "4px",
                                padding: "1px 8px",
                                fontSize: "12px",
                              }}
                            >
                              {u.filial || "Filial 1"}
                            </span>
                          </p>
                          {u.whatsapp && (
                            <p className="user-detail">
                              <strong>WhatsApp:</strong> {u.whatsapp}
                            </p>
                          )}

                          {/* Bloco de Atividade / Inatividade Detalhado */}
                          <div className="user-activity-box">
                            <div className="user-activity-row">
                              <span className="activity-label">
                                <span>⏱️</span> Tempo de Atividade:
                              </span>
                              <span
                                className="activity-value"
                                style={{ color: isOnline ? "#4ade80" : "#64748b" }}
                              >
                                {isOnline ? `🟢 ${tempoAtivoTexto}` : "Desconectado"}
                              </span>
                            </div>

                            <div className="user-activity-row">
                              <span className="activity-label">
                                <span>💤</span> Tempo de Inatividade:
                              </span>
                              <span
                                className="activity-value"
                                style={{ color: !isOnline ? "#f87171" : "#4ade80" }}
                              >
                                {!isOnline ? `⚪ ${tempoInativoTexto}` : "0s (Operando)"}
                              </span>
                            </div>

                            <div className="user-activity-row" style={{ borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "6px" }}>
                              <span className="activity-label" style={{ fontSize: "12px" }}>
                                <span>📅</span> Último Acesso:
                              </span>
                              <span style={{ fontSize: "12px", color: "#cbd5e1" }}>
                                {formatarDataHora(u.lastLoginAt || u.lastSeenAt || u.createdAt)}
                              </span>
                            </div>
                          </div>

                          {/* Telas Liberadas para o Usuário */}
                          <div style={{ marginTop: "10px", borderTop: "1px solid #283340", paddingTop: "8px" }}>
                            <span style={{ fontSize: "11px", fontWeight: 700, color: "#94a3b8", display: "block", marginBottom: "4px" }}>
                              🖥️ Telas Liberadas:
                            </span>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
                              {isMasterAdmin ? (
                                <span style={{ fontSize: "10.5px", background: "rgba(239, 68, 68, 0.2)", color: "#fca5a5", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: "4px", padding: "1px 6px", fontWeight: 700 }}>
                                  👑 Todas as Telas (*)
                                </span>
                              ) : (
                                SYSTEM_SCREENS.filter((s) => {
                                  const userPerms = Array.isArray(u.permissions) ? u.permissions : [];
                                  return userPerms.includes("*") || userPerms.includes(s.key) || s.isFixed;
                                }).map((s) => (
                                  <span
                                    key={s.key}
                                    style={{
                                      fontSize: "10.5px",
                                      background: s.key === "prevencao" ? "rgba(0, 210, 255, 0.15)" : "#1e2632",
                                      color: s.key === "prevencao" ? "#38bdf8" : "#cbd5e1",
                                      border: s.key === "prevencao" ? "1px solid rgba(0, 210, 255, 0.35)" : "1px solid #334155",
                                      borderRadius: "4px",
                                      padding: "1px 6px",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "3px",
                                    }}
                                  >
                                    {s.icon} {s.label.split(" ")[0]}
                                  </span>
                                ))
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Botões de Ação: Editar, Gerar Fatura e Desconectar */}
                        <div className="card-footer">
                          <button
                            type="button"
                            className="edit-btn"
                            onClick={() => handleOpenEdit(u)}
                            title={`Editar ${u.name || u.username}`}
                          >
                            📝 Editar
                          </button>
                          <button
                            type="button"
                            className="fatura-btn"
                            onClick={() => handleGerarFaturaManual(u)}
                            title={`Gerar fatura SYS do mês atual para ${u.name || u.username}`}
                          >
                            💳 Gerar Fatura
                          </button>
                          {!isMasterAdmin && (
                            <button
                              type="button"
                              className="disconnect-btn"
                              onClick={() => handleDisconnectUser(u)}
                              title={isOnline ? "Desconectar sessão imediatamente" : "Usuário já desconectado"}
                            >
                              🚫 Desconectar
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Rodapé do Modal */}
            <div className="filial-modal-footer">
              <span style={{ fontSize: "12.5px", color: "#94a3b8" }}>
                Mostrando <strong>{usersDaFilialAtual.length}</strong> de <strong>{allUsersByFilial[filialModalOpen]?.length || 0}</strong> colaboradores de {filialModalOpen}
              </span>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  onClick={() => handleOpenCreateForFilial(filialModalOpen)}
                  style={{
                    background: "rgba(56, 189, 248, 0.15)",
                    border: "1px solid rgba(56, 189, 248, 0.35)",
                    color: "#38bdf8",
                    padding: "6px 14px",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  ➕ Novo Usuário nesta Filial
                </button>
                <button
                  type="button"
                  onClick={() => setFilialModalOpen(null)}
                  style={{
                    background: "#334155",
                    border: "none",
                    color: "#fff",
                    padding: "6px 16px",
                    borderRadius: "8px",
                    fontSize: "12.5px",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Novo Usuário pelo Admin */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-card" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>➕ Cadastrar Novo Usuário</h2>
            </div>

            <form onSubmit={handleCreateUserSubmit}>
              <div className="create-user-grid-form" style={{ marginTop: "14px" }}>
                <div className="modal-section" style={{ margin: 0 }}>
                  <label className="modal-label">Nome Completo *</label>
                  <input
                    type="text"
                    placeholder="Ex: João da Silva"
                    value={newUserData.nomeCompleto}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewUserData({
                        ...newUserData,
                        nomeCompleto: val,
                        username: gerarUsername(val),
                      });
                    }}
                    required
                    className="modal-input"
                  />
                </div>

                <div className="modal-section" style={{ margin: 0 }}>
                  <label className="modal-label">Login (nome.sobrenome) *</label>
                  <input
                    type="text"
                    placeholder="nome.sobrenome"
                    value={newUserData.username}
                    onChange={(e) => setNewUserData({ ...newUserData, username: e.target.value.toLowerCase().replace(/\s+/g, ".") })}
                    required
                    className="modal-input"
                    style={{ fontFamily: "monospace", color: "#38bdf8", fontWeight: 600 }}
                  />
                </div>

                <div className="modal-section" style={{ margin: 0 }}>
                  <label className="modal-label">CPF (Opcional)</label>
                  <input
                    type="text"
                    placeholder="000.000.000-00 (Opcional)"
                    value={newUserData.cpf}
                    onChange={(e) => setNewUserData({ ...newUserData, cpf: formatCPF(e.target.value) })}
                    className="modal-input"
                  />
                </div>

                <div className="modal-section" style={{ margin: 0 }}>
                  <label className="modal-label">Data de Nascimento (Opcional)</label>
                  <input
                    type="date"
                    value={newUserData.dataNascimento}
                    onChange={(e) => setNewUserData({ ...newUserData, dataNascimento: e.target.value })}
                    className="modal-input"
                  />
                </div>

                <div className="modal-section" style={{ margin: 0 }}>
                  <label className="modal-label">E-mail *</label>
                  <input
                    type="email"
                    placeholder="usuario@jsa.com"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                    required
                    className="modal-input"
                  />
                </div>

                <div className="modal-section" style={{ margin: 0 }}>
                  <label className="modal-label">WhatsApp *</label>
                  <input
                    type="text"
                    placeholder="(00) 00000-0000"
                    value={newUserData.whatsapp}
                    onChange={(e) => setNewUserData({ ...newUserData, whatsapp: formatWhatsApp(e.target.value) })}
                    required
                    className="modal-input"
                  />
                </div>

                <div className="modal-section" style={{ margin: 0 }}>
                  <label className="modal-label">Filial *</label>
                  <select
                    value={newUserData.filial || "Filial 1"}
                    onChange={(e) => setNewUserData({ ...newUserData, filial: e.target.value })}
                    required
                    className="modal-input"
                    style={{
                      background: "#181d24",
                      color: "#38bdf8",
                      fontWeight: "bold",
                      cursor: "pointer",
                      width: "100%",
                      padding: "10px 12px",
                      borderRadius: "6px",
                      border: "1px solid #334155",
                    }}
                  >
                    {FILIAIS.map((f) => (
                      <option key={f} value={f}>
                        🏢 {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="modal-section" style={{ margin: 0 }}>
                  <label className="modal-label">Senha *</label>
                  <input
                    type="password"
                    placeholder="Mínimo 3 dígitos"
                    value={newUserData.senha}
                    onChange={(e) => setNewUserData({ ...newUserData, senha: e.target.value })}
                    required
                    className="modal-input"
                  />
                </div>

                <div className="modal-section" style={{ margin: 0 }}>
                  <label className="modal-label">Confirmar Senha *</label>
                  <input
                    type="password"
                    placeholder="Repita a senha"
                    value={newUserData.confirmarSenha}
                    onChange={(e) => setNewUserData({ ...newUserData, confirmarSenha: e.target.value })}
                    required
                    className="modal-input"
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: "20px" }}>
                <button type="submit" className="modal-btn modal-btn-save" disabled={isCreating}>
                  {isCreating ? "⏳ Cadastrando..." : "💾 Concluir Cadastro"}
                </button>
                <button type="button" className="modal-btn modal-btn-close" onClick={() => setShowCreateModal(false)}>
                  Fechar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Overlay de Loading (Ampulheta) */}
      {isLoading && (
        <div className="modal-overlay">
          <div className="loading-card">
            <div className="hourglass-icon">⏳</div>
            <h3 style={{ marginTop: "15px", color: "#fff" }}>
              Verificando permissões...
            </h3>
            <p style={{ color: "#aaa", fontSize: "14px", marginTop: "5px" }}>
              Carregando painel de acesso para <strong>{loadingUser?.name}</strong>
            </p>
          </div>
        </div>
      )}

      {/* Modal de Edição de Acesso */}
      {selectedUser && !isLoading && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-card edit-access-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header" style={{ marginBottom: "6px", display: "flex", justifyContent: "space-between", alignItems: "center", minWidth: 0, width: "100%" }}>
              <h2
                style={{
                  margin: 0,
                  fontSize: "16px",
                  color: "#f87171",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                  flex: 1,
                  minWidth: 0,
                }}
                title={`Editar Acesso: ${selectedUser.name}`}
              >
                Editar Acesso: {selectedUser.name}
              </h2>
            </div>

            {feedbackMsg.text && (
              <div className={`feedback-msg ${feedbackMsg.type}`} style={{ padding: "6px", fontSize: "13px", marginBottom: "6px" }}>
                {feedbackMsg.text}
              </div>
            )}

            {/* Painel Superior 100% Fluido em 2 Colunas (Foto/Perfil/Filial + Senha) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "8px", margin: "2px 0 6px 0", width: "100%", boxSizing: "border-box" }}>
              {/* Coluna Esquerda: Avatar + Nome + Perfil + Filial */}
              <div style={{ background: "#181d24", border: "1px solid #283340", borderRadius: "8px", padding: "8px 10px", display: "flex", flexDirection: "column", gap: "6px", minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "50%",
                      overflow: "hidden",
                      cursor: "pointer",
                      border: "2px solid #3b82f6",
                      position: "relative",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "#1e2632",
                    }}
                    onClick={() => modalFileInputRef.current?.click()}
                    title="Clique para alterar foto"
                  >
                    {editAvatar ? (
                      <img src={editAvatar} alt={selectedUser.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: "1rem", fontWeight: "bold", color: "#93c5fd" }}>
                        {obterIniciais(selectedUser.name)}
                      </span>
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "#f1f5f9",
                        display: "block",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                      title={selectedUser.name}
                    >
                      {selectedUser.name}
                    </span>
                    <span style={{ fontSize: "11px", color: isMasterAdminAccount(selectedUser) ? "#f87171" : "#94a3b8", display: "block" }}>
                      {isMasterAdminAccount(selectedUser) ? "👑 Administrador Master" : "👤 Operador de Sistema"}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => modalFileInputRef.current?.click()}
                    style={{
                      background: "rgba(59, 130, 246, 0.15)",
                      border: "1px solid #3b82f6",
                      color: "#93c5fd",
                      padding: "4px 8px",
                      borderRadius: "5px",
                      cursor: "pointer",
                      fontSize: "11px",
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    📷 Foto
                  </button>
                  {editAvatar && (
                    <button
                      type="button"
                      onClick={() => setEditAvatar(null)}
                      style={{
                        background: "rgba(239, 68, 68, 0.15)",
                        border: "1px solid #ef4444",
                        color: "#fca5a5",
                        padding: "4px 6px",
                        borderRadius: "5px",
                        cursor: "pointer",
                        fontSize: "11px",
                        flexShrink: 0,
                      }}
                      title="Remover foto"
                    >
                      🗑️
                    </button>
                  )}
                  <input
                    type="file"
                    ref={modalFileInputRef}
                    accept="image/*"
                    onChange={handleModalAvatarUpload}
                    style={{ display: "none" }}
                  />
                </div>

                {/* Seleção de Filial Integrada */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px", borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "4px", minWidth: 0 }}>
                  <label style={{ fontSize: "11.5px", color: "#94a3b8", fontWeight: 700, whiteSpace: "nowrap" }}>
                    🏢 Filial:
                  </label>
                  <select
                    value={editFilial}
                    onChange={(e) => setEditFilial(e.target.value)}
                    className="modal-input"
                    style={{
                      padding: "4px 8px",
                      background: "#11161d",
                      color: "#38bdf8",
                      fontWeight: "bold",
                      fontSize: "12px",
                      border: "1px solid #334155",
                      borderRadius: "5px",
                      cursor: "pointer",
                      height: "28px",
                      flex: 1,
                      minWidth: 0,
                    }}
                  >
                    {FILIAIS.map((f) => (
                      <option key={f} value={f}>
                        🏢 {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Coluna Direita: Alterar Senha */}
              <div style={{ background: "#181d24", border: "1px solid #283340", borderRadius: "8px", padding: "8px 10px", display: "flex", flexDirection: "column", justifyContent: "center", gap: "4px", minWidth: 0 }}>
                <label style={{ fontSize: "11.5px", color: "#94a3b8", fontWeight: 700 }}>
                  🔑 Alterar Senha do Usuário:
                </label>
                <div className="inline-form" style={{ display: "flex", gap: "6px", width: "100%", minWidth: 0 }}>
                  <input
                    type="text"
                    placeholder="Nova senha..."
                    value={manualPassword}
                    onChange={(e) => setManualPassword(e.target.value)}
                    className="modal-input"
                    style={{ padding: "4px 8px", fontSize: "12px", height: "28px", flex: 1, minWidth: 0 }}
                  />
                  <button
                    className="modal-btn modal-btn-generate"
                    onClick={handleGenerateRandomPassword}
                    type="button"
                    style={{ height: "28px", padding: "0 10px", fontSize: "11px", fontWeight: "bold", whiteSpace: "nowrap", flexShrink: 0 }}
                  >
                    ⚡ Gerar
                  </button>
                </div>
              </div>
            </div>

            {/* Seção 3: Permissões de Telas e Módulos do Sistema */}
            {!isMasterAdminAccount(selectedUser) && (() => {
              const countLiberadas = SYSTEM_SCREENS.filter(
                (s) => selectedPermissions.includes(s.key) || s.isFixed
              ).length;

              return (
                <div className="modal-section" style={{ marginTop: "5px" }}>
                  <div className="permissions-header-bar">
                    <div className="permissions-title-count">
                      <span>🖥️ Telas e Módulos do Sistema</span>
                      <span className="permissions-count-badge">
                        {countLiberadas} de {SYSTEM_SCREENS.length} {countLiberadas === 1 ? "liberada" : "liberadas"}
                      </span>
                    </div>

                    <div className="permissions-quick-actions">
                      <button
                        type="button"
                        className="quick-action-btn"
                        onClick={handleSelectAllPermissions}
                      >
                        ✅ Marcar Todas
                      </button>
                      <button
                        type="button"
                        className="quick-action-btn"
                        onClick={handleClearAllPermissions}
                        title="Voltar apenas para a tela padrão (Atendimento & Chamados)"
                      >
                        🔒 Padrão (Fixas)
                      </button>
                    </div>
                  </div>

                  <div className="permissions-grid-modal">
                    {SYSTEM_SCREENS.map((screen) => {
                      const isGranted = selectedPermissions.includes(screen.key) || screen.isFixed;
                      return (
                        <div
                          key={screen.key}
                          className={`permission-item-card ${isGranted ? "granted" : ""} ${screen.isFixed ? "fixed-card" : ""}`}
                          onClick={() => handleTogglePermission(screen.key)}
                          title={screen.isFixed ? "Tela fixa padrão para todos os usuários" : screen.desc}
                        >
                          <div className="permission-item-left">
                            <span className="permission-item-icon">{screen.icon}</span>
                            <div className="permission-item-info">
                              <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                <span className="permission-item-name">{screen.label}</span>
                                {screen.isFixed && (
                                  <span style={{ fontSize: "10px", background: "rgba(59, 130, 246, 0.2)", color: "#60a5fa", padding: "1px 5px", borderRadius: "4px", fontWeight: "bold" }}>
                                    FIXA
                                  </span>
                                )}
                              </div>
                              <span className="permission-item-route">{screen.path}</span>
                            </div>
                          </div>

                          <div className="permission-switch" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Rodapé do Modal */}
            <div className="modal-footer" style={{ marginTop: "15px" }}>
              <button className="modal-btn modal-btn-save" onClick={handleSaveAll}>
                💾 Salvar Alterações
              </button>
              <button className="modal-btn modal-btn-close" onClick={() => setSelectedUser(null)}>
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Customizado do Sistema: Confirmar Desconectar Todos os Usuários */}
      {showDisconnectAllModal && (
        <div className="modal-overlay" onClick={() => !isDisconnectingAll && setShowDisconnectAllModal(false)}>
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "460px",
              width: "92%",
              padding: "22px 24px",
              borderRadius: "14px",
              background: "linear-gradient(145deg, #1b1e24 0%, #13161a 100%)",
              border: "1px solid rgba(239, 68, 68, 0.4)",
              boxShadow: "0 12px 40px rgba(0, 0, 0, 0.7), 0 0 25px rgba(220, 38, 38, 0.2)",
              textAlign: "center",
              boxSizing: "border-box",
            }}
          >
            <div
              style={{
                width: "54px",
                height: "54px",
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.15)",
                border: "2px solid #ef4444",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "26px",
                margin: "0 auto 12px auto",
              }}
            >
              ⚠️
            </div>

            <h3 style={{ margin: "0 0 8px 0", fontSize: "18px", color: "#f87171", fontWeight: 800 }}>
              Desconectar Todos os Usuários
            </h3>

            <p style={{ margin: "0 0 14px 0", fontSize: "13.5px", color: "#cbd5e1", lineHeight: 1.5 }}>
              Tem certeza que deseja desconectar <strong>TODOS os usuários</strong> do sistema agora?
            </p>

            <div
              style={{
                background: "rgba(0, 0, 0, 0.35)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                borderRadius: "8px",
                padding: "10px 14px",
                marginBottom: "18px",
                textAlign: "left",
                fontSize: "12px",
                color: "#94a3b8",
                lineHeight: 1.45,
              }}
            >
              <p style={{ margin: "0 0 6px 0", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🔄</span> <span>Todos os operadores e usuários online serão deslogados imediatamente e redirecionados para a tela de login.</span>
              </p>
              <p style={{ margin: 0, display: "flex", alignItems: "center", gap: "6px", color: "#38bdf8", fontWeight: 600 }}>
                <span>👑</span> <span>O seu acesso de ADMIN permanecerá 100% ativo.</span>
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                disabled={isDisconnectingAll}
                onClick={handleConfirmDisconnectAll}
                style={{
                  flex: 1,
                  height: "42px",
                  background: isDisconnectingAll
                    ? "#555"
                    : "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
                  color: "#fff",
                  border: "none",
                  borderRadius: "8px",
                  fontWeight: "bold",
                  fontSize: "13.5px",
                  cursor: isDisconnectingAll ? "not-allowed" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px",
                  boxShadow: "0 4px 12px rgba(220, 38, 38, 0.35)",
                  transition: "all 0.2s ease",
                }}
              >
                {isDisconnectingAll ? "⏳ Desconectando..." : "🚫 Sim, Desconectar"}
              </button>

              <button
                type="button"
                disabled={isDisconnectingAll}
                onClick={() => setShowDisconnectAllModal(false)}
                style={{
                  flex: 1,
                  height: "42px",
                  background: "#242b35",
                  color: "#cbd5e1",
                  border: "1px solid #334155",
                  borderRadius: "8px",
                  fontWeight: 600,
                  fontSize: "13.5px",
                  cursor: isDisconnectingAll ? "not-allowed" : "pointer",
                  transition: "all 0.2s ease",
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}