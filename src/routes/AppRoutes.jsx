// // src/routes/AppRoutes.jsx
// import React from "react";
// import { Routes, Route, Navigate, useLocation } from "react-router-dom";
// import { ToastContainer } from "react-toastify";

// /* ---------- Componentes globais ---------- */
// import Navbar from "../components/Navbar";
// import Footer from "../components/Footer";

// /* ---------- Auth ---------- */
// import { getUser, isAdmin } from "../auth/auth";

// /* ---------- Páginas de Auth (públicas) ---------- */
// import Login from "../pages/Auth/Login";
// import Register from "../pages/Auth/Register";
// import ForgotPassword from "../pages/Auth/ForgotPassword";
// import ResetPassword from "../pages/Auth/ResetPassword";

// /* ---------- Páginas (privadas) ---------- */
// import ContasPage from "../pages/Contas/ContasPage";
// import FluxoPage from "../pages/FluxoCaixa/FluxoPage";
// import SimuladorPage from "../pages/Simulador/SimuladorPage";
// import ContratosPage from "../pages/Contratos/ContratosPage";
// import ContratoInternetPage from "../pages/Contratos/ContratoInternetPage";
// import EstoquePage from "../pages/Estoque/EstoquePage";
// import NotasPage from "../pages/NotasFiscais/NotasPage";

// /* ---------- Ordem de Serviço ---------- */
// import OrdemServicoForm from "../pages/Os/OrdemServicoForm";
// import OrdemServicoList from "../pages/Os/OrdemServicoList";

// /* ---------- Admin ---------- */
// import LogPage from "../pages/Admin/Log";
// import * as AdminUsersModule from "../pages/Admin/AdminUsersPage";

// const AdminUsersPage =
//   AdminUsersModule.default || AdminUsersModule.AdminUsersPage;

// /* =========================================================
//    Funções auxiliares de checagem
// ========================================================= */
// function checkIsLoggedIn() {
//   return !!getUser();
// }

// function checkIsAdmin() {
//   const u = getUser();
//   if (!u) return false;

//   // Se a função isAdmin() da auth.js retornar true
//   if (typeof isAdmin === "function" && isAdmin()) return true;

//   // Garante que contas antigas / administradores principais tenham acesso irrestrito
//   const email = (u?.email || u?.username || "").toLowerCase();
  
//   if (
//     email.includes("admin") || 
//     email === "jsa@jsa.com" || 
//     email === "jsa.admin@gmail.com" ||
//     u?.role === "admin" ||
//     u?.isAdmin === true
//   ) {
//     return true;
//   }

//   // Se for uma conta nova e não for marcada explicitamente como admin, nega o acesso de admin
//   if (u?.isNewUser && !u?.isAdmin) {
//     return false;
//   }

//   // Por padrão, libera para o usuário legados/existentes
//   return true;
// }

// /* =========================================================
//    Componentes de Rota Protegida
// ========================================================= */
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

// /* =========================================================
//    Layout Principal
// ========================================================= */
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

// /* =========================================================
//    Componente Principal de Rotas
// ========================================================= */
// export default function AppRoutes({ ordens, adicionarOrdem, excluirOrdem }) {
//   return (
//     <Layout>
//       <Routes>
//         {/* PÚBLICAS */}
//         <Route path="/login" element={<Login />} />
//         <Route path="/register" element={<Register />} />
//         <Route path="/forgot" element={<ForgotPassword />} />
//         <Route path="/reset-password" element={<ResetPassword />} />

//         {/* PRIVADAS */}
//         <Route
//           path="/"
//           element={
//             <ProtectedRoute>
//               <ContasPage />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/fluxo"
//           element={
//             <ProtectedRoute>
//               <FluxoPage />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/simulador"
//           element={
//             <ProtectedRoute>
//               <SimuladorPage />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/contratos"
//           element={
//             <ProtectedRoute>
//               <ContratosPage />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/contrato-internet"
//           element={
//             <ProtectedRoute>
//               <ContratoInternetPage />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/estoque"
//           element={
//             <ProtectedRoute>
//               <EstoquePage />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/notas"
//           element={
//             <ProtectedRoute>
//               <NotasPage />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/ordem-servico"
//           element={
//             <ProtectedRoute>
//               <div className="container">
//                 <h1>JSA Soluções Tecnológicas (O.S)</h1>

//                 <OrdemServicoForm onSalvar={adicionarOrdem} />

//                 <OrdemServicoList
//                   ordens={ordens}
//                   onExcluir={excluirOrdem}
//                 />
//               </div>
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/ordens"
//           element={
//             <ProtectedRoute>
//               <OrdemServicoList
//                 ordens={ordens}
//                 onExcluir={excluirOrdem}
//               />
//             </ProtectedRoute>
//           }
//         />

//         {/* ADMIN */}
//         <Route
//           path="/admin/log"
//           element={
//             <ProtectedRoute>
//               <AdminRoute>
//                 <LogPage />
//               </AdminRoute>
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/admin/users"
//           element={
//             <ProtectedRoute>
//               <AdminRoute>
//                 <AdminUsersPage />
//               </AdminRoute>
//             </ProtectedRoute>
//           }
//         />

//         {/* Fallback */}
//         <Route path="*" element={<Navigate to="/" replace />} />
//       </Routes>
//     </Layout>
//   );
// }


// // src/routes/AppRoutes.jsx
// import React from "react";
// import { Routes, Route, Navigate, useLocation } from "react-router-dom";
// import { ToastContainer } from "react-toastify";

// /* ---------- Componentes globais ---------- */
// import Navbar from "../components/Navbar";
// import Footer from "../components/Footer";

// /* ---------- Auth ---------- */
// import { getUser, isAdmin } from "../auth/auth";

// /* ---------- Páginas de Auth (públicas) ---------- */
// import Login from "../pages/Auth/Login";
// import Register from "../pages/Auth/Register";
// import ForgotPassword from "../pages/Auth/ForgotPassword";
// import ResetPassword from "../pages/Auth/ResetPassword";

// /* ---------- Páginas (privadas) ---------- */
// import ContasPage from "../pages/Contas/ContasPage";
// import FluxoPage from "../pages/FluxoCaixa/FluxoPage";
// import SimuladorPage from "../pages/Simulador/SimuladorPage";
// import ContratosPage from "../pages/Contratos/ContratosPage";
// import ContratoInternetPage from "../pages/Contratos/ContratoInternetPage";
// import EstoquePage from "../pages/Estoque/EstoquePage";
// import NotasPage from "../pages/NotasFiscais/NotasPage";

// /* ---------- Chamados ---------- */
// import ChamadosAdmin from "../pages/Chamados/ChamadosAdmin";
// import ChamadosClient from "../pages/Chamados/ChamadosClient";

// /* ---------- Ordem de Serviço ---------- */
// import OrdemServicoForm from "../pages/Os/OrdemServicoForm";
// import OrdemServicoList from "../pages/Os/OrdemServicoList";

// /* ---------- Admin ---------- */
// import LogPage from "../pages/Admin/Log";
// import * as AdminUsersModule from "../pages/Admin/AdminUsersPage";

// const AdminUsersPage =
//   AdminUsersModule.default || AdminUsersModule.AdminUsersPage;

// /* =========================================================
//    Funções auxiliares de checagem
// ========================================================= */
// function checkIsLoggedIn() {
//   return !!getUser();
// }

// function checkIsAdmin() {
//   const u = getUser();
//   if (!u) return false;

//   if (typeof isAdmin === "function" && isAdmin()) return true;

//   const email = (u?.email || u?.username || "").toLowerCase();

//   if (
//     email.includes("admin") ||
//     email === "jsa@jsa.com" ||
//     email === "jsa.admin@gmail.com" ||
//     u?.role === "admin" ||
//     u?.isAdmin === true
//   ) {
//     return true;
//   }

//   if (u?.isNewUser && !u?.isAdmin) {
//     return false;
//   }

//   return true;
// }

// /* =========================================================
//    Componente Roteador de Atendimento / Chamados
// ========================================================= */
// function ChamadosRouter() {
//   try {
//     const isUserAdmin = checkIsAdmin();
//     return isUserAdmin ? <ChamadosAdmin /> : <ChamadosClient />;
//   } catch (error) {
//     console.error("Erro ao redirecionar chamados:", error);
//     return <ChamadosAdmin />;
//   }
// }

// /* =========================================================
//    Componentes de Rota Protegida
// ========================================================= */
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

// /* =========================================================
//    Layout Principal
// ========================================================= */
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

// /* =========================================================
//    Componente Principal de Rotas
// ========================================================= */
// export default function AppRoutes({ ordens, adicionarOrdem, excluirOrdem }) {
//   return (
//     <Layout>
//       <Routes>
//         {/* PÚBLICAS */}
//         <Route path="/login" element={<Login />} />
//         <Route path="/register" element={<Register />} />
//         <Route path="/forgot" element={<ForgotPassword />} />
//         <Route path="/reset-password" element={<ResetPassword />} />

//         {/* PRIVADAS */}
//         <Route
//           path="/"
//           element={
//             <ProtectedRoute>
//               <ContasPage />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/fluxo"
//           element={
//             <ProtectedRoute>
//               <FluxoPage />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/simulador"
//           element={
//             <ProtectedRoute>
//               <SimuladorPage />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/contratos"
//           element={
//             <ProtectedRoute>
//               <ContratosPage />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/contrato-internet"
//           element={
//             <ProtectedRoute>
//               <ContratoInternetPage />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/estoque"
//           element={
//             <ProtectedRoute>
//               <EstoquePage />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/notas"
//           element={
//             <ProtectedRoute>
//               <NotasPage />
//             </ProtectedRoute>
//           }
//         />

//         {/* ATENDIMENTO / CHAMADOS */}
//         <Route
//           path="/chamados"
//           element={
//             <ProtectedRoute>
//               <ChamadosRouter />
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/ordem-servico"
//           element={
//             <ProtectedRoute>
//               <div className="container">
//                 <h1>JSA Soluções Tecnológicas (O.S)</h1>

//                 <OrdemServicoForm onSalvar={adicionarOrdem} />

//                 <OrdemServicoList
//                   ordens={ordens}
//                   onExcluir={excluirOrdem}
//                 />
//               </div>
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/ordens"
//           element={
//             <ProtectedRoute>
//               <OrdemServicoList
//                 ordens={ordens}
//                 onExcluir={excluirOrdem}
//               />
//             </ProtectedRoute>
//           }
//         />

//         {/* ADMIN */}
//         <Route
//           path="/admin/log"
//           element={
//             <ProtectedRoute>
//               <AdminRoute>
//                 <LogPage />
//               </AdminRoute>
//             </ProtectedRoute>
//           }
//         />

//         <Route
//           path="/admin/users"
//           element={
//             <ProtectedRoute>
//               <AdminRoute>
//                 <AdminUsersPage />
//               </AdminRoute>
//             </ProtectedRoute>
//           }
//         />

//         {/* Fallback */}
//         <Route path="*" element={<Navigate to="/" replace />} />
//       </Routes>
//     </Layout>
//   );
// }






import React, { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { ToastContainer } from "react-toastify";

/* ---------- Componentes globais ---------- */
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import MobileBottomNav from "../components/MobileBottomNav";
import ChatbotIA from "../components/Chatbot/ChatbotIA";
import JsaLoginIntroAnimation from "../components/Visual/JsaLoginIntroAnimation";
import TelaEmManutencaoView, { AdminMaintenanceNoticeBanner } from "../components/Visual/TelaEmManutencaoView";
import TelaSemAcessoView from "../components/Visual/TelaSemAcessoView";
import { useSystemStatus, verificarManutencaoTela } from "../services/systemStatusService";
import { useAdminPresenceAlerts } from "../hooks/useAdminPresenceAlerts";
import { isMobilePort, initDeviceMode } from "../utils/deviceMode";
import "../components/Visual/mobileExclusive2515.css";

/* ---------- Auth ---------- */
import { getUser, isAdmin, isLoggedIn } from "../auth/auth";

/* ---------- Páginas de Auth (públicas) ---------- */
import Login from "../pages/Auth/Login";
import Register from "../pages/Auth/Register";
import ForgotPassword from "../pages/Auth/ForgotPassword";
import ResetPassword from "../pages/Auth/ResetPassword";
import CompletarWhatsapp from "../pages/Auth/CompletarWhatsapp";

/* ---------- Páginas (privadas) ---------- */
import Dashboard from "../pages/Dashboard/Dashboard";
import ContasPage from "../pages/Contas/ContasPage";
import FluxoPage from "../pages/FluxoCaixa/FluxoPage";
import SimuladorPage from "../pages/Simulador/SimuladorPage";
import ContratosPage from "../pages/Contratos/ContratosPage";
import ContratoInternetPage from "../pages/Contratos/ContratoInternetPage";
import EstoquePage from "../pages/Estoque/EstoquePage";
import NotasPage from "../pages/NotasFiscais/NotasPage";
import ControleNotasPage from "../pages/ControleNotas/ControleNotasPage";
import PrevencaoPage from "../pages/Prevencao/PrevencaoPage";
import ControleUniformesPage from "../pages/Uniformes/ControleUniformesPage";

/* ---------- Chamados ---------- */
import ChamadosAdmin from "../pages/Chamados/ChamadosAdmin";
import ChamadosClient from "../pages/Chamados/ChamadosClient";

/* ---------- Ordem de Serviço ---------- */
import OrdemServicoForm from "../pages/Os/OrdemServicoForm";
import OrdemServicoList from "../pages/Os/OrdemServicoList";

/* ---------- Admin ---------- */
import LogPage from "../pages/Admin/Log";
import AdminUsersPage from "../pages/Admin/AdminUsersPage";

/* =========================================================
   Funções auxiliares de checagem
========================================================= */
function checkIsLoggedIn() {
  return isLoggedIn();
}

function checkIsAdmin() {
  return isAdmin();
}

/* =========================================================
   Componente Roteador de Atendimento / Chamados
========================================================= */
function ChamadosRouter() {
  try {
    const isUserAdmin = checkIsAdmin();
    return isUserAdmin ? <ChamadosAdmin /> : <ChamadosClient />;
  } catch (error) {
    console.error("Erro ao redirecionar chamados:", error);
    return <ChamadosClient />;
  }
}

/* =========================================================
   Componente Roteador de Dashboard (Respeita Permissões)
========================================================= */
function DashboardRouter() {
  try {
    const u = getUser();
    if (!u) return <Navigate to="/login" replace />;

    if (checkIsAdmin()) {
      return <Dashboard />;
    }

    const perms = Array.isArray(u.permissions || u.permissoes)
      ? (u.permissions || u.permissoes)
      : [];

    // Se o usuário tem permissão para o Dashboard, renderiza o Dashboard
    if (perms.includes("*") || perms.includes("dashboard")) {
      return <Dashboard />;
    }

    // Se não tiver permissão para Dashboard, redireciona para a primeira tela permitida
    if (perms.includes("prevencao")) {
      return <Navigate to="/prevencao" replace />;
    }
    if (perms.includes("uniformes") || perms.includes("controle-uniformes")) {
      return <Navigate to="/uniformes" replace />;
    }
    if (perms.includes("controle-notas")) {
      return <Navigate to="/controle-notas" replace />;
    }
    if (perms.includes("contas")) {
      return <Navigate to="/contas" replace />;
    }
    if (perms.includes("fluxo")) {
      return <Navigate to="/fluxo" replace />;
    }
    if (perms.includes("simulador")) {
      return <Navigate to="/simulador" replace />;
    }
    if (perms.includes("notas")) {
      return <Navigate to="/notas" replace />;
    }
    if (perms.includes("ordem-servico") || perms.includes("os")) {
      return <Navigate to="/ordem-servico" replace />;
    }
    if (perms.includes("contratos")) {
      return <Navigate to="/contratos" replace />;
    }
    if (perms.includes("contrato-internet")) {
      return <Navigate to="/contrato-internet" replace />;
    }
    if (perms.includes("estoque")) {
      return <Navigate to="/estoque" replace />;
    }

    return <Navigate to="/chamados" replace />;
  } catch (error) {
    console.error("Erro no roteamento do dashboard:", error);
    return <Dashboard />;
  }
}

/* =========================================================
   Componentes de Rota Protegida com Checagem de Permissão
========================================================= */
function ProtectedRoute({ children, requiredPermission }) {
  const location = useLocation();
  const systemStatus = useSystemStatus();

  if (!checkIsLoggedIn()) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  const isUserAdmin = checkIsAdmin();
  const manutencaoAtiva = verificarManutencaoTela(location.pathname, systemStatus);

  // SE A TELA ESTIVER EM MANUTENÇÃO E O USUÁRIO NÃO FOR ADMINISTRADOR:
  // BLOQUEIA A TELA IMEDIATAMENTE EXIBINDO "[Nome da Tela] Em Manutenção..." OU "Sistema em Manutenção em Múltiplas Telas!"
  if (manutencaoAtiva && !isUserAdmin) {
    return (
      <TelaEmManutencaoView
        nomeTela={manutencaoAtiva.nomeTela}
        mensagem={manutencaoAtiva.mensagem}
        isGeral={manutencaoAtiva.isGeral}
      />
    );
  }

  // SE FOR ADMINISTRADOR E A TELA ESTIVER EM MANUTENÇÃO: EXIBE AVISO SUPERIOR
  if (manutencaoAtiva && isUserAdmin) {
    return (
      <>
        <AdminMaintenanceNoticeBanner
          nomeTela={manutencaoAtiva.nomeTela}
          mensagem={manutencaoAtiva.mensagem}
        />
        {children}
      </>
    );
  }

  if (isUserAdmin) return children;

  if (requiredPermission) {
    if (requiredPermission === "chamados" || requiredPermission === "atendimento") {
      return children;
    }

    const u = getUser();
    const perms = Array.isArray(u?.permissions || u?.permissoes)
      ? (u.permissions || u.permissoes)
      : [];

    if (perms.includes("*") || perms.includes("admin")) {
      return children;
    }

    let hasPerm = false;
    if (requiredPermission === "ordem-servico" || requiredPermission === "os") {
      hasPerm = perms.includes("ordem-servico") || perms.includes("os");
    } else if (requiredPermission === "uniformes" || requiredPermission === "controle-uniformes") {
      hasPerm = perms.includes("uniformes") || perms.includes("controle-uniformes");
    } else {
      hasPerm = perms.includes(requiredPermission);
    }

    if (!hasPerm) {
      return (
        <TelaSemAcessoView
          rota={location.pathname}
          requiredPermission={requiredPermission}
        />
      );
    }
  }

  return children;
}

function AdminRoute({ children }) {
  if (!checkIsAdmin()) return <Navigate to="/" replace />;
  return children;
}

/* =========================================================
   Layout Principal
========================================================= */
function Layout({ children }) {
  const location = useLocation();
  const path = location.pathname;

  // Alertas em tempo real de conexão e desconexão de usuários exclusivos para o Administrador
  useAdminPresenceAlerts();

  const [showIntroAnimation, setShowIntroAnimation] = React.useState(() => {
    return sessionStorage.getItem("play_login_intro") === "true";
  });

  useEffect(() => {
    initDeviceMode();
    if (sessionStorage.getItem("play_login_intro") === "true") {
      setShowIntroAnimation(true);
    }
  }, [location]);

  const isAuthPage =
    path.startsWith("/login") ||
    path.startsWith("/register") ||
    path.startsWith("/forgot") ||
    path.startsWith("/reset-password") ||
    path.startsWith("/completar-cadastro");

  const showMobileNav = isMobilePort() && !isAuthPage;

  return (
    <div className="app-main-layout">
      {/* ANIMAÇÃO DE 3 SEGUNDOS LOGO APÓS SAIR DO LOGIN */}
      {showIntroAnimation && (
        <JsaLoginIntroAnimation
          onComplete={() => {
            sessionStorage.removeItem("play_login_intro");
            setShowIntroAnimation(false);
          }}
        />
      )}

      {!isAuthPage && <Navbar />}

      <main className="app-main-content">
        {children}
      </main>

      {!isAuthPage && <Footer />}
      {!isAuthPage && <ChatbotIA />}
      {showMobileNav && <MobileBottomNav />}
    </div>
  );
}

/* =========================================================
   Componente Principal de Rotas
========================================================= */
export default function AppRoutes({ ordens, adicionarOrdem, excluirOrdem }) {
  return (
    <Layout>
      <Routes>
        {/* PÚBLICAS */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/forgot" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />

        {/* ATUALIZAÇÃO CADASTRAL DE WHATSAPP */}
        <Route
          path="/completar-cadastro"
          element={
            <ProtectedRoute>
              <CompletarWhatsapp />
            </ProtectedRoute>
          }
        />

        {/* PRIVADAS */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />

        <Route
          path="/contas"
          element={
            <ProtectedRoute requiredPermission="contas">
              <ContasPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardRouter />
            </ProtectedRoute>
          }
        />

        <Route
          path="/fluxo"
          element={
            <ProtectedRoute requiredPermission="fluxo">
              <FluxoPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/simulador"
          element={
            <ProtectedRoute requiredPermission="simulador">
              <SimuladorPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/contratos"
          element={
            <ProtectedRoute requiredPermission="contratos">
              <ContratosPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/contrato-internet"
          element={
            <ProtectedRoute requiredPermission="contrato-internet">
              <ContratoInternetPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/estoque"
          element={
            <ProtectedRoute requiredPermission="estoque">
              <EstoquePage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/notas"
          element={
            <ProtectedRoute requiredPermission="notas">
              <NotasPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/controle-notas"
          element={
            <ProtectedRoute requiredPermission="controle-notas">
              <ControleNotasPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/controle-de-notas"
          element={
            <ProtectedRoute requiredPermission="controle-notas">
              <ControleNotasPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/prevencao"
          element={
            <ProtectedRoute requiredPermission="prevencao">
              <PrevencaoPage />
            </ProtectedRoute>
          }
        />

        <Route
          path="/uniformes"
          element={
            <ProtectedRoute requiredPermission="uniformes">
              <ControleUniformesPage />
            </ProtectedRoute>
          }
        />

        {/* ATENDIMENTO / CHAMADOS */}
        <Route
          path="/chamados"
          element={
            <ProtectedRoute requiredPermission="chamados">
              <ChamadosRouter />
            </ProtectedRoute>
          }
        />

        <Route
          path="/ordem-servico"
          element={
            <ProtectedRoute requiredPermission="ordem-servico">
              <div className="page-container fade-in-page">
                <div className="notas-header-bar" style={{ marginBottom: "20px" }}>
                  <div>
                    <h1 className="page-title" style={{ color: "#ff4d4d", margin: 0, fontSize: "1.8rem", fontWeight: 800 }}>
                      Ordem de Serviço (O.S)
                    </h1>
                    <p className="page-subtitle" style={{ color: "#8a94a6", fontSize: "0.95rem", marginTop: "4px" }}>
                      Emissão, controle e gerenciamento de Ordens de Serviço
                    </p>
                  </div>
                </div>

                <OrdemServicoForm onSalvar={adicionarOrdem} ordens={ordens} />

                <OrdemServicoList
                  ordens={ordens}
                  onExcluir={excluirOrdem}
                />
              </div>
            </ProtectedRoute>
          }
        />

        <Route
          path="/ordens"
          element={
            <ProtectedRoute requiredPermission="ordem-servico">
              <OrdemServicoList
                ordens={ordens}
                onExcluir={excluirOrdem}
              />
            </ProtectedRoute>
          }
        />

        {/* ADMIN */}
        <Route
          path="/admin/log"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <LogPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin/users"
          element={
            <ProtectedRoute>
              <AdminRoute>
                <AdminUsersPage />
              </AdminRoute>
            </ProtectedRoute>
          }
        />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}