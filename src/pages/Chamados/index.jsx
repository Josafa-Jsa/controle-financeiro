// src/pages/Chamados/index.jsx
import React from "react";
import ChamadosAdmin from "./ChamadosAdmin";
import ChamadosClient from "./ChamadosClient";
import { getUser } from "../../auth/auth";

export default function Chamados() {
  const user = getUser?.() || {};
  const email = (user.email || "").toLowerCase();
  
  // Define se é admin pelo e-mail ou role
  const isAdmin = email === "jsa@jsa.com" || user.isAdmin || user.role === "admin";

  return isAdmin ? <ChamadosAdmin /> : <ChamadosClient />;
}