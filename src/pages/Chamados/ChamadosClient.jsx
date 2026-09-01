// src/pages/Chamados/ChamadosClient.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import emailjs from "@emailjs/browser";
import { getUser, setUser } from "../../auth/auth";
import { api } from "../../api/client";
import { sendTelegramEvent } from "../../utils/telegram";
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
  const [filtroStatus, setFiltroStatus] = useState("Todos");

  const [categoria, setCategoria] = useState("Suporte Técnico");
  const [whatsapp, setWhatsapp] = useState("");
  const [assunto, setAssunto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [anexo, setAnexo] = useState(null);

  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === "Escape") {
        setShowCadastrarZapModal(false);
        setShowNovoModal(false);
        setShowMeusModal(false);
        setChamadoParaCancelar(null);
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

  const handleSolicitarCancelamento = (chamado) => {
    setChamadoParaCancelar(chamado);
  };

  const handleConfirmarCancelamento = async () => {
    if (!chamadoParaCancelar) return;
    const chamado = chamadoParaCancelar;
    const clienteNome = usuario?.name || usuario?.nome || "O Usuário";

    try {
      const dataCompleta = JSON.parse(localStorage.getItem("chamados_db") || "[]");
      const dataHora = new Date().toLocaleString("pt-BR");

      const atualizados = dataCompleta.map((item) => {
        if (item.id === chamado.id) {
          const historico = item.respostas || [];
          return {
            ...item,
            status: "Cancelado",
            motivoCancelamento: "Cancelado a pedido do cliente",
            canceladoPor: clienteNome,
            dataCancelamento: dataHora,
            respostas: [
              ...historico,
              {
                autor: "Sistema (Cancelamento)",
                mensagem: `Chamado cancelado pelo cliente ${clienteNome} em ${dataHora}.`,
                data: dataHora,
              },
            ],
          };
        }
        return item;
      });

      localStorage.setItem("chamados_db", JSON.stringify(atualizados));
      carregarChamados(usuario);

      try {
        await sendTelegramEvent({
          title: "Chamado Cancelado pelo Cliente",
          emoji: "🚫",
          lines: [
            `Protocolo: #${chamado.id}`,
            `Cliente: ${clienteNome} (${chamado.clienteEmail})`,
            `Status: Cancelado`,
            `Data/Hora: ${dataHora}`,
          ],
        });
      } catch (err) {
        console.error(err);
      }

      toast.info(`O chamado #${chamado.id} foi cancelado.`);
    } catch {
      toast.error("Erro ao cancelar o chamado.");
    } finally {
      setChamadoParaCancelar(null);
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

              {/* Opções de Problemas Frequentes Selecionáveis - Desaparecem após selecionar */}
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

      {/* MODAL: MEUS CHAMADOS */}
      {showMeusModal && (
        <div className="chamados-modal-overlay" onClick={() => setShowMeusModal(false)}>
          <div className="chamados-modal-content wide" onClick={(e) => e.stopPropagation()}>
            <h2 className="chamados-modal-title">Meus Chamados</h2>

            {/* Filtros de Status */}
            <div className="chamados-filter-bar">
              {["Todos", "Aberto", "Em Atendimento", "Resolvido", "Cancelado"].map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => setFiltroStatus(status)}
                    className={`chamados-filter-tab ${
                      filtroStatus === status ? "active" : ""
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
                        <span className="chamados-category-badge">{c.categoria}</span>
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

                    {c.anexo && (
                      <div style={{ marginTop: "6px", marginBottom: "8px" }}>
                        <a
                          href={c.anexo.data}
                          download={c.anexo.nome}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="chamados-attachment-tag"
                        >
                          📎 Anexo: {c.anexo.nome} ({c.anexo.tamanho}) — <em>Visualizar / Baixar</em>
                        </a>
                      </div>
                    )}

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
                      {c.status === "Aberto" && (
                        <button
                          className="chamados-btn-cancel-ticket"
                          onClick={() => handleSolicitarCancelamento(c)}
                        >
                          Cancelar Chamado
                        </button>
                      )}
                    </div>

                    {c.respostas && c.respostas.length > 0 && (
                      <div className="chamados-resposta-box">
                        <small style={{ color: "#a1a1aa" }}>
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

      {/* MODAL: CONFIRMAÇÃO DE CANCELAMENTO DE CHAMADO */}
      {chamadoParaCancelar && (
        <div className="chamados-modal-overlay" onClick={() => setChamadoParaCancelar(null)}>
          <div className="chamados-modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="chamados-modal-title" style={{ color: "#ef4444" }}>
              Cancelar Chamado
            </h2>
            <p style={{ color: "#e4e4e7", fontSize: "14px", margin: "16px 0", lineHeight: "1.5" }}>
              Tem certeza de que deseja cancelar o chamado <strong>#{chamadoParaCancelar.id}</strong> ({chamadoParaCancelar.assunto})?
            </p>
            <div className="chamados-modal-footer">
              <button
                type="button"
                className="chamados-btn-cancelar"
                onClick={() => setChamadoParaCancelar(null)}
              >
                Não, manter
              </button>
              <button
                type="button"
                className="chamados-btn-cancel-ticket"
                style={{ padding: "10px 20px", fontSize: "14px", fontWeight: "600" }}
                onClick={handleConfirmarCancelamento}
              >
                Sim, cancelar chamado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
