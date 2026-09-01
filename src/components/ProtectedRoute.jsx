// import React from "react";
// import { Navigate, useLocation } from "react-router-dom";
// import { isLoggedIn } from "../auth/auth";
// export default function ProtectedRoute({ children }) {
//   const loc = useLocation();
//   return isLoggedIn() ? children : <Navigate to="/login" replace state={{ from: loc }} />;
// }


// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getUser, isAdmin, isLoggedIn } from "../auth/auth";

export default function ProtectedRoute({ children, requiredPermission }) {
  const user = getUser();

  if (!user || !isLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  // Admin possui acesso total a todas as telas liberadas pelo sistema
  if (isAdmin(user) || (Array.isArray(user.permissions) && user.permissions.includes("*"))) {
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