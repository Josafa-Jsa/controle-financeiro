// // src/App.jsx
// import React, { useEffect, useState } from "react";
// import {
//   BrowserRouter as Router,
//   Routes,
//   Route,
//   useLocation,
//   Navigate,
// } from "react-router-dom";
// import { ToastContainer } from "react-toastify";

// import "react-toastify/dist/ReactToastify.css";
// import "./styles.css";

// /* ---------- Componentes globais ---------- */
// import Navbar from "./components/Navbar";
// import Footer from "./components/Footer";

// /* ---------- Auth ---------- */
// import {
//   getUser,
//   isAdmin,
//   initAuthWatcher,
//   useSessionCountdown,
//   formatRemaining,
// } from "./auth/auth";

// /* ---------- Páginas de Auth (públicas) ---------- */
// import Login from "./pages/Auth/Login";
// import Register from "./pages/Auth/Register";
// import ForgotPassword from "./pages/Auth/ForgotPassword";
// import ResetPassword from "./pages/Auth/ResetPassword";

// /* ---------- Páginas (privadas) ---------- */
// import ContasPage from "./pages/Contas/ContasPage";
// import FluxoPage from "./pages/FluxoCaixa/FluxoPage";
// import SimuladorPage from "./pages/Simulador/SimuladorPage";
// import ContratosPage from "./pages/Contratos/ContratosPage";
// import ContratoInternetPage from "./pages/Contratos/ContratoInternetPage";
// import EstoquePage from "./pages/Estoque/EstoquePage";
// import NotasPage from "./pages/NotasFiscais/NotasPage";

// /* ---------- Ordem de Serviço ---------- */
// import OrdemServicoForm from "./pages/Os/OrdemServicoForm";
// import OrdemServicoList from "./pages/Os/OrdemServicoList";

// /* ---------- Admin ---------- */
// import LogPage from "./pages/Admin/Log";
// import * as AdminUsersModule from "./pages/Admin/AdminUsersPage";

// // Trata exportação padrão (default) ou nomeada ({ AdminUsersPage })
// const AdminUsersPage =
//   AdminUsersModule.default || AdminUsersModule.AdminUsersPage;

// /* ========================================================= */

// function checkIsLoggedIn() {
//   return !!getUser();
// }

// function checkIsAdmin() {
//   if (typeof isAdmin === "function") return isAdmin();
//   const u = getUser();
//   const email = (u?.email || "").toLowerCase();
//   return email === "jsa@jsa.com" || email === "jsa.admin@gmail.com";
// }

// /* ========================================================= */

// class ErrorBoundary extends React.Component {
//   constructor(props) {
//     super(props);
//     this.state = { hasError: false, error: null };
//   }

//   static getDerivedStateFromError(error) {
//     return { hasError: true, error };
//   }

//   componentDidCatch(error, info) {
//     console.error("UI crash:", error, info);
//   }

//   render() {
//     if (this.state.hasError) {
//       return (
//         <div
//           style={{
//             background: "#7f1d1d",
//             color: "#fff",
//             padding: 16,
//             borderBottom: "3px solid #991b1b",
//           }}
//         >
//           <h2 style={{ marginTop: 0 }}>Erro na interface</h2>
//           <pre style={{ whiteSpace: "pre-wrap" }}>
//             {String(this.state.error)}
//           </pre>
//         </div>
//       );
//     }

//     return this.props.children;
//   }
// }

// /* ========================================================= */

// export function TopBarRight() {
//   const msLeft = useSessionCountdown();

//   return (
//     <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//       {msLeft > 0 && (
//         <small className="session-badge">
//           Sessão expira em {formatRemaining(msLeft)}
//         </small>
//       )}
//     </div>
//   );
// }

// /* ========================================================= */

// function ProtectedRoute({ children }) {
//   const location = useLocation();

//   if (!checkIsLoggedIn()) {
//     return <Navigate to="/login" replace state={{ from: location }} />;
//   }

//   return children;
// }

// function AdminRoute({ children }) {
//   if (!checkIsAdmin()) return <Navigate to="/" replace />;
//   return children;
// }

// /* ========================================================= */

// function Layout({ children }) {
//   const location = useLocation();
//   const path = location.pathname;

//   const isAuthPage =
//     path.startsWith("/login") ||
//     path.startsWith("/register") ||
//     path.startsWith("/forgot") ||
//     path.startsWith("/reset-password");

//   return (
//     <>
//       {!isAuthPage && <Navbar />}

//       <ToastContainer
//         theme="dark"
//         autoClose={3000}
//         position="top-right"
//         hideProgressBar={false}
//         newestOnTop={false}
//         closeOnClick
//         rtl={false}
//         pauseOnFocusLoss
//         draggable
//         pauseOnHover
//       />

//       {children}

//       {!isAuthPage && <Footer />}
//     </>
//   );
// }

// /* ========================================================= */

// function App() {
//   useEffect(() => {
//     initAuthWatcher();
//   }, []);

//   const [ordens, setOrdens] = useState(() => {
//     try {
//       return JSON.parse(localStorage.getItem("ordens")) || [];
//     } catch {
//       return [];
//     }
//   });

//   const salvarLocal = (lista) => {
//     try {
//       localStorage.setItem("ordens", JSON.stringify(lista));
//     } catch (e) {
//       console.error("Erro ao acessar localStorage:", e);
//     }
//   };

//   const adicionarOrdem = (novaOrdem) => {
//     const atualizadas = [...ordens, novaOrdem];
//     setOrdens(atualizadas);
//     salvarLocal(atualizadas);
//   };

//   const excluirOrdem = (numeroOS) => {
//     const atualizadas = ordens.filter((o) => o.numeroOS !== numeroOS);
//     setOrdens(atualizadas);
//     salvarLocal(atualizadas);
//   };

//   return (
//     <Router>
//       <ErrorBoundary>
//         <Layout>
//           <Routes>
//             {/* PÚBLICAS */}
//             <Route path="/login" element={<Login />} />
//             <Route path="/register" element={<Register />} />
//             <Route path="/forgot" element={<ForgotPassword />} />
//             <Route path="/reset-password" element={<ResetPassword />} />

//             {/* PRIVADAS */}
//             <Route
//               path="/"
//               element={
//                 <ProtectedRoute>
//                   <ContasPage />
//                 </ProtectedRoute>
//               }
//             />

//             <Route
//               path="/fluxo"
//               element={
//                 <ProtectedRoute>
//                   <FluxoPage />
//                 </ProtectedRoute>
//               }
//             />

//             <Route
//               path="/simulador"
//               element={
//                 <ProtectedRoute>
//                   <SimuladorPage />
//                 </ProtectedRoute>
//               }
//             />

//             <Route
//               path="/contratos"
//               element={
//                 <ProtectedRoute>
//                   <ContratosPage />
//                 </ProtectedRoute>
//               }
//             />

//             <Route
//               path="/contrato-internet"
//               element={
//                 <ProtectedRoute>
//                   <ContratoInternetPage />
//                 </ProtectedRoute>
//               }
//             />

//             <Route
//               path="/estoque"
//               element={
//                 <ProtectedRoute>
//                   <EstoquePage />
//                 </ProtectedRoute>
//               }
//             />

//             <Route
//               path="/notas"
//               element={
//                 <ProtectedRoute>
//                   <NotasPage />
//                 </ProtectedRoute>
//               }
//             />

//             <Route
//               path="/ordem-servico"
//               element={
//                 <ProtectedRoute>
//                   <div className="container">
//                     <h1>JSA Soluções Tecnológicas (O.S)</h1>

//                     <OrdemServicoForm onSalvar={adicionarOrdem} />

//                     <OrdemServicoList
//                       ordens={ordens}
//                       onExcluir={excluirOrdem}
//                     />
//                   </div>
//                 </ProtectedRoute>
//               }
//             />

//             <Route
//               path="/ordens"
//               element={
//                 <ProtectedRoute>
//                   <OrdemServicoList
//                     ordens={ordens}
//                     onExcluir={excluirOrdem}
//                   />
//                 </ProtectedRoute>
//               }
//             />

//             {/* ADMIN */}
//             <Route
//               path="/admin/log"
//               element={
//                 <ProtectedRoute>
//                   <AdminRoute>
//                     <LogPage />
//                   </AdminRoute>
//                 </ProtectedRoute>
//               }
//             />

//             <Route
//               path="/admin/users"
//               element={
//                 <ProtectedRoute>
//                   <AdminRoute>
//                     <AdminUsersPage />
//                   </AdminRoute>
//                 </ProtectedRoute>
//               }
//             />

//             {/* Fallback */}
//             <Route path="*" element={<Navigate to="/" replace />} />
//           </Routes>
//         </Layout>
//       </ErrorBoundary>
//     </Router>
//   );
// }

// export default App;


// // src/App.jsx
// import React, { useEffect, useState } from "react";
// import { BrowserRouter as Router } from "react-router-dom";
// import AppRoutes from "./routes/AppRoutes";
// import Chamados from "./pages/Chamados";

// import "react-toastify/dist/ReactToastify.css";
// import "./styles.css";

// import {
//   initAuthWatcher,
//   useSessionCountdown,
//   formatRemaining,
// } from "./auth/auth";


// /* =========================================================
//    Error Boundary Global
// ========================================================= */
// class ErrorBoundary extends React.Component {
//   constructor(props) {
//     super(props);
//     this.state = { hasError: false, error: null };
//   }

//   static getDerivedStateFromError(error) {
//     return { hasError: true, error };
//   }

//   componentDidCatch(error, info) {
//     console.error("UI crash:", error, info);
//   }

//   render() {
//     if (this.state.hasError) {
//       return (
//         <div
//           style={{
//             background: "#7f1d1d",
//             color: "#fff",
//             padding: 16,
//             borderBottom: "3px solid #991b1b",
//           }}
//         >
//           <h2 style={{ marginTop: 0 }}>Erro na interface</h2>
//           <pre style={{ whiteSpace: "pre-wrap" }}>
//             {String(this.state.error)}
//           </pre>
//         </div>
//       );
//     }

//     return this.props.children;
//   }
// }

// /* =========================================================
//    Componente Auxiliar de Expiração da Sessão
// ========================================================= */
// export function TopBarRight() {
//   const msLeft = useSessionCountdown();

//   return (
//     <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//       {msLeft > 0 && (
//         <small className="session-badge">
//           Sessão expira em {formatRemaining(msLeft)}
//         </small>
//       )}
//     </div>
//   );
// }

// /* =========================================================
//    Componente Raiz (App)
// ========================================================= */
// function App() {
//   useEffect(() => {
//     initAuthWatcher();
//   }, []);

//   const [ordens, setOrdens] = useState(() => {
//     try {
//       return JSON.parse(localStorage.getItem("ordens")) || [];
//     } catch {
//       return [];
//     }
//   });

//   const salvarLocal = (lista) => {
//     try {
//       localStorage.setItem("ordens", JSON.stringify(lista));
//     } catch (e) {
//       console.error("Erro ao acessar localStorage:", e);
//     }
//   };

//   const adicionarOrdem = (novaOrdem) => {
//     const atualizadas = [...ordens, novaOrdem];
//     setOrdens(atualizadas);
//     salvarLocal(atualizadas);
//   };

//   const excluirOrdem = (numeroOS) => {
//     const atualizadas = ordens.filter((o) => o.numeroOS !== numeroOS);
//     setOrdens(atualizadas);
//     salvarLocal(atualizadas);
//   };

//   return (
//     <Router>
//       <ErrorBoundary>
//         <AppRoutes
//           ordens={ordens}
//           adicionarOrdem={adicionarOrdem}
//           excluirOrdem={excluirOrdem}
//         />
//       </ErrorBoundary>
//     </Router>
//   );
// }

// export default App;

// -------------------------------------------------------------------------------------------

// // src/App.jsx
// import React, { useEffect, useState } from "react";
// import { BrowserRouter as Router } from "react-router-dom";
// import AppRoutes from "./routes/AppRoutes";

// import "react-toastify/dist/ReactToastify.css";
// import "./styles.css";

// import {
//   initAuthWatcher,
//   useSessionCountdown,
//   formatRemaining,
// } from "./auth/auth";

// /* =========================================================
//    Error Boundary Global
// ========================================================= */
// class ErrorBoundary extends React.Component {
//   constructor(props) {
//     super(props);
//     this.state = { hasError: false, error: null };
//   }

//   static getDerivedStateFromError(error) {
//     return { hasError: true, error };
//   }

//   componentDidCatch(error, info) {
//     console.error("UI crash:", error, info);
//   }

//   render() {
//     if (this.state.hasError) {
//       return (
//         <div
//           style={{
//             background: "#7f1d1d",
//             color: "#fff",
//             padding: 16,
//             borderBottom: "3px solid #991b1b",
//           }}
//         >
//           <h2 style={{ marginTop: 0 }}>Erro na interface</h2>
//           <pre style={{ whiteSpace: "pre-wrap" }}>
//             {String(this.state.error)}
//           </pre>
//         </div>
//       );
//     }

//     return this.props.children;
//   }
// }

// /* =========================================================
//    Componente Auxiliar de Expiração da Sessão
// ========================================================= */
// export function TopBarRight() {
//   const msLeft = useSessionCountdown();

//   return (
//     <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//       {msLeft > 0 && (
//         <small className="session-badge">
//           Sessão expira em {formatRemaining(msLeft)}
//         </small>
//       )}
//     </div>
//   );
// }

// /* =========================================================
//    Componente Raiz (App)
// ========================================================= */
// function App() {
//   useEffect(() => {
//     initAuthWatcher();
//   }, []);

//   const [ordens, setOrdens] = useState(() => {
//     try {
//       return JSON.parse(localStorage.getItem("ordens")) || [];
//     } catch {
//       return [];
//     }
//   });

//   const salvarLocal = (lista) => {
//     try {
//       localStorage.setItem("ordens", JSON.stringify(lista));
//     } catch (e) {
//       console.error("Erro ao acessar localStorage:", e);
//     }
//   };

//   const adicionarOrdem = (novaOrdem) => {
//     const atualizadas = [...ordens, novaOrdem];
//     setOrdens(atualizadas);
//     salvarLocal(atualizadas);
//   };

//   const excluirOrdem = (numeroOS) => {
//     const atualizadas = ordens.filter((o) => o.numeroOS !== numeroOS);
//     setOrdens(atualizadas);
//     salvarLocal(atualizadas);
//   };

//   return (
//     <Router>
//       <ErrorBoundary>
//         <AppRoutes
//           ordens={ordens}
//           adicionarOrdem={adicionarOrdem}
//           excluirOrdem={excluirOrdem}
//         />
//       </ErrorBoundary>
//     </Router>
//   );
// }

// export default App;


// ------------------------------------------------------------------

// import React, { useEffect, useState } from "react";
// import { BrowserRouter as Router } from "react-router-dom";
// import AppRoutes from "./routes/AppRoutes";

// import "react-toastify/dist/ReactToastify.css";
// import "./styles.css";

// import {
//   initAuthWatcher,
//   useSessionCountdown,
//   formatRemaining,
// } from "./auth/auth";

// /* =========================================================
//    Error Boundary Global
// ========================================================= */
// class ErrorBoundary extends React.Component {
//   constructor(props) {
//     super(props);
//     this.state = { hasError: false, error: null };
//   }

//   static getDerivedStateFromError(error) {
//     return { hasError: true, error };
//   }

//   componentDidCatch(error, info) {
//     console.error("UI crash:", error, info);
//   }

//   render() {
//     if (this.state.hasError) {
//       return (
//         <div
//           style={{
//             background: "#7f1d1d",
//             color: "#fff",
//             padding: 16,
//             borderBottom: "3px solid #991b1b",
//           }}
//         >
//           <h2 style={{ marginTop: 0 }}>Erro na interface</h2>
//           <pre style={{ whiteSpace: "pre-wrap" }}>
//             {String(this.state.error)}
//           </pre>
//         </div>
//       );
//     }

//     return this.props.children;
//   }
// }

// /* =========================================================
//    Componente Auxiliar de Expiração da Sessão
// ========================================================= */
// export function TopBarRight() {
//   const msLeft = useSessionCountdown();

//   return (
//     <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
//       {msLeft > 0 && (
//         <small className="session-badge">
//           Sessão expira em {formatRemaining(msLeft)}
//         </small>
//       )}
//     </div>
//   );
// }

// /* =========================================================
//    Componente Raiz (App)
// ========================================================= */
// function App() {
//   useEffect(() => {
//     initAuthWatcher();
//   }, []);

//   const [ordens, setOrdens] = useState(() => {
//     try {
//       return JSON.parse(localStorage.getItem("ordens")) || [];
//     } catch {
//       return [];
//     }
//   });

//   const salvarLocal = (lista) => {
//     try {
//       localStorage.setItem("ordens", JSON.stringify(lista));
//     } catch (e) {
//       console.error("Erro ao acessar localStorage:", e);
//     }
//   };

//   const adicionarOrdem = (novaOrdem) => {
//     const atualizadas = [...ordens, novaOrdem];
//     setOrdens(atualizadas);
//     salvarLocal(atualizadas);
//   };

//   const excluirOrdem = (numeroOS) => {
//     const atualizadas = ordens.filter((o) => o.numeroOS !== numeroOS);
//     setOrdens(atualizadas);
//     salvarLocal(atualizadas);
//   };

//   return (
//     <Router>
//       <ErrorBoundary>
//         <AppRoutes
//           ordens={ordens}
//           adicionarOrdem={adicionarOrdem}
//           excluirOrdem={excluirOrdem}
//         />
//       </ErrorBoundary>
//     </Router>
//   );
// }

// export default App;


















// src/App.jsx
import React, { useEffect, useState } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import AppRoutes from "./routes/AppRoutes";

import "react-toastify/dist/ReactToastify.css";
import "./components/Visual/styles.css";

import {
  initAuthWatcher,
  useSessionCountdown,
  formatRemaining,
  getUser,
  isAdmin,
} from "./auth/auth";

/* =========================================================
   Error Boundary Global
========================================================= */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("UI crash:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            background: "#7f1d1d",
            color: "#fff",
            padding: 16,
            borderBottom: "3px solid #991b1b",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Erro na interface</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {String(this.state.error)}
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}

/* =========================================================
   Componente Auxiliar de Expiração da Sessão & Perfil
========================================================= */
export function TopBarRight() {
  const msLeft = useSessionCountdown();
  const user = getUser();
  const isUserAdmin = isAdmin(user);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
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

/* =========================================================
   Componente Raiz (App)
========================================================= */
import { api } from "./api/client";
import { sincronizarContasDoServidor } from "./services/contasService";
import ModalChatAtendimento, { playChatNotificationSound } from "./components/Modais/ModalChatAtendimento";

function App() {
  const [ordens, setOrdens] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ordens")) || [];
    } catch {
      return [];
    }
  });

  // Estado global para Chat de Atendimento ao Vivo em tempo real
  const [chatAtivoChamado, setChatAtivoChamado] = useState(null);
  const [isChatMinimized, setIsChatMinimized] = useState(false);

  useEffect(() => {
    initAuthWatcher();
    // Sincroniza ordens de serviço do backend MySQL
    api.get("/os")
      .then((resp) => {
        if (Array.isArray(resp.data)) {
          setOrdens(resp.data);
          try {
            localStorage.setItem("ordens", JSON.stringify(resp.data));
          } catch {}
        }
      })
      .catch((e) => {
        console.warn("Aviso ao carregar OS do servidor:", e.message);
      });

    // Sincroniza contas do servidor (garante compartilhamento entre portas 5173 e 2515)
    sincronizarContasDoServidor().catch(() => {});
  }, []);

  // Listener global de mensagens e início de atendimento em tempo real
  useEffect(() => {
    const processarEventoChat = (evento) => {
      if (!evento || !evento.chamadoId) return;

      const currentUser = getUser();
      if (!currentUser) return;

      const myEmail = String(currentUser.email || "").toLowerCase().trim();
      const myUsername = String(currentUser.username || "").toLowerCase().trim();
      const myName = String(currentUser.name || currentUser.nome || "").toLowerCase().trim();
      const isUserAdmin =
        isAdmin(currentUser) ||
        myEmail.includes("admin") ||
        myEmail === "jsa@jsa.com" ||
        myEmail === "jsa.admin@gmail.com";

      const targetClientEmail = String(evento.clienteEmail || "").toLowerCase().trim();
      const targetClientName = String(evento.clienteNome || "").toLowerCase().trim();

      // Determina se a notificação é para o usuário logado
      let isParaMim = false;
      if (isUserAdmin) {
        isParaMim = !!evento.isClientSender;
      } else {
        // Usuário comum / cliente:
        if (evento.isAdminSender || evento.tipo === "INICIAR_ATENDIMENTO" || evento.tipo === "NOVA_MENSAGEM") {
          // 1. Email do cliente bate
          if (myEmail && targetClientEmail && (targetClientEmail === myEmail || targetClientEmail.includes(myEmail) || myEmail.includes(targetClientEmail))) {
            isParaMim = true;
          }
          // 2. Username do cliente bate
          else if (myUsername && targetClientEmail && (targetClientEmail === myUsername || targetClientEmail.includes(myUsername))) {
            isParaMim = true;
          }
          // 3. Nome do cliente bate
          else if (myName && targetClientName && (myName === targetClientName || myName.includes(targetClientName) || targetClientName.includes(myName))) {
            isParaMim = true;
          }
          // 4. Chamado registrado no localStorage do cliente
          else {
            try {
              const db = JSON.parse(localStorage.getItem("chamados_db") || "[]");
              const meuChamado = db.find((c) => String(c.id) === String(evento.chamadoId));
              if (meuChamado) {
                const cEmail = String(meuChamado.clienteEmail || "").toLowerCase().trim();
                const cName = String(meuChamado.clienteNome || "").toLowerCase().trim();
                if (
                  (myEmail && (cEmail === myEmail || cEmail.includes(myEmail))) ||
                  (myUsername && (cEmail === myUsername || cEmail.includes(myUsername))) ||
                  (myName && (cName === myName || cName.includes(myName))) ||
                  (!cEmail && !myEmail)
                ) {
                  isParaMim = true;
                }
              } else {
                // Se não há e-mail de destino especificado ou se o usuário não é admin
                if (!targetClientEmail || targetClientEmail === myEmail) {
                  isParaMim = true;
                }
              }
            } catch {
              isParaMim = true;
            }
          }
        }
      }

      if (isParaMim) {
        // Toca som de notificação
        playChatNotificationSound();

        // Obtém dados atualizados do chamado no localStorage ou cria objeto com a nova mensagem
        let chamadoObj = null;
        try {
          const db = JSON.parse(localStorage.getItem("chamados_db") || "[]");
          chamadoObj = db.find((c) => String(c.id) === String(evento.chamadoId));
          if (chamadoObj && evento.mensagem) {
            const hist = chamadoObj.respostas || chamadoObj.mensagens || [];
            const jaExiste = hist.some(
              (m) => m.mensagem === evento.mensagem && m.data === evento.data
            );
            if (!jaExiste) {
              chamadoObj = {
                ...chamadoObj,
                status: "Em Atendimento",
                respostas: [
                  ...hist,
                  {
                    autor: evento.autor || "Suporte JSA",
                    mensagem: evento.mensagem,
                    data: evento.data || new Date().toLocaleString("pt-BR"),
                    isAdmin: !!evento.isAdminSender,
                    timestamp: evento.timestamp || Date.now(),
                  },
                ],
              };
              const novos = db.map((c) => (String(c.id) === String(chamadoObj.id) ? chamadoObj : c));
              localStorage.setItem("chamados_db", JSON.stringify(novos));
            }
          }
        } catch {}

        if (!chamadoObj) {
          chamadoObj = {
            id: evento.chamadoId,
            assunto: evento.assunto || "Atendimento JSA",
            clienteEmail: targetClientEmail,
            clienteNome: evento.clienteNome || "Cliente",
            status: "Em Atendimento",
            respostas: evento.mensagem
              ? [
                  {
                    autor: evento.autor || "Suporte JSA",
                    mensagem: evento.mensagem,
                    data: evento.data || new Date().toLocaleString("pt-BR"),
                    isAdmin: !!evento.isAdminSender,
                    timestamp: evento.timestamp || Date.now(),
                  },
                ]
              : [],
          };
        }

        // Abre o modal do chat na tela do usuário automaticamente
        setChatAtivoChamado(chamadoObj);
        setIsChatMinimized(false);

        // Toast informativo
        if (evento.tipo === "INICIAR_ATENDIMENTO") {
          toast.info(
            `🎧 Atendimento Iniciado! O Suporte JSA iniciou o atendimento do Chamado #${evento.chamadoId}.`,
            { autoClose: 6000 }
          );
        } else if (evento.tipo === "NOVA_MENSAGEM") {
          toast.info(
            `💬 ${evento.autor || "Suporte"}: "${(evento.mensagem || "").slice(0, 50)}${
              (evento.mensagem || "").length > 50 ? "..." : ""
            }"`,
            { autoClose: 5000 }
          );
        }
      }
    };

    let bc;
    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel("jsa_chamados_chat");
      bc.onmessage = (e) => processarEventoChat(e.data);
    }

    const handleStorage = (e) => {
      if (e.key === "jsa_chat_last_event" && e.newValue) {
        try {
          const payload = JSON.parse(e.newValue);
          processarEventoChat(payload);
        } catch {}
      }
    };

    const handleCustomEvent = (e) => {
      if (e.detail) {
        processarEventoChat(e.detail);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("jsa_chat_event", handleCustomEvent);

    // Polling ativo a cada 2s para sincronizar chamados e abrir chat caso haja nova mensagem do suporte
    const pollInterval = setInterval(() => {
      const currentUser = getUser();
      if (!currentUser) return;

      const myEmail = String(currentUser.email || "").toLowerCase().trim();
      const myUsername = String(currentUser.username || "").toLowerCase().trim();
      const myName = String(currentUser.name || currentUser.nome || "").toLowerCase().trim();
      const isUserAdmin =
        isAdmin(currentUser) ||
        myEmail.includes("admin") ||
        myEmail === "jsa@jsa.com" ||
        myEmail === "jsa.admin@gmail.com";

      if (isUserAdmin) return; // Polling dedicado para clientes

      api.get("/chamados")
        .then((resp) => {
          if (Array.isArray(resp.data)) {
            localStorage.setItem("chamados_db", JSON.stringify(resp.data));

            const meusChamados = resp.data.filter((c) => {
              const cEmail = String(c.clienteEmail || "").toLowerCase().trim();
              const cName = String(c.clienteNome || "").toLowerCase().trim();
              return (
                (myEmail && (cEmail === myEmail || cEmail.includes(myEmail) || myEmail.includes(cEmail))) ||
                (myUsername && (cEmail === myUsername || cEmail.includes(myUsername))) ||
                (myName && (cName === myName || cName.includes(myName)))
              );
            });

            meusChamados.forEach((c) => {
              if (c.status === "Em Atendimento") {
                const msgs = c.respostas || c.mensagens || [];
                const keySeen = `jsa_seen_msgs_${c.id}`;
                const keyOpened = `jsa_opened_ticket_${c.id}`;
                const lastSeen = Number(sessionStorage.getItem(keySeen) || "0");
                const jaAbriu = sessionStorage.getItem(keyOpened) === "true";

                // Se ainda não abriu ou se chegou nova mensagem
                if (!jaAbriu || msgs.length > lastSeen) {
                  sessionStorage.setItem(keyOpened, "true");
                  sessionStorage.setItem(keySeen, String(msgs.length));

                  // Identifica se a última mensagem é do admin/suporte
                  const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
                  const isFromAdmin =
                    lastMsg &&
                    (lastMsg.isAdmin ||
                      String(lastMsg.autor).includes("Suporte") ||
                      String(lastMsg.autor).includes("Admin"));

                  if (isFromAdmin || !jaAbriu) {
                    playChatNotificationSound();
                    setChatAtivoChamado(c);
                    setIsChatMinimized(false);

                    if (lastMsg && isFromAdmin) {
                      toast.info(
                        `💬 ${lastMsg.autor}: "${(lastMsg.mensagem || "").slice(0, 45)}${
                          (lastMsg.mensagem || "").length > 45 ? "..." : ""
                        }"`,
                        { autoClose: 5000 }
                      );
                    }
                  }
                }
              }
            });
          }
        })
        .catch(() => {});
    }, 2000);

    return () => {
      if (bc) bc.close();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("jsa_chat_event", handleCustomEvent);
      clearInterval(pollInterval);
    };
  }, []);

  const salvarLocal = (lista) => {
    try {
      localStorage.setItem("ordens", JSON.stringify(lista));
    } catch (e) {
      console.error("Erro ao acessar localStorage:", e);
    }
  };

  const adicionarOrdem = (novaOrdem) => {
    const atualizadas = [...ordens, novaOrdem];
    setOrdens(atualizadas);
    salvarLocal(atualizadas);

    // Persiste no banco de dados via API
    api.post("/os", novaOrdem).catch((e) =>
      console.warn("Aviso ao persistir OS no banco via API:", e.message)
    );
  };

  const excluirOrdem = (numeroOS) => {
    const atualizadas = ordens.filter((o) => o.numeroOS !== numeroOS);
    setOrdens(atualizadas);
    salvarLocal(atualizadas);

    // Persiste no banco de dados via API
    api.delete(`/os/${numeroOS}`).catch((e) =>
      console.warn("Aviso ao excluir OS no banco via API:", e.message)
    );
  };

  return (
    <Router>
      <ErrorBoundary>
        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="dark"
          limit={3}
        />
        <AppRoutes
          ordens={ordens}
          adicionarOrdem={adicionarOrdem}
          excluirOrdem={excluirOrdem}
        />

        {/* MODAL GLOBAL DE CHAT AO VIVO DE ATENDIMENTO */}
        {chatAtivoChamado && !isChatMinimized && (
          <ModalChatAtendimento
            chamado={chatAtivoChamado}
            onClose={() => setChatAtivoChamado(null)}
            onMinimize={() => setIsChatMinimized(true)}
            onUpdateChamado={(atualizado) => setChatAtivoChamado(atualizado)}
          />
        )}

        {/* BOTÃO FLUTUANTE QUANDO CHAT MINIMIZADO */}
        {chatAtivoChamado && isChatMinimized && (
          <button
            type="button"
            className="chamados-floating-chat-btn"
            onClick={() => setIsChatMinimized(false)}
            title="Clique para reabrir o chat de atendimento"
          >
            <span>💬</span>
            <span>Atendimento Ativo (#{chatAtivoChamado.id})</span>
            <span className="chamados-floating-chat-badge">!</span>
          </button>
        )}
      </ErrorBoundary>
    </Router>
  );
}

export default App;