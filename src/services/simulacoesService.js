// src/services/simulacoesService.js
import { logEvent } from "../utils/logger";
import { parseToBackendFloat } from "../utils/numberUtils";
import { api } from "../api/client";
import { getUser } from "../auth/auth";

const STORAGE_KEY = "simulacoesCredito";

function _resolveUser(provided = null) {
  const u = provided || getUser() || {};
  const email = (u.email || u.user_email || "").trim().toLowerCase();
  
  const rawName = (u.name || u.nome || "").trim();
  const rawSurname = (u.surname || u.sobrenome || "").trim();
  let fullName = [rawName, rawSurname].filter(Boolean).join(" ");
  if (!fullName || fullName.toLowerCase() === "usuario") {
    fullName = email ? email.split("@")[0] : "Operador";
  }

  let username = (u.username || u.user_login || "").trim();
  if (!username || username.toLowerCase() === "usuario") {
    if (rawName) {
      const p1 = rawName.split(" ")[0].toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      const p2 = (rawSurname || rawName.split(" ")[1] || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
      username = p2 ? `${p1}.${p2}` : p1;
    } else if (email) {
      username = email.split("@")[0];
    } else {
      username = "operador";
    }
  }

  const id = u.id || null;
  const role = (u.role || "").trim().toLowerCase();
  const isAdmin =
    role === "admin" ||
    email === "jsa@jsa.com" ||
    email === "josafa.santos.jss@gmail.com" ||
    fullName.toLowerCase() === "jsa admin" ||
    username.toLowerCase() === "jsa.admin";

  return { id, email, username, name: fullName, role, isAdmin };
}

// Sincroniza em segundo plano com o banco de dados filtrando pelo usuário (ou geral se admin)
export async function sincronizarSimulacoesDoServidor(customUser = null) {
  const u = _resolveUser(customUser);
  try {
    const params = {};
    if (u.isAdmin) {
      params.isAdmin = "true";
    } else {
      if (u.email) params.email = u.email;
      if (u.username) params.username = u.username;
      if (u.id) params.userId = u.id;
    }

    const resp = await api.get("/simulacoes", { params });
    if (Array.isArray(resp.data)) {
      const serverList = resp.data.map(normalize);
      safeWrite(serverList);
      return serverList;
    }
  } catch (e) {
    // Modo offline resiliente
  }
  return listarSimulacoes(u);
}

/* =============== Helpers =============== */
function safeRead() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    console.error("[simulacoesService] JSON parse falhou:", e);
    return [];
  }
}

function safeWrite(lista) {
  try {
    const idMap = new Map();
    (Array.isArray(lista) ? lista : []).forEach((item) => {
      if (item && item.id != null) {
        idMap.set(String(item.id), item);
      }
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(idMap.values())));
  } catch (e) {
    console.error("[simulacoesService] localStorage write falhou:", e);
  }
}

function generateId(lista) {
  const maxId = lista.reduce((acc, s) => {
    const n = typeof s.id === "number" ? s.id : Number(s.id);
    return Number.isFinite(n) && n > acc ? n : acc;
  }, 0);
  return maxId + 1;
}

function normalize(sim) {
  const valor = parseToBackendFloat(sim.valor);
  const total = parseToBackendFloat(sim.total);
  const jurosTotal = parseToBackendFloat(sim.jurosTotal ?? sim.juros_total);
  const parcelas = parseInt(sim.parcelas, 10) || 1;
  const parcela = parseToBackendFloat(sim.parcela || (total / parcelas));

  return {
    id: sim.id != null ? Number(sim.id) || sim.id : null,
    userId: sim.userId ?? sim.user_id ?? null,
    userEmail: sim.userEmail ?? sim.user_email ?? "",
    userName: sim.userName ?? sim.user_name ?? "",
    userLogin: sim.userLogin ?? sim.user_login ?? "",
    valor,
    juros: Number.isFinite(Number(sim.juros)) ? parseFloat(Number(sim.juros).toFixed(4)) : 0.00,
    parcelas,
    parcela,
    total,
    jurosTotal,
    status: sim.status || "PENDENTE",
    data: sim.data || new Date().toLocaleString("pt-BR"),
    createdAt: sim.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/* =============== API =============== */
export function listarSimulacoes(customUser = null) {
  const u = _resolveUser(customUser);
  const rawList = safeRead().map(normalize);

  // Deduplica por ID em memória
  const idMap = new Map();
  rawList.forEach((item) => {
    if (item && item.id != null) {
      idMap.set(String(item.id), item);
    }
  });
  const list = Array.from(idMap.values());

  // ADMIN: visualiza todas as simulações de todos os operadores!
  if (u.isAdmin) {
    return list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  // Operador comum: filtra estritamente as suas próprias simulações
  return list
    .filter((s) => {
      const sEmail = String(s.userEmail || "").trim().toLowerCase();
      const sUser = String(s.userLogin || "").trim().toLowerCase();
      const sId = s.userId ? String(s.userId) : null;

      if (sEmail || sUser || sId) {
        return (
          (u.email && sEmail && sEmail === u.email) ||
          (u.username && sUser && sUser === u.username) ||
          (u.id && sId && sId === String(u.id))
        );
      }

      // Legado sem identificação prévia
      return true;
    })
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function salvarSimulacao(simulacao, customUser = null) {
  try {
    const u = _resolveUser(customUser);
    const norm = normalize({
      ...simulacao,
      id: null,
      status: "PENDENTE",
      userId: u.id,
      userEmail: u.email,
      userName: u.name,
      userLogin: u.username || u.email,
    });

    // 1. Salva no banco de dados primeiro para obter o ID oficial autoincremental
    try {
      const resp = await api.post("/simulacoes", norm);
      if (resp && resp.data && resp.data.id) {
        norm.id = resp.data.id;
      }
    } catch (err) {
      console.warn("Aviso ao persistir simulação no banco via API:", err.message);
    }

    // Se offline ou não retornou ID da API, gera ID local único
    if (norm.id == null) {
      const lista = safeRead();
      norm.id = generateId(lista);
    }

    // 2. Adiciona no localStorage sem duplicatas
    const lista = safeRead();
    const semDuplicatas = lista.filter((s) => String(s.id) !== String(norm.id));
    semDuplicatas.unshift(norm);
    safeWrite(semDuplicatas);

    // LOG: registro da simulação salva
    logEvent({
      type: "simulador",
      title: "Simulação salva",
      screen: "Simulador",
      details: {
        id: norm.id,
        valor: norm.valor,
        jurosPercent: norm.juros,
        parcelas: norm.parcelas,
        total: norm.total,
        jurosTotal: norm.jurosTotal,
        status: norm.status,
        quando: norm.data,
      },
      user: u,
    });

    return norm;
  } catch (e) {
    console.error("[simulacoesService] Erro ao salvar simulação:", e);
    return null;
  }
}

export async function aprovarSimulacao(id, customUser = null) {
  try {
    const u = _resolveUser(customUser);
    
    // 1. Atualiza na base local
    const lista = safeRead();
    const atualizada = lista.map((s) => {
      if (String(s.id) === String(id)) {
        return { ...s, status: "APROVADA" };
      }
      return s;
    });
    safeWrite(atualizada);

    // 2. Atualiza no banco de dados via API
    try {
      await api.put(`/simulacoes/${id}/status`, { status: "APROVADA" });
    } catch (e) {
      console.warn("Aviso ao aprovar simulação no banco via API:", e.message);
    }

    logEvent({
      type: "simulador",
      title: "Simulação aprovada pelo Admin",
      screen: "Simulador",
      details: { id },
      user: u,
    });
    return true;
  } catch (e) {
    console.error("[simulacoesService] Erro ao aprovar simulação:", e);
    return false;
  }
}

export async function cancelarSimulacao(id, customUser = null) {
  try {
    const u = _resolveUser(customUser);
    
    // 1. Remove da base local imediatamente para desaparecer das telas
    const lista = safeRead();
    const filtrada = lista.filter((s) => String(s.id) !== String(id));
    safeWrite(filtrada);

    // 2. Remove do banco de dados no servidor
    try {
      await api.delete(`/simulacoes/${id}`);
    } catch (e) {
      console.warn("Aviso ao cancelar/excluir simulação no banco via API:", e.message);
    }

    logEvent({
      type: "simulador",
      title: "Simulação cancelada",
      screen: "Simulador",
      details: { id },
      user: u,
    });
    return true;
  } catch (e) {
    console.error("[simulacoesService] Erro ao cancelar simulação:", e);
    return false;
  }
}

export async function excluirSimulacao(id, customUser = null) {
  return await cancelarSimulacao(id, customUser);
}
