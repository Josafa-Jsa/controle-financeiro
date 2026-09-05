import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { getUser, isAdmin } from "../../auth/auth";
import { api } from "../../api/client";
import { salvarConta, listarContas } from "../../services/contasService";
import { salvarNota, listarNotas } from "../../services/notasService";
import { listarControleNotas } from "../../services/controleNotasService";
import { salvarSimulacao } from "../../services/simulacoesService";
import { aplicarTema } from "../../services/themeService";
import { salvarStatusSistema, obterStatusLocal, TELAS_SISTEMA_CONFIG } from "../../services/systemStatusService";
import ModalResultadoLocalizacao from "../Modais/ModalResultadoLocalizacao";
import ModalEditarTema from "../Modais/ModalEditarTema";
import botAvatarImg from "../../assets/assistente-jsa.png";
import "../Visual/chatbot.css";

const LINK_WHATSAPP_DEV =
  "https://wa.me/5565984027342?text=Ol%C3%A1%2C%20referente%20ao%20Sistema%20JSA...%0Aestou%20com%20uma%20duvida%20no...";

// Mapa Completo de Telas, Rotas e Permissões do Sistema JSA
export const MAPA_ROTAS_PERMISSOES = [
  {
    key: "prevencao",
    rota: "/prevencao",
    titulo: "Prevenção de Perdas",
    nomes: ["prevencao", "perdas", "ocorrencia", "ocorrencias", "relato de fatos", "relato", "roubo", "furto", "cftv", "prevencao de perdas"],
  },
  {
    key: "uniformes",
    rota: "/uniformes",
    titulo: "Controle de Uniformes",
    nomes: ["uniforme", "uniformes", "epi", "epis", "entrega de uniforme", "entrega de uniformes", "guia de uniforme", "termo de responsabilidade", "controle de uniformes"],
  },
  {
    key: "controle-notas",
    rota: "/controle-notas",
    titulo: "Controle de Notas",
    nomes: ["controle de notas", "controle de nota", "conferencia de notas", "notas recebidas", "chave de 44", "leitor de notas", "controle-notas", "controle-de-notas"],
  },
  {
    key: "notas",
    rota: "/notas",
    titulo: "Notas Fiscais (NF-e)",
    nomes: ["nota fiscal", "notas fiscais", "nfe", "emissao de nota", "danfe", "notas"],
  },
  {
    key: "contas",
    rota: "/contas",
    titulo: "Gestão de Contas",
    nomes: ["contas", "contas a pagar", "contas a receber", "despesa", "despesas", "receita", "receitas", "gestao de contas", "pagamentos"],
  },
  {
    key: "fluxo",
    rota: "/fluxo",
    titulo: "Fluxo de Caixa",
    nomes: ["fluxo", "fluxo de caixa", "dre", "balanco", "projecao", "saldo", "fluxo-caixa"],
  },
  {
    key: "simulador",
    rota: "/simulador",
    titulo: "Simulador de Créditos",
    nomes: ["simulador", "maquininha", "simulacao", "taxas", "cartao de credito", "parcelamento", "simulador de vendas", "simulador de maquininha"],
  },
  {
    key: "ordem-servico",
    rota: "/ordens",
    titulo: "Ordem de Serviço (O.S)",
    nomes: ["ordem de servico", "ordens de servico", "ordem de servicos", "os", "laudo tecnico", "manutencao equipamento", "ordens"],
  },
  {
    key: "contratos",
    rota: "/contratos",
    titulo: "Gestão de Contratos",
    nomes: ["contrato", "contratos", "gestao de contratos"],
  },
  {
    key: "contrato-internet",
    rota: "/contrato-internet",
    titulo: "Contrato Internet / Provedor",
    nomes: ["contrato internet", "internet provedor", "link dedicado", "provedor de internet", "contrato-internet"],
  },
  {
    key: "estoque",
    rota: "/estoque",
    titulo: "Controle de Estoque",
    nomes: ["estoque", "almoxarifado", "inventario", "material", "materiais", "produtos"],
  },
  {
    key: "chamados",
    rota: "/chamados",
    titulo: "Atendimento & Chamados",
    nomes: ["chamado", "chamados", "suporte", "atendimento", "abrir chamado", "falar com tecnico", "central de suporte", "ajuda", "ticket", "tickets"],
  },
  {
    key: "dashboard",
    rota: "/dashboard",
    titulo: "Dashboard Principal",
    nomes: ["dashboard", "painel principal", "tela inicial", "inicio", "home"],
  },
];

// Helper para checar se o usuário tem permissão para acessar determinada tela
export const verificarAcessoUsuario = (rotaOuKey, userObj) => {
  if (!userObj) return false;

  // Administrador possui acesso total a tudo
  if (
    isAdmin(userObj) ||
    userObj.role === "admin" ||
    (Array.isArray(userObj.permissions) && userObj.permissions.includes("*")) ||
    (Array.isArray(userObj.permissoes) && userObj.permissoes.includes("*"))
  ) {
    return true;
  }

  const perms = Array.isArray(userObj.permissions || userObj.permissoes)
    ? (userObj.permissions || userObj.permissoes)
    : [];

  if (perms.includes("*") || perms.includes("admin")) return true;

  const key = typeof rotaOuKey === "object" ? rotaOuKey.key : rotaOuKey;

  // Atendimento & Chamados é sempre liberado para qualquer usuário autenticado
  if (key === "chamados" || key === "atendimento" || key === "/chamados") return true;

  if (key === "ordem-servico" || key === "os" || key === "/ordens" || key === "/ordem-servico") {
    return perms.includes("ordem-servico") || perms.includes("os");
  }

  if (key === "uniformes" || key === "controle-uniformes" || key === "/uniformes") {
    return perms.includes("uniformes") || perms.includes("controle-uniformes");
  }

  if (key === "controle-notas" || key === "/controle-notas" || key === "/controle-de-notas") {
    return perms.includes("controle-notas");
  }

  if (key === "contratos" || key === "/contratos") {
    return perms.includes("contratos");
  }

  if (key === "contrato-internet" || key === "/contrato-internet") {
    return perms.includes("contrato-internet");
  }

  if (key === "estoque" || key === "/estoque") {
    return perms.includes("estoque");
  }

  if (key === "notas" || key === "/notas") {
    return perms.includes("notas");
  }

  if (key === "contas" || key === "/contas") {
    return perms.includes("contas");
  }

  if (key === "fluxo" || key === "/fluxo") {
    return perms.includes("fluxo");
  }

  if (key === "simulador" || key === "/simulador") {
    return perms.includes("simulador");
  }

  if (key === "prevencao" || key === "/prevencao") {
    return perms.includes("prevencao");
  }

  if (key === "dashboard" || key === "/dashboard") {
    return perms.includes("dashboard");
  }

  return perms.includes(key);
};

// Gerador de protocolo exclusivo para Chamados
export const gerarProtocoloChamado = () => {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let codigo = "";
  for (let i = 0; i < 6; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return `JSA-${codigo}`;
};

// Utilitários de Extração Inteligente de Parâmetros
const parseValor = (texto) => {
  if (!texto) return null;
  const m1 = texto.match(/r\$\s*([0-9]+(?:[.,][0-9]{1,2})?)/i);
  if (m1) {
    return parseFloat(m1[1].replace(".", "").replace(",", "."));
  }
  const m2 = texto.match(/(?:valor|quantia|preco|total)?\s*(?:de\s*)?([0-9]+[.,][0-9]{2})/i);
  if (m2) {
    return parseFloat(m2[1].replace(".", "").replace(",", "."));
  }
  const m3 = texto.match(/([0-9]+(?:[.,][0-9]{1,2})?)\s*(?:reais|real)/i);
  if (m3) {
    return parseFloat(m3[1].replace(".", "").replace(",", "."));
  }
  const m4 = texto.match(/(?:valor|de|por)\s*([0-9]+(?:[.,][0-9]{1,2})?)(?:\s|$|,|\.)/i);
  if (m4) {
    return parseFloat(m4[1].replace(".", "").replace(",", "."));
  }
  return null;
};

const parseDataVencimento = (texto) => {
  if (!texto) return new Date().toISOString().split("T")[0];
  const hoje = new Date();

  const mCompleto = texto.match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (mCompleto) {
    const dia = String(mCompleto[1]).padStart(2, "0");
    const mes = String(mCompleto[2]).padStart(2, "0");
    const ano = mCompleto[3];
    return `${ano}-${mes}-${dia}`;
  }

  const mCurto = texto.match(/(\d{1,2})[/.-](\d{1,2})/);
  if (mCurto) {
    const dia = String(mCurto[1]).padStart(2, "0");
    const mes = String(mCurto[2]).padStart(2, "0");
    const ano = hoje.getFullYear();
    return `${ano}-${mes}-${dia}`;
  }

  const mDia = texto.match(/dia\s*(\d{1,2})/i);
  if (mDia) {
    const dia = String(mDia[1]).padStart(2, "0");
    const mes = String(hoje.getMonth() + 1).padStart(2, "0");
    const ano = hoje.getFullYear();
    return `${ano}-${mes}-${dia}`;
  }

  if (texto.includes("amanha") || texto.includes("amanhã")) {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  }

  return hoje.toISOString().split("T")[0];
};

const formatarMoedaBR = (v) => {
  if (v === null || v === undefined || isNaN(v)) return "R$ 0,00";
  return Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const formatarDataBR = (dStr) => {
  if (!dStr) return "";
  const partes = String(dStr).split("T")[0].split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return dStr;
};

// =========================================================================
// MOTOR DE BUSCA & LOCALIZAÇÃO GLOBAL DO SISTEMA JSA
// Localiza Notas, Contas, O.S, Chamados, Prevenção, Uniformes e Contratos
// =========================================================================
export const buscarRegistrosSistema = (termoBuscaOriginal, userObj) => {
  if (!termoBuscaOriginal || typeof termoBuscaOriginal !== "string") return [];

  const limpa = termoBuscaOriginal
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();

  // Remove stop words comuns de comando
  const termosLimpos = limpa
    .replace(/^(localize|localizar|procure|procurar|buscar|busca|encontre|encontrar|pesquise|pesquisar|achar|consultar|onde esta|onde estao|ver registro|ver)\s+/i, "")
    .replace(/\b(essa|esse|esta|este|a|o|as|os|de|do|da|no|na|pra|para|mim|por|favor|sistema)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Extração de padrões específicos
  const m44Chave = termoBuscaOriginal.match(/\b(\d{44})\b/);
  const chave44 = m44Chave ? m44Chave[1] : null;

  const mNumero = termoBuscaOriginal.match(/\b(\d{1,8})\b/);
  const numeroBusca = mNumero ? mNumero[1] : null;

  const mProtocolo = termoBuscaOriginal.match(/jsa-([a-z0-9]+)/i);
  const protocoloBusca = mProtocolo ? mProtocolo[0].toUpperCase() : null;

  const valorBusca = parseValor(termoBuscaOriginal);

  const tokens = termosLimpos.split(" ").filter((t) => t.length >= 2);
  const resultados = [];

  const pontuarTexto = (alvo) => {
    if (!alvo) return 0;
    const alvoLimpo = String(alvo).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (alvoLimpo === limpa || alvoLimpo === termosLimpos) return 100;
    if (alvoLimpo.includes(termosLimpos) && termosLimpos.length >= 3) return 60;
    let pts = 0;
    for (const tk of tokens) {
      if (alvoLimpo.includes(tk)) pts += 15;
    }
    return pts;
  };

  // 1. BUSCA EM CONTAS A PAGAR / RECEBER
  try {
    const contas = listarContas() || JSON.parse(localStorage.getItem("contas_db") || localStorage.getItem("contas") || "[]");
    for (const c of contas) {
      if (!c) continue;
      let score = 0;
      if (c.codigo && protocoloBusca && String(c.codigo).toUpperCase().includes(protocoloBusca)) score += 100;
      if (c.id && numeroBusca && String(c.id) === numeroBusca) score += 80;
      if (valorBusca && Math.abs(Number(c.valor || 0) - valorBusca) < 0.05) score += 50;
      score += pontuarTexto(c.descricao);
      score += pontuarTexto(c.fornecedor || c.cliente);
      score += pontuarTexto(c.categoria);

      if (score >= 20) {
        resultados.push({
          score,
          tipoEntidade: "Gestão de Contas",
          tipoFormatado: `Conta a ${c.tipo || (c.tipoConta === "Receber" ? "Receber" : "Pagar")}`,
          icone: "💰",
          id: c.codigo || c.id || "Conta",
          tituloDestaque: c.descricao || `Conta #${c.codigo || c.id}`,
          subtituloDestaque: c.fornecedor || c.cliente || c.categoria || "Lançamento Financeiro",
          valorPrincipal: c.valor,
          labelValor: `Valor a ${c.tipo || "Pagar"}`,
          status: c.status || "Pendente",
          dataRef: formatarDataBR(c.vencimento),
          nomeModulo: "Gestão de Contas",
          rota: "/contas",
          descricao: `Descrição: ${c.descricao || "Sem descrição"}\nCategoria: ${c.categoria || "Geral"}\nForma de Pagamento: ${c.formaPagamento || "PIX"}`,
          detalhes: [
            { label: "Código / ID", value: c.codigo || String(c.id) || "N/A" },
            { label: "Tipo de Conta", value: `Conta a ${c.tipo || c.tipoConta || "Pagar"}` },
            { label: "Vencimento", value: formatarDataBR(c.vencimento) },
            { label: "Categoria", value: c.categoria || "Geral" },
            { label: "Fornecedor / Cliente", value: c.fornecedor || c.cliente || "Não informado" },
            { label: "Forma de Pagamento", value: c.formaPagamento || "PIX" },
            { label: "Status Atual", value: c.status || "Pendente" },
          ],
        });
      }
    }
  } catch (e) {
    console.warn("Aviso ao buscar em contas:", e);
  }

  // 2. BUSCA EM NOTAS FISCAIS & CONTROLE DE NOTAS
  try {
    const notasCtrl = listarControleNotas() || [];
    const notasGerais = listarNotas() || [];
    const todasNotas = [...notasCtrl, ...notasGerais];

    for (const n of todasNotas) {
      if (!n) continue;
      let score = 0;
      const chaveItem = (n.chavedeacesso || n.chave || "").replace(/\D/g, "");
      if (chave44 && chaveItem.includes(chave44)) score += 120;
      if (numeroBusca && (String(n.numero) === numeroBusca || String(n.numero).includes(numeroBusca))) score += 85;
      if (valorBusca && Math.abs(Number(n.valor || 0) - valorBusca) < 0.05) score += 40;
      score += pontuarTexto(n.fornecedor || n.razaoSocial || n.clienteOuServico);
      score += pontuarTexto(n.cnpj);

      if (score >= 20) {
        resultados.push({
          score,
          tipoEntidade: "Controle de Notas Fiscais",
          tipoFormatado: `Nota Fiscal nº ${n.numero || "S/N"}`,
          icone: "🧾",
          id: n.numero || n.id || "NF",
          tituloDestaque: `NF-e nº ${n.numero || "S/N"} (Série ${n.serie || "1"})`,
          subtituloDestaque: n.fornecedor || n.razaoSocial || n.clienteOuServico || `CNPJ: ${n.cnpj || "N/A"}`,
          valorPrincipal: n.valor,
          labelValor: "Valor da Nota",
          status: n.status || "Emitida",
          dataRef: formatarDataBR(n.dataEmissao || n.data || n.created_at),
          nomeModulo: "Controle de Notas",
          rota: "/controle-notas",
          descricao: `Fornecedor: ${n.fornecedor || n.razaoSocial || "N/A"}\nCNPJ: ${n.cnpj || "N/A"}\nChave: ${n.chavedeacesso || n.chave || "N/A"}`,
          detalhes: [
            { label: "Número da NF", value: n.numero ? `NF ${n.numero}` : "S/N" },
            { label: "Série / Modelo", value: `${n.serie || "1"} / ${n.modelo || "55"}` },
            { label: "Fornecedor / Emitente", value: n.fornecedor || n.razaoSocial || "Não informado" },
            { label: "CNPJ", value: n.cnpj || "Não informado" },
            { label: "Data de Emissão", value: formatarDataBR(n.dataEmissao || n.data) },
            { label: "Chave de Acesso (44 Dígitos)", value: n.chavedeacesso || n.chave || "Não informada", isChave: true },
            { label: "Filial", value: n.filial || "Filial 1" },
            { label: "Status", value: n.status || "Emitida" },
          ],
        });
      }
    }
  } catch (e) {
    console.warn("Aviso ao buscar em notas:", e);
  }

  // 3. BUSCA EM ORDENS DE SERVIÇO (O.S)
  try {
    const ordens = JSON.parse(localStorage.getItem("ordens") || "[]");
    for (const os of ordens) {
      if (!os) continue;
      let score = 0;
      if (numeroBusca && (String(os.numeroOS) === numeroBusca || String(os.id) === numeroBusca)) score += 95;
      score += pontuarTexto(os.cliente);
      score += pontuarTexto(os.equipamento);
      score += pontuarTexto(os.defeito);
      score += pontuarTexto(os.tecnico);

      if (score >= 20) {
        resultados.push({
          score,
          tipoEntidade: "Ordem de Serviço (O.S)",
          tipoFormatado: `Ordem de Serviço nº ${os.numeroOS || os.id}`,
          icone: "🛠️",
          id: os.numeroOS || os.id,
          tituloDestaque: `O.S. nº ${os.numeroOS || os.id}`,
          subtituloDestaque: `Cliente: ${os.cliente || "Não informado"}`,
          valorPrincipal: os.valorTotal || os.valor,
          labelValor: "Valor Total da O.S",
          status: os.status || "Pendente",
          dataRef: formatarDataBR(os.data || os.dataEntrada),
          nomeModulo: "Ordens de Serviço",
          rota: "/ordens",
          descricao: `Cliente: ${os.cliente || "N/A"}\nEquipamento: ${os.equipamento || "N/A"}\nDefeito: ${os.defeito || "N/A"}\n${os.laudo ? `Laudo Técnico: ${os.laudo}` : ""}`,
          detalhes: [
            { label: "Número da O.S", value: `#${os.numeroOS || os.id}` },
            { label: "Cliente", value: os.cliente || "Não informado" },
            { label: "Equipamento", value: os.equipamento || "Não informado" },
            { label: "Técnico Responsável", value: os.tecnico || "Não informado" },
            { label: "Data de Entrada", value: formatarDataBR(os.data || os.dataEntrada) },
            { label: "Status da O.S", value: os.status || "Pendente" },
          ],
        });
      }
    }
  } catch (e) {
    console.warn("Aviso ao buscar em ordens de serviço:", e);
  }

  // 4. BUSCA EM ATENDIMENTO & CHAMADOS
  try {
    const chamados = JSON.parse(localStorage.getItem("chamados_db") || "[]");
    for (const ch of chamados) {
      if (!ch) continue;
      let score = 0;
      const prot = String(ch.protocolo || ch.id || "").toUpperCase();
      if (protocoloBusca && prot.includes(protocoloBusca)) score += 110;
      if (numeroBusca && prot.includes(numeroBusca)) score += 80;
      score += pontuarTexto(ch.assunto);
      score += pontuarTexto(ch.clienteNome);
      score += pontuarTexto(ch.categoria);
      score += pontuarTexto(ch.descricao);

      if (score >= 20) {
        resultados.push({
          score,
          tipoEntidade: "Atendimento & Chamados",
          tipoFormatado: `Chamado #${ch.id || ch.protocolo}`,
          icone: "🎧",
          id: ch.id || ch.protocolo,
          tituloDestaque: `Chamado #${ch.id || ch.protocolo}`,
          subtituloDestaque: `Assunto: ${ch.assunto || "Atendimento Técnico"}`,
          status: ch.status || "Aberto",
          dataRef: ch.dataCriacao || "Recente",
          nomeModulo: "Atendimentos",
          rota: "/chamados",
          descricao: `Solicitante: ${ch.clienteNome || "N/A"}\nCategoria: ${ch.categoria || "Suporte Técnico"}\n\nDescrição:\n${ch.descricao || "Sem detalhes"}`,
          detalhes: [
            { label: "Protocolo", value: `#${ch.id || ch.protocolo}` },
            { label: "Solicitante", value: ch.clienteNome || "Não informado" },
            { label: "E-mail", value: ch.clienteEmail || "Não informado" },
            { label: "Categoria", value: ch.categoria || "Suporte Técnico" },
            { label: "Data de Abertura", value: ch.dataCriacao || "Não informada" },
            { label: "Status Atual", value: ch.status || "Aberto" },
          ],
        });
      }
    }
  } catch (e) {
    console.warn("Aviso ao buscar em chamados:", e);
  }

  // 5. BUSCA EM PREVENÇÃO DE PERDAS
  try {
    const ocorrencias = JSON.parse(localStorage.getItem("jsa_ocorrencias_prevencao") || "[]");
    for (const oc of ocorrencias) {
      if (!oc) continue;
      let score = 0;
      const numOc = String(oc.numero || oc.id || "").toUpperCase();
      if (numeroBusca && numOc.includes(numeroBusca)) score += 95;
      score += pontuarTexto(oc.tipoOcorrencia);
      score += pontuarTexto(oc.setor);
      score += pontuarTexto(oc.resumoFatos);

      if (score >= 20) {
        resultados.push({
          score,
          tipoEntidade: "Prevenção de Perdas",
          tipoFormatado: `Ocorrência #${oc.numero || oc.id}`,
          icone: "🛡️",
          id: oc.numero || oc.id,
          tituloDestaque: `Ocorrência #${oc.numero || oc.id}`,
          subtituloDestaque: `${oc.tipoOcorrencia || "Ocorrência"} - Setor ${oc.setor || "Geral"}`,
          valorPrincipal: oc.prejuizoEstimado,
          labelValor: "Prejuízo Estimado",
          status: oc.status || "Em Andamento",
          dataRef: oc.dataHora || oc.data,
          nomeModulo: "Prevenção de Perdas",
          rota: "/prevencao",
          descricao: `Resumo dos Fatos:\n${oc.resumoFatos || "Sem relato detalhado"}`,
          detalhes: [
            { label: "Número / Protocolo", value: `#${oc.numero || oc.id}` },
            { label: "Tipo de Ocorrência", value: oc.tipoOcorrencia || "Ocorrência" },
            { label: "Setor / Filial", value: oc.setor || oc.filial || "Geral" },
            { label: "Data e Hora", value: oc.dataHora || oc.data || "Não informada" },
            { label: "Mercadoria Recuperada", value: formatarMoedaBR(oc.valorRecuperado) },
            { label: "Status", value: oc.status || "Em Andamento" },
          ],
        });
      }
    }
  } catch (e) {
    console.warn("Aviso ao buscar em prevencao:", e);
  }

  // 6. BUSCA EM CONTROLE DE UNIFORMES
  try {
    const movs = JSON.parse(localStorage.getItem("jsa_uniformes_movimentacoes") || "[]");
    for (const un of movs) {
      if (!un) continue;
      let score = 0;
      if (numeroBusca && (String(un.numeroGuia) === numeroBusca || String(un.id) === numeroBusca)) score += 90;
      score += pontuarTexto(un.funcionario || un.colaborador);
      score += pontuarTexto(un.cpf);
      score += pontuarTexto(un.departamento);
      score += pontuarTexto(un.peca || un.tipoUniforme);

      if (score >= 20) {
        resultados.push({
          score,
          tipoEntidade: "Controle de Uniformes",
          tipoFormatado: `Guia de Uniforme #${un.numeroGuia || un.id || "GUIA"}`,
          icone: "👔",
          id: un.numeroGuia || un.id,
          tituloDestaque: `${un.tipoMovimento || "Entrega"} - ${un.funcionario || un.colaborador || "Colaborador"}`,
          subtituloDestaque: `${un.peca || un.tipoUniforme || "Uniforme"} (Qtd: ${un.quantidade || 1})`,
          status: "Registrado",
          dataRef: formatarDataBR(un.data),
          nomeModulo: "Controle de Uniformes",
          rota: "/uniformes",
          descricao: `Colaborador: ${un.funcionario || un.colaborador || "N/A"}\nCPF: ${un.cpf || "N/A"}\nDepartamento: ${un.departamento || "N/A"}\nItem: ${un.peca || un.tipoUniforme || "N/A"}`,
          detalhes: [
            { label: "Funcionário / Colaborador", value: un.funcionario || un.colaborador || "Não informado" },
            { label: "CPF", value: un.cpf || "Não informado" },
            { label: "Departamento / Setor", value: un.departamento || "Não informado" },
            { label: "Peça / Tipo de Uniforme", value: un.peca || un.tipoUniforme || "Não informado" },
            { label: "Quantidade", value: String(un.quantidade || 1) },
            { label: "Data de Registro", value: formatarDataBR(un.data) },
          ],
        });
      }
    }
  } catch (e) {
    console.warn("Aviso ao buscar em uniformes:", e);
  }

  // Ordena por pontuação de relevância decrescente
  resultados.sort((a, b) => b.score - a.score);
  return resultados;
};

// Helper para formatar resposta respeitando permissão de acesso
const formatarRespostaComPermissao = (user, rota, titulo, textoConteudo) => {
  const temPerm = verificarAcessoUsuario(rota, user);
  if (temPerm) {
    return {
      texto: textoConteudo,
      temAcaoNavegacao: true,
      acaoTexto: `👉 Abrir ${titulo}`,
      acaoRota: rota,
      temBotaoWhats: false,
    };
  } else {
    return {
      texto: `${textoConteudo}\n\n⚠️ **Aviso de Acesso:**\nNO MOMENTO VOCÊ NÃO POSSUI ACESSO A ESSA TELA, SOLICITE O ACESSO NA TELA ATENDIMENTOS, E AGUARDE A EQUIPE TÉCNICA TE CONCEDER ACESSO A TELA E SUAS FUNCIONALIDADES.`,
      temAcaoNavegacao: true,
      acaoTexto: "Ir para tela de ATENDIMENTOS",
      acaoRota: "/chamados",
      temBotaoWhats: false,
    };
  }
};

// Base de Conhecimento Inteligente do Sistema JSA (100% de cobertura de módulos e rotinas)
const BASE_CONHECIMENTO = [
  {
    topico: "modificacao_dev",
    keywords: [
      "modificacao",
      "modificar",
      "desenvolvedor",
      "programador",
      "customizar",
      "customizacao",
      "alterar sistema",
      "nova funcao",
      "novo recurso",
      "personalizar",
      "personalizacao",
      "whatsapp",
      "contato desenvolvedor",
      "orcamento",
      "mudanca",
      "ajuste no codigo",
      "integracao",
      "nova tela",
      "criar modulo",
      "falar com dev",
      "responsavel",
      "ajuste tecnico",
    ],
    resposta: () => ({
      texto: `Precisa de **modificações, personalizações ou novas funcionalidades** no Sistema JSA?
      
Nossa equipe de desenvolvimento está pronta para te atender! Você pode falar diretamente com o desenvolvedor responsável através do WhatsApp para alinhar detalhes técnicos ou solicitar novos recursos sob medida.`,
      temBotaoWhats: true,
      whatsTexto: "Falar com o Desenvolvedor no WhatsApp",
    }),
  },
  {
    topico: "prevencao_perdas",
    keywords: [
      "prevencao",
      "prevencao de perdas",
      "ocorrencia",
      "ocorrencias",
      "relato de fatos",
      "relato",
      "roubo",
      "furto",
      "envolvido",
      "envolvidos",
      "pessoa envolvida",
      "mercadoria recuperada",
      "prejuizo",
      "cftv",
      "boletim",
      "boletim de ocorrencia",
      "brasao",
      "relatorio ocorrencia",
      "perdas",
    ],
    resposta: (user) =>
      formatarRespostaComPermissao(
        user,
        "/prevencao",
        "Prevenção de Perdas",
        `🛡️ **Módulo de Prevenção de Perdas e Roubos**:

1. **Abertura de Ocorrência / Relato de Fatos**:
   • Clique em **"+ Nova Ocorrência"** para iniciar o relato detalhado com data, hora, setor e resumo dos fatos.
2. **Cadastro de Pessoas Envolvidas**:
   • Adicione suspeitos, funcionários ou testemunhas com foto, nome, CPF, RG, endereço e tipo de envolvimento.
3. **Controle Financeiro da Ocorrência**:
   • Registre os itens subtraídos, o valor estimado de **Prejuízo** e o valor de **Mercadorias Recuperadas** para consolidação estatística.
4. **Anexo de Provas e CFTV**:
   • Anexe imagens das câmeras de segurança, fotos das mercadorias e arquivos do Boletim de Ocorrência policial.
5. **Relatório Oficial em PDF**:
   • Gere o relatório oficial assinado, com numeração de protocolo, dados do responsável e brasão institucional pronto para impressão.`
      ),
  },
  {
    topico: "controle_uniformes",
    keywords: [
      "uniforme",
      "uniformes",
      "epi",
      "epis",
      "entrega uniforme",
      "comprovante uniforme",
      "guia de entrega",
      "termo de responsabilidade",
      "transferencia uniforme",
      "descarte uniforme",
      "baixa uniforme",
      "tamanho",
      "camisa",
      "calca",
      "bota",
      "avental",
      "estoque uniforme",
    ],
    resposta: (user) =>
      formatarRespostaComPermissao(
        user,
        "/uniformes",
        "Controle de Uniformes",
        `👔 **Controle de Uniformes e EPIs**:

1. **Entrada no Almoxarifado**:
   • Registre a chegada de novos uniformes informando tipo, tamanho (P, M, G, GG, etc.), quantidade, fornecedor e custo unitário.
2. **Entrega para Colaborador (Guia Oficial)**:
   • Ao entregar o uniforme, informe o nome do funcionário, setor e CPF. O sistema gera automaticamente o **Comprovante de Recebimento com Termo de Responsabilidade** para assinatura.
3. **Transferência entre Filiais**:
   • Transfira peças entre unidades com emissão da **Guia de Remessa e Rastreamento**.
4. **Baixa por Descarte ou Avaria**:
   • Caso um uniforme sofra desgaste ou dano irreparável, faça a baixa por descarte com justificativa obrigatória.
5. **Relatórios em PDF**:
   • Emita a posição consolidada de estoque e o extrato de entregas por funcionário com 1 clique.`
      ),
  },
  {
    topico: "controle_notas",
    keywords: [
      "nota fiscal",
      "notas fiscais",
      "nfe",
      "chave de acesso",
      "44 digitos",
      "leitor de codigo",
      "codigo de barras",
      "fornecedor",
      "cadastrar nota",
      "inserir nota",
      "anexar nota",
      "duplicidade",
      "recibo",
      "xml",
      "pdf nota",
      "conferencia nota",
      "filial nota",
      "controle de notas",
    ],
    resposta: (user) =>
      formatarRespostaComPermissao(
        user,
        "/controle-notas",
        "Controle de Notas",
        `🧾 **Controle de Notas Fiscais e Código de Barras**:

1. **Leitura Automática (44 Dígitos)**:
   • Posicione o cursor no campo **"Chave de Acesso"** e passe o leitor de código de barras na DANFE (ou cole a chave de 44 dígitos).
   • O sistema decodifica na hora:
     - **UF de Origem** e **Ano/Mês de Emissão**;
     - **CNPJ do Emitente/Fornecedor**;
     - **Modelo, Série e Número da Nota Fiscal**.
2. **Preenchimento Automático e Vínculo Financeiro**:
   • Se o fornecedor já existir no sistema, os dados são preenchidos automaticamente e você pode vinculá-la aos **Recebidos** e ao **Contas a Pagar**.
   • Se for um novo CNPJ, abre o cadastro rápido do fornecedor.
3. **Anexo de Comprovantes**:
   • Anexe a foto ou PDF da nota fiscal física (máx. 5MB) para auditoria e histórico permanente.
4. **Relatórios e Auditoria**:
   • Exporte relatórios em PDF com assinatura de conferência ou planilha em Excel.`
      ),
  },
  {
    topico: "contas_pagar_receber",
    keywords: [
      "contas",
      "contas a pagar",
      "contas a receber",
      "despesa",
      "despesas",
      "receita",
      "receitas",
      "pagar",
      "receber",
      "liquidar",
      "baixa",
      "marcar como pago",
      "vencimento",
      "boleto",
      "pix",
      "comprovante",
      "status conta",
      "vencida",
    ],
    resposta: (user) =>
      formatarRespostaComPermissao(
        user,
        "/contas",
        "Gestão de Contas",
        `💰 **Módulo de Contas a Pagar e Receber**:

• **Lançamentos**: Cadastre despesas e receitas informando valor, vencimento, categoria, fornecedor/cliente e forma de pagamento (*PIX, Boleto, Cartão, Transferência*).
• **Liquidação / Baixa Rápida**: Clique no botão de status da conta para marcar como **Paga** ou **Recebida**, registrando a data exata da efetivação.
• **Anexo de Comprovantes**: Salve fotos de recibos, comprovantes bancários ou arquivos fiscais vinculados ao lançamento.
• **Filtros Inteligentes**: Filtre por período (*Hoje, Esta Semana, Este Mês, Vencidas, Pendentes ou Pagas*).
• **Demonstrativo Financeiro**: Exporte relatórios detalhados com totalizadores por categoria.`
      ),
  },
  {
    topico: "fluxo_caixa",
    keywords: [
      "fluxo de caixa",
      "fluxo",
      "saldo",
      "entradas",
      "saidas",
      "projecao",
      "balanco",
      "grafico",
      "lucro",
      "faturamento",
      "dre",
      "demonstrativo",
    ],
    resposta: (user) =>
      formatarRespostaComPermissao(
        user,
        "/fluxo",
        "Fluxo de Caixa",
        `📊 **Fluxo de Caixa e Planejamento Financeiro**:

• **Visão Geral Consolidada**: Acompanhe o total de **Entradas (Receitas)**, **Saídas (Despesas)** e o **Saldo Líquido Operacional** em tempo real.
• **Projeção de Saldo Futuro**: Visualize o comportamento do caixa da empresa nos próximos dias com base nas contas agendadas a pagar e receber.
• **Gráficos Interativos**: Gráficos comparativos de desempenho financeiro mês a mês para suporte à tomada de decisões estratégicas.
• **Exportação**: Gere relatórios do fluxo de caixa consolidados para a diretoria.`
      ),
  },
  {
    topico: "simulador_maquininha",
    keywords: [
      "maquininha",
      "simulador",
      "cartao",
      "taxa",
      "taxas",
      "debito",
      "credito",
      "parcelado",
      "repassar taxa",
      "margem",
      "lucro venda",
      "maquininhas",
    ],
    resposta: (user) =>
      formatarRespostaComPermissao(
        user,
        "/simulador",
        "Simulador de Maquininha",
        `💳 **Simulador de Vendas e Maquininha de Cartão**:

• **Cálculo de Taxas**: Simule vendas em **Débito**, **Crédito à Vista** ou **Parcelado (em até 18x)**.
• **Modo Repasse de Taxa**:
  - Descubra o valor exato que você deve cobrar do cliente para que, após o desconto das taxas da maquininha, você receba **100% do valor integral** do produto.
• **Detalhamento**: Visualize instantaneamente o valor bruto, a taxa percentual cobrada pela operadora e o valor líquido exato a ser creditado em sua conta.`
      ),
  },
  {
    topico: "estoque_almoxarifado",
    keywords: [
      "estoque",
      "almoxarifado",
      "produto",
      "produtos",
      "material",
      "materiais",
      "entrada estoque",
      "saida estoque",
      "baixa estoque",
      "inventario",
      "reposicao",
      "quantidade",
    ],
    resposta: (user) =>
      formatarRespostaComPermissao(
        user,
        "/estoque",
        "Controle de Estoque",
        `📦 **Controle de Estoque e Almoxarifado**:

• **Entrada de Itens**: Cadastre novos materiais informando quantidade, valor unitário, fornecedor, nota fiscal e lote.
• **Saídas e Consumo**: Registre saídas para consumo interno, setores específicos ou descarte justificado.
• **Alerta de Estoque Mínimo**: Sinalizadores visuais para itens que atingiram o ponto de reposição.
• **Auditoria e Rastreabilidade**: Histórico completo de movimentações com data, hora e usuário responsável.`
      ),
  },
  {
    topico: "contratos_internet",
    keywords: [
      "contrato",
      "contratos",
      "internet",
      "provedor",
      "parceiro",
      "mensalidade",
      "plano",
      "fibra",
      "renovacao",
      "vencimento contrato",
      "link dedicado",
    ],
    resposta: (user) =>
      formatarRespostaComPermissao(
        user,
        "/contratos",
        "Gestão de Contratos",
        `🌐 **Gestão de Contratos e Links de Internet**:

• **Contratos Ativos**: Cadastre contratos de prestação de serviços, parcerias comerciais e planos de internet/fibra.
• **Controle de Vigência e Reajustes**: Acompanhe prazos de vigência, datas de reajuste anual e vencimentos.
• **Geração de Documentos**: Emissão e exportação de termos contratuais em PDF prontos para assinatura.`
      ),
  },
  {
    topico: "ordem_servico",
    keywords: [
      "ordem de servico",
      "ordens de servico",
      "os",
      "laudo",
      "tecnico",
      "manutencao",
      "defeito",
      "cliente os",
      "imprimir os",
      "garantia",
      "pecas",
    ],
    resposta: (user) =>
      formatarRespostaComPermissao(
        user,
        "/ordens",
        "Ordens de Serviço (O.S.)",
        `🛠️ **Módulo de Ordem de Serviço (O.S.)**:

• **Abertura de O.S.**: Cadastro ágil com número de protocolo único, cliente, equipamento e defeito reclamado.
• **Diagnóstico e Laudo Técnico**: Registro do diagnóstico, peças substituídas e valor da mão de obra.
• **Fluxo de Status**: Acompanhe o andamento (*Pendente, Em Andamento, Aguardando Peça, Concluído ou Cancelado*).
• **Impressão com Garantia**: Emita a via do cliente pronta para impressão com termos de garantia e assinatura.`
      ),
  },
  {
    topico: "chamados_suporte",
    keywords: [
      "chamado",
      "chamados",
      "suporte",
      "atendimento",
      "chat",
      "falar com tecnico",
      "ajuda",
      "duvida",
      "abrir chamado",
      "protocolo",
      "tempo real",
      "cancelar chamado",
    ],
    resposta: () => ({
      texto: `🎧 **Central de Atendimento e Chamados JSA**:

• **Abertura de Chamados**: Abra solicitações em *Suporte Técnico*, *Financeiro*, *Comercial* ou *Outros Assuntos*.
• **Abertura Direta via Assistente JSA**: Você pode me pedir para abrir o chamado diretamente aqui pelo chat!
• **Localizar Registros**: Peça para eu localizar notas, contas, ordens de serviço ou chamados e eu abrirei o modal com todos os detalhes!
• **Chat ao Vivo em Tempo Real**: Converse diretamente com a equipe de suporte através do chat interno com mensagens instantâneas.`,
      temAcaoNavegacao: true,
      acaoTexto: "👉 Ir para tela de ATENDIMENTOS",
      acaoRota: "/chamados",
      temBotaoWhats: false,
    }),
  },
  {
    topico: "login_senha_esqueci",
    keywords: [
      "senha",
      "esqueci a senha",
      "recuperar senha",
      "redefinir senha",
      "trocar senha",
      "senha provisoria",
      "esqueci",
      "login",
      "entrar",
      "acesso",
      "bloqueado",
    ],
    resposta: () => ({
      texto: `🔐 **Recuperação e Troca de Senha**:

1. **Esqueceu sua senha?**
   • Na tela de Login, clique no link **"Esqueci minha senha"**.
   • Digite o seu **e-mail cadastrado** e clique em *"Enviar senha provisória"*.
   • O sistema gerará uma senha provisória segura e a enviará imediatamente para sua caixa de entrada.
2. **Primeiro Acesso ou Alteração**:
   • Ao acessar o sistema com a senha provisória, vá até as configurações do seu perfil para cadastrar sua nova senha definitiva.`,
      temBotaoWhats: false,
    }),
  },
  {
    topico: "usuarios_filiais_permissoes",
    keywords: [
      "usuario",
      "usuarios",
      "permissao",
      "permissoes",
      "filial",
      "filiais",
      "cadastro de usuario",
      "dar acesso",
      "liberar tela",
      "admin",
      "painel admin",
    ],
    resposta: () => ({
      texto: `👥 **Gestão de Usuários, Filiais e Permissões (Admin)**:

• **Controle de Acesso Granular**: No painel de administração, defina quais telas cada colaborador pode acessar (*Prevenção, Controle de Notas, Uniformes, Contas, Fluxo, etc.*).
• **Vínculo por Filial**: Associe o usuário à sua respectiva filial ou conceda acesso global a todas as lojas.
• **Auditoria e Logs**: Acompanhe o histórico de quem efetuou cada alteração ou exclusão no sistema.`,
      temBotaoWhats: false,
    }),
  },
  {
    topico: "dicas_tecnicas_cache",
    keywords: [
      "lento",
      "lentidao",
      "nao carrega",
      "travou",
      "trava",
      "tela branca",
      "erro",
      "limpar cache",
      "atualizar",
      "bug",
      "pagina nao abre",
    ],
    resposta: () => ({
      texto: `⚡ **Dicas Rápidas para Solução de Travamentos ou Telas Desatualizadas**:

1. **Atualização Forçada (Limpar Cache do Navegador)**:
   • Pressione as teclas **\`Ctrl + Shift + R\`** (ou **\`Ctrl + F5\`**) no teclado para recarregar a versão mais recente do sistema.
2. **Teste em Aba Anônima**:
   • Pressione **\`Ctrl + Shift + N\`** no Google Chrome para testar sem interferência de extensões ou cookies antigos.
3. **Persistiu o problema?**
   • Caso o erro persista, você pode falar diretamente com o desenvolvedor pelo botão de WhatsApp abaixo!`,
      temBotaoWhats: true,
      whatsTexto: "Falar com o Desenvolvedor no WhatsApp",
    }),
  },
  {
    topico: "agradecimento",
    keywords: [
      "obrigado",
      "obrigada",
      "valeu",
      "muito obrigado",
      "show",
      "top",
      "perfeito",
      "ajudou",
      "excelente",
      "otimo",
      "beleza",
    ],
    resposta: (user) => ({
      texto: `Fico muito feliz em ter ajudado${user?.name ? `, **${user.name}**` : ""}! 😊
      
Sempre que tiver qualquer dúvida, precisar localizar notas/contas/OS ou abrir chamados no Sistema JSA, é só me chamar aqui! 🚀`,
      temBotaoWhats: false,
    }),
  },
  {
    topico: "saudacao",
    keywords: [
      "ola",
      "olá",
      "oi",
      "bom dia",
      "boa tarde",
      "boa noite",
      "como vai",
      "opa",
      "tudo bem",
      "e ai",
      "eae",
    ],
    resposta: (user) => ({
      texto: `Olá${user?.name ? `, **${user.name}**` : ""}! 👋 Eu sou a **Assistente JSA**.

Estou aqui para tirar dúvidas sobre o sistema, te direcionar para as telas, **localizar notas/contas/OS em tempo real** e **executar operações ou abrir chamados para você**!

💡 **Exemplos de comandos práticos que você pode me pedir**:
• *"Localize essa nota fiscal nº 1234"*
• *"Localizar conta de luz ou aluguel"*
• *"Buscar a ordem de serviço do cliente Carlos"*
• *"Localizar chamado de suporte"*
• *"Abrir chamado solicitando acesso à tela de Fluxo de Caixa"*
• *"Me direcione para a tela de Prevenção de Perdas"*
• *"Adicionar uma conta a receber no valor de R$ 30,00 para o dia 15/12/2026"*
• *"Simular venda de R$ 500 em 10x na maquininha"*`,
      temBotaoWhats: false,
    }),
  },
];

// Sugestões Rápidas (Chips Clicáveis com os principais fluxos do sistema)
const SUGESTOES_RAPIDAS = [
  { label: "🔍 Localizar Nota Fiscal (Exemplo)", query: "localize a nota fiscal nº 1234" },
  { label: "🔍 Localizar Conta a Pagar/Receber", query: "localize essa conta de luz" },
  { label: "🔍 Localizar Ordem de Serviço (O.S)", query: "localize a ordem de servico 101" },
  { label: "🎧 Abrir Chamado de Solicitação de Acesso", query: "abrir chamado solicitando acesso a telas do sistema" },
  { label: "💰 Adicionar Conta a Receber (Exemplo R$ 30)", query: "adicionar uma conta a receber na data do vencimento dia 15/12/2026, no valor de R$ 30,00" },
  { label: "💳 Simular Venda de R$ 500 em 10x", query: "fazer simulacao de credito de 500 reais em 10x" },
  { label: "🧾 Cadastrar Nota Fiscal (44 Dígitos)", query: "como cadastrar nota fiscal e ir para a tela de notas" },
  { label: "🛡️ Prevenção de Perdas & Ocorrências", query: "me direcione para a tela de prevencao de perdas" },
  { label: "👔 Entrega de Uniformes & Guia", query: "me direcione para o controle de uniformes" },
  { label: "📊 Ver Fluxo de Caixa", query: "me direcione para a tela de fluxo de caixa" },
  { label: "🛠️ Ordens de Serviço (O.S.)", query: "me direcione para a tela de ordem de servico" },
  { label: "🎨 Alterar Tema do Sistema", query: "alterar tema do sistema" },
  { label: "💬 Falar com o Desenvolvedor", query: "preciso de uma modificacao no sistema desenvolvedor", isDev: true },
];

const getMensagemInicial = (user) => {
  const nome = user?.name || user?.nome || (user?.email ? user.email.split("@")[0] : "");
  const saudacao = nome ? `Olá **${nome}**, sou **ASSISTENTE JSA**! 🤖\n\n` : `Olá, sou **ASSISTENTE JSA**! 🤖\n\n`;
  return `${saudacao}Estou aqui para tirar suas dúvidas, **localizar notas, contas, O.S e chamados no sistema** e executar operações para você (lançar contas a pagar/receber, simulações de crédito, notas fiscais e abertura de chamados)! Se precisar de alguma modificação personalizada ou suporte, posso te direcionar a um atendimento personalizado direto com o suporte técnico.`;
};

export default function ChatbotIA() {
  const navigate = useNavigate();
  const user = getUser() || {};
  const [isOpen, setIsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Estados para o Modal de Localização / Detalhes de Registro
  const [modalResultadoAberto, setModalResultadoAberto] = useState(false);
  const [registroLocalizado, setRegistroLocalizado] = useState(null);

  // Estado para o Modal de Edição de Tema
  const [modalTemaAberto, setModalTemaAberto] = useState(false);

  const [messages, setMessages] = useState(() => [
    {
      id: 1,
      sender: "bot",
      text: getMensagemInicial(user),
      time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      temBotaoWhats: false,
    },
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages, isTyping]);

  // Motor de Execução de Ações Autônomas do Assistente JSA
  const executarAcaoAutonoma = (pergunta) => {
    const limpa = pergunta
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");

    // =========================================================================
    // 1. AÇÃO: BUSCA & LOCALIZAÇÃO DE REGISTROS NO SISTEMA (NOTAS, CONTAS, O.S, ETC.)
    // =========================================================================
    const isComandoBusca =
      limpa.includes("localize") ||
      limpa.includes("localizar") ||
      limpa.includes("procure") ||
      limpa.includes("procurar") ||
      limpa.includes("buscar") ||
      limpa.includes("busca") ||
      limpa.includes("encontre") ||
      limpa.includes("encontrar") ||
      limpa.includes("pesquise") ||
      limpa.includes("pesquisar") ||
      limpa.includes("achar") ||
      limpa.includes("consultar") ||
      limpa.includes("ver registro") ||
      limpa.includes("onde esta") ||
      limpa.includes("onde estao") ||
      limpa.startsWith("busca ") ||
      limpa.startsWith("procura ");

    if (isComandoBusca) {
      const encontrados = buscarRegistrosSistema(pergunta, user);

      if (encontrados && encontrados.length > 0) {
        const principal = encontrados[0];

        // Abre o Modal com os dados completos imediatamente
        setRegistroLocalizado(principal);
        setModalResultadoAberto(true);

        const outrosAvisos =
          encontrados.length > 1
            ? `\n\n📌 *Nota: Localizei mais **${encontrados.length - 1}** registro(s) semelhante(s). Exibindo o de maior relevância no modal.*`
            : "";

        return {
          sucesso: true,
          texto: `🔍 **Registro Localizado com Sucesso!**

• **Tipo**: ${principal.tipoFormatado || principal.tipoEntidade}
• **Identificador**: **${principal.tituloDestaque}**
${principal.valorPrincipal ? `• **Valor**: ${formatarMoedaBR(principal.valorPrincipal)}\n` : ""}• **Status**: \`${principal.status || "Ativo"}\`
• **Módulo do Sistema**: ${principal.nomeModulo}${outrosAvisos}

✨ *O **Modal de Detalhes** com todas as informações completas foi aberto na tela para você conferir!*`,
          temModalLocalizacao: true,
          registroItem: principal,
          temAcaoNavegacao: Boolean(principal.rota),
          acaoTexto: `👉 Abrir no Módulo (${principal.nomeModulo})`,
          acaoRota: principal.rota,
          temBotaoWhats: false,
        };
      } else {
        return {
          sucesso: false,
          texto: `❌ **Nenhum Registro Localizado**

Não encontrei nenhum registro no sistema correspondente aos termos solicitados.

💡 **Dicas para uma busca precisa**:
• Para **Notas Fiscais**: informe o número exato da NF (ex: \`NF 1234\`) ou a Chave de Acesso (44 dígitos).
• Para **Contas**: informe a descrição da despesa (ex: \`luz\`, \`aluguel\`, \`internet\`) ou o valor.
• Para **Ordens de Serviço**: informe o número da O.S (ex: \`OS 101\`) ou o nome do cliente.
• Para **Chamados**: informe o protocolo oficial (ex: \`JSA-XXXXXX\`).`,
          temAcaoNavegacao: false,
          temBotaoWhats: true,
          whatsTexto: "Falar com o Suporte Técnico no WhatsApp",
        };
      }
    }

    // =========================================================================
    // 2. AÇÃO: ABERTURA DE CHAMADO / SOLICITAÇÃO DE ACESSO OU ATENDIMENTO
    // =========================================================================
    const isComandoChamado =
      (limpa.includes("chamado") || limpa.includes("ticket") || limpa.includes("atendimento") || limpa.includes("suporte")) &&
      (limpa.includes("abrir") || limpa.includes("criar") || limpa.includes("solicitar") || limpa.includes("novo") || limpa.includes("fazer") || limpa.includes("gerar") || limpa.includes("pedir") || limpa.includes("abertura"));

    const isComandoSolicitarAcesso =
      (limpa.includes("solicitar") || limpa.includes("pedir") || limpa.includes("preciso de") || limpa.includes("liberar") || limpa.includes("quero") || limpa.includes("conceder")) &&
      (limpa.includes("acesso") || limpa.includes("permissao") || limpa.includes("liberacao"));

    if (isComandoChamado || isComandoSolicitarAcesso) {
      const protocolo = gerarProtocoloChamado();
      const clienteNome = user?.name || user?.nome || (user?.email ? user.email.split("@")[0] : "Usuário");
      const clienteEmail = (user?.email || user?.username || "").toLowerCase();
      const clienteWhatsapp = user?.whatsapp || user?.telefone || "";
      const dataHora = new Date().toLocaleString("pt-BR");

      let categoria = "Suporte Técnico";
      if (limpa.includes("financeiro") || limpa.includes("pagamento") || limpa.includes("fatura") || limpa.includes("conta")) {
        categoria = "Financeiro / Fatura";
      } else if (limpa.includes("comercial") || limpa.includes("venda") || limpa.includes("contrato") || limpa.includes("plano")) {
        categoria = "Comercial";
      } else if (isComandoSolicitarAcesso || limpa.includes("acesso") || limpa.includes("permissao")) {
        categoria = "Suporte Técnico";
      }

      let assunto = "Solicitação via Assistente JSA";
      if (isComandoSolicitarAcesso || limpa.includes("acesso")) {
        let telaDetectada = "";
        for (const item of MAPA_ROTAS_PERMISSOES) {
          if (item.nomes.some((n) => limpa.includes(n))) {
            telaDetectada = item.titulo;
            break;
          }
        }
        assunto = telaDetectada ? `Solicitação de Acesso - ${telaDetectada}` : "Solicitação de Acesso a Módulo do Sistema";
      } else {
        const mAssunto = pergunta.match(/(?:sobre|de|assunto|motivo|para)\s+([a-zA-Z0-9\s]+?)(?:$|\.|\,)/i);
        if (mAssunto && mAssunto[1] && mAssunto[1].trim().length > 3) {
          assunto = mAssunto[1].trim();
        } else {
          assunto = `Atendimento Técnico - ${clienteNome}`;
        }
      }

      const novoChamado = {
        id: protocolo,
        clienteNome,
        clienteEmail,
        whatsapp: clienteWhatsapp,
        categoria,
        assunto,
        descricao: `Abertura realizada diretamente pelo chat da Assistente JSA:\n"${pergunta.trim()}"`,
        anexo: null,
        status: "Aberto",
        dataCriacao: dataHora,
        respostas: [],
      };

      try {
        const dataCompleta = JSON.parse(localStorage.getItem("chamados_db") || "[]");
        const atualizados = [novoChamado, ...dataCompleta];
        localStorage.setItem("chamados_db", JSON.stringify(atualizados));

        api.post("/chamados", novoChamado).catch((e) =>
          console.warn("Aviso ao persistir chamado via API:", e.message)
        );

        window.dispatchEvent(new Event("storage"));
        window.dispatchEvent(new Event("chamados-atualizados"));
      } catch (e) {
        console.error("Erro ao salvar chamado no storage:", e);
      }

      toast.success(`Chamado #${protocolo} aberto com sucesso!`);
      setTimeout(() => navigate("/chamados"), 1600);

      return {
        sucesso: true,
        texto: `✅ **Chamado Aberto com Sucesso!**

• **Protocolo**: \`#${protocolo}\`
• **Solicitante**: ${clienteNome}
• **Assunto**: ${assunto}
• **Categoria**: ${categoria}
• **Status**: Aberto
• **Data de Abertura**: ${dataHora}

Sua solicitação foi registrada no sistema e já está disponível para a nossa equipe técnica!

🚀 *Redirecionando você para a tela de **Atendimentos & Chamados** para acompanhar o chamado em tempo real...*`,
        temAcaoNavegacao: true,
        acaoTexto: "👉 Ir para tela de ATENDIMENTOS",
        acaoRota: "/chamados",
        temBotaoWhats: false,
      };
    }

    // =========================================================================
    // 3. AÇÃO: INSERÇÃO / CADASTRO DE CONTA A RECEBER OU A PAGAR
    // =========================================================================
    const isComandoConta =
      (limpa.includes("conta") || limpa.includes("despesa") || limpa.includes("receita") || limpa.includes("lancamento") || limpa.includes("boleto")) &&
      (limpa.includes("adicionar") || limpa.includes("inserir") || limpa.includes("cadastrar") || limpa.includes("criar") || limpa.includes("lancar") || limpa.includes("salvar") || limpa.includes("colocar") || limpa.includes("valor"));

    if (isComandoConta) {
      if (!verificarAcessoUsuario("contas", user)) {
        return {
          sucesso: false,
          texto: `⚠️ **Acesso Restrito ao Módulo de Contas**

NO MOMENTO VOCÊ NÃO POSSUI ACESSO A ESSA TELA, SOLICITE O ACESSO NA TELA ATENDIMENTOS, E AGUARDE A EQUIPE TÉCNICA TE CONCEDER ACESSO A TELA E SUAS FUNCIONALIDADES.

💡 *Dica:* Você pode me pedir: *"Abrir chamado solicitando acesso a tela de Gestão de Contas"* que eu crio a solicitação para você agora mesmo!`,
          temAcaoNavegacao: true,
          acaoTexto: "Ir para tela de ATENDIMENTOS",
          acaoRota: "/chamados",
          temBotaoWhats: false,
        };
      }

      const isReceber =
        limpa.includes("receber") ||
        limpa.includes("receita") ||
        limpa.includes("cliente") ||
        limpa.includes("venda") ||
        limpa.includes("entrada");

      const tipo = isReceber ? "Receber" : "Pagar";
      const valor = parseValor(pergunta);
      const vencimento = parseDataVencimento(pergunta);

      let descricao = `Conta a ${tipo} inserida via Assistente JSA`;
      const descMatches = [
        /(?:conta|despesa|receita)\s+de\s+([a-zA-Z0-9\s]+?)(?:\s+(?:no\s+valor|na\s+data|para|em|vencimento|valor|$))/i,
        /referente\s+a\s+([a-zA-Z0-9\s]+?)(?:\s+(?:no\s+valor|na\s+data|para|em|vencimento|valor|$))/i,
      ];
      for (const rx of descMatches) {
        const m = pergunta.match(rx);
        if (m && m[1] && m[1].trim().length > 2) {
          descricao = m[1].trim();
          break;
        }
      }

      if (valor && valor > 0) {
        try {
          const novaConta = salvarConta({
            descricao,
            tipo,
            valor,
            vencimento,
            categoria: tipo === "Receber" ? "Receitas Operacionais" : "Despesas Administrativas",
            formaPagamento: "PIX",
            status: "Pendente",
          });

          try {
            window.dispatchEvent(new Event("contas-atualizadas"));
            window.dispatchEvent(new Event("storage"));
          } catch (e) {}

          toast.success(`Conta a ${tipo} de ${formatarMoedaBR(valor)} cadastrada com sucesso!`);
          setTimeout(() => navigate("/contas"), 1200);

          return {
            sucesso: true,
            texto: `✅ **Conta a ${tipo} Inserida com Sucesso!**
            
• **Descrição**: ${novaConta?.descricao || descricao}
• **Tipo**: Conta a ${tipo}
• **Valor**: ${formatarMoedaBR(valor)}
• **Vencimento**: ${formatarDataBR(vencimento)}
• **Código Identificador**: \`${novaConta?.codigo || novaConta?.id || "JSA-AUT"}\`
• **Status**: Pendente

🚀 *Redirecionando você automaticamente para a tela de **Gestão de Contas**...*`,
            temAcaoNavegacao: true,
            acaoTexto: "👉 Ir para Gestão de Contas",
            acaoRota: "/contas",
            temBotaoWhats: false,
          };
        } catch (err) {
          console.error("Erro ao inserir conta automaticamente:", err);
          setTimeout(() => navigate("/contas"), 1200);
          return {
            sucesso: false,
            texto: `Houve uma instabilidade ao salvar a conta automaticamente, mas já preparei tudo e estou te direcionando para a tela **Gestão de Contas** para finalizar o lançamento!`,
            temAcaoNavegacao: true,
            acaoTexto: "👉 Abrir Gestão de Contas",
            acaoRota: "/contas",
            temBotaoWhats: true,
          };
        }
      } else {
        setTimeout(() => navigate("/contas"), 1200);
        return {
          sucesso: true,
          texto: `Entendi que você deseja cadastrar uma **Conta a ${tipo}**!
          
💡 *Dica:* Para cadastrar tudo em 1 comando, você pode me dizer: *"Adicionar uma conta a ${tipo.toLowerCase()} no valor de R$ 50,00 para o dia 20/12/2026"*.

🚀 *Redirecionando você agora para a tela de **Gestão de Contas**...*`,
          temAcaoNavegacao: true,
          acaoTexto: "👉 Ir para Gestão de Contas",
          acaoRota: "/contas",
          temBotaoWhats: false,
        };
      }
    }

    // =========================================================================
    // 4. AÇÃO: SIMULAÇÃO DE CRÉDITO / MAQUININHA DE CARTÃO
    // =========================================================================
    const isComandoSimulacao =
      limpa.includes("simul") ||
      (limpa.includes("maquininha") && (limpa.includes("taxa") || limpa.includes("calcul") || limpa.includes("venda")));

    if (isComandoSimulacao) {
      if (!verificarAcessoUsuario("simulador", user)) {
        return {
          sucesso: false,
          texto: `⚠️ **Acesso Restrito ao Simulador**

NO MOMENTO VOCÊ NÃO POSSUI ACESSO A ESSA TELA, SOLICITE O ACESSO NA TELA ATENDIMENTOS, E AGUARDE A EQUIPE TÉCNICA TE CONCEDER ACESSO A TELA E SUAS FUNCIONALIDADES.

💡 *Dica:* Você pode me pedir: *"Abrir chamado solicitando acesso a tela do Simulador"* que eu crio a solicitação para você agora mesmo!`,
          temAcaoNavegacao: true,
          acaoTexto: "Ir para tela de ATENDIMENTOS",
          acaoRota: "/chamados",
          temBotaoWhats: false,
        };
      }

      const valor = parseValor(pergunta);
      const mParcelas = limpa.match(/(\d{1,2})\s*(?:x|vezes|parcelas)/i);
      const parcelas = mParcelas ? parseInt(mParcelas[1], 10) : 1;
      const isDebito = limpa.includes("debito") || limpa.includes("débito");

      if (valor && valor > 0) {
        let taxaPercentual = 0;
        let modalidadeNome = "";

        if (isDebito) {
          taxaPercentual = 1.39;
          modalidadeNome = "Débito";
        } else if (parcelas === 1) {
          taxaPercentual = 3.19;
          modalidadeNome = "Crédito à Vista";
        } else {
          taxaPercentual = Number((3.79 + (parcelas - 1) * 1.15).toFixed(2));
          modalidadeNome = `Crédito Parcelado em ${parcelas}x`;
        }

        const valorTaxa = Number(((valor * taxaPercentual) / 100).toFixed(2));
        const valorLiquidoReceber = Number((valor - valorTaxa).toFixed(2));
        const valorParcelaCliente = Number((valor / parcelas).toFixed(2));

        const fatorRepasse = 1 - taxaPercentual / 100;
        const valorTotalRepasse = Number((valor / fatorRepasse).toFixed(2));
        const valorParcelaRepasse = Number((valorTotalRepasse / parcelas).toFixed(2));

        try {
          salvarSimulacao({
            valor,
            total: valor,
            jurosTotal: valorTaxa,
            parcelas,
            parcela: valorParcelaCliente,
            juros: taxaPercentual,
            status: "SIMULADO",
          });
          window.dispatchEvent(new Event("simulacoes-atualizadas"));
        } catch (e) {}

        setTimeout(() => navigate("/simulador"), 1500);

        return {
          sucesso: true,
          texto: `💳 **Simulação de Maquininha Realizada com Sucesso!**

• **Valor da Venda**: ${formatarMoedaBR(valor)}
• **Modalidade**: ${modalidadeNome}
• **Taxa da Operadora**: **${taxaPercentual}%** (${formatarMoedaBR(valorTaxa)})
• **Valor Líquido a Receber**: **${formatarMoedaBR(valorLiquidoReceber)}**
• **Parcela do Cliente**: ${parcelas}x de ${formatarMoedaBR(valorParcelaCliente)}

🎯 **Modo Repasse de Taxa (Para Receber o Valor Integral):**
• **Cobrar do Cliente**: **${formatarMoedaBR(valorTotalRepasse)}** (${parcelas}x de ${formatarMoedaBR(valorParcelaRepasse)})
• **Seu Ganho Líquido**: **${formatarMoedaBR(valor)}** (sem perdas de taxa!)

🚀 *Redirecionando você para o **Simulador de Maquininha**...*`,
          temAcaoNavegacao: true,
          acaoTexto: "👉 Abrir Simulador de Vendas",
          acaoRota: "/simulador",
          temBotaoWhats: false,
        };
      } else {
        setTimeout(() => navigate("/simulador"), 1200);
        return {
          sucesso: true,
          texto: `Você pode simular vendas em débito, crédito à vista ou parcelado em até 18x!
          
💡 *Exemplo de comando direto:* *"Simular venda de R$ 500 em 10x"*

🚀 *Redirecionando você para a tela do **Simulador de Maquininha**...*`,
          temAcaoNavegacao: true,
          acaoTexto: "👉 Ir para o Simulador",
          acaoRota: "/simulador",
          temBotaoWhats: false,
        };
      }
    }

    // =========================================================================
    // 5. AÇÃO: INSERIR / CADASTRAR NOTA FISCAL
    // =========================================================================
    const isComandoNota =
      (limpa.includes("nota") || limpa.includes("danfe") || limpa.includes("nfe")) &&
      (limpa.includes("inserir") || limpa.includes("cadastrar") || limpa.includes("adicionar") || limpa.includes("lancar") || limpa.includes("chave") || limpa.includes("leitor"));

    if (isComandoNota) {
      if (!verificarAcessoUsuario("controle-notas", user) && !verificarAcessoUsuario("notas", user)) {
        return {
          sucesso: false,
          texto: `⚠️ **Acesso Restrito ao Módulo de Notas**

NO MOMENTO VOCÊ NÃO POSSUI ACESSO A ESSA TELA, SOLICITE O ACESSO NA TELA ATENDIMENTOS, E AGUARDE A EQUIPE TÉCNICA TE CONCEDER ACESSO A TELA E SUAS FUNCIONALIDADES.

💡 *Dica:* Você pode me pedir: *"Abrir chamado solicitando acesso a tela de Controle de Notas"* que eu crio a solicitação para você agora mesmo!`,
          temAcaoNavegacao: true,
          acaoTexto: "Ir para tela de ATENDIMENTOS",
          acaoRota: "/chamados",
          temBotaoWhats: false,
        };
      }

      const mChave = pergunta.match(/\b(\d{44})\b/);
      if (mChave) {
        const chave = mChave[1];
        const uf = chave.slice(0, 2);
        const aamm = chave.slice(2, 6);
        const cnpj = chave.slice(6, 20);
        const modelo = chave.slice(20, 22);
        const serie = chave.slice(22, 25);
        const nNF = String(Number(chave.slice(25, 34)));
        const valor = parseValor(pergunta) || 0;

        try {
          const novaNota = salvarNota({
            chavedeacesso: chave,
            numero: nNF,
            cnpj,
            modelo,
            serie,
            valor,
            tipoConta: "Receber",
            status: "Emitida",
          });

          try {
            window.dispatchEvent(new Event("notas-atualizadas"));
            window.dispatchEvent(new Event("storage"));
          } catch (e) {}

          toast.success(`Nota Fiscal nº ${nNF} cadastrada com sucesso!`);
          setTimeout(() => navigate("/controle-notas"), 1200);

          return {
            sucesso: true,
            texto: `🧾 **Nota Fiscal Decodificada e Cadastrada com Sucesso!**

• **Número da Nota**: NF ${nNF} (Série ${serie})
• **CNPJ Emitente**: \`${cnpj}\`
• **UF / Emissão**: UF ${uf} • Ano/Mês: 20${aamm.slice(0, 2)}/${aamm.slice(2, 4)}
• **Chave de Acesso**: \`${chave}\`
${valor > 0 ? `• **Valor**: ${formatarMoedaBR(valor)}` : ""}

🚀 *Redirecionando você para o **Controle de Notas Fiscais**...*`,
            temAcaoNavegacao: true,
            acaoTexto: "👉 Abrir Controle de Notas",
            acaoRota: "/controle-notas",
            temBotaoWhats: false,
          };
        } catch (e) {
          setTimeout(() => navigate("/controle-notas"), 1200);
          return {
            sucesso: false,
            texto: `Identifiquei a chave da Nota Fiscal (\`${chave}\`). Estou te direcionando para o Controle de Notas para conferência e confirmação!`,
            temAcaoNavegacao: true,
            acaoTexto: "👉 Abrir Controle de Notas",
            acaoRota: "/controle-notas",
            temBotaoWhats: false,
          };
        }
      } else {
        setTimeout(() => navigate("/controle-notas"), 1200);
        return {
          sucesso: true,
          texto: `Para cadastrar uma Nota Fiscal, basta posicionar o cursor no campo de leitura e bipar o código de barras da DANFE ou colar a chave de 44 dígitos!
          
🚀 *Redirecionando você para a tela de **Controle de Notas Fiscais**...*`,
          temAcaoNavegacao: true,
          acaoTexto: "👉 Ir para Controle de Notas",
          acaoRota: "/controle-notas",
          temBotaoWhats: false,
        };
      }
    }

    // =========================================================================
    // 6. AÇÃO: NAVEGAÇÃO DIRETA PARA TELAS SOLICITADAS
    // =========================================================================
    const isPedidoNavegacao =
      limpa.includes("ir para") ||
      limpa.includes("abrir tela") ||
      limpa.includes("acessar") ||
      limpa.includes("mostrar tela") ||
      limpa.includes("navegar") ||
      limpa.includes("direcione") ||
      limpa.includes("direcionar") ||
      limpa.includes("levar para") ||
      limpa.includes("me leva") ||
      limpa.includes("tela de") ||
      limpa.includes("tela do") ||
      limpa.startsWith("ir ");

    if (isPedidoNavegacao) {
      for (const item of MAPA_ROTAS_PERMISSOES) {
        if (item.nomes.some((n) => limpa.includes(n))) {
          const temAcesso = verificarAcessoUsuario(item, user);

          if (temAcesso) {
            setTimeout(() => navigate(item.rota), 1000);
            return {
              sucesso: true,
              texto: `Com certeza! Estou te direcionando agora para a tela de **${item.titulo}** 🚀.`,
              temAcaoNavegacao: true,
              acaoTexto: `👉 Ir para ${item.titulo}`,
              acaoRota: item.rota,
              temBotaoWhats: false,
            };
          } else {
            return {
              sucesso: false,
              texto: `⚠️ **Acesso Restrito**\n\nNO MOMENTO VOCÊ NÃO POSSUI ACESSO A ESSA TELA, SOLICITE O ACESSO NA TELA ATENDIMENTOS, E AGUARDE A EQUIPE TÉCNICA TE CONCEDER ACESSO A TELA E SUAS FUNCIONALIDADES.\n\n💡 *Dica:* Se desejar, me diga: *"Abrir chamado solicitando acesso a tela ${item.titulo}"* que eu crio a solicitação para você agora mesmo!`,
              temAcaoNavegacao: true,
              acaoTexto: "Ir para tela de ATENDIMENTOS",
              acaoRota: "/chamados",
              temBotaoWhats: false,
            };
          }
        }
      }
    }

    // =========================================================================
    // 7. AÇÃO: ALTERAR / EDITAR TEMA DO SISTEMA
    // =========================================================================
    const isComandoTema =
      limpa.includes("tema") ||
      limpa.includes("cor do sistema") ||
      limpa.includes("mudar cor") ||
      limpa.includes("modo escuro") ||
      limpa.includes("modo claro") ||
      limpa.includes("personalizar aparencia");

    if (isComandoTema) {
      if (limpa.includes("escuro") || limpa.includes("dark") || limpa.includes("preto")) {
        aplicarTema("escuro");
        toast.success("🎨 Tema Escuro aplicado com sucesso!");
        return {
          sucesso: true,
          texto: "✅ **Tema Escuro Aplicado!**\n\nO sistema foi atualizado para o modo escuro padrão com alto contraste.",
          temBotaoWhats: false,
        };
      }
      if (limpa.includes("claro") || limpa.includes("branco") || limpa.includes("light")) {
        aplicarTema("claro");
        toast.success("🎨 Tema Claro aplicado com sucesso!");
        return {
          sucesso: true,
          texto: "✅ **Tema Claro Aplicado!**\n\nO sistema foi adaptado com fundo claro e textos escuros de máxima legibilidade.",
          temBotaoWhats: false,
        };
      }
      if (limpa.includes("azul") || limpa.includes("blue")) {
        aplicarTema("azul");
        toast.success("🎨 Tema Azul aplicado com sucesso!");
        return {
          sucesso: true,
          texto: "✅ **Tema Azul Aplicado!**\n\nO sistema foi adaptado para a paleta Deep Navy & Sky Blue.",
          temBotaoWhats: false,
        };
      }
      if (limpa.includes("verde") || limpa.includes("green")) {
        aplicarTema("verde");
        toast.success("🎨 Tema Verde aplicado com sucesso!");
        return {
          sucesso: true,
          texto: "✅ **Tema Verde Aplicado!**\n\nO sistema foi adaptado para a paleta Emerald / Teal.",
          temBotaoWhats: false,
        };
      }
      if (limpa.includes("rosa") || limpa.includes("pink") || limpa.includes("magenta")) {
        aplicarTema("rosa");
        toast.success("🎨 Tema Rosa aplicado com sucesso!");
        return {
          sucesso: true,
          texto: "✅ **Tema Rosa Aplicado!**\n\nO sistema foi adaptado para a paleta Magenta / Rose.",
          temBotaoWhats: false,
        };
      }
      if (limpa.includes("laranja") || limpa.includes("orange")) {
        aplicarTema("laranja");
        toast.success("🎨 Tema Laranja aplicado com sucesso!");
        return {
          sucesso: true,
          texto: "✅ **Tema Laranja Aplicado!**\n\nO sistema foi adaptado para a paleta Sunset Orange.",
          temBotaoWhats: false,
        };
      }

      // Se for apenas comando genérico de abrir tema
      setModalTemaAberto(true);
      return {
        sucesso: true,
        texto: "🎨 **Editar Tema do Sistema**\n\nAbri o painel de seleção de cores para você escolher o seu tema favorito (Escuro, Claro, Azul, Verde, Rosa ou Laranja)!",
        temBotaoWhats: false,
      };
    }

    // =========================================================================
    // 8. AÇÕES ADMINISTRATIVAS EXCLUSIVAS DO ADMIN (MANUTENÇÃO, DESCONEXÃO, BLOQUEIO)
    // =========================================================================
    const isComandoAdminGeral =
      limpa.includes("manutencao") ||
      limpa.includes("desconectar") ||
      limpa.includes("deslogar") ||
      limpa.includes("encerrar sessao") ||
      limpa.includes("derrubar usuario") ||
      limpa.includes("bloquear usuario") ||
      limpa.includes("bloquear acesso") ||
      limpa.includes("bloquear o usuario") ||
      limpa.includes("desbloquear usuario") ||
      limpa.includes("desbloquear acesso") ||
      limpa.includes("desbloquear o usuario") ||
      limpa.includes("liberar acesso do usuario") ||
      limpa.includes("usuarios bloqueados") ||
      limpa.includes("status das manutencoes") ||
      limpa.includes("status do sistema") ||
      ((limpa.includes("colocar") || limpa.includes("adicionar") || limpa.includes("tirar") || limpa.includes("remover") || limpa.includes("liberar")) && limpa.includes("manutencao"));

    if (isComandoAdminGeral) {
      const userIsAdmin = isAdmin(user);

      // Se NÃO for administrador, restringe imediatamente com aviso de segurança
      if (!userIsAdmin) {
        return {
          sucesso: false,
          texto: `⛔ **Acesso Restrito ao Administrador**\n\nEsta operação é restrita exclusivamente a administradores credenciados do **Sistema JSA**.\n\nSe você precisa de manutenção em alguma tela ou alteração de permissão, por favor abra um chamado técnico para que a equipe de TI avalie sua solicitação.`,
          temAcaoNavegacao: true,
          acaoTexto: "🎧 Abrir Chamado de Suporte",
          acaoRota: "/chamados",
          temBotaoWhats: false,
        };
      }

      // --- 8.1 COMANDO: COLOCAR / REMOVER TELA EM MANUTENÇÃO ---
      const isAcaoManutencao =
        limpa.includes("manutencao") ||
        ((limpa.includes("colocar") || limpa.includes("adicionar") || limpa.includes("tirar") || limpa.includes("remover") || limpa.includes("liberar")) && (limpa.includes("tela") || limpa.includes("sistema")));

      if (isAcaoManutencao) {
        const isRemover =
          limpa.includes("tirar") ||
          limpa.includes("remover") ||
          limpa.includes("liberar") ||
          limpa.includes("desativar") ||
          limpa.includes("concluir") ||
          limpa.includes("desfazer") ||
          limpa.includes("finalizar");

        // Identifica qual tela o administrador citou
        let telaAlvoConfig = null;

        if (limpa.includes("geral") || limpa.includes("todas as telas") || limpa.includes("sistema todo") || limpa.includes("todas")) {
          telaAlvoConfig = { nome: "Sistema em Múltiplas Telas", key: "*", icon: "🛠️" };
        } else {
          for (const t of TELAS_SISTEMA_CONFIG) {
            const nomeClean = t.nome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const keyClean = t.key.toLowerCase();
            const aliasesClean = (t.aliases || []).map((a) => a.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));

            // Match estrito para evitar colisão entre Notas Fiscais e Controle de Notas
            if (t.key === "controle-notas") {
              if (limpa.includes("controle de notas") || limpa.includes("controle notas") || limpa.includes("controle de nota")) {
                telaAlvoConfig = t;
                break;
              }
            } else if (t.key === "notas") {
              if ((limpa.includes("notas fiscais") || limpa.includes("nota fiscal") || limpa.includes("nfe") || limpa.includes("tela de notas") || limpa.includes("tela notas") || limpa.includes("notas")) && !limpa.includes("controle")) {
                telaAlvoConfig = t;
                break;
              }
            } else {
              if (limpa.includes(nomeClean) || limpa.includes(keyClean) || aliasesClean.some((al) => limpa.includes(al))) {
                telaAlvoConfig = t;
                break;
              }
            }
          }
        }

        if (isRemover) {
          salvarStatusSistema(
            { emManutencao: false, tela: "", mensagem: "" },
            user.name || "JSA Admin"
          );
          toast.success(telaAlvoConfig ? `✅ Manutenção da tela ${telaAlvoConfig.nome} FINALIZADA!` : "✅ Manutenção do sistema desativada!");
          return {
            sucesso: true,
            texto: `✅ **Manutenção Finalizada com Sucesso!**\n\n• **Módulo / Tela**: ${telaAlvoConfig ? `${telaAlvoConfig.icon || "💻"} **${telaAlvoConfig.nome}**` : "Todas as Telas"}\n• **Status**: 🟢 **LIBERADA PARA ACESSO NORMAL**\n• **Autorizado por**: \`${user.name || "Administrador"}\` às ${new Date().toLocaleTimeString("pt-BR")}\n\nTodos os usuários com permissão já podem navegar e utilizar as funcionalidades normalmente!`,
            temBotaoWhats: false,
          };
        } else {
          // Ativação da Manutenção
          const nomeTela = telaAlvoConfig ? telaAlvoConfig.nome : "Gestão de Contas";
          const iconTela = telaAlvoConfig ? telaAlvoConfig.icon || "🛠️" : "💳";

          salvarStatusSistema(
            {
              emManutencao: true,
              tela: nomeTela,
              mensagem: `A tela ${nomeTela} está passando por manutenção programada preventiva da equipe técnica.`,
              tipo: "ajuste",
            },
            user.name || "JSA Admin"
          );

          toast.warn(`⚠️ Tela ${nomeTela} colocada em MANUTENÇÃO!`);

          return {
            sucesso: true,
            texto: `🛠️ **Tela Colocada em Manutenção com Sucesso!**\n\n• **Tela / Módulo**: ${iconTela} **${nomeTela}**\n• **Status**: 🟡 **EM MANUTENÇÃO PROGRAMADA**\n• **Comportamento**: Usuários comuns verão aviso de ajuste e manutenção ativa\n• **Acesso Administrativo**: Liberado para testes da equipe técnica\n• **Registrado por**: \`${user.name || "JSA Admin"}\` às ${new Date().toLocaleTimeString("pt-BR")}\n\n💡 *Para liberar a tela novamente a qualquer momento, basta dizer: "Tirar tela ${nomeTela} de manutenção".*`,
            temBotaoWhats: false,
          };
        }
      }

      // --- 8.2 COMANDO: DESCONECTAR USUÁRIO ---
      const isComandoDesconectar =
        limpa.includes("desconectar") ||
        limpa.includes("deslogar") ||
        limpa.includes("encerrar sessao") ||
        limpa.includes("derrubar usuario");

      if (isComandoDesconectar) {
        if (limpa.includes("todos") || limpa.includes("todas")) {
          try {
            localStorage.setItem("desconectar_todos_usuarios_evento", Date.now().toString());
            window.dispatchEvent(new CustomEvent("force_user_logout", { detail: { all: true } }));
          } catch {}
          toast.warn("🚪 Todas as sessões de usuários comuns foram desconectadas!");
          return {
            sucesso: true,
            texto: `🚪 **Todas as Sessões de Usuários Desconectadas!**\n\nTodos os usuários com sessão ativa no sistema foram desconectados imediatamente. Suas permissões e contas permanecem intactas, mas precisarão fazer login novamente.`,
            temBotaoWhats: false,
          };
        }

        const rawUsers = localStorage.getItem("users") || localStorage.getItem("auth_users") || "[]";
        let usersList = [];
        try {
          usersList = JSON.parse(rawUsers);
        } catch {}

        let matchedUser = null;
        for (const u of usersList) {
          const uNome = String(u.name || u.nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const uEmail = String(u.email || "").toLowerCase().trim();
          const uUsername = String(u.username || "").toLowerCase().trim();

          if (
            (uNome && limpa.includes(uNome)) ||
            (uEmail && limpa.includes(uEmail)) ||
            (uUsername && limpa.includes(uUsername)) ||
            (limpa.includes("user teste") && (uNome.includes("teste") || uUsername.includes("teste") || uEmail.includes("teste")))
          ) {
            matchedUser = u;
            break;
          }
        }

        if (matchedUser) {
          try {
            localStorage.setItem(
              "usuario_desconectado_admin",
              JSON.stringify({
                email: matchedUser.email,
                username: matchedUser.username,
                userId: matchedUser.id,
                timestamp: Date.now(),
              })
            );
            window.dispatchEvent(
              new CustomEvent("force_user_logout", {
                detail: {
                  email: matchedUser.email,
                  username: matchedUser.username,
                  userId: matchedUser.id,
                },
              })
            );
            api.post("/auth/logout", { email: matchedUser.email, userId: matchedUser.id }).catch(() => {});
          } catch {}

          toast.warn(`🚪 Usuário ${matchedUser.name || matchedUser.email} desconectado com sucesso!`);

          return {
            sucesso: true,
            texto: `🚪 **Usuário Desconectado com Sucesso!**\n\n• **Nome**: **${matchedUser.name || matchedUser.nome || matchedUser.username}**\n• **E-mail**: \`${matchedUser.email}\`\n• **Status**: Sessão encerrada forçadamente pelo Administrador.\n\nO usuário foi redirecionado imediatamente para a tela de login.`,
            temBotaoWhats: false,
          };
        } else {
          const nomesDisponiveis = usersList.slice(0, 6).map((u) => `• \`${u.name || u.email}\``).join("\n");
          return {
            sucesso: false,
            texto: `⚠️ Não consegui localizar o usuário solicitado para desconectar.\n\nPor favor, informe o nome ou e-mail exato do usuário (ex: *"Desconectar usuário user teste"* ou *"Desconectar usuario@email.com"*).\n\n👥 **Usuários cadastrados no sistema**:\n${nomesDisponiveis}`,
            temBotaoWhats: false,
          };
        }
      }

      // --- 8.3 COMANDO: BLOQUEAR OU DESBLOQUEAR USUÁRIO ---
      const isComandoBloqueio =
        limpa.includes("bloquear") ||
        limpa.includes("bloqueio") ||
        limpa.includes("desbloquear") ||
        limpa.includes("desbloqueio") ||
        limpa.includes("liberar acesso");

      if (isComandoBloqueio) {
        const isDesbloquear =
          limpa.includes("desbloquear") ||
          limpa.includes("desbloqueio") ||
          limpa.includes("liberar") ||
          limpa.includes("reativar");

        const rawUsers = localStorage.getItem("users") || localStorage.getItem("auth_users") || "[]";
        let usersList = [];
        try {
          usersList = JSON.parse(rawUsers);
        } catch {}

        let matchedIndex = -1;
        for (let i = 0; i < usersList.length; i++) {
          const u = usersList[i];
          const uNome = String(u.name || u.nome || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          const uEmail = String(u.email || "").toLowerCase().trim();
          const uUsername = String(u.username || "").toLowerCase().trim();

          if (
            (uNome && limpa.includes(uNome)) ||
            (uEmail && limpa.includes(uEmail)) ||
            (uUsername && limpa.includes(uUsername)) ||
            (limpa.includes("user teste") && (uNome.includes("teste") || uUsername.includes("teste") || uEmail.includes("teste")))
          ) {
            matchedIndex = i;
            break;
          }
        }

        if (matchedIndex !== -1) {
          const targetUser = usersList[matchedIndex];

          if (isDesbloquear) {
            targetUser.blocked = false;
            targetUser.status = "Ativo";
            usersList[matchedIndex] = targetUser;

            try {
              localStorage.setItem("users", JSON.stringify(usersList));
              localStorage.setItem("auth_users", JSON.stringify(usersList));
              api.put(`/users/${targetUser.id || targetUser.email}`, { ...targetUser, blocked: false }).catch(() => {});
            } catch {}

            toast.success(`✅ Acesso do usuário ${targetUser.name || targetUser.email} DESBLOQUEADO!`);

            return {
              sucesso: true,
              texto: `✅ **Acesso Desbloqueado com Sucesso!**\n\n• **Usuário**: **${targetUser.name || targetUser.nome || targetUser.username}**\n• **E-mail**: \`${targetUser.email}\`\n• **Situação**: 🟢 **ATIVO / LIBERADO**\n• **Autorizado por**: \`${user.name || "JSA Admin"}\` às ${new Date().toLocaleTimeString("pt-BR")}\n\nO usuário já pode fazer login e acessar normalmente as telas com permissão concedida!`,
              temBotaoWhats: false,
            };
          } else {
            targetUser.blocked = true;
            targetUser.status = "Bloqueado";
            usersList[matchedIndex] = targetUser;

            try {
              localStorage.setItem("users", JSON.stringify(usersList));
              localStorage.setItem("auth_users", JSON.stringify(usersList));
              // Força desconexão imediata se o usuário estiver com sessão aberta
              localStorage.setItem(
                "usuario_desconectado_admin",
                JSON.stringify({
                  email: targetUser.email,
                  username: targetUser.username,
                  userId: targetUser.id,
                  timestamp: Date.now(),
                })
              );
              window.dispatchEvent(
                new CustomEvent("force_user_logout", {
                  detail: {
                    email: targetUser.email,
                    username: targetUser.username,
                    userId: targetUser.id,
                  },
                })
              );
              api.put(`/users/${targetUser.id || targetUser.email}`, { ...targetUser, blocked: true }).catch(() => {});
            } catch {}

            toast.error(`🚫 Usuário ${targetUser.name || targetUser.email} BLOQUEADO com sucesso!`);

            return {
              sucesso: true,
              texto: `🚫 **Acesso Bloqueado com Sucesso!**\n\n• **Usuário**: **${targetUser.name || targetUser.nome || targetUser.username}**\n• **E-mail**: \`${targetUser.email}\`\n• **Situação**: 🔴 **BLOQUEADO**\n• **Ação**: Sessão encerrada imediatamente e login bloqueado.\n\nO acesso desse usuário permanecerá suspenso **até que você solicite o desbloqueio** (ex: *"Desbloquear usuário ${targetUser.name || targetUser.username}"*).`,
              temBotaoWhats: false,
            };
          }
        } else {
          const nomesDisponiveis = usersList.slice(0, 6).map((u) => `• \`${u.name || u.email}\``).join("\n");
          return {
            sucesso: false,
            texto: `⚠️ Não consegui encontrar o usuário solicitado para ${isDesbloquear ? "desbloquear" : "bloquear"}.\n\nPor favor, informe o nome ou e-mail exato do usuário.\n\n👥 **Usuários cadastrados no sistema**:\n${nomesDisponiveis}`,
            temBotaoWhats: false,
          };
        }
      }

      // --- 8.4 STATUS GERAL DE MANUTENÇÕES E USUÁRIOS ---
      const statusAtual = obterStatusLocal();
      const rawUsers = localStorage.getItem("users") || "[]";
      let usersList = [];
      try { usersList = JSON.parse(rawUsers); } catch {}
      const usuariosBloqueados = usersList.filter((u) => u.blocked);

      return {
        sucesso: true,
        texto: `📋 **Painel de Controle Administrativo JSA**\n\n• **Status de Manutenção**: ${statusAtual.emManutencao ? `🟡 **ATIVA** na tela: \`${statusAtual.tela || "Geral"}\`` : "🟢 **Todas as telas liberadas**"}\n• **Total de Usuários Cadastrados**: ${usersList.length}\n• **Usuários Bloqueados**: ${usuariosBloqueados.length > 0 ? usuariosBloqueados.map((u) => `\`${u.name || u.email}\``).join(", ") : "Nenhum usuário bloqueado"}\n\n💡 **Comandos que você pode me pedir como ADMIN**:\n• *"Colocar tela Gestão de Contas em manutenção"*\n• *"Tirar tela Contas de manutenção"*\n• *"Desconectar usuário user teste"*\n• *"Bloquear acesso do usuário user teste"*\n• *"Desbloquear usuário user teste"*`,
        temBotaoWhats: false,
      };
    }

    return null;
  };

  // Processador de IA / Linguagem Natural Inteligente
  const processarPerguntaIA = (pergunta) => {
    // 1. Tenta executar ação autônoma primeiro (busca de registros, chamado, inserção, navegação, simulação, etc.)
    const resultadoAcao = executarAcaoAutonoma(pergunta);
    if (resultadoAcao) {
      return resultadoAcao;
    }

    // 2. Busca na base de conhecimento rica do sistema
    const limpa = pergunta
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/gi, " ");

    const palavras = limpa.split(/\s+/).filter((p) => p.length > 2);

    let melhorTopico = null;
    let maxPontos = 0;

    for (const item of BASE_CONHECIMENTO) {
      let pontos = 0;
      for (const kw of item.keywords) {
        const kwLimpa = kw
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");

        if (limpa.includes(kwLimpa)) {
          pontos += kwLimpa.length >= 8 ? 6 : 4;
        } else {
          const kwPalavras = kwLimpa.split(/\s+/);
          for (const kp of kwPalavras) {
            if (kp.length > 3 && palavras.includes(kp)) {
              pontos += 2;
            }
          }
        }
      }

      if (pontos > maxPontos) {
        maxPontos = pontos;
        melhorTopico = item;
      }
    }

    if (melhorTopico && maxPontos >= 2) {
      return melhorTopico.resposta(user, pergunta);
    }

    // Fallback inteligente
    return {
      texto: `Entendi sua solicitação sobre: *" ${pergunta} "*.
      
💡 **Como posso te ajudar**:
• Peça para eu **localizar qualquer nota, conta, O.S ou chamado** (ex: *"Localize a nota 1234"* ou *"Buscar conta de luz"*).
• Navegue pelas telas do sistema ou peça para eu te direcionar.
• Você também pode me pedir para **abrir chamados**, cadastrar contas ou simular taxas diretamente aqui!

Se a sua solicitação envolver uma **situação específica, alteração de regras ou customização no sistema**, fale diretamente com o Desenvolvedor no WhatsApp abaixo:`,
      temBotaoWhats: true,
      whatsTexto: "Falar com o Desenvolvedor no WhatsApp",
    };
  };

  const handleEnviar = (textoCustom) => {
    const texto = (textoCustom || inputValue).trim();
    if (!texto || isTyping) return;

    const dataHora = new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    // 1. Adiciona a mensagem do usuário
    const userMsg = {
      id: Date.now(),
      sender: "user",
      text: texto,
      time: dataHora,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setIsTyping(true);

    // 2. Simula tempo de processamento da IA para naturalidade
    setTimeout(() => {
      const respIA = processarPerguntaIA(texto);
      const botMsg = {
        id: Date.now() + 1,
        sender: "bot",
        text: respIA.texto,
        temBotaoWhats: respIA.temBotaoWhats,
        whatsTexto: respIA.whatsTexto || "Abrir WhatsApp do Desenvolvedor",
        temAcaoNavegacao: respIA.temAcaoNavegacao,
        acaoTexto: respIA.acaoTexto,
        acaoRota: respIA.acaoRota,
        temModalLocalizacao: respIA.temModalLocalizacao,
        registroItem: respIA.registroItem,
        time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 450);
  };

  const formatTextMarkdown = (str) => {
    if (!str) return "";
    let formatted = str.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    formatted = formatted.replace(/`(.*?)`/g, "<code>$1</code>");
    return formatted;
  };

  return (
    <>
      {/* Modal de Resultado da Localização / Detalhes do Registro */}
      <ModalResultadoLocalizacao
        item={registroLocalizado}
        isOpen={modalResultadoAberto}
        onClose={() => setModalResultadoAberto(false)}
        onNavegar={(rota) => {
          setModalResultadoAberto(false);
          navigate(rota);
        }}
      />

      {/* Modal de Edição de Tema do Sistema */}
      <ModalEditarTema
        isOpen={modalTemaAberto}
        onClose={() => setModalTemaAberto(false)}
      />

      <div className="jsa-chatbot-container">
        {/* Botão Minimizado / Gatilho Flutuante no Canto Inferior Direito */}
        {!isOpen && (
          <button
            type="button"
            className="jsa-chatbot-trigger-btn"
            onClick={() => setIsOpen(true)}
            title="Abrir Assistente JSA"
          >
            <img src={botAvatarImg} alt="Assistente JSA" className="jsa-chatbot-trigger-img" />
            <span>Assistente JSA</span>
            <span className="jsa-chatbot-trigger-badge" />
          </button>
        )}

        {/* Janela do Chatbot Aberta */}
        {isOpen && (
          <div className="jsa-chatbot-card" role="dialog" aria-modal="false">
            {/* Cabeçalho */}
            <div className="jsa-chatbot-header">
              <div className="jsa-chatbot-header-left">
                <div className="jsa-chatbot-avatar">
                  <img src={botAvatarImg} alt="Assistente JSA" className="jsa-chatbot-avatar-img" />
                </div>
                <div className="jsa-chatbot-title-group">
                  <div className="jsa-chatbot-title">
                    <span>Assistente JSA</span>
                  </div>
                  <div className="jsa-chatbot-status">
                    <span className="jsa-chatbot-status-dot" />
                    <span>Online • Tire dúvidas e localize dados</span>
                  </div>
                </div>
              </div>

              <div className="jsa-chatbot-header-actions">
                <button
                  type="button"
                  className="jsa-chatbot-btn-header"
                  onClick={() =>
                    setMessages([
                      {
                        id: Date.now(),
                        sender: "bot",
                        text: getMensagemInicial(user),
                        time: new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
                        temBotaoWhats: false,
                      },
                    ])
                  }
                  title="Limpar histórico da conversa"
                >
                  🔄
                </button>
                <button
                  type="button"
                  className="jsa-chatbot-btn-header"
                  onClick={() => setIsOpen(false)}
                  title="Minimizar Assistente"
                >
                  _
                </button>
                <button
                  type="button"
                  className="jsa-chatbot-btn-header btn-close"
                  onClick={() => setIsOpen(false)}
                  title="Fechar Chatbot"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Área de Mensagens */}
            <div className="jsa-chatbot-messages">
              {messages.map((m) => (
                <div key={m.id} className={`jsa-chatbot-msg-row ${m.sender}`}>
                  <div className={`jsa-chatbot-bubble ${m.sender}`}>
                    <div
                      className="jsa-chatbot-text-content"
                      style={{ whiteSpace: "pre-line" }}
                      dangerouslySetInnerHTML={{ __html: formatTextMarkdown(m.text) }}
                    />

                    {/* Botão de Reabrir Modal de Localização se a mensagem for de busca */}
                    {m.temModalLocalizacao && m.registroItem && (
                      <div style={{ marginTop: "8px", marginBottom: "4px" }}>
                        <button
                          type="button"
                          className="jsa-chatbot-action-btn"
                          style={{ background: "linear-gradient(135deg, #0284c7 0%, #0369a1 100%)", border: "1px solid #38bdf8" }}
                          onClick={() => {
                            setRegistroLocalizado(m.registroItem);
                            setModalResultadoAberto(true);
                          }}
                        >
                          🔍 Ver Detalhes no Modal
                        </button>
                      </div>
                    )}

                    {/* Card de Ação do Sistema & Redirecionamento */}
                    {m.temAcaoNavegacao && (
                      <div className="jsa-chatbot-action-box">
                        <div className="jsa-chatbot-action-badge">
                          <span>⚡</span>
                          <span>Ação • Direcionar</span>
                        </div>
                        <button
                          type="button"
                          className="jsa-chatbot-action-btn"
                          onClick={() => {
                            if (m.acaoRota) {
                              navigate(m.acaoRota);
                            }
                          }}
                        >
                          {m.acaoTexto || "👉 Acessar Tela"}
                        </button>
                      </div>
                    )}

                    {/* Card Direcionamento ao WhatsApp do Desenvolvedor */}
                    {m.temBotaoWhats && (
                      <div className="jsa-chatbot-dev-box">
                        <span className="jsa-chatbot-dev-text">
                          📲 Clique abaixo para enviar uma mensagem direta ao desenvolvedor:
                        </span>
                        <a
                          href={LINK_WHATSAPP_DEV}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="jsa-chatbot-whatsapp-btn"
                        >
                          <span>💬</span> {m.whatsTexto || "Falar com o Desenvolvedor no WhatsApp"}
                        </a>
                      </div>
                    )}

                    <div className="jsa-chatbot-bubble-time">{m.time}</div>
                  </div>
                </div>
              ))}

              {/* Efeito de IA Digitando */}
              {isTyping && (
                <div className="jsa-chatbot-msg-row bot">
                  <div className="jsa-chatbot-typing-row">
                    <span className="jsa-chatbot-typing-dot" />
                    <span className="jsa-chatbot-typing-dot" />
                    <span className="jsa-chatbot-typing-dot" />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Sugestões Rápidas (Chips Clicáveis) */}
            <div className="jsa-chatbot-chips-section">
              <div className="jsa-chatbot-chips-title">
                <span>💡</span> {isAdmin(user) ? "Comandos Administrativos & Pesquisas:" : "Perguntas e pesquisas frequentes:"}
              </div>
              <div className="jsa-chatbot-chips-scroll">
                {(isAdmin(user)
                  ? [
                      { label: "🛠️ Colocar Contas em Manutenção", query: "adicionar tela contas em manutencao" },
                      { label: "✅ Liberar Telas de Manutenção", query: "tirar manutencao de todas as telas" },
                      { label: "🚫 Bloquear Usuário (Ex: user teste)", query: "bloquear acesso do usuario user teste" },
                      { label: "🟢 Desbloquear Usuário", query: "desbloquear usuario user teste" },
                      { label: "🚪 Desconectar Usuário", query: "desconectar usuario user teste" },
                      { label: "📋 Status do Sistema & Manutenções", query: "status das manutencoes do sistema" },
                      ...SUGESTOES_RAPIDAS,
                    ]
                  : SUGESTOES_RAPIDAS
                ).map((sugestao, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className={`jsa-chatbot-chip ${sugestao.isDev ? "dev-chip" : ""}`}
                    onClick={() => handleEnviar(sugestao.query)}
                  >
                    {sugestao.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Barra de Input / Envio */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleEnviar();
              }}
              className="jsa-chatbot-input-bar"
            >
              <input
                ref={inputRef}
                type="text"
                className="jsa-chatbot-input"
                placeholder="Localize uma nota, conta, O.S ou tire dúvidas..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                disabled={isTyping}
              />
              <button
                type="submit"
                className="jsa-chatbot-btn-send"
                disabled={isTyping || !inputValue.trim()}
                title="Enviar solicitação"
              >
                ➤
              </button>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
