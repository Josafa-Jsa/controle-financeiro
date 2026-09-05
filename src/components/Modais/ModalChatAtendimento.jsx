// src/components/Modais/ModalChatAtendimento.jsx
import React, { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { getUser, isAdmin } from "../../auth/auth";
import { api } from "../../api/client";
import { sendTelegramEvent } from "../../utils/telegram";
import "../../components/Visual/chamados.css";

// Som agradável de notificação via Web Audio API (sem depender de arquivos externos)
export function playChatNotificationSound() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    if (ctx.state === "suspended") {
      ctx.resume();
    }
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(659.25, ctx.currentTime); // E5
    osc.frequency.setValueAtTime(880.0, ctx.currentTime + 0.1); // A5

    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Silencia se bloqueado pelo navegador
  }
}

// Emite evento global de chat para sincronizar todas as abas e telas
export function emitChatEvent(payload) {
  try {
    const fullPayload = { ...payload, _t: Date.now() };
    if (typeof BroadcastChannel !== "undefined") {
      const bc = new BroadcastChannel("jsa_chamados_chat");
      bc.postMessage(fullPayload);
      setTimeout(() => bc.close(), 100);
    }
    localStorage.setItem("jsa_chat_last_event", JSON.stringify(fullPayload));
    window.dispatchEvent(new CustomEvent("jsa_chat_event", { detail: fullPayload }));
  } catch (err) {
    console.warn("Aviso ao emitir evento de chat:", err);
  }
}

export default function ModalChatAtendimento({
  chamado,
  isCurrentUserAdmin,
  onClose,
  onMinimize,
  onUpdateChamado,
}) {
  const [mensagemTexto, setMensagemTexto] = useState("");
  const [chamadoAtivo, setChamadoAtivo] = useState(chamado);
  const [enviando, setEnviando] = useState(false);
  const [mostrarContexto, setMostrarContexto] = useState(false);
  const [imagemLightbox, setImagemLightbox] = useState(null);
  const messagesAreaRef = useRef(null);
  const inputRef = useRef(null);
  const isNearBottomRef = useRef(true);
  const initialScrollDoneRef = useRef(false);

  const currentUser = getUser() || {};
  const isUserAdmin =
    isCurrentUserAdmin !== undefined
      ? isCurrentUserAdmin
      : typeof isAdmin === "function"
      ? isAdmin(currentUser)
      : (currentUser?.email || "").toLowerCase().includes("admin") ||
        currentUser?.email === "jsa@jsa.com" ||
        currentUser?.email === "jsa.admin@gmail.com";

  // Trava a rolagem da página de fundo enquanto o modal de chat estiver aberto
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Mantém chamado sincronizado
  useEffect(() => {
    if (chamado) {
      setChamadoAtivo(chamado);
    }
  }, [chamado]);

  // Monitora se o usuário rolou para cima no chat
  const handleScrollMessages = () => {
    if (!messagesAreaRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = messagesAreaRef.current;
    // Se estiver a menos de 70px do final, considera que está acompanhando o fim
    isNearBottomRef.current = scrollHeight - scrollTop - clientHeight < 70;
  };

  // Rola internamente o container de mensagens (SEM rolar a página inteira)
  const scrollToBottom = (force = false) => {
    if (!messagesAreaRef.current) return;
    if (force || isNearBottomRef.current) {
      messagesAreaRef.current.scrollTop = messagesAreaRef.current.scrollHeight;
    }
  };

  // Rola para o final apenas no primeiro carregamento do chat
  useEffect(() => {
    if (!initialScrollDoneRef.current && (chamadoAtivo?.respostas?.length || chamadoAtivo?.mensagens?.length)) {
      initialScrollDoneRef.current = true;
      setTimeout(() => scrollToBottom(true), 60);
    }
  }, [chamadoAtivo?.id]);

  // Foco no input ao abrir
  useEffect(() => {
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  }, []);

  // Listener para mensagens em tempo real da mesma sala de chat
  useEffect(() => {
    let bc;
    const handleMensagemRecebida = (evento) => {
      if (!evento || !evento.chamadoId) return;
      if (String(evento.chamadoId) === String(chamadoAtivo?.id)) {
        // Toca som se a mensagem foi enviada pelo outro lado
        if (
          (isUserAdmin && (evento.isClientSender || !evento.isAdminSender)) ||
          (!isUserAdmin && (evento.isAdminSender || evento.tipo === "INICIAR_ATENDIMENTO"))
        ) {
          playChatNotificationSound();
        }

        // Atualiza a lista de mensagens do chamado ativo
        try {
          const db = JSON.parse(localStorage.getItem("chamados_db") || "[]");
          const atualizado = db.find((c) => String(c.id) === String(chamadoAtivo.id));
          if (atualizado) {
            setChamadoAtivo(atualizado);
            if (onUpdateChamado) onUpdateChamado(atualizado);
          }
        } catch {}
      }
    };

    if (typeof BroadcastChannel !== "undefined") {
      bc = new BroadcastChannel("jsa_chamados_chat");
      bc.onmessage = (e) => handleMensagemRecebida(e.data);
    }

    const handleStorage = (e) => {
      if (e.key === "jsa_chat_last_event" && e.newValue) {
        try {
          const payload = JSON.parse(e.newValue);
          handleMensagemRecebida(payload);
        } catch {}
      }
      if (e.key === "chamados_db" && e.newValue) {
        try {
          const db = JSON.parse(e.newValue);
          const atualizado = db.find((c) => String(c.id) === String(chamadoAtivo?.id));
          if (atualizado) {
            setChamadoAtivo(atualizado);
          }
        } catch {}
      }
    };

    const handleCustomEvent = (e) => {
      if (e.detail) {
        handleMensagemRecebida(e.detail);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("jsa_chat_event", handleCustomEvent);

    // Polling rápido a cada 1.5s para sincronizar mensagens em tempo real entre abas/janelas/servidor
    const interval = setInterval(() => {
      try {
        const db = JSON.parse(localStorage.getItem("chamados_db") || "[]");
        const atualizado = db.find((c) => String(c.id) === String(chamadoAtivo?.id));
        if (
          atualizado &&
          JSON.stringify(atualizado.respostas || atualizado.mensagens || []) !==
            JSON.stringify(chamadoAtivo?.respostas || chamadoAtivo?.mensagens || [])
        ) {
          setChamadoAtivo(atualizado);
          if (onUpdateChamado) onUpdateChamado(atualizado);
        }
      } catch {}

      // Sincroniza periodicamente com o servidor API
      api.get("/chamados")
        .then((resp) => {
          if (Array.isArray(resp.data)) {
            localStorage.setItem("chamados_db", JSON.stringify(resp.data));
            const doServidor = resp.data.find((c) => String(c.id) === String(chamadoAtivo?.id));
            if (
              doServidor &&
              JSON.stringify(doServidor.respostas || doServidor.mensagens || []) !==
                JSON.stringify(chamadoAtivo?.respostas || chamadoAtivo?.mensagens || [])
            ) {
              setChamadoAtivo(doServidor);
              if (onUpdateChamado) onUpdateChamado(doServidor);
            }
          }
        })
        .catch(() => {});
    }, 1500);

    return () => {
      if (bc) bc.close();
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("jsa_chat_event", handleCustomEvent);
      clearInterval(interval);
    };
  }, [chamadoAtivo?.id]);

  // Enviar Mensagem
  const handleEnviarMensagem = async (e) => {
    if (e) e.preventDefault();
    const texto = mensagemTexto.trim();
    if (!texto || enviando || !chamadoAtivo) return;

    setEnviando(true);
    const dataHora = new Date().toLocaleString("pt-BR");
    const autorNome = isUserAdmin
      ? `Suporte JSA (${currentUser?.name || currentUser?.nome || "Técnico"})`
      : currentUser?.name || currentUser?.nome || "Cliente";

    const novaResposta = {
      autor: autorNome,
      mensagem: texto,
      data: dataHora,
      isAdmin: isUserAdmin,
      timestamp: Date.now(),
    };

    try {
      const db = JSON.parse(localStorage.getItem("chamados_db") || "[]");
      let chamadoSalvo = null;

      const atualizados = db.map((c) => {
        if (String(c.id) === String(chamadoAtivo.id)) {
          const historico = c.respostas || c.mensagens || [];
          const novoStatus = c.status === "Aberto" ? "Em Atendimento" : c.status;
          chamadoSalvo = {
            ...c,
            status: novoStatus,
            respostas: [...historico, novaResposta],
          };
          return chamadoSalvo;
        }
        return c;
      });

      if (!chamadoSalvo) {
        const historico = chamadoAtivo.respostas || chamadoAtivo.mensagens || [];
        chamadoSalvo = {
          ...chamadoAtivo,
          status: chamadoAtivo.status === "Aberto" ? "Em Atendimento" : chamadoAtivo.status,
          respostas: [...historico, novaResposta],
        };
        atualizados.push(chamadoSalvo);
      }

      localStorage.setItem("chamados_db", JSON.stringify(atualizados));
      setChamadoAtivo(chamadoSalvo);
      if (onUpdateChamado) onUpdateChamado(chamadoSalvo);

      // Sincroniza via API no backend
      api.put(`/chamados/${chamadoAtivo.id}`, {
        status: chamadoSalvo.status,
        mensagens: chamadoSalvo.respostas,
      }).catch((err) => console.warn("Aviso ao sincronizar mensagem via API:", err.message));

      // Emite evento para que a outra parte receba instantaneamente
      emitChatEvent({
        tipo: "NOVA_MENSAGEM",
        chamadoId: chamadoAtivo.id,
        clienteEmail: (chamadoAtivo.clienteEmail || "").toLowerCase(),
        autor: autorNome,
        mensagem: texto,
        data: dataHora,
        isAdminSender: isUserAdmin,
        isClientSender: !isUserAdmin,
        timestamp: Date.now(),
      });

      // Notifica no Telegram se for mensagem do cliente para o suporte
      if (!isUserAdmin) {
        sendTelegramEvent({
          title: "Nova Mensagem do Cliente no Chat",
          emoji: "💬",
          lines: [
            `Protocolo: #${chamadoAtivo.id}`,
            `Cliente: ${autorNome} (${chamadoAtivo.clienteEmail})`,
            `Mensagem: ${texto}`,
          ],
        }).catch(() => {});
      }

      setMensagemTexto("");
      scrollToBottom(true);
    } catch (err) {
      console.error("Erro ao enviar mensagem no chat:", err);
      toast.error("Erro ao enviar mensagem.");
    } finally {
      setEnviando(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const respostas = chamadoAtivo?.respostas || chamadoAtivo?.mensagens || [];

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

  // Determina classes e cores de status
  const getStatusBadgeInfo = (status) => {
    switch (status) {
      case "Aberto":
        return {
          badgeClass: "chamados-status-aberto",
          dotColor: "#f59e0b",
          dotClass: "dot-aberto",
          label: "Aberto",
        };
      case "Em Atendimento":
        return {
          badgeClass: "chamados-status-atendimento",
          dotColor: "#22c55e",
          dotClass: "dot-atendimento",
          label: "Em Atendimento",
        };
      case "Resolvido":
        return {
          badgeClass: "chamados-status-resolvido",
          dotColor: "#22c55e",
          dotClass: "dot-resolvido",
          label: "Resolvido",
        };
      case "Cancelado":
        return {
          badgeClass: "chamados-status-cancelado",
          dotColor: "#ef4444",
          dotClass: "dot-cancelado",
          label: "Cancelado",
        };
      default:
        return {
          badgeClass: "chamados-status-atendimento",
          dotColor: "#00c8c8",
          dotClass: "",
          label: status || "Atendimento",
        };
    }
  };

  const statusInfo = getStatusBadgeInfo(chamadoAtivo?.status);
  const isFinalizado =
    chamadoAtivo?.status === "Resolvido" || chamadoAtivo?.status === "Cancelado";

  return (
    <div className="chamados-chat-modal-overlay" onClick={onClose}>
      <div
        className="chamados-chat-modal-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* CABEÇALHO DO CHAT */}
        <div className="chamados-chat-header">
          <div className="chamados-chat-header-info">
            <div
              className="chamados-chat-status-dot"
              style={{
                backgroundColor: statusInfo.dotColor,
                boxShadow: `0 0 10px ${statusInfo.dotColor}`,
                animation:
                  chamadoAtivo?.status === "Em Atendimento"
                    ? "pulseGreen 1.8s infinite"
                    : "none",
              }}
              title={`Status: ${statusInfo.label}`}
            />
            <div>
              <div className="chamados-chat-title-row">
                <h3 className="chamados-chat-title">
                  🎧 Chamado #{chamadoAtivo?.id}
                </h3>
                <span className="chamados-category-badge">
                  {chamadoAtivo?.categoria || "Suporte"}
                </span>
                <span className={`chamados-status-badge ${statusInfo.badgeClass}`}>
                  {statusInfo.label}
                </span>
              </div>
              <div className="chamados-chat-subinfo">
                {isUserAdmin ? (
                  <span>
                    👤 Cliente: <strong>{chamadoAtivo?.clienteNome || "Usuário"}</strong> (
                    {chamadoAtivo?.clienteEmail || "-"})
                  </span>
                ) : (
                  <span>
                    👨‍💼 Atendimento: <strong>Suporte Técnico JSA</strong>
                    {isFinalizado ? " (Atendimento Encerrado)" : " (Analista Online)"}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="chamados-chat-header-actions">
            <button
              type="button"
              className="chamados-chat-btn-header"
              onClick={() => setMostrarContexto(!mostrarContexto)}
              title="Ver detalhes da solicitação inicial"
            >
              {mostrarContexto ? "Ocultar Detalhes ▲" : "Ver Detalhes ▼"}
            </button>
            {onMinimize && (
              <button
                type="button"
                className="chamados-chat-btn-header"
                onClick={onMinimize}
                title="Minimizar chat para botão flutuante"
              >
                _
              </button>
            )}
            <button
              type="button"
              className="chamados-chat-btn-close"
              onClick={onClose}
              title="Fechar chat"
            >
              ✕
            </button>
          </div>
        </div>

        {/* BARRA RECOLHÍVEL: DETALHES DA SOLICITAÇÃO INICIAL DO CHAMADO */}
        {mostrarContexto && (
          <div className="chamados-chat-context-box">
            <div style={{ color: "#38bdf8", fontWeight: 700, fontSize: "13px", marginBottom: "4px" }}>
              Assunto: {chamadoAtivo?.assunto}
            </div>
            <div style={{ color: "#d4d4d8", fontSize: "12px", lineHeight: "1.4", whiteSpace: "pre-wrap" }}>
              {chamadoAtivo?.descricao}
            </div>
            {(() => {
              const anexoContext = getAnexo(chamadoAtivo);
              if (!anexoContext || !anexoContext.data) return null;
              const ehImg = isImagem(anexoContext);

              return (
                <div style={{ marginTop: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
                  {ehImg ? (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        background: "#09090b",
                        padding: "4px 8px",
                        borderRadius: "6px",
                        border: "1px solid #27272a",
                        cursor: "pointer",
                      }}
                      onClick={() => setImagemLightbox(anexoContext.data)}
                    >
                      <img
                        src={anexoContext.data}
                        alt="Anexo do Chamado"
                        style={{ width: "36px", height: "26px", objectFit: "cover", borderRadius: "4px" }}
                      />
                      <span style={{ fontSize: "11px", color: "#00c8c8" }}>
                        🔍 Ver imagem anexada ({anexoContext.tamanho})
                      </span>
                    </div>
                  ) : (
                    <a
                      href={anexoContext.data}
                      download={anexoContext.nome}
                      className="chamados-attachment-tag"
                      style={{ fontSize: "11px" }}
                    >
                      📎 Anexo: {anexoContext.nome}
                    </a>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ÁREA DE MENSAGENS / CONVERSA */}
        <div
          ref={messagesAreaRef}
          onScroll={handleScrollMessages}
          className="chamados-chat-messages-area"
        >
          {/* Mensagem Inicial do Sistema */}
          <div className="chamados-chat-system-badge">
            <span>🎫</span> Chamado #{chamadoAtivo?.id} aberto em {chamadoAtivo?.dataCriacao || "recente"}.
          </div>

          {respostas.length === 0 ? (
            <div className="chamados-chat-empty-hint">
              <span>💬</span>
              <p>Nenhuma mensagem trocada ainda. Inicie a conversa abaixo!</p>
            </div>
          ) : (
            respostas.map((r, idx) => {
              // Determina se a mensagem foi enviada pelo usuário local ou pelo outro lado
              const isMine = isUserAdmin
                ? r.isAdmin || String(r.autor).includes("Suporte") || String(r.autor).includes("Admin")
                : !r.isAdmin && !String(r.autor).includes("Suporte") && !String(r.autor).includes("Admin") && !String(r.autor).includes("Sistema");

              const isSystem = String(r.autor).includes("Sistema") || String(r.mensagem).startsWith("✅") || String(r.mensagem).startsWith("🚫");

              if (isSystem) {
                return (
                  <div key={idx} className="chamados-chat-system-badge">
                    <span>⚙️</span> {r.mensagem} <small>({r.data})</small>
                  </div>
                );
              }

              return (
                <div
                  key={idx}
                  className={`chamados-chat-bubble-row ${isMine ? "mine" : "theirs"}`}
                >
                  <div className={`chamados-chat-bubble ${isMine ? "bubble-mine" : "bubble-theirs"}`}>
                    <div className="chamados-chat-bubble-header">
                      <span className="chamados-chat-bubble-author">
                        {isMine ? "Você" : r.autor}
                      </span>
                      <span className="chamados-chat-bubble-time">{r.data}</span>
                    </div>
                    <div className="chamados-chat-bubble-text">{r.mensagem}</div>
                  </div>
                </div>
              );
            })
          )}

          {/* BANNER DE FINALIZAÇÃO OU CANCELAMENTO DO CHAMADO */}
          {chamadoAtivo?.status === "Resolvido" && (
            <div className="chamados-chat-archived-banner resolved">
              <div style={{ color: "#22c55e", fontWeight: 700, fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>✅</span> Chamado Finalizado / Resolvido
              </div>
              <div style={{ color: "#dcfce7", fontSize: "12px", marginTop: "4px" }}>
                <strong>Procedimento Executado:</strong> {chamadoAtivo?.procedimentoExecutado || "Procedimento registrado pela equipe técnica."}
              </div>
              <div style={{ color: "#86efac", fontSize: "11px", marginTop: "4px" }}>
                {chamadoAtivo?.tecnicoResponsavel && <span>Técnico: <strong>{chamadoAtivo.tecnicoResponsavel}</strong> | </span>}
                {chamadoAtivo?.dataFinalizacao && <span>Data: {chamadoAtivo.dataFinalizacao}</span>}
              </div>
            </div>
          )}

          {chamadoAtivo?.status === "Cancelado" && (
            <div className="chamados-chat-archived-banner cancelled">
              <div style={{ color: "#ef4444", fontWeight: 700, fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
                <span>🚫</span> Chamado Cancelado
              </div>
              <div style={{ color: "#fee2e2", fontSize: "12px", marginTop: "4px" }}>
                <strong>Motivo:</strong> {chamadoAtivo?.motivoCancelamento || "Cancelado pelo usuário."}
              </div>
              <div style={{ color: "#fca5a5", fontSize: "11px", marginTop: "4px" }}>
                {chamadoAtivo?.canceladoPor && <span>Cancelado por: <strong>{chamadoAtivo.canceladoPor}</strong> | </span>}
                {chamadoAtivo?.dataCancelamento && <span>Data: {chamadoAtivo.dataCancelamento}</span>}
              </div>
            </div>
          )}
        </div>

        {/* BARRA INFERIOR: SE FINALIZADO MOSTRA AVISO DE HISTÓRICO PRESERVADO, SENÃO MOSTRA INPUT */}
        {isFinalizado ? (
          <div className="chamados-chat-footer-closed">
            <span>🔒</span>
            <span>
              Este chamado está <strong>{chamadoAtivo?.status}</strong>. O histórico da conversa e todas as informações foram preservados para futuras consultas.
            </span>
          </div>
        ) : (
          <form onSubmit={handleEnviarMensagem} className="chamados-chat-input-bar">
            <input
              ref={inputRef}
              type="text"
              className="chamados-chat-input"
              placeholder="Digite sua mensagem e pressione Enter..."
              value={mensagemTexto}
              onChange={(e) => setMensagemTexto(e.target.value)}
              disabled={enviando}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleEnviarMensagem();
                }
              }}
            />
            <button
              type="submit"
              className="chamados-chat-btn-send"
              disabled={enviando || !mensagemTexto.trim()}
            >
              {enviando ? "..." : "➤ Enviar"}
            </button>
          </form>
        )}

        {/* LIGHTBOX DE IMAGEM */}
        {imagemLightbox && (
          <div
            className="chamados-lightbox-overlay"
            onClick={() => setImagemLightbox(null)}
            style={{ zIndex: 100010 }}
          >
            <div className="chamados-lightbox-content" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="chamados-lightbox-close"
                onClick={() => setImagemLightbox(null)}
              >
                ✕
              </button>
              <img
                src={imagemLightbox}
                alt="Imagem Ampliada"
                className="chamados-lightbox-img"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
