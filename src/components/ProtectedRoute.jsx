// import React from "react";
// import { Navigate, useLocation } from "react-router-dom";
// import { isLoggedIn } from "../auth/auth";
// export default function ProtectedRoute({ children }) {
//   const loc = useLocation();
//   return isLoggedIn() ? children : <Navigate to="/login" replace state={{ from: loc }} />;
// }


// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getUser, isAdmin, isLoggedIn } from "../auth/auth";
import TelaEmManutencaoView, { AdminMaintenanceNoticeBanner } from "./Visual/TelaEmManutencaoView";
import { useSystemStatus, verificarManutencaoTela } from "../services/systemStatusService";

export default function ProtectedRoute({ children, requiredPermission }) {
  const location = useLocation();
  const systemStatus = useSystemStatus();
  const user = getUser();

  if (!user || !isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  const isUserAdmin = isAdmin(user) || (Array.isArray(user.permissions) && user.permissions.includes("*"));
  const manutencaoAtiva = verificarManutencaoTela(location.pathname, systemStatus);

  // Se estiver em manutenção e não for admin: bloqueia exibindo [Nome da Tela] Em Manutenção... ou Sistema em Manutenção em Múltiplas Telas!
  if (manutencaoAtiva && !isUserAdmin) {
    return (
      <TelaEmManutencaoView
        nomeTela={manutencaoAtiva.nomeTela}
        mensagem={manutencaoAtiva.mensagem}
        isGeral={manutencaoAtiva.isGeral}
      />
    );
  }

  // Se for admin e estiver em manutenção: exibe aviso superior
  if (manutencaoAtiva && isUserAdmin) {
    return (
      <>
        <AdminMaintenanceNoticeBanner
          nomeTela={manutencaoAtiva.nomeTela}
          mensagem={manutencaoAtiva.mensagem}
        />
        {children ? children : <Outlet />}
      </>
    );
  }

  // Admin possui acesso total a todas as telas liberadas pelo sistema
  if (isUserAdmin) {
    return children ? children : <Outlet />;
  }

  // Se não foi exigida permissão específica, acesso liberado
  if (!requiredPermission) {
    return children ? children : <Outlet />;
  }

  // Verifica se o usuário possui a permissão liberada pelo ADMIN
  const perms = Array.isArray(user.permissions) ? user.permissions : [];
  let hasAccess = false;

  if (requiredPermission === "ordem-servico" || requiredPermission === "os") {
    hasAccess = perms.includes("ordem-servico") || perms.includes("os");
  } else {
    hasAccess = perms.includes(requiredPermission);
  }

  if (!hasAccess) {
    // Redireciona para o dashboard ou para a primeira tela permitida
    return <Navigate to="/dashboard" replace />;
  }

  return children ? children : <Outlet />;
}