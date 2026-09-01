// import React, { useState, useEffect } from "react";
// import { toast, ToastContainer } from "react-toastify";
// import "react-toastify/dist/ReactToastify.css";

// // Telas disponíveis no sistema para liberação de acesso
// const AVAILABLE_PAGES = [
//   { id: "dashboard", label: "Dashboard / Início" },
//   { id: "contas", label: "Contas (Acesso Padrão)" },
//   { id: "transacoes", label: "Transações / Lançamentos" },
//   { id: "categorias", label: "Categorias" },
//   { id: "relatorios", label: "Relatórios" },
//   { id: "usuarios", label: "Usuários e Acessos" },
// ];

// export default function UsersAndAccess() {
//   const [users, setUsers] = useState([]);
//   const [showModal, setShowModal] = useState(false);
//   const [activeTab, setActiveTab] = useState("grant"); // "grant" ou "create"

//   // Estado para Edição/Concessão de Acesso
//   const [selectedEmail, setSelectedEmail] = useState("");
//   const [allowedPages, setAllowedPages] = useState(["contas"]);

//   // Estado para Criação Manual de Usuário
//   const [newName, setNewName] = useState("");
//   const [newEmail, setNewEmail] = useState("");
//   const [newPassword, setNewPassword] = useState("");

//   useEffect(() => {
//     loadUsers();
//   }, []);

//   const loadUsers = () => {
//     const raw = localStorage.getItem("users");
//     const list = raw ? JSON.parse(raw) : [];
//     setUsers(list);
//   };

//   const handleOpenModal = () => {
//     setShowModal(true);
//     if (users.length > 0) {
//       setSelectedEmail(users[0].email);
//       setAllowedPages(users[0].permissions || ["contas"]);
//     }
//   };

//   const handleUserSelectChange = (email) => {
//     setSelectedEmail(email);
//     const u = users.find((item) => item.email === email);
//     if (u) {
//       setAllowedPages(u.permissions || ["contas"]);
//     }
//   };

//   const togglePagePermission = (pageId) => {
//     // A tela "contas" sempre deve permanecer ativa por padrão
//     if (pageId === "contas") return;

//     if (allowedPages.includes(pageId)) {
//       setAllowedPages(allowedPages.filter((p) => p !== pageId));
//     } else {
//       setAllowedPages([...allowedPages, pageId]);
//     }
//   };

//   // Salva os acessos concedidos a um usuário existente
//   const handleSavePermissions = (e) => {
//     e.preventDefault();
//     if (!selectedEmail) {
//       toast.warn("Selecione um usuário.");
//       return;
//     }

//     const updatedUsers = users.map((u) => {
//       if (u.email === selectedEmail) {
//         return { ...u, permissions: allowedPages };
//       }
//       return u;
//     });

//     localStorage.setItem("users", JSON.stringify(updatedUsers));
//     setUsers(updatedUsers);
//     toast.success("Acessos atualizados com sucesso!");
//     setShowModal(false);
//   };

//   // Cadastra um novo usuário já concedendo acessos
//   const handleCreateUserWithAccess = (e) => {
//     e.preventDefault();
//     if (!newEmail || !newPassword) {
//       toast.warn("Preencha e-mail e senha.");
//       return;
//     }

//     const emailFormatted = newEmail.trim().toLowerCase();
//     const exists = users.some((u) => u.email === emailFormatted);

//     if (exists) {
//       toast.error("Este e-mail já está cadastrado.");
//       return;
//     }

//     const newUser = {
//       name: newName || emailFormatted.split("@")[0],
//       email: emailFormatted,
//       password: newPassword,
//       permissions: allowedPages,
//     };

//     const updatedList = [...users, newUser];
//     localStorage.setItem("users", JSON.stringify(updatedList));
//     setUsers(updatedList);

//     toast.success("Usuário cadastrado e acessos concedidos!");
//     setNewName("");
//     setNewEmail("");
//     setNewPassword("");
//     setShowModal(false);
//   };

//   return (
//     <div style={{ padding: "24px", color: "#fff" }}>
//       <ToastContainer limit={3} />
      
//       <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
//         <h2>Gerenciamento de Usuários e Acessos</h2>
//         <button
//           onClick={handleOpenModal}
//           style={{
//             background: "#ff4d4d",
//             color: "#fff",
//             border: "none",
//             padding: "10px 18px",
//             borderRadius: "6px",
//             fontWeight: "bold",
//             cursor: "pointer",
//           }}
//         >
//           ⚙️ Gerenciar / Conceder Acessos
//         </button>
//       </div>

//       {/* Tabela Resumo de Usuários e Permissões */}
//       <table style={{ width: "100%", borderCollapse: "collapse", background: "#1a1d24", borderRadius: "8px", overflow: "hidden" }}>
//         <thead>
//           <tr style={{ background: "#252932", textTransform: "uppercase", fontSize: "12px", color: "#aaa" }}>
//             <th style={{ padding: "12px", textAlign: "left" }}>Usuário</th>
//             <th style={{ padding: "12px", textAlign: "left" }}>E-mail</th>
//             <th style={{ padding: "12px", textAlign: "left" }}>Telas Permitidas</th>
//           </tr>
//         </thead>
//         <tbody>
//           {users.map((u, idx) => (
//             <tr key={idx} style={{ borderBottom: "1px solid #2a2e39" }}>
//               <td style={{ padding: "12px" }}>{u.name || u.email}</td>
//               <td style={{ padding: "12px" }}>{u.email}</td>
//               <td style={{ padding: "12px" }}>
//                 {(u.permissions || ["contas"]).map((p) => (
//                   <span
//                     key={p}
//                     style={{
//                       background: "#333a48",
//                       padding: "4px 8px",
//                       borderRadius: "4px",
//                       fontSize: "12px",
//                       marginRight: "6px",
//                       display: "inline-block",
//                       marginTop: "2px",
//                     }}
//                   >
//                     {p}
//                   </span>
//                 ))}
//               </td>
//             </tr>
//           ))}
//           {users.length === 0 && (
//             <tr>
//               <td colSpan="3" style={{ padding: "20px", textAlign: "center", color: "#888" }}>
//                 Nenhum usuário cadastrado até o momento.
//               </td>
//             </tr>
//           )}
//         </tbody>
//       </table>

//       {/* Modal de Concessão de Acesso e Cadastro */}
//       {showModal && (
//         <div
//           style={{
//             position: "fixed",
//             top: 0,
//             left: 0,
//             width: "100vw",
//             height: "100vh",
//             backgroundColor: "rgba(0, 0, 0, 0.85)",
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             zIndex: 9999,
//           }}
//         >
//           <div
//             style={{
//               background: "#1e2430",
//               border: "1px solid #384252",
//               borderRadius: "10px",
//               padding: "24px",
//               width: "100%",
//               maxWidth: "480px",
//               boxShadow: "0 10px 30px rgba(0,0,0,0.7)",
//             }}
//           >
//             {/* Abas do Modal */}
//             <div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #333a48", paddingBottom: "10px" }}>
//               <button
//                 type="button"
//                 onClick={() => setActiveTab("grant")}
//                 style={{
//                   background: activeTab === "grant" ? "#ff4d4d" : "transparent",
//                   color: "#fff",
//                   border: "none",
//                   padding: "8px 12px",
//                   borderRadius: "4px",
//                   cursor: "pointer",
//                   fontSize: "13px",
//                   fontWeight: "bold",
//                 }}
//               >
//                 Conceder Acesso
//               </button>
//               <button
//                 type="button"
//                 onClick={() => setActiveTab("create")}
//                 style={{
//                   background: activeTab === "create" ? "#ff4d4d" : "transparent",
//                   color: "#fff",
//                   border: "none",
//                   padding: "8px 12px",
//                   borderRadius: "4px",
//                   cursor: "pointer",
//                   fontSize: "13px",
//                   fontWeight: "bold",
//                 }}
//               >
//                 + Cadastrar Usuário
//               </button>
//             </div>

//             {/* ABA 1: Conceder Acesso a Usuário Existente */}
//             {activeTab === "grant" && (
//               <form onSubmit={handleSavePermissions}>
//                 <label style={{ fontSize: "13px", color: "#aaa", display: "block", marginBottom: "6px" }}>
//                   Selecione o Usuário Cadastrado:
//                 </label>
//                 <select
//                   value={selectedEmail}
//                   onChange={(e) => handleUserSelectChange(e.target.value)}
//                   style={{
//                     width: "100%",
//                     padding: "10px",
//                     borderRadius: "6px",
//                     background: "#0f131a",
//                     color: "#fff",
//                     border: "1px solid #333a48",
//                     marginBottom: "16px",
//                   }}
//                 >
//                   {users.map((u) => (
//                     <option key={u.email} value={u.email}>
//                       {u.name ? `${u.name} (${u.email})` : u.email}
//                     </option>
//                   ))}
//                 </select>

//                 <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "8px" }}>Telas permitidas para este usuário:</p>
//                 <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
//                   {AVAILABLE_PAGES.map((page) => (
//                     <label key={page.id} style={{ fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
//                       <input
//                         type="checkbox"
//                         checked={allowedPages.includes(page.id)}
//                         disabled={page.id === "contas"}
//                         onChange={() => togglePagePermission(page.id)}
//                       />
//                       {page.label} {page.id === "contas" && "(Obrigatório)"}
//                     </label>
//                   ))}
//                 </div>

//                 <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
//                   <button
//                     type="button"
//                     onClick={() => setShowModal(false)}
//                     style={{ background: "#333", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "6px", cursor: "pointer" }}
//                   >
//                     Cancelar
//                   </button>
//                   <button
//                     type="submit"
//                     style={{ background: "#22c55e", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
//                   >
//                     Salvar Permissões
//                   </button>
//                 </div>
//               </form>
//             )}

//             {/* ABA 2: Cadastrar Novo Usuário e Conceder Acesso */}
//             {activeTab === "create" && (
//               <form onSubmit={handleCreateUserWithAccess}>
//                 <div style={{ marginBottom: "10px" }}>
//                   <label style={{ fontSize: "12px", color: "#aaa" }}>Nome:</label>
//                   <input
//                     type="text"
//                     value={newName}
//                     onChange={(e) => setNewName(e.target.value)}
//                     placeholder="Nome completo"
//                     style={{ width: "100%", padding: "8px", borderRadius: "4px", background: "#0f131a", color: "#fff", border: "1px solid #333a48" }}
//                   />
//                 </div>

//                 <div style={{ marginBottom: "10px" }}>
//                   <label style={{ fontSize: "12px", color: "#aaa" }}>E-mail:</label>
//                   <input
//                     type="email"
//                     value={newEmail}
//                     onChange={(e) => setNewEmail(e.target.value)}
//                     placeholder="email@jsa.com"
//                     required
//                     style={{ width: "100%", padding: "8px", borderRadius: "4px", background: "#0f131a", color: "#fff", border: "1px solid #333a48" }}
//                   />
//                 </div>

//                 <div style={{ marginBottom: "14px" }}>
//                   <label style={{ fontSize: "12px", color: "#aaa" }}>Senha Provisória/Definitiva:</label>
//                   <input
//                     type="password"
//                     value={newPassword}
//                     onChange={(e) => setNewPassword(e.target.value)}
//                     placeholder="Senha do usuário"
//                     required
//                     style={{ width: "100%", padding: "8px", borderRadius: "4px", background: "#0f131a", color: "#fff", border: "1px solid #333a48" }}
//                   />
//                 </div>

//                 <p style={{ fontSize: "13px", color: "#aaa", marginBottom: "8px" }}>Liberar Acesso às Telas:</p>
//                 <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
//                   {AVAILABLE_PAGES.map((page) => (
//                     <label key={page.id} style={{ fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
//                       <input
//                         type="checkbox"
//                         checked={allowedPages.includes(page.id)}
//                         disabled={page.id === "contas"}
//                         onChange={() => togglePagePermission(page.id)}
//                       />
//                       {page.label} {page.id === "contas" && "(Obrigatório)"}
//                     </label>
//                   ))}
//                 </div>

//                 <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
//                   <button
//                     type="button"
//                     onClick={() => setShowModal(false)}
//                     style={{ background: "#333", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "6px", cursor: "pointer" }}
//                   >
//                     Cancelar
//                   </button>
//                   <button
//                     type="submit"
//                     style={{ background: "#ff4d4d", color: "#fff", border: "none", padding: "10px 16px", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
//                   >
//                     Cadastrar & Liberar Acesso
//                   </button>
//                 </div>
//               </form>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }




import React, { useState, useEffect } from "react";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Telas disponíveis no sistema para liberação de acesso
const AVAILABLE_PAGES = [
  { id: "contas", label: "Gestão de Contas" },
  { id: "simulador", label: "Simulador de Créditos" },
  { id: "notas", label: "Notas Fiscais" },
  { id: "ordem-servico", label: "Ordem de Serviços (O.S)" },
  { id: "chamados", label: "Atendimentos / Chamados" },
  { id: "usuarios", label: "Usuários e Acessos (Admin)" },
  { id: "logs", label: "Logs do Sistema (Admin)" },
];

const DEFAULT_PAGES = ["contas", "simulador", "notas", "ordem-servico", "chamados"];

export default function UsersAndAccess() {
  const [users, setUsers] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("grant"); // "grant", "create", "block" ou "reset"

  // Estado para Edição/Concessão de Acesso
  const [selectedEmail, setSelectedEmail] = useState("");
  const [allowedPages, setAllowedPages] = useState(DEFAULT_PAGES);

  // Estado para Criação Manual de Usuário
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  // Estado para Reset de Senha (Exige verificação de E-mail)
  const [resetEmail, setResetEmail] = useState("");
  const [resetNewPassword, setResetNewPassword] = useState("");

  // Estado para Bloqueio de Usuário
  const [blockEmail, setBlockEmail] = useState("");

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    const raw = localStorage.getItem("users");
    const list = raw ? JSON.parse(raw) : [];
    setUsers(list);
  };

  const handleOpenModalTab = (tabName) => {
    setActiveTab(tabName);
    setShowModal(true);

    if (users.length > 0) {
      setSelectedEmail(users[0].email);
      setAllowedPages(
        users[0].permissions && users[0].permissions.length > 1
          ? users[0].permissions
          : DEFAULT_PAGES
      );
      setBlockEmail(users[0].email);
    }
  };

  const handleUserSelectChange = (email) => {
    setSelectedEmail(email);
    const u = users.find((item) => item.email === email);
    if (u) {
      setAllowedPages(
        u.permissions && u.permissions.length > 1
          ? u.permissions
          : DEFAULT_PAGES
      );
    }
  };

  const togglePagePermission = (pageId) => {
    // A tela "contas" sempre deve permanecer ativa por padrão
    if (pageId === "contas") return;

    if (allowedPages.includes(pageId)) {
      setAllowedPages(allowedPages.filter((p) => p !== pageId));
    } else {
      setAllowedPages([...allowedPages, pageId]);
    }
  };

  // 1. SOLICITAR RELATÓRIO DE USUÁRIOS AO ADMIN (TELEGRAM)
  const handleSendTelegramReport = () => {
    if (users.length === 0) {
      toast.warn("Nenhum usuário cadastrado para gerar o relatório.");
      return;
    }

    let reportMessage = "📋 *Relatório de Usuários Cadastrados*\n\n";
    users.forEach((u, idx) => {
      const perms = u.blocked
        ? "🚫 [BLOQUEADO]"
        : (u.permissions || ["contas"]).join(", ");
      reportMessage += `${idx + 1}. *Nome:* ${u.name || "N/A"}\n   *E-mail:* ${u.email}\n   *Permissões:* ${perms}\n\n`;
    });

    const encodedMessage = encodeURIComponent(reportMessage);
    // Abre o Telegram Web/App pronto para envio
    window.open(`https://t.me/share/url?url=&text=${encodedMessage}`, "_blank");
    toast.success("Relatório gerado! Redirecionando para o Telegram...");
  };

  // 2. SALVAR PERMISSÕES / CONCEDER ACESSO
  const handleSavePermissions = (e) => {
    e.preventDefault();
    if (!selectedEmail) {
      toast.warn("Selecione um usuário.");
      return;
    }

    const updatedUsers = users.map((u) => {
      if (u.email === selectedEmail) {
        return { ...u, permissions: allowedPages, blocked: false };
      }
      return u;
    });

    localStorage.setItem("users", JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
    toast.success("Acessos concedidos/atualizados com sucesso!");
    setShowModal(false);
  };

  // CADASTRO DE NOVO USUÁRIO
  const handleCreateUserWithAccess = (e) => {
    e.preventDefault();
    if (!newEmail || !newPassword) {
      toast.warn("Preencha e-mail e senha.");
      return;
    }

    const emailFormatted = newEmail.trim().toLowerCase();
    const exists = users.some((u) => u.email === emailFormatted);

    if (exists) {
      toast.error("Este e-mail já está cadastrado.");
      return;
    }

    const newUser = {
      name: newName || emailFormatted.split("@")[0],
      email: emailFormatted,
      password: newPassword,
      permissions: allowedPages,
      blocked: false,
    };

    const updatedList = [...users, newUser];
    localStorage.setItem("users", JSON.stringify(updatedList));
    setUsers(updatedList);

    toast.success("Usuário cadastrado e acessos concedidos!");
    setNewName("");
    setNewEmail("");
    setNewPassword("");
    setShowModal(false);
  };

  // 3. BLOQUEAR ACESSO DO USUÁRIO
  const handleBlockUser = (e) => {
    e.preventDefault();
    if (!blockEmail) {
      toast.warn("Selecione um usuário para bloquear.");
      return;
    }

    const updatedUsers = users.map((u) => {
      if (u.email === blockEmail) {
        return { ...u, blocked: true, permissions: [] };
      }
      return u;
    });

    localStorage.setItem("users", JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
    toast.error(`Acesso do usuário ${blockEmail} foi bloqueado!`);
    setShowModal(false);
  };

  // 4. RESETAR SENHA (EXIGE CONFIRMAÇÃO DO E-MAIL)
  const handleResetPassword = (e) => {
    e.preventDefault();
    const targetEmail = resetEmail.trim().toLowerCase();

    if (!targetEmail || !resetNewPassword) {
      toast.warn("Preencha o e-mail e a nova senha.");
      return;
    }

    const userExists = users.some((u) => u.email === targetEmail);
    if (!userExists) {
      toast.error("Usuário não encontrado com o e-mail informado.");
      return;
    }

    const updatedUsers = users.map((u) => {
      if (u.email === targetEmail) {
        return { ...u, password: resetNewPassword };
      }
      return u;
    });

    localStorage.setItem("users", JSON.stringify(updatedUsers));
    setUsers(updatedUsers);
    toast.success(`Senha do e-mail ${targetEmail} alterada com sucesso!`);
    setResetEmail("");
    setResetNewPassword("");
    setShowModal(false);
  };

  return (
    <div style={{ padding: "24px", color: "#fff" }}>
      <div
        style={{
          display: "flex",
          justify: "space-between",
          alignItems: "center",
          marginBottom: "20px",
          flexWrap: "wrap",
          gap: "10px",
        }}
      >
        <h2>Gerenciamento de Usuários e Acessos</h2>

        {/* GRUPO DE NOVOS BOTÕES */}
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            onClick={handleSendTelegramReport}
            style={{
              background: "#0088cc",
              color: "#fff",
              border: "none",
              padding: "10px 14px",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            ✈️ Relatório (Telegram)
          </button>

          <button
            onClick={() => handleOpenModalTab("grant")}
            style={{
              background: "#22c55e",
              color: "#fff",
              border: "none",
              padding: "10px 14px",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            🔑 Conceder Acesso
          </button>

          <button
            onClick={() => handleOpenModalTab("block")}
            style={{
              background: "#ef4444",
              color: "#fff",
              border: "none",
              padding: "10px 14px",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            🚫 Bloquear Acesso
          </button>

          <button
            onClick={() => handleOpenModalTab("reset")}
            style={{
              background: "#f59e0b",
              color: "#fff",
              border: "none",
              padding: "10px 14px",
              borderRadius: "6px",
              fontWeight: "bold",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            🔄 Resetar Senha
          </button>
        </div>
      </div>

      {/* Tabela Resumo de Usuários e Permissões */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "#1a1d24",
          borderRadius: "8px",
          overflow: "hidden",
        }}
      >
        <thead>
          <tr
            style={{
              background: "#252932",
              textTransform: "uppercase",
              fontSize: "12px",
              color: "#aaa",
            }}
          >
            <th style={{ padding: "12px", textAlign: "left" }}>Usuário</th>
            <th style={{ padding: "12px", textAlign: "left" }}>E-mail</th>
            <th style={{ padding: "12px", textAlign: "left" }}>Status / Telas Permitidas</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, idx) => (
            <tr key={idx} style={{ borderBottom: "1px solid #2a2e39" }}>
              <td style={{ padding: "12px" }}>{u.name || u.email}</td>
              <td style={{ padding: "12px" }}>{u.email}</td>
              <td style={{ padding: "12px" }}>
                {u.blocked ? (
                  <span
                    style={{
                      background: "#ef4444",
                      padding: "4px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                      fontWeight: "bold",
                    }}
                  >
                    BLOQUEADO
                  </span>
                ) : (
                  (u.permissions || ["contas"]).map((p) => (
                    <span
                      key={p}
                      style={{
                        background: "#333a48",
                        padding: "4px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        marginRight: "6px",
                        display: "inline-block",
                        marginTop: "2px",
                      }}
                    >
                      {p}
                    </span>
                  ))
                )}
              </td>
            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td
                colSpan="3"
                style={{ padding: "20px", textAlign: "center", color: "#888" }}
              >
                Nenhum usuário cadastrado até o momento.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {/* Modal Multi-Ações */}
      {showModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0, 0, 0, 0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: "#1e2430",
              border: "1px solid #384252",
              borderRadius: "10px",
              padding: "24px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.7)",
            }}
          >
            {/* Abas do Modal */}
            <div
              style={{
                display: "flex",
                gap: "6px",
                marginBottom: "20px",
                borderBottom: "1px solid #333a48",
                paddingBottom: "10px",
                overflowX: "auto",
              }}
            >
              <button
                type="button"
                onClick={() => setActiveTab("grant")}
                style={{
                  background: activeTab === "grant" ? "#22c55e" : "transparent",
                  color: "#fff",
                  border: "none",
                  padding: "8px 10px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                Conceder Acesso
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("create")}
                style={{
                  background: activeTab === "create" ? "#ff4d4d" : "transparent",
                  color: "#fff",
                  border: "none",
                  padding: "8px 10px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                + Cadastrar Usuário
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("block")}
                style={{
                  background: activeTab === "block" ? "#ef4444" : "transparent",
                  color: "#fff",
                  border: "none",
                  padding: "8px 10px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                Bloquear Acesso
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("reset")}
                style={{
                  background: activeTab === "reset" ? "#f59e0b" : "transparent",
                  color: "#fff",
                  border: "none",
                  padding: "8px 10px",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "12px",
                  fontWeight: "bold",
                }}
              >
                Resetar Senha
              </button>
            </div>

            {/* ABA 1: Conceder Acesso */}
            {activeTab === "grant" && (
              <form onSubmit={handleSavePermissions}>
                <label
                  style={{
                    fontSize: "13px",
                    color: "#aaa",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Selecione o Usuário Cadastrado:
                </label>
                <select
                  value={selectedEmail}
                  onChange={(e) => handleUserSelectChange(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    background: "#0f131a",
                    color: "#fff",
                    border: "1px solid #333a48",
                    marginBottom: "16px",
                  }}
                >
                  {users.map((u) => (
                    <option key={u.email} value={u.email}>
                      {u.name ? `${u.name} (${u.email})` : u.email}
                    </option>
                  ))}
                </select>

                <p
                  style={{
                    fontSize: "13px",
                    color: "#aaa",
                    marginBottom: "8px",
                  }}
                >
                  Telas permitidas para este usuário:
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    marginBottom: "20px",
                  }}
                >
                  {AVAILABLE_PAGES.map((page) => (
                    <label
                      key={page.id}
                      style={{
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={allowedPages.includes(page.id)}
                        disabled={page.id === "contas"}
                        onChange={() => togglePagePermission(page.id)}
                      />
                      {page.label} {page.id === "contas" && "(Obrigatório)"}
                    </label>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    justify: "flex-end",
                    gap: "10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      background: "#333",
                      color: "#fff",
                      border: "none",
                      padding: "10px 16px",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{
                      background: "#22c55e",
                      color: "#fff",
                      border: "none",
                      padding: "10px 16px",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Salvar & Desbloquear
                  </button>
                </div>
              </form>
            )}

            {/* ABA 2: Cadastrar Novo Usuário */}
            {activeTab === "create" && (
              <form onSubmit={handleCreateUserWithAccess}>
                <div style={{ marginBottom: "10px" }}>
                  <label style={{ fontSize: "12px", color: "#aaa" }}>
                    Nome:
                  </label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Nome completo"
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      background: "#0f131a",
                      color: "#fff",
                      border: "1px solid #333a48",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "10px" }}>
                  <label style={{ fontSize: "12px", color: "#aaa" }}>
                    E-mail:
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="email@jsa.com"
                    required
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      background: "#0f131a",
                      color: "#fff",
                      border: "1px solid #333a48",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "14px" }}>
                  <label style={{ fontSize: "12px", color: "#aaa" }}>
                    Senha Provisória/Definitiva:
                  </label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Senha do usuário"
                    required
                    style={{
                      width: "100%",
                      padding: "8px",
                      borderRadius: "4px",
                      background: "#0f131a",
                      color: "#fff",
                      border: "1px solid #333a48",
                    }}
                  />
                </div>

                <p
                  style={{
                    fontSize: "13px",
                    color: "#aaa",
                    marginBottom: "8px",
                  }}
                >
                  Liberar Acesso às Telas:
                </p>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "8px",
                    marginBottom: "20px",
                  }}
                >
                  {AVAILABLE_PAGES.map((page) => (
                    <label
                      key={page.id}
                      style={{
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={allowedPages.includes(page.id)}
                        disabled={page.id === "contas"}
                        onChange={() => togglePagePermission(page.id)}
                      />
                      {page.label} {page.id === "contas" && "(Obrigatório)"}
                    </label>
                  ))}
                </div>

                <div
                  style={{
                    display: "flex",
                    justify: "flex-end",
                    gap: "10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      background: "#333",
                      color: "#fff",
                      border: "none",
                      padding: "10px 16px",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{
                      background: "#ff4d4d",
                      color: "#fff",
                      border: "none",
                      padding: "10px 16px",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Cadastrar & Liberar Acesso
                  </button>
                </div>
              </form>
            )}

            {/* ABA 3: Bloquear Acesso */}
            {activeTab === "block" && (
              <form onSubmit={handleBlockUser}>
                <label
                  style={{
                    fontSize: "13px",
                    color: "#aaa",
                    display: "block",
                    marginBottom: "6px",
                  }}
                >
                  Selecione o Usuário para Bloquear:
                </label>
                <select
                  value={blockEmail}
                  onChange={(e) => setBlockEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "6px",
                    background: "#0f131a",
                    color: "#fff",
                    border: "1px solid #333a48",
                    marginBottom: "20px",
                  }}
                >
                  {users.map((u) => (
                    <option key={u.email} value={u.email}>
                      {u.name ? `${u.name} (${u.email})` : u.email}
                    </option>
                  ))}
                </select>

                <p
                  style={{
                    fontSize: "12px",
                    color: "#ef4444",
                    marginBottom: "20px",
                  }}
                >
                  ⚠️ Esta ação removerá temporariamente todas as permissões de acesso do usuário selecionado.
                </p>

                <div
                  style={{
                    display: "flex",
                    justify: "flex-end",
                    gap: "10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      background: "#333",
                      color: "#fff",
                      border: "none",
                      padding: "10px 16px",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{
                      background: "#ef4444",
                      color: "#fff",
                      border: "none",
                      padding: "10px 16px",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Confirmar Bloqueio
                  </button>
                </div>
              </form>
            )}

            {/* ABA 4: Resetar Senha */}
            {activeTab === "reset" && (
              <form onSubmit={handleResetPassword}>
                <div style={{ marginBottom: "12px" }}>
                  <label style={{ fontSize: "12px", color: "#aaa" }}>
                    Digite o E-mail do Usuário Cadastrado:
                  </label>
                  <input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="email@jsa.com"
                    required
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "6px",
                      background: "#0f131a",
                      color: "#fff",
                      border: "1px solid #333a48",
                    }}
                  />
                </div>

                <div style={{ marginBottom: "20px" }}>
                  <label style={{ fontSize: "12px", color: "#aaa" }}>
                    Nova Senha:
                  </label>
                  <input
                    type="password"
                    value={resetNewPassword}
                    onChange={(e) => setResetNewPassword(e.target.value)}
                    placeholder="Informe a nova senha"
                    required
                    style={{
                      width: "100%",
                      padding: "10px",
                      borderRadius: "6px",
                      background: "#0f131a",
                      color: "#fff",
                      border: "1px solid #333a48",
                    }}
                  />
                </div>

                <div
                  style={{
                    display: "flex",
                    justify: "flex-end",
                    gap: "10px",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{
                      background: "#333",
                      color: "#fff",
                      border: "none",
                      padding: "10px 16px",
                      borderRadius: "6px",
                      cursor: "pointer",
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    style={{
                      background: "#f59e0b",
                      color: "#fff",
                      border: "none",
                      padding: "10px 16px",
                      borderRadius: "6px",
                      fontWeight: "bold",
                      cursor: "pointer",
                    }}
                  >
                    Resetar Senha
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}