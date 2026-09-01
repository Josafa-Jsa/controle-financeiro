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

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
      {user && (
        <span
          style={{
            fontSize: 12,
            padding: "4px 8px",
            borderRadius: 4,
            background: user.role === "ADMIN" ? "#854d0e" : "#334155",
            color: "#fff",
            fontWeight: "bold",
          }}
        >
          {user.role === "ADMIN" ? "👑 Admin" : "👤 Usuário"}
        </span>
      )}
      {msLeft > 0 && (
        <small className="session-badge">
          Sessão expira em {formatRemaining(msLeft)}
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

function App() {
  const [ordens, setOrdens] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("ordens")) || [];
    } catch {
      return [];
    }
  });

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
      </ErrorBoundary>
    </Router>
  );
}

export default App;