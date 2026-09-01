import React, { useState, useEffect, useMemo } from "react";
import "../../components/Visual/log.css";
import {
  getLogs,
  clearLogs,
  sincronizarLogsDoServidor,
} from "../../utils/logger";
import { api } from "../../api/client";

const SCREEN_MODULES = [
  { label: "Todos", key: "Todos", icon: "🌐" },
  { label: "Prevenção", key: "Prevenção", icon: "🛡️" },
  { label: "Atendimento", key: "Atendimento", icon: "💬" },
  { label: "Contas", key: "Contas", icon: "📊" },
  { label: "Fluxo de Caixa", key: "Fluxo de Caixa", icon: "💰" },
  { label: "Estoque", key: "Estoque", icon: "📦" },
  { label: "Simulador", key: "Simulador", icon: "🧮" },
  { label: "Notas Fiscais", key: "Notas Fiscais", icon: "📄" },
  { label: "O.S", key: "O.S", icon: "🛠️" },
  { label: "Contratos", key: "Contratos", icon: "📜" },
  { label: "Usuários", key: "Usuários", icon: "👥" },
  { label: "Sistema", key: "Sistema", icon: "⚙️" },
];

export default function Log() {
  const [logsList, setLogsList] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [activeModuleFilter, setActiveModuleFilter] = useState("Todos");

  // Carrega logs do servidor e lista unificada de usuários cadastrados
  const fetchAllData = async () => {
    setLoading(true);
    try {
      // 1. Sincroniza logs do backend MySQL + localStorage
      const serverLogs = await sincronizarLogsDoServidor();
      const localLogs = getLogs();
      
      const mapLogs = new Map();
      [...(Array.isArray(serverLogs) ? serverLogs : []), ...(Array.isArray(localLogs) ? localLogs : [])].forEach((l) => {
        if (l && l.id) {
          mapLogs.set(String(l.id), l);
        }
      });
      const unifiedLogs = Array.from(mapLogs.values()).sort(
        (a, b) => new Date(b.ts || b.createdAt || 0) - new Date(a.ts || a.createdAt || 0)
      );
      setLogsList(unifiedLogs);

      // 2. Busca todos os usuários cadastrados do MySQL
      let apiUsers = [];
      try {
        const respUsers = await api.get("/users");
        if (Array.isArray(respUsers.data)) {
          apiUsers = respUsers.data;
        }
      } catch (err) {
        console.warn("Aviso ao buscar usuários via API:", err.message);
      }

      // 3. Mescla com usuários locais do localStorage
      const localUsersRaw = [];
      try {
        const u1 = JSON.parse(localStorage.getItem("users") || "[]");
        if (Array.isArray(u1)) localUsersRaw.push(...u1);
      } catch {}
      try {
        const u2 = JSON.parse(localStorage.getItem("auth_users") || "[]");
        if (Array.isArray(u2)) localUsersRaw.push(...u2);
      } catch {}
      try {
        const u3 = JSON.parse(localStorage.getItem("user") || "null");
        if (u3 && u3.email) localUsersRaw.push(u3);
      } catch {}

      const usersMap = new Map();

      // Base com usuários locais
      localUsersRaw.forEach((lu) => {
        if (!lu || !lu.email) return;
        const key = String(lu.email).trim().toLowerCase();
        let isLocalOnline = false;
        try {
          const pRaw = localStorage.getItem(`user_presence_${key}`);
          if (pRaw) {
            const p = JSON.parse(pRaw);
            if (p && p.isOnline && Date.now() - p.lastSeen < 35000) {
              isLocalOnline = true;
            }
          }
        } catch {}

        if (!usersMap.has(key)) {
          const generatedUsername = lu.username || `${lu.name?.toLowerCase().replace(/\s+/g, "") || "usuario"}.${lu.surname?.toLowerCase().replace(/\s+/g, "") || ""}`;
          usersMap.set(key, {
            id: lu.id || key,
            name: lu.name || lu.nome || lu.nomeCompleto || key.split("@")[0],
            surname: lu.surname || "",
            username: generatedUsername,
            email: lu.email,
            role: lu.role || "USER",
            isOnline: Boolean(lu.isOnline || isLocalOnline),
            lastLoginAt: lu.lastLoginAt || lu.createdAt || null,
            lastSeenAt: lu.lastSeenAt || null,
            createdAt: lu.createdAt || null,
          });
        }
      });

      // Sobrepõe com dados da API do MySQL
      apiUsers.forEach((au) => {
        if (!au || !au.email) return;
        const key = String(au.email).trim().toLowerCase();
        const existing = usersMap.get(key) || {};
        const generatedUsername = au.username || existing.username || `${au.name?.toLowerCase().replace(/\s+/g, "") || "usuario"}.${au.surname?.toLowerCase().replace(/\s+/g, "") || ""}`;

        usersMap.set(key, {
          ...existing,
          ...au,
          id: au.id || existing.id || key,
          name: au.name || existing.name || key.split("@")[0],
          surname: au.surname || existing.surname || "",
          username: generatedUsername,
          email: au.email,
          role: au.role || existing.role || "USER",
          isOnline: au.isOnline !== undefined ? Boolean(au.isOnline) : Boolean(existing.isOnline),
          lastLoginAt: au.lastLoginAt || existing.lastLoginAt,
          lastSeenAt: au.lastSeenAt || existing.lastSeenAt,
          createdAt: au.createdAt || existing.createdAt,
        });
      });

      // Também adiciona quaisquer usuários presentes nos logs que não estavam no cadastro
      unifiedLogs.forEach((l) => {
        const email = l.userEmail;
        if (!email || email === "sem_email@sistema.com") return;
        const key = String(email).trim().toLowerCase();
        if (!usersMap.has(key)) {
          usersMap.set(key, {
            id: l.userId || key,
            name: l.userName || key.split("@")[0],
            surname: "",
            username: l.userLogin || key.split("@")[0],
            email: email,
            role: "USER",
            isOnline: false,
            lastLoginAt: l.ts || null,
            lastSeenAt: l.ts || null,
            createdAt: l.ts || null,
          });
        }
      });

      setAllUsers(Array.from(usersMap.values()));
    } catch (e) {
      console.error("Erro ao carregar dados de logs e usuários:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape" && selectedUser) setSelectedUser(null);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [selectedUser]);

  const handleClearAll = async () => {
    if (window.confirm("Deseja realmente apagar todos os logs registrados no sistema?")) {
      clearLogs();
      setLogsList([]);
      setSelectedUser(null);
      await fetchAllData();
    }
  };

  // Mapeia logs para cada usuário cadastrado
  const usersWithLogs = useMemo(() => {
    return allUsers.map((u) => {
      const uEmail = String(u.email || "").toLowerCase().trim();
      const uUser = String(u.username || "").toLowerCase().trim();
      const uId = u.id ? String(u.id) : null;
      const uName = String(u.name || "").toLowerCase().trim();

      const userLogs = logsList.filter((l) => {
        const lEmail = String(l.userEmail || "").toLowerCase().trim();
        const lUser = String(l.userLogin || "").toLowerCase().trim();
        const lId = l.userId ? String(l.userId) : null;
        const lName = String(l.userName || "").toLowerCase().trim();

        return (
          (uEmail && lEmail && uEmail === lEmail) ||
          (uUser && lUser && uUser === lUser) ||
          (uId && lId && uId === lId) ||
          (uName && lName && uName === lName)
        );
      });

      // Se não tiver ações manuais, insere log de cadastro do sistema
      if (userLogs.length === 0) {
        userLogs.push({
          id: `init_${u.id || uEmail}`,
          ts: u.createdAt || u.lastLoginAt || new Date().toISOString(),
          formattedDate: new Date(u.createdAt || u.lastLoginAt || Date.now()).toLocaleString("pt-BR"),
          type: "Sistema",
          screen: "Usuários",
          title: "Cadastro no Sistema",
          details: "Conta cadastrada e liberada com permissões configuradas.",
          userName: u.name,
          userEmail: u.email,
        });
      }

      const lastLog = userLogs[0];
      const lastActivity = lastLog?.formattedDate || (lastLog?.ts ? new Date(lastLog.ts).toLocaleString("pt-BR") : "-");

      return {
        ...u,
        logs: userLogs,
        totalActions: userLogs.length,
        lastActivity,
      };
    });
  }, [allUsers, logsList]);

  // Filtragem dos Cards pelo termo pesquisado
  const filteredUsers = useMemo(() => {
    const search = searchInput.toLowerCase().trim();
    if (!search) return usersWithLogs;

    return usersWithLogs.filter((u) => {
      const name = String(u.name || "").toLowerCase();
      const email = String(u.email || "").toLowerCase();
      const username = String(u.username || "").toLowerCase();
      const role = String(u.role || "").toLowerCase();

      return (
        name.includes(search) ||
        email.includes(search) ||
        username.includes(search) ||
        role.includes(search)
      );
    });
  }, [usersWithLogs, searchInput]);

  // Totalizadores
  const totalCadastrados = allUsers.length;
  const totalOnline = allUsers.filter((u) => u.isOnline).length;
  const totalAcoes = logsList.length;

  // Logs filtrados no modal do usuário selecionado
  const getUserModalLogs = () => {
    if (!selectedUser) return [];
    const found = usersWithLogs.find((u) => u.email === selectedUser.email);
    const userLogs = found ? found.logs : [];

    if (activeModuleFilter === "Todos") return userLogs;

    const filterKey = activeModuleFilter.toLowerCase();
    return userLogs.filter((l) => {
      const screen = String(l.screen || "").toLowerCase();
      const type = String(l.type || "").toLowerCase();
      return screen.includes(filterKey) || type.includes(filterKey);
    });
  };

  // Exportar logs específicos do usuário atual do modal para .TXT
  const handleExportUserLogs = () => {
    if (!selectedUser) return;
    const modalLogs = getUserModalLogs();

    if (modalLogs.length === 0) {
      alert("Não há registros para exportar com o filtro selecionado.");
      return;
    }

    let content = `========================================================\n`;
    content += `JSA TI - HISTÓRICO DE LOGS DO USUÁRIO\n`;
    content += `USUÁRIO: ${selectedUser.name} ${selectedUser.surname || ""}\n`;
    content += `LOGIN: ${selectedUser.username || "-"}\n`;
    content += `E-MAIL: ${selectedUser.email}\n`;
    content += `MÓDULO: ${activeModuleFilter.toUpperCase()}\n`;
    content += `DATA DO GERAMENTO: ${new Date().toLocaleString("pt-BR")}\n`;
    content += `========================================================\n\n`;

    modalLogs.forEach((l, idx) => {
      const strDetails =
        typeof l.details === "object" ? JSON.stringify(l.details) : String(l.details || "");

      content += `[#${idx + 1}] DATA/HORA: ${l.formattedDate || l.ts}\n`;
      content += `TELA/MÓDULO: ${l.screen || l.type || "Sistema"}\n`;
      content += `AÇÃO: ${l.title}\n`;
      content += `DETALHES: ${strDetails}\n`;
      content += `--------------------------------------------------------\n`;
    });

    const fileName = `Log_${selectedUser.name.replace(/\s+/g, "_")}_${activeModuleFilter}.txt`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
  };

  return (
    <div className="logs-container fade-in-page">
      {/* CABEÇALHO */}
      <div className="logs-header">
        <div>
          <h2 className="logs-title">📋 Logs e Auditoria do Sistema</h2>
          <p style={{ margin: "4px 0 0 0", color: "#a2a3b7", fontSize: 13 }}>
            Rastreamento de atividades, acessos e ações de todos os usuários cadastrados.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={fetchAllData} className="btn-search" style={{ backgroundColor: "#2563eb" }}>
            🔄 Atualizar
          </button>
          <button onClick={handleClearAll} className="btn-danger-outline">
            🗑️ Limpar Todos os Logs
          </button>
        </div>
      </div>

      {/* CARDS DE RESUMO / ESTATÍSTICAS */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 16,
        marginBottom: 20
      }}>
        <div style={{
          backgroundColor: "#1a1d28",
          border: "1px solid #282c3c",
          borderRadius: 8,
          padding: 16,
          display: "flex",
          alignItems: "center",
          gap: 14
        }}>
          <span style={{ fontSize: 28 }}>👥</span>
          <div>
            <div style={{ fontSize: 12, color: "#a2a3b7" }}>Usuários Cadastrados</div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#fff" }}>{totalCadastrados}</div>
          </div>
        </div>

        <div style={{
          backgroundColor: "#1a1d28",
          border: "1px solid #282c3c",
          borderRadius: 8,
          padding: 16,
          display: "flex",
          alignItems: "center",
          gap: 14
        }}>
          <span style={{ fontSize: 28 }}>🟢</span>
          <div>
            <div style={{ fontSize: 12, color: "#a2a3b7" }}>Usuários Online Agora</div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#22c55e" }}>{totalOnline}</div>
          </div>
        </div>

        <div style={{
          backgroundColor: "#1a1d28",
          border: "1px solid #282c3c",
          borderRadius: 8,
          padding: 16,
          display: "flex",
          alignItems: "center",
          gap: 14
        }}>
          <span style={{ fontSize: 28 }}>⚡</span>
          <div>
            <div style={{ fontSize: 12, color: "#a2a3b7" }}>Ações Gravadas</div>
            <div style={{ fontSize: 20, fontWeight: "bold", color: "#38bdf8" }}>{totalAcoes}</div>
          </div>
        </div>
      </div>

      {/* BARRA DE PESQUISA */}
      <div className="logs-actions-bar">
        <div className="search-box-container">
          <input
            type="text"
            className="logs-search-input"
            placeholder="Buscar por nome, login (nome.sobrenome) ou e-mail..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
        </div>
        <span style={{ fontSize: 13, color: "#aaa" }}>
          Usuários listados: <strong>{filteredUsers.length}</strong> de {totalCadastrados}
        </span>
      </div>

      {/* GRID DE CARDS DOS USUÁRIOS */}
      {loading ? (
        <div style={{ textAlign: "center", padding: 40, color: "#aaa" }}>
          ⏳ Carregando dados de usuários e logs...
        </div>
      ) : (
        <div className="users-grid">
          {filteredUsers.length > 0 ? (
            filteredUsers.map((u) => {
              const userName = `${u.name || "Usuário"} ${u.surname || ""}`.trim();
              const initial = userName.charAt(0).toUpperCase() || "U";
              const isOnline = Boolean(u.isOnline);
              const isAdmin = String(u.role || "").toUpperCase() === "ADMIN" || u.email === "jsa@jsa.com" || u.name === "JSA Admin";

              return (
                <div key={u.id || u.email} className="user-card">
                  <div>
                    <div className="user-card-header">
                      <div className="avatar-wrapper">
                        <div className="user-avatar">
                          {initial}
                        </div>
                        <span
                          className={`status-indicator ${isOnline ? "online" : "offline"}`}
                          title={isOnline ? "Online" : "Offline"}
                        ></span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span className="user-info-name">{userName}</span>
                          <span style={{
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 4,
                            fontWeight: "bold",
                            backgroundColor: isAdmin ? "rgba(234, 179, 8, 0.2)" : "rgba(59, 130, 246, 0.2)",
                            color: isAdmin ? "#facc15" : "#60a5fa",
                            border: `1px solid ${isAdmin ? "#facc15" : "#60a5fa"}`
                          }}>
                            {isAdmin ? "ADMIN" : "USUÁRIO"}
                          </span>
                        </div>
                        <div className="user-info-email">{u.email}</div>
                        {u.username && (
                          <div style={{ fontSize: 11, color: "#38bdf8", marginTop: 2 }}>
                            🔑 Login: <code>{u.username}</code>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="user-card-body">
                      <div>
                        <strong>Status:</strong>{" "}
                        <span style={{ color: isOnline ? "#22c55e" : "#ef4444", fontWeight: "bold" }}>
                          {isOnline ? "🟢 Conectado (Online)" : "⚪ Desconectado"}
                        </span>
                      </div>
                      <div>
                        <strong>Total de ações:</strong> <span style={{ color: "#fff", fontWeight: "bold" }}>{u.totalActions}</span>
                      </div>
                      <div>
                        <strong>Última atividade:</strong> {u.lastActivity}
                      </div>
                    </div>
                  </div>

                  <button
                    className="btn-view-history"
                    onClick={() => {
                      setSelectedUser(u);
                      setActiveModuleFilter("Todos");
                    }}
                  >
                    👁️ Ver Histórico Completo
                  </button>
                </div>
              );
            })
          ) : (
            <div style={{ color: "#888", padding: "30px", gridColumn: "1 / -1", textAlign: "center" }}>
              Nenhum usuário encontrado correspondente aos critérios de busca.
            </div>
          )}
        </div>
      )}

      {/* MODAL DO HISTÓRICO DO USUÁRIO */}
      {selectedUser && (
        <div className="logs-modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="logs-modal-content" onClick={(e) => e.stopPropagation()}>
            {/* CABEÇALHO DO MODAL */}
            <div className="logs-modal-header">
              <div>
                <h3 style={{ margin: 0, color: "#ff5b5b", display: "flex", alignItems: "center", gap: 8 }}>
                  👤 Histórico de {selectedUser.name} {selectedUser.surname || ""}
                  <span style={{
                    fontSize: 11,
                    padding: "2px 6px",
                    borderRadius: 4,
                    fontWeight: "bold",
                    backgroundColor: selectedUser.isOnline ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)",
                    color: selectedUser.isOnline ? "#22c55e" : "#ef4444"
                  }}>
                    {selectedUser.isOnline ? "ONLINE" : "OFFLINE"}
                  </span>
                </h3>
                <div style={{ fontSize: 12, color: "#aaa", marginTop: 4 }}>
                  E-mail: <strong>{selectedUser.email}</strong> | Login: <code>{selectedUser.username || "-"}</code>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button className="btn-export-txt" onClick={handleExportUserLogs}>
                  📥 Baixar Arquivo TXT
                </button>
                <button className="btn-danger-outline" onClick={() => setSelectedUser(null)}>
                  ✕ Fechar
                </button>
              </div>
            </div>

            {/* BOTÕES DE MÓDULOS / TELAS NO MODAL */}
            <div className="logs-modules-bar">
              {SCREEN_MODULES.map((mod) => (
                <button
                  key={mod.key}
                  className={`btn-module-filter ${activeModuleFilter === mod.key ? "active" : ""}`}
                  onClick={() => setActiveModuleFilter(mod.key)}
                >
                  {mod.icon} {mod.label}
                </button>
              ))}
            </div>

            {/* TABELA DE LOGS DO USUÁRIO */}
            <div className="logs-modal-body">
              <table className="logs-table">
                <thead>
                  <tr>
                    <th style={{ width: 170 }}>Data/Hora</th>
                    <th style={{ width: 140 }}>Tela / Módulo</th>
                    <th style={{ width: 220 }}>Ação</th>
                    <th>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {getUserModalLogs().length > 0 ? (
                    getUserModalLogs().map((log) => (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: "nowrap", color: "#a2a3b7" }}>
                          {log.formattedDate || (log.ts ? new Date(log.ts).toLocaleString("pt-BR") : "-")}
                        </td>
                        <td>
                          <span className="badge-module">
                            {log.screen || log.type || "Sistema"}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: "#fff" }}>{log.title}</strong>
                        </td>
                        <td style={{ wordBreak: "break-word", fontSize: 12, color: "#ccc" }}>
                          {typeof log.details === "object"
                            ? JSON.stringify(log.details)
                            : String(log.details || "-")}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="4" style={{ textAlign: "center", padding: "30px", color: "#888" }}>
                        Nenhum registro encontrado para este módulo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}