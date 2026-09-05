// src/pages/Chamados/ChamadosClient.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import emailjs from "@emailjs/browser";
import { getUser, setUser } from "../../auth/auth";
import { api } from "../../api/client";
import { sendTelegramEvent } from "../../utils/telegram";
import whatsSuporteImg from "../../assets/whatssuporte.jpeg";
import ModalChatAtendimento from "../../components/Modais/ModalChatAtendimento";
import "../../components/Visual/chamados.css";

const EMAILJS_SERVICE_ID = "jsasolucoestecnologicas";
// const EMAILJS_TEMPLATE_ID = "template_vrnfmrt"; 
const EMAILJS_TEMPLATE_ID = "template_qra8gli";
const EMAILJS_PUBLIC_KEY = "YUEhSf74n7z0_XT30";

const formatWhatsApp = (value) => {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 2) return digits ? `(${digits}` : "";
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
};

const gerarProtocolo = () => {
  const caracteres = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let codigo = "";
  for (let i = 0; i < 6; i++) {
    codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
  }
  return `JSA-${codigo}`;
};

export default function ChamadosClient() {
  const [chamados, setChamados] = useState([]);
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(false);

  const [showCadastrarZapModal, setShowCadastrarZapModal] = useState(false);
  const [tempWhatsapp, setTempWhatsapp] = useState("");
  const [showNovoModal, setShowNovoModal] = useState(false);
  const [showMeusModal, setShowMeusModal] = useState(false);
  const [chamadoParaCancelar, setChamadoParaCancelar] = useState(null);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("Todos");
  const [imagemModalAberta, setImagemModalAberta] = useState(null);
  const [chatModalChamado, setChatModalChamado] = useState(null);

  // Estados para Edição de Chamado
  const [chamadoParaEditar, setChamadoParaEditar] = useState(null);
  const [editCategoria, setEditCategoria] = useState("Suporte Técnico");
  const [editWhatsapp, setEditWhatsapp] = useState("");
  const [editAssunto, setEditAssunto] = useState("");
  const [editDescricao, setEditDescricao] = useState("");
  const [editAnexo, setEditAnexo] = useState(null);

  const [categoria, setCategoria] = useState("Suporte Técnico");
  const [whatsapp, setWhatsapp] = useState("");
  const [assunto, setAssunto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [anexo, setAnexo] = useState(null);

  // Helper para normalizar e extrair o anexo independente do formato
  const getAnexo = (item) => {
    if (!item) return null;
    let anx =
      item.anexo ||
      (Array.isArray(item.anexos) && item.anexos.length > 0 ? item.anexos[0] : null) ||
      item.imagem ||
      item.arquivo;
    if (!anx) return null;

    if (typeof anx === "string") {
      const trimmed = anx.trim();
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        try {
          const parsed = JSON.parse(trimmed);
          anx = Array.isArray(parsed) ? parsed[0] : parsed;
        } catch {}
      } else if (
        trimmed.startsWith("data:") ||
        trimmed.startsWith("http") ||
        trimmed.startsWith("/") ||
        trimmed.startsWith("blob:")
      ) {
        return {
          nome: "imagem_anexada.png",
          tamanho: "Imagem",
          tipo: "image/png",
          data: trimmed,
        };
      }
    }

    if (anx && typeof anx === "object") {
      const dataUrl = anx.data || anx.url || anx.src || anx.base64 || anx.link || "";
      return {
        nome: anx.nome || anx.name || "anexo_imagem.png",
        tamanho: anx.tamanho || anx.size || "Anexo",
        tipo:
          anx.tipo ||
          anx.type ||
          (typeof dataUrl === "string" && dataUrl.startsWith("data:image") ? "image/png" : ""),
        data: dataUrl,
      };
    }
    return null;
  };

  // Helper para identificar anexos que são imagens
  const isImagem = (anx) => {
    if (!anx) return false;
    const dataStr = typeof anx === "string" ? anx : anx.data || anx.url || anx.src || "";
    if (
      typeof dataStr === "string" &&
      (dataStr.startsWith("data:image") ||
        dataStr.startsWith("blob:") ||
        /\.(jpe?g|png|webp|gif|svg|bmp)($|\?)/i.test(dataStr))
    ) {
      return true;
    }
    const tipo = (anx.tipo || anx.type || "").toLowerCase();
    if (tipo.startsWith("image")) return true;
    const nome = (anx.nome || anx.name || "").toLowerCase();
    if (/\.(jpe?g|png|webp|gif|svg|bmp)($|\?)/i.test(nome)) return true;
    return false;
  };

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setShowCadastrarZapModal(false);
        setShowNovoModal(false);
        setShowMeusModal(false);
        setChamadoParaCancelar(null);
        setMotivoCancelamento("");
        setChamadoParaEditar(null);
        setImagemModalAberta(null);
      }
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, []);

  const categorias = [
    "Suporte Técnico",
    "Financeiro / Fatura",
    "Comercial",
    "Outros Assuntos",
  ];

  const PROBLEMAS_POR_CATEGORIA = {
    "Suporte Técnico": [
      "Sem acesso à internet",
      "Conexão lenta / oscilação",
      "Queda frequente de sinal",
      "Configuração de roteador / Wi-Fi",
      "Luz vermelha no equipamento (LOS)",
      "Problema em equipamento / fibra óptica",
    ],
    "Financeiro / Fatura": [
      "Segunda via de boleto / fatura",
      "Comprovante de pagamento enviado",
      "Dúvida sobre valor da mensalidade",
      "Negociação de débitos / reativação",
      "Alteração de data de vencimento",
      "Problema com chave PIX / pagamento",
    ],
    "Comercial": [
      "Upgrade / aumento de velocidade do plano",
      "Mudança de endereço de instalação",
      "Contratação de novo ponto / serviço",
      "Transferência de titularidade",
      "Dúvidas sobre cláusulas do contrato",
    ],
    "Outros Assuntos": [
      "Elogio ou sugestão de melhoria",
      "Dúvidas gerais sobre a empresa",
      "Reclamação de atendimento",
      "Solicitação de visita técnica",
    ],
  };

  const categoriasCards = [
    {
      id: "suporte",
      titulo: "Suporte Técnico",
      icone: "🛠️",
      descricao: "Encontre ajuda para problemas ou erros no sistema.",
      categoria: "Suporte Técnico",
    },
    {
      id: "financeiro",
      titulo: "Financeiro / Fatura",
      icone: "💳",
      descricao: "Dúvidas sobre faturas, pagamentos, boletos ou cobranças.",
      categoria: "Financeiro / Fatura",
    },
    {
      id: "comercial",
      titulo: "Comercial",
      icone: "💼",
      descricao: "Informações sobre novos planos, contratos e contratações.",
      categoria: "Comercial",
    },
    {
      id: "outros",
      titulo: "Outros Assuntos",
      icone: "📋",
      descricao: "Dúvidas gerais, sugestões ou outras solicitações.",
      categoria: "Outros Assuntos",
    },
  ];

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limite de 5MB
    const maxBytes = 5 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.warn("O arquivo é muito grande. O tamanho máximo permitido é de 5MB.");
      e.target.value = "";
      return;
    }

    const formatSize = (bytes) => {
      if (bytes < 1024) return `${bytes} B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      setAnexo({
        nome: file.name,
        tamanho: formatSize(file.size),
        tipo: file.type,
        data: loadEvent.target.result,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleRemoverAnexo = () => {
    setAnexo(null);
  };

  const handleSelectProblema = (itemProblema) => {
    setAssunto(itemProblema);
  };

  const getNumeroWhatsappUsuario = (userObj) => {
    if (userObj?.whatsapp || userObj?.telefone) {
      return userObj.whatsapp || userObj.telefone;
    }
    try {
      const email = (userObj?.email || userObj?.username || "").toLowerCase();
      const raw = localStorage.getItem("users");
      const users = raw ? JSON.parse(raw) : [];
      const found = users.find(
        (u) => String(u.email || "").toLowerCase() === email
      );
      return found?.whatsapp || found?.telefone || "";
    } catch {
      return "";
    }
  };

  const handleAbrirPorCategoria = (catNome) => {
    setCategoria(catNome);
    setAssunto("");
    setDescricao("");
    setAnexo(null);
    const user = getUser() || usuario || {};
    const zap = getNumeroWhatsappUsuario(user);

    if (!zap || zap.trim().length < 10) {
      setTempWhatsapp("");
      setShowCadastrarZapModal(true);
    } else {
      setWhatsapp(zap);
      setShowNovoModal(true);
    }
  };

  const handleSalvarWhatsappModal = (e) => {
    e.preventDefault();

    const digitsOnly = tempWhatsapp.replace(/\D/g, "");
    if (!digitsOnly || digitsOnly.length < 10) {
      toast.warn("Por favor, insira um número de WhatsApp válido com DDD.");
      return;
    }

    try {
      const zapLimpo = tempWhatsapp.trim();
      const user = getUser() || usuario || {};
      const targetEmail = (user?.email || user?.username || "").toLowerCase();

      // 1. Atualiza no localStorage 'users'
      const raw = localStorage.getItem("users");
      const users = raw ? JSON.parse(raw) : [];
      const updatedUsers = users.map((u) => {
        if (String(u.email || "").toLowerCase() === targetEmail) {
          return { ...u, whatsapp: zapLimpo };
        }
        return u;
      });
      localStorage.setItem("users", JSON.stringify(updatedUsers));

      // 2. Atualiza a sessão ativa
      const updatedUser = { ...user, whatsapp: zapLimpo };
      setUser(updatedUser);
      setUsuario(updatedUser);
      setWhatsapp(zapLimpo);

      setShowCadastrarZapModal(false);
      toast.success("WhatsApp cadastrado com sucesso!");
      setShowNovoModal(true);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar WhatsApp.");
    }
  };

  useEffect(() => {
    const user = getUser() || {};
    setUsuario(user);
    const zap = getNumeroWhatsappUsuario(user);
    if (zap) {
      setWhatsapp(zap);
    }
    carregarChamados(user);
  }, []);

  const carregarChamados = async (user) => {
    const userEmail = (user?.email || user?.username || "").toLowerCase();
    try {
      const resp = await api.get("/chamados");
      if (Array.isArray(resp.data)) {
        localStorage.setItem("chamados_db", JSON.stringify(resp.data));
        const meus = resp.data.filter(
          (c) => (c.clienteEmail || "").toLowerCase() === userEmail
        );
        setChamados(meus);
        return;
      }
    } catch (e) {
      console.warn("Aviso ao carregar chamados via API:", e.message);
    }

    try {
      const data = JSON.parse(localStorage.getItem("chamados_db") || "[]");
      const meus = data.filter(
        (c) => (c.clienteEmail || "").toLowerCase() === userEmail
      );
      setChamados(meus);
    } catch {
      setChamados([]);
    }
  };

  const handleNovoChamado = async (e) => {
    e.preventDefault();

    if (!whatsapp.trim() || !assunto.trim() || !descricao.trim()) {
      toast.warn("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    setLoading(true);

    try {
      const dataCompleta = JSON.parse(localStorage.getItem("chamados_db") || "[]");
      const protocolo = gerarProtocolo();
      const clienteNome = usuario?.name || usuario?.nome || "Cliente";
      const clienteEmail = (usuario?.email || usuario?.username || "").toLowerCase();
      const dataHora = new Date().toLocaleString("pt-BR");

      const novoChamado = {
        id: protocolo,
        clienteNome,
        clienteEmail,
        whatsapp: whatsapp.trim(),
        categoria,
        assunto: assunto.trim(),
        descricao: descricao.trim(),
        anexo: anexo || null,
        status: "Aberto",
        dataCriacao: dataHora,
        respostas: [],
      };

      const atualizados = [novoChamado, ...dataCompleta];
      localStorage.setItem("chamados_db", JSON.stringify(atualizados));

      // Persiste no banco de dados via API
      api.post("/chamados", novoChamado).catch((e) =>
        console.warn("Aviso ao persistir chamado no banco via API:", e.message)
      );

      const infoAnexo = anexo ? `\nAnexo: ${anexo.nome} (${anexo.tamanho})` : "";
      const relacaoSolicitacao =
        `CONFIRMAÇÃO DE ABERTURA DE CHAMADO\n` +
        `----------------------------------------\n` +
        `Protocolo: #${protocolo}\n` +
        `Cliente: ${clienteNome}\n` +
        `E-mail: ${clienteEmail}\n` +
        `WhatsApp: ${whatsapp.trim()}\n` +
        `Categoria: ${categoria}\n` +
        `Assunto: ${assunto.trim()}${infoAnexo}\n` +
        `Data de Abertura: ${dataHora}\n\n` +
        `DESCRIÇÃO DA SOLICITAÇÃO:\n${descricao.trim()}\n\n` +
        `Sua solicitação já está sob análise da nossa equipe técnica.`;

      try {
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            to_email: clienteEmail,
            email: clienteEmail,
            user_name: clienteNome,
            whatsapp: whatsapp.trim(),
            protocolo: protocolo,
            categoria: categoria,
            assunto: assunto.trim(),
            descricao: descricao.trim(),
            message: relacaoSolicitacao,
          },
          EMAILJS_PUBLIC_KEY
        );
      } catch (err) {
        console.error("Erro EmailJS:", err);
      }

      try {
        const telegramLines = [
          `Protocolo: #${protocolo}`,
          `Cliente: ${clienteNome} (${clienteEmail})`,
          `WhatsApp: ${whatsapp.trim()}`,
          `Categoria: ${categoria}`,
          `Assunto: ${assunto}`,
          `Descrição: ${descricao}`,
        ];

        if (anexo) {
          telegramLines.push(`📎 Anexo: ${anexo.nome} (${anexo.tamanho})`);
        }

        await sendTelegramEvent({
          title: "Novo Chamado Aberto",
          emoji: "🎫",
          lines: telegramLines,
        });
      } catch (err) {
        console.error("Erro Telegram:", err);
      }

      setAssunto("");
      setDescricao("");
      setAnexo(null);
      setShowNovoModal(false);
      carregarChamados(usuario);
      toast.success(`Chamado #${protocolo} criado com sucesso!`);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao registrar chamado.");
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de edição do chamado
  const handleAbrirEditarChamado = (chamado) => {
    setChamadoParaEditar(chamado);
    setEditCategoria(chamado.categoria || "Suporte Técnico");
    setEditAssunto(chamado.assunto || "");
    setEditDescricao(chamado.descricao || "");
    setEditWhatsapp(chamado.whatsapp || "");
    setEditAnexo(chamado.anexo || null);
  };

  // Salvar alterações da edição do chamado
  const handleSalvarEdicaoChamado = async (e) => {
    e.preventDefault();
    if (!chamadoParaEditar) return;

    if (!editAssunto.trim() || !editDescricao.trim()) {
      toast.warn("Por favor, preencha o assunto e a descrição do chamado.");
      return;
    }

    setLoading(true);
    try {
      const dataHora = new Date().toLocaleString("pt-BR");
      const dataCompleta = JSON.parse(localStorage.getItem("chamados_db") || "[]");

      const atualizados = dataCompleta.map((item) => {
        if (item.id === chamadoParaEditar.id) {
          const historico = item.respostas || [];
          return {
            ...item,
            categoria: editCategoria,
            assunto: editAssunto.trim(),
            descricao: editDescricao.trim(),
            whatsapp: editWhatsapp.trim() || item.whatsapp,
            anexo: editAnexo,
            respostas: [
              ...historico,
              {
                autor: "Usuário (Edição)",
                mensagem: `Chamado editado pelo usuário em ${dataHora}.`,
                data: dataHora,
              },
            ],
          };
        }
        return item;
      });

      localStorage.setItem("chamados_db", JSON.stringify(atualizados));

      api.put(`/chamados/${chamadoParaEditar.id}`, {
        categoria: editCategoria,
        assunto: editAssunto.trim(),
        descricao: editDescricao.trim(),
        anexos: editAnexo ? [editAnexo] : [],
      }).catch((err) => console.warn("Aviso ao salvar edição via API:", err.message));

      carregarChamados(usuario);
      setChamadoParaEditar(null);
      toast.success(`Chamado #${chamadoParaEditar.id} atualizado com sucesso!`);
    } catch (err) {
      console.error("Erro ao editar chamado:", err);
      toast.error("Erro ao atualizar o chamado.");
    } finally {
      setLoading(false);
    }
  };

  const handleSolicitarCancelamento = (chamado) => {
    setChamadoParaCancelar(chamado);
    setMotivoCancelamento("");
  };

  const handleConfirmarCancelamento = async (e) => {
    if (e) e.preventDefault();
    if (!chamadoParaCancelar) return;

    const motivoLimpo = String(motivoCancelamento || "").trim();
    if (!motivoLimpo) {
      toast.warn("Por favor, informe o motivo do cancelamento.");
      return;
    }

    const chamado = chamadoParaCancelar;
    const clienteNome = usuario?.name || usuario?.nome || chamado.clienteNome || "O Usuário";
    const clienteEmail = (chamado.clienteEmail || usuario?.email || usuario?.username || "").toLowerCase();
    const dataHora = new Date().toLocaleString("pt-BR");

    setLoading(true);
    try {
      const dataCompleta = JSON.parse(localStorage.getItem("chamados_db") || "[]");

      const atualizados = dataCompleta.map((item) => {
        if (item.id === chamado.id) {
          const historico = item.respostas || [];
          return {
            ...item,
            status: "Cancelado",
            motivoCancelamento: motivoLimpo,
            canceladoPor: clienteNome,
            dataCancelamento: dataHora,
            respostas: [
              ...historico,
              {
                autor: "Sistema (Cancelamento)",
                mensagem: `Chamado cancelado pelo cliente ${clienteNome} em ${dataHora}. Motivo: ${motivoLimpo}`,
                data: dataHora,
              },
            ],
          };
        }
        return item;
      });

      localStorage.setItem("chamados_db", JSON.stringify(atualizados));
      api.put(`/chamados/${chamado.id}`, {
        status: "Cancelado",
        motivoCancelamento: motivoLimpo,
      }).catch((e) => console.warn("Aviso ao cancelar chamado via API:", e.message));

      carregarChamados(usuario);

      // 1. Enviar E-mail de Notificação de Cancelamento ao Usuário via EmailJS
      if (clienteEmail) {
        const corpoEmail =
          `CONFIRMAÇÃO DE CANCELAMENTO DE CHAMADO\n` +
          `----------------------------------------\n` +
          `Olá, ${clienteNome}!\n\n` +
          `Confirmamos que você realizou com sucesso o cancelamento do seu chamado no sistema JSA Gestão:\n\n` +
          `Protocolo: #${chamado.id}\n` +
          `Assunto: ${chamado.assunto}\n` +
          `Categoria: ${chamado.categoria || "Geral"}\n` +
          `Data de Abertura: ${chamado.dataCriacao || "-"}\n` +
          `Data do Cancelamento: ${dataHora}\n` +
          `Motivo do Cancelamento: ${motivoLimpo}\n` +
          `Status: Cancelado a pedido do usuário\n\n` +
          `Se você tiver alguma dúvida adicional ou desejar novo suporte, sinta-se à vontade para abrir um novo chamado a qualquer momento na Central de Atendimento.\n\n` +
          `Atenciosamente,\n` +
          `Equipe de Atendimento e Suporte JSA`;

        try {
          await emailjs.send(
            EMAILJS_SERVICE_ID,
            EMAILJS_TEMPLATE_ID,
            {
              to_email: clienteEmail,
              email: clienteEmail,
              user_name: clienteNome,
              protocolo: chamado.id,
              categoria: chamado.categoria || "Geral",
              assunto: `Cancelamento de Chamado: ${chamado.assunto}`,
              status: "Cancelado pelo Cliente",
              message: corpoEmail,
            },
            EMAILJS_PUBLIC_KEY
          );
          toast.success(`E-mail de confirmação de cancelamento enviado para ${clienteEmail}`);
        } catch (err) {
          console.error("Erro ao enviar e-mail de cancelamento:", err);
        }
      }

      // 2. Enviar notificação Telegram
      try {
        await sendTelegramEvent({
          title: "Chamado Cancelado pelo Cliente",
          emoji: "🚫",
          lines: [
            `Protocolo: #${chamado.id}`,
            `Cliente: ${clienteNome} (${clienteEmail})`,
            `Status: Cancelado`,
            `Motivo: ${motivoLimpo}`,
            `Data/Hora: ${dataHora}`,
          ],
        });
      } catch (err) {
        console.error(err);
      }

      toast.info(`O chamado #${chamado.id} foi cancelado com sucesso.`);
    } catch {
      toast.error("Erro ao cancelar o chamado.");
    } finally {
      setLoading(false);
      setChamadoParaCancelar(null);
      setMotivoCancelamento("");
    }
  };

  const chamadosFiltrados = chamados.filter((c) =>
    filtroStatus === "Todos" ? true : c.status === filtroStatus
  );

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Aberto":
        return "chamados-status-aberto";
      case "Em Atendimento":
        return "chamados-status-atendimento";
      case "Resolvido":
        return "chamados-status-resolvido";
      default:
        return "chamados-status-cancelado";
    }
  };

  return (
    <div className="chamados-hero-container fade-in-page">
      <div className="chamados-client-wrapper">
        <div className="chamados-header-section">
          <div className="chamados-icon-header">💬</div>
          <h2 className="chamados-title-center">Central de Atendimento</h2>
          <p className="chamados-subtitle">
            Precisa de suporte técnico ou financeiro? Escolha uma das categorias abaixo para abrir um chamado ou acompanhe suas solicitações.
          </p>

          <div className="chamados-header-actions">
            <button
              className="chamados-btn-secondary-center"
              onClick={() => setShowMeusModal(true)}
            >
              📋 Meus Chamados ({chamados.length})
            </button>
          </div>
        </div>

        <div className="chamados-categories-grid">
          {categoriasCards.map((item, index) => (
            <div
              key={item.id}
              className="chamados-category-card card-slide-in"
              style={{ animationDelay: `${index * 0.05}s` }}
              onClick={() => handleAbrirPorCategoria(item.categoria)}
            >
              <div className="chamados-category-icon">{item.icone}</div>
              <h3 className="chamados-category-title">{item.titulo}</h3>
              <p className="chamados-category-desc">{item.descricao}</p>
              <button
                type="button"
                className="chamados-category-action"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAbrirPorCategoria(item.categoria);
                }}
              >
                Abrir chamado <span className="chamados-arrow">→</span>
              </button>
            </div>
          ))}

          {/* Container Especial: WhatsApp Suporte e QR Code */}
          <div
            className="chamados-category-card chamados-category-whatsapp card-slide-in"
            onClick={() => {
              window.open(
                "https://wa.me/5565984027342?text=Ol%C3%A1%2C%20referente%20ao%20Sistema%20JSA...%0Aestou%20com%20uma%20duvida%20no...",
                "_blank",
                "noopener,noreferrer"
              );
            }}
            title="Clique para abrir o WhatsApp de Atendimento Direto ou escaneie o QR Code"
            style={{
              animationDelay: "0.25s",
              border: "1px solid rgba(34, 197, 94, 0.35)",
              background: "linear-gradient(145deg, #18181b 0%, #0d1e13 100%)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              cursor: "pointer",
            }}
          >
            <div className="chamados-category-icon" style={{ fontSize: "28px", marginBottom: "8px" }}>
              💬
            </div>
            <h3 className="chamados-category-title" style={{ color: "#4ade80", marginBottom: "6px" }}>
              Atendimento Direto
            </h3>
            <p
              className="chamados-category-desc"
              style={{
                fontSize: "12px",
                lineHeight: 1.45,
                color: "#cbd5e1",
                marginBottom: "12px",
                textAlign: "center",
              }}
            >
              Dúvidas, reclamações ou atendimento personalizado, escanei o QrCode, e entre em contato direto com o Analista.
            </p>

            <div
              style={{
                background: "#ffffff",
                padding: "6px",
                borderRadius: "10px",
                boxShadow: "0 6px 20px rgba(0, 0, 0, 0.55), 0 0 16px rgba(34, 197, 94, 0.2)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "10px",
              }}
            >
              <img
                src={whatsSuporteImg}
                alt="QR Code WhatsApp Suporte"
                style={{
                  width: "115px",
                  height: "115px",
                  display: "block",
                  objectFit: "contain",
                  borderRadius: "6px",
                }}
              />
            </div>

            <span
              style={{
                fontSize: "11px",
                color: "#86efac",
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <span>📱</span> Escaneie o QR Code ou clique para abrir
            </span>
          </div>
        </div>

        {/* ====================================================================
            CONTAINER EM DESTAQUE NA TELA DO USUÁRIO: SEUS CHAMADOS CRIADOS
            ==================================================================== */}
        <div className="chamados-client-tickets-container">
          <div className="chamados-client-tickets-header">
            <div className="chamados-client-tickets-title-wrap">
              <span className="chamados-client-tickets-icon">📋</span>
              <div>
                <h3 className="chamados-client-tickets-title">Seus Chamados Criados</h3>
                <p className="chamados-client-tickets-sub">
                  Acompanhe em tempo real suas solicitações, visualize anexos, edite dados ou cancele chamados ativos.
                </p>
              </div>
            </div>
            <div className="chamados-client-tickets-count">
              Total: <strong>{chamados.length}</strong>
            </div>
          </div>

          {chamados.length === 0 ? (
            <div className="chamados-client-empty-box">
              <span style={{ fontSize: "36px", marginBottom: "8px" }}>🎫</span>
              <strong style={{ color: "#fff", fontSize: "15px" }}>Nenhum chamado aberto no momento</strong>
              <p style={{ color: "#a1a1aa", fontSize: "13px", margin: "4px 0 0 0" }}>
                Quando você abrir um chamado em uma das categorias acima, ele aparecerá aqui com o número de protocolo, opções de edição e cancelamento.
              </p>
            </div>
          ) : (
            <div className="chamados-client-grid-cards">
              {chamados.map((c) => (
                <div key={c.id} className="chamados-client-ticket-item">
                  {/* Header do Card */}
                  <div className="chamados-client-item-header">
                    <div className="chamados-client-item-proto-wrap">
                      <span className="chamados-client-item-proto">#{c.id}</span>
                      <span className="chamados-category-badge">{c.categoria || "Geral"}</span>
                    </div>
                    <span className={`chamados-status-badge ${getStatusBadgeClass(c.status)}`}>
                      {c.status}
                    </span>
                  </div>

                  {/* Assunto e Descrição */}
                  <h4 className="chamados-client-item-title">{c.assunto}</h4>
                  <p className="chamados-client-item-desc">{c.descricao}</p>

                  {/* Anexo / Imagem Preview se houver */}
                  {(() => {
                    const anexoItem = getAnexo(c);
                    if (!anexoItem || !anexoItem.data) return null;
                    const ehImg = isImagem(anexoItem);

                    return (
                      <div className="chamados-client-item-anexo-box">
                        {ehImg ? (
                          <div className="chamados-client-anexo-img-row">
                            <div
                              className="chamados-client-anexo-thumb"
                              onClick={() => setImagemModalAberta(anexoItem.data)}
                              title="Clique para ampliar a imagem"
                            >
                              <img src={anexoItem.data} alt={anexoItem.nome} />
                              <span className="chamados-thumb-zoom-overlay">🔍</span>
                            </div>
                            <div className="chamados-client-anexo-info">
                              <span className="chamados-client-anexo-name" title={anexoItem.nome}>
                                📎 {anexoItem.nome}
                              </span>
                              <span className="chamados-client-anexo-size">{anexoItem.tamanho}</span>
                              <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                                <button
                                  type="button"
                                  className="chamados-btn-preview-zoom"
                                  onClick={() => setImagemModalAberta(anexoItem.data)}
                                  style={{ fontSize: "10px", padding: "2px 6px" }}
                                >
                                  🔍 Ver
                                </button>
                                <a
                                  href={anexoItem.data}
                                  download={anexoItem.nome}
                                  className="chamados-btn-preview-download"
                                  style={{ fontSize: "10px", padding: "2px 6px" }}
                                >
                                  ⬇️ Baixar
                                </a>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <a
                            href={anexoItem.data}
                            download={anexoItem.nome}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="chamados-attachment-tag"
                          >
                            📎 Arquivo: {anexoItem.nome} ({anexoItem.tamanho}) — <em>Baixar</em>
                          </a>
                        )}
                      </div>
                    );
                  })()}

                  {/* Solução se Resolvido */}
                  {c.status === "Resolvido" && c.procedimentoExecutado && (
                    <div className="chamados-client-resolved-alert">
                      <strong>✅ Solução Realizada:</strong> {c.procedimentoExecutado}
                    </div>
                  )}

                  {/* Motivo se Cancelado */}
                  {c.status === "Cancelado" && c.motivoCancelamento && (
                    <div className="chamados-client-cancelled-alert">
                      <strong>🚫 Motivo do Cancelamento:</strong> {c.motivoCancelamento}
                    </div>
                  )}

                  {/* Respostas do Suporte se houver */}
                  {c.respostas && c.respostas.length > 0 && (
                    <div className="chamados-resposta-box">
                      <small style={{ color: "#38bdf8", fontWeight: 600 }}>
                        💬 Interações do Atendimento ({c.respostas.length}):
                      </small>
                      {c.respostas.map((r, idx) => (
                        <div key={idx} className="chamados-resposta-item">
                          <strong>{r.autor}</strong> ({r.data}):
                          <div>{r.mensagem}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Footer com Data e Botões: Editar e Cancelar */}
                  <div className="chamados-client-item-footer">
                    <span className="chamados-ticket-date">
                      📅 {c.dataCriacao}
                    </span>
                    <div className="chamados-client-item-actions">
                      {(c.status === "Aberto" || c.status === "Em Atendimento") && (
                        <>
                          <button
                            type="button"
                            className="chamados-btn-edit-ticket"
                            onClick={() => setChatModalChamado(c)}
                            title="Conversar em tempo real com o suporte"
                            style={{ background: "rgba(0, 200, 200, 0.2)", borderColor: "#00c8c8" }}
                          >
                            💬 Abrir Chat
                          </button>
                          <button
                            type="button"
                            className="chamados-btn-edit-ticket"
                            onClick={() => handleAbrirEditarChamado(c)}
                            title="Editar informações do chamado"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            type="button"
                            className="chamados-btn-cancel-ticket"
                            onClick={() => handleSolicitarCancelamento(c)}
                            title="Cancelar este chamado"
                          >
                            🚫 Cancelar
                          </button>
                        </>
                      )}

                      {(c.status === "Resolvido" || c.status === "Cancelado") && (
                        <button
                          type="button"
                          className="chamados-btn-edit-ticket"
                          onClick={() => setChatModalChamado(c)}
                          title="Ver histórico completo da conversa deste chamado"
                          style={{ background: "rgba(0, 200, 200, 0.12)", borderColor: "#00c8c8" }}
                        >
                          💬 Ver Conversa / Histórico
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL: CADASTRAR WHATSAPP ANTES DE ABRIR CHAMADO */}
      {showCadastrarZapModal && (
        <div className="chamados-modal-overlay" onClick={() => setShowCadastrarZapModal(false)}>
          <div className="chamados-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="chamados-modal-title">Atualização Cadastral</h2>
            <div className="chamados-info-box" style={{ marginTop: "14px", marginBottom: "16px" }}>
              📱 <strong>Informe seu WhatsApp:</strong> Para darmos andamento ao seu chamado e fornecer atualizações do atendimento, por favor informe seu número com DDD.
            </div>

            <form onSubmit={handleSalvarWhatsappModal}>
              <div className="chamados-field">
                <label className="chamados-label">Número de WhatsApp (com DDD):</label>
                <input
                  type="tel"
                  className="chamados-input"
                  placeholder="(00) 00000-0000"
                  value={tempWhatsapp}
                  onChange={(e) => setTempWhatsapp(formatWhatsApp(e.target.value))}
                  autoFocus
                  required
                />
              </div>

              <div className="chamados-modal-footer">
                <button
                  type="button"
                  className="chamados-btn-cancelar"
                  onClick={() => setShowCadastrarZapModal(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="chamados-btn-salvar">
                  Salvar e Prosseguir
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ABRIR CHAMADO */}
      {showNovoModal && (
        <div className="chamados-modal-overlay" onClick={() => setShowNovoModal(false)}>
          <div className="chamados-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="chamados-modal-title">Novo Chamado</h2>

            <form onSubmit={handleNovoChamado} style={{ marginTop: "12px" }}>
              <div className="chamados-field-row">
                <div className="chamados-field-col">
                  <label className="chamados-label">Selecione a Categoria:</label>
                  <select
                    className="chamados-select"
                    value={categoria}
                    onChange={(e) => {
                      setCategoria(e.target.value);
                      setAssunto("");
                    }}
                  >
                    {categorias.map((cat, i) => (
                      <option key={i} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="chamados-field-col">
                  <label className="chamados-label">WhatsApp / Telefone:</label>
                  <input
                    type="tel"
                    className="chamados-input"
                    placeholder="(00) 00000-0000"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(formatWhatsApp(e.target.value))}
                    required
                  />
                </div>
              </div>

              {/* Opções de Problemas Frequentes Selecionáveis */}
              {PROBLEMAS_POR_CATEGORIA[categoria] && !assunto.trim() && (
                <div style={{ marginBottom: "10px" }}>
                  <label className="chamados-label">Problemas Frequentes (clique para selecionar):</label>
                  <div className="chamados-quick-chips">
                    {PROBLEMAS_POR_CATEGORIA[categoria].map((prob, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="chamados-chip"
                        onClick={() => handleSelectProblema(prob)}
                      >
                        {prob}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="chamados-field-row">
                <div className="chamados-field-col">
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <label className="chamados-label" style={{ marginBottom: 0 }}>
                      Assunto - Onde está o problema:
                    </label>
                    {assunto.trim() && (
                      <button
                        type="button"
                        onClick={() => setAssunto("")}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "#00c8c8",
                          fontSize: "11px",
                          cursor: "pointer",
                          padding: 0,
                          textDecoration: "underline",
                        }}
                      >
                        Trocar assunto
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    className="chamados-input"
                    placeholder="Ex.: Sem acesso à internet / Dúvida em fatura"
                    value={assunto}
                    onChange={(e) => setAssunto(e.target.value)}
                    required
                  />
                </div>

                <div className="chamados-field-col">
                  <label className="chamados-label">Anexar Arquivo (Foto / Print / PDF - Opcional):</label>
                  <div className="chamados-file-upload-box">
                    {!anexo ? (
                      <label className="chamados-file-btn">
                        <input
                          type="file"
                          accept="image/*,.pdf"
                          className="chamados-file-input-hidden"
                          onChange={handleFileChange}
                        />
                        📎 Anexar arquivo (máx. 5MB)
                      </label>
                    ) : (
                      <div className="chamados-file-preview">
                        <div className="chamados-file-info">
                          <span>📎</span>
                          <strong style={{ maxWidth: "160px", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {anexo.nome}
                          </strong>
                          <small style={{ color: "#a1a1aa" }}>({anexo.tamanho})</small>
                        </div>
                        <button
                          type="button"
                          className="chamados-file-remove"
                          onClick={handleRemoverAnexo}
                          title="Remover anexo"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="chamados-field">
                <label className="chamados-label">Descreva sua dúvida ou problema apresentado:</label>
                <textarea
                  className="chamados-textarea"
                  rows="3"
                  style={{ minHeight: "60px", maxHeight: "100px" }}
                  placeholder="Descreva o problema com o máximo de detalhes..."
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  required
                />
              </div>

              <div className="chamados-modal-footer" style={{ marginTop: "14px" }}>
                <button
                  type="button"
                  className="chamados-btn-cancelar"
                  onClick={() => setShowNovoModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="chamados-btn-salvar"
                >
                  {loading ? "Enviando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MEUS CHAMADOS (HISTÓRICO COMPLETO) */}
      {showMeusModal && (
        <div className="chamados-modal-overlay" onClick={() => setShowMeusModal(false)}>
          <div className="chamados-modal-content wide" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #27272a", paddingBottom: "12px", marginBottom: "16px" }}>
              <h2 className="chamados-modal-title" style={{ margin: 0 }}>
                📋 Meus Chamados
              </h2>
              <button
                type="button"
                className="chamados-detail-modal-close-btn"
                onClick={() => setShowMeusModal(false)}
                title="Fechar"
              >
                ✕
              </button>
            </div>

            {/* Filtros de Status */}
            <div className="chamados-filter-bar">
              {["Todos", "Aberto", "Em Atendimento", "Resolvido", "Cancelado"].map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setFiltroStatus(status)}
                    className={`chamados-filter-tab ${filtroStatus === status ? "active" : ""
                      }`}
                  >
                    {status}
                  </button>
                )
              )}
            </div>

            <div className="chamados-list">
              {chamadosFiltrados.length === 0 ? (
                <div className="chamados-empty-text">Nenhum chamado encontrado.</div>
              ) : (
                chamadosFiltrados.map((c) => (
                  <div key={c.id} className="chamados-ticket-card">
                    <div className="chamados-ticket-header">
                      <div>
                        <span className="chamados-ticket-tag">#{c.id}</span>
                        <span className="chamados-category-badge">{c.categoria || "Geral"}</span>
                      </div>
                      <span
                        className={`chamados-status-badge ${getStatusBadgeClass(
                          c.status
                        )}`}
                      >
                        {c.status}
                      </span>
                    </div>

                    <h4 className="chamados-ticket-title">{c.assunto}</h4>
                    <p className="chamados-ticket-desc">{c.descricao}</p>

                    {(() => {
                      const anexoItem = getAnexo(c);
                      if (!anexoItem || !anexoItem.data) return null;
                      const ehImg = isImagem(anexoItem);

                      return (
                        <div className="chamados-client-item-anexo-box">
                          {ehImg ? (
                            <div className="chamados-client-anexo-img-row">
                              <div
                                className="chamados-client-anexo-thumb"
                                onClick={() => setImagemModalAberta(anexoItem.data)}
                                title="Clique para ampliar"
                              >
                                <img src={anexoItem.data} alt={anexoItem.nome} />
                                <span className="chamados-thumb-zoom-overlay">🔍</span>
                              </div>
                              <div className="chamados-client-anexo-info">
                                <span className="chamados-client-anexo-name" title={anexoItem.nome}>
                                  📎 {anexoItem.nome}
                                </span>
                                <span className="chamados-client-anexo-size">{anexoItem.tamanho}</span>
                                <div style={{ display: "flex", gap: "6px", marginTop: "2px" }}>
                                  <button
                                    type="button"
                                    className="chamados-btn-preview-zoom"
                                    onClick={() => setImagemModalAberta(anexoItem.data)}
                                    style={{ fontSize: "10px", padding: "2px 6px" }}
                                  >
                                    🔍 Ver
                                  </button>
                                  <a
                                    href={anexoItem.data}
                                    download={anexoItem.nome}
                                    className="chamados-btn-preview-download"
                                    style={{ fontSize: "10px", padding: "2px 6px" }}
                                  >
                                    ⬇️ Baixar
                                  </a>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <a
                              href={anexoItem.data}
                              download={anexoItem.nome}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="chamados-attachment-tag"
                            >
                              📎 Anexo: {anexoItem.nome} ({anexoItem.tamanho}) — <em>Visualizar / Baixar</em>
                            </a>
                          )}
                        </div>
                      );
                    })()}

                    {c.status === "Cancelado" && c.motivoCancelamento && (
                      <div
                        style={{
                          backgroundColor: "rgba(239, 68, 68, 0.1)",
                          border: "1px solid rgba(239, 68, 68, 0.3)",
                          borderRadius: "6px",
                          padding: "8px 10px",
                          marginTop: "6px",
                          marginBottom: "8px",
                          fontSize: "12px",
                          color: "#fca5a5",
                        }}
                      >
                        <strong>Motivo do Cancelamento:</strong> {c.motivoCancelamento}
                      </div>
                    )}

                    {c.status === "Resolvido" && c.procedimentoExecutado && (
                      <div
                        style={{
                          backgroundColor: "rgba(34, 197, 94, 0.1)",
                          border: "1px solid rgba(34, 197, 94, 0.3)",
                          borderRadius: "6px",
                          padding: "8px 10px",
                          marginTop: "6px",
                          marginBottom: "8px",
                          fontSize: "12px",
                          color: "#86efac",
                        }}
                      >
                        <strong>Procedimento / Solução Realizada:</strong> {c.procedimentoExecutado}
                      </div>
                    )}

                    <div className="chamados-ticket-footer">
                      <span className="chamados-ticket-date">
                        Criado em: {c.dataCriacao}
                      </span>
                      <div className="chamados-client-item-actions">
                        {(c.status === "Aberto" || c.status === "Em Atendimento") && (
                          <>
                            <button
                              type="button"
                              className="chamados-btn-edit-ticket"
                              onClick={() => {
                                setShowMeusModal(false);
                                setChatModalChamado(c);
                              }}
                              title="Abrir chat ao vivo"
                              style={{ background: "rgba(0, 200, 200, 0.2)", borderColor: "#00c8c8" }}
                            >
                              💬 Abrir Chat
                            </button>
                            <button
                              type="button"
                              className="chamados-btn-edit-ticket"
                              onClick={() => {
                                setShowMeusModal(false);
                                handleAbrirEditarChamado(c);
                              }}
                              title="Editar chamado"
                            >
                              ✏️ Editar
                            </button>
                            <button
                              type="button"
                              className="chamados-btn-cancel-ticket"
                              onClick={() => handleSolicitarCancelamento(c)}
                              title="Cancelar chamado"
                            >
                              🚫 Cancelar
                            </button>
                          </>
                        )}

                        {(c.status === "Resolvido" || c.status === "Cancelado") && (
                          <button
                            type="button"
                            className="chamados-btn-edit-ticket"
                            onClick={() => {
                              setShowMeusModal(false);
                              setChatModalChamado(c);
                            }}
                            title="Ver histórico completo da conversa deste chamado"
                            style={{ background: "rgba(0, 200, 200, 0.12)", borderColor: "#00c8c8" }}
                          >
                            💬 Ver Conversa / Histórico
                          </button>
                        )}
                      </div>
                    </div>

                    {c.respostas && c.respostas.length > 0 && (
                      <div className="chamados-resposta-box">
                        <small style={{ color: "#38bdf8", fontWeight: 600 }}>
                          Histórico do Atendimento:
                        </small>
                        {c.respostas.map((r, idx) => (
                          <div key={idx} className="chamados-resposta-item">
                            <strong>{r.autor}</strong> ({r.data}):
                            <div>{r.mensagem}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            <div className="chamados-modal-footer" style={{ marginTop: "20px" }}>
              <button
                type="button"
                className="chamados-btn-cancelar"
                onClick={() => setShowMeusModal(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR CHAMADO */}
      {chamadoParaEditar && (
        <div className="chamados-modal-overlay" onClick={() => setChamadoParaEditar(null)}>
          <div className="chamados-modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #27272a", paddingBottom: "10px", marginBottom: "14px" }}>
              <h2 className="chamados-modal-title" style={{ margin: 0 }}>
                ✏️ Editar Chamado #{chamadoParaEditar.id}
              </h2>
              <button
                type="button"
                className="chamados-detail-modal-close-btn"
                onClick={() => setChamadoParaEditar(null)}
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSalvarEdicaoChamado}>
              <div className="chamados-field-row">
                <div className="chamados-field-col">
                  <label className="chamados-label">Categoria:</label>
                  <select
                    className="chamados-select"
                    value={editCategoria}
                    onChange={(e) => setEditCategoria(e.target.value)}
                  >
                    {categorias.map((cat, i) => (
                      <option key={i} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="chamados-field-col">
                  <label className="chamados-label">WhatsApp / Telefone:</label>
                  <input
                    type="tel"
                    className="chamados-input"
                    value={editWhatsapp}
                    onChange={(e) => setEditWhatsapp(formatWhatsApp(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div className="chamados-field">
                <label className="chamados-label">Assunto:</label>
                <input
                  type="text"
                  className="chamados-input"
                  value={editAssunto}
                  onChange={(e) => setEditAssunto(e.target.value)}
                  required
                />
              </div>

              <div className="chamados-field">
                <label className="chamados-label">Descrição da Solicitação:</label>
                <textarea
                  className="chamados-textarea"
                  rows="3"
                  style={{ minHeight: "70px", maxHeight: "120px" }}
                  value={editDescricao}
                  onChange={(e) => setEditDescricao(e.target.value)}
                  required
                />
              </div>

              <div className="chamados-field">
                <label className="chamados-label">Anexo / Imagem (Opcional):</label>
                <div className="chamados-file-upload-box">
                  {!editAnexo ? (
                    <label className="chamados-file-btn">
                      <input
                        type="file"
                        accept="image/*,.pdf"
                        className="chamados-file-input-hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          if (file.size > 5 * 1024 * 1024) {
                            toast.warn("O arquivo é muito grande. O tamanho máximo permitido é de 5MB.");
                            return;
                          }
                          const formatSize = (bytes) => {
                            if (bytes < 1024) return `${bytes} B`;
                            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
                            return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
                          };
                          const reader = new FileReader();
                          reader.onload = (loadEvent) => {
                            setEditAnexo({
                              nome: file.name,
                              tamanho: formatSize(file.size),
                              tipo: file.type,
                              data: loadEvent.target.result,
                            });
                          };
                          reader.readAsDataURL(file);
                        }}
                      />
                      📎 Anexar nova imagem ou documento
                    </label>
                  ) : (
                    <div className="chamados-file-preview">
                      <div className="chamados-file-info">
                        <span>📎</span>
                        <strong style={{ maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {editAnexo.nome}
                        </strong>
                        <small style={{ color: "#a1a1aa" }}>({editAnexo.tamanho})</small>
                      </div>
                      <button
                        type="button"
                        className="chamados-file-remove"
                        onClick={() => setEditAnexo(null)}
                        title="Remover anexo"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="chamados-modal-footer" style={{ marginTop: "16px" }}>
                <button
                  type="button"
                  className="chamados-btn-cancelar"
                  onClick={() => setChamadoParaEditar(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="chamados-btn-salvar"
                >
                  {loading ? "Salvando..." : "Salvar Alterações"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: MOTIVO DO CANCELAMENTO DO CHAMADO */}
      {chamadoParaCancelar && (
        <div className="chamados-modal-overlay" onClick={() => setChamadoParaCancelar(null)}>
          <div className="chamados-modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #27272a", paddingBottom: "10px", marginBottom: "14px" }}>
              <h2 className="chamados-modal-title" style={{ color: "#ef4444", margin: 0 }}>
                🚫 Cancelar Chamado #{chamadoParaCancelar.id}
              </h2>
              <button
                type="button"
                className="chamados-detail-modal-close-btn"
                onClick={() => setChamadoParaCancelar(null)}
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <div style={{ marginBottom: "14px", background: "rgba(239, 68, 68, 0.08)", border: "1px solid rgba(239, 68, 68, 0.25)", borderRadius: "8px", padding: "10px 14px" }}>
              <div style={{ color: "#fff", fontSize: "14px", fontWeight: 700, marginBottom: "4px" }}>
                Assunto: {chamadoParaCancelar.assunto}
              </div>
              <div style={{ color: "#d4d4d8", fontSize: "12px" }}>
                Categoria: <strong>{chamadoParaCancelar.categoria || "Geral"}</strong> | Aberto em: {chamadoParaCancelar.dataCriacao}
              </div>
            </div>

            <form onSubmit={handleConfirmarCancelamento}>
              {/* Sugestões de Motivos Rápidos */}
              <div style={{ marginBottom: "10px" }}>
                <label className="chamados-label">
                  Selecione um motivo rápido ou digite abaixo:
                </label>
                <div className="chamados-quick-chips">
                  {[
                    "Problema já foi resolvido",
                    "Abri o chamado por engano",
                    "Não preciso mais do atendimento",
                    "Consegui resolver sozinho",
                    "Outro motivo",
                  ].map((motivoItem, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`chamados-chip ${motivoCancelamento === motivoItem ? "active" : ""}`}
                      onClick={() => setMotivoCancelamento(motivoItem)}
                    >
                      {motivoItem}
                    </button>
                  ))}
                </div>
              </div>

              <div className="chamados-field">
                <label className="chamados-label">
                  * Informe o motivo do cancelamento (Obrigatório):
                </label>
                <textarea
                  className="chamados-textarea"
                  rows="3"
                  style={{ minHeight: "75px", maxHeight: "120px" }}
                  placeholder="Explique por que está cancelando esta solicitação..."
                  value={motivoCancelamento}
                  onChange={(e) => setMotivoCancelamento(e.target.value)}
                  required
                  autoFocus
                />
              </div>

              <p style={{ color: "#a1a1aa", fontSize: "11px", margin: "4px 0 14px 0", lineHeight: "1.4" }}>
                ✉️ Ao confirmar, uma notificação com o comprovante de cancelamento será enviada para o seu e-mail (<strong>{chamadoParaCancelar.clienteEmail || usuario?.email}</strong>).
              </p>

              <div className="chamados-modal-footer">
                <button
                  type="button"
                  className="chamados-btn-cancelar"
                  onClick={() => setChamadoParaCancelar(null)}
                  disabled={loading}
                >
                  Voltar / Não Cancelar
                </button>
                <button
                  type="submit"
                  className="chamados-btn-cancel-ticket"
                  style={{ padding: "10px 18px", fontSize: "13px", fontWeight: "700" }}
                  disabled={loading || !motivoCancelamento.trim()}
                >
                  {loading ? "Processando..." : "🚫 Confirmar Cancelamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL LIGHTBOX: VISUALIZAÇÃO DA IMAGEM EM TAMANHO REAL */}
      {imagemModalAberta && (
        <div
          className="chamados-lightbox-overlay"
          onClick={() => setImagemModalAberta(null)}
        >
          <div className="chamados-lightbox-content" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="chamados-lightbox-close"
              onClick={() => setImagemModalAberta(null)}
              title="Fechar (Esc)"
            >
              ✕
            </button>
            <img
              src={imagemModalAberta}
              alt="Imagem Ampliada do Chamado"
              className="chamados-lightbox-img"
            />
          </div>
        </div>
      )}
      {/* MODAL DE CHAT AO VIVO DO CLIENTE */}
      {chatModalChamado && (
        <ModalChatAtendimento
          chamado={chatModalChamado}
          isCurrentUserAdmin={false}
          onClose={() => setChatModalChamado(null)}
          onUpdateChamado={(atualizado) => {
            setChatModalChamado(atualizado);
            carregarChamados(usuario);
          }}
        />
      )}
    </div>
  );
}
