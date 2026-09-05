// src/components/Modais/ModalResultadoLocalizacao.jsx
import React, { useEffect } from "react";
import { toast } from "react-toastify";
import "./ModalResultadoLocalizacao.css";

const formatarMoeda = (val) => {
  if (val === null || val === undefined || isNaN(val)) return null;
  return Number(val).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const formatarData = (dStr) => {
  if (!dStr) return "Não informada";
  const str = String(dStr).split("T")[0];
  const partes = str.split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }
  return dStr;
};

export default function ModalResultadoLocalizacao({ item, isOpen, onClose, onNavegar }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const getStatusClass = (statusStr) => {
    if (!statusStr) return "status-pill-aberto";
    const s = String(statusStr).toLowerCase();
    if (s.includes("pago") || s.includes("conclu") || s.includes("emitid") || s.includes("ativo") || s.includes("recebid")) {
      return "status-pill-pago";
    }
    if (s.includes("pendente") || s.includes("aberto") || s.includes("andamento") || s.includes("aguardando")) {
      return "status-pill-pendente";
    }
    if (s.includes("cancel") || s.includes("vencid") || s.includes("excluid") || s.includes("inativo")) {
      return "status-pill-cancelado";
    }
    return "status-pill-pendente";
  };

  const handleCopiarDados = () => {
    let resumo = `=== DETALHES DO REGISTRO (ASSISTENTE JSA) ===\n`;
    resumo += `Tipo: ${item.tipoFormatado || item.tipoEntidade}\n`;
    resumo += `Identificador: ${item.tituloDestaque || item.id}\n`;
    if (item.valorPrincipal) resumo += `Valor: ${formatarMoeda(item.valorPrincipal)}\n`;
    if (item.status) resumo += `Status: ${item.status}\n`;
    if (item.dataRef) resumo += `Data: ${item.dataRef}\n`;
    if (item.detalhes && Array.isArray(item.detalhes)) {
      item.detalhes.forEach((d) => {
        resumo += `${d.label}: ${d.value}\n`;
      });
    }
    if (item.descricao) resumo += `Descrição: ${item.descricao}\n`;

    try {
      navigator.clipboard.writeText(resumo);
      toast.success("📋 Dados copiados para a área de transferência!");
    } catch {
      toast.info("Resumo exibido na tela.");
    }
  };

  return (
    <div className="jsa-modal-busca-overlay" onClick={onClose}>
      <div className="jsa-modal-busca-card" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div className="jsa-modal-busca-header">
          <div className="jsa-modal-busca-title-group">
            <div className="jsa-modal-busca-avatar-icon">
              {item.icone || "🔍"}
            </div>
            <div>
              <h3 className="jsa-modal-busca-title">
                {item.tipoFormatado || "Registro Localizado"}
              </h3>
              <p className="jsa-modal-busca-subtitle">
                Localizado com sucesso pelo Assistente JSA
              </p>
            </div>
          </div>

          <button
            type="button"
            className="jsa-modal-busca-btn-close"
            onClick={onClose}
            title="Fechar Modal (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Corpo */}
        <div className="jsa-modal-busca-body">
          {/* Status Bar */}
          <div className="jsa-modal-busca-status-bar">
            <div className="jsa-modal-busca-type-badge">
              <span>{item.icone || "📌"}</span>
              <span>{item.tipoEntidade || "Módulo do Sistema"}</span>
            </div>
            {item.status && (
              <span className={`jsa-modal-busca-status-pill ${getStatusClass(item.status)}`}>
                {item.status}
              </span>
            )}
          </div>

          {/* Card de Destaque */}
          <div className="jsa-modal-busca-highlight-box">
            <div className="jsa-modal-busca-main-info">
              <h4>{item.tituloDestaque || item.id}</h4>
              <p>{item.subtituloDestaque || item.clienteOuFornecedor || "Registro no Banco de Dados"}</p>
            </div>

            {item.valorPrincipal !== undefined && item.valorPrincipal !== null && (
              <div className="jsa-modal-busca-value-box">
                <div className="jsa-modal-busca-value-label">
                  {item.labelValor || "Valor"}
                </div>
                <div className="jsa-modal-busca-value-amount">
                  {formatarMoeda(item.valorPrincipal)}
                </div>
              </div>
            )}
          </div>

          {/* Grid de Detalhes Específicos */}
          {item.detalhes && Array.isArray(item.detalhes) && item.detalhes.length > 0 && (
            <div className="jsa-modal-busca-grid">
              {item.detalhes.map((det, idx) => (
                <div key={idx} className="jsa-modal-busca-grid-item">
                  <div className="jsa-modal-busca-grid-label">{det.label}</div>
                  <div className={`jsa-modal-busca-grid-value ${det.isChave ? "chave-acesso" : ""}`}>
                    {det.value || "-"}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Descrição / Observações */}
          {item.descricao && (
            <div className="jsa-modal-busca-desc-box">
              <div className="jsa-modal-busca-desc-title">
                📝 Detalhes / Descrição:
              </div>
              <p className="jsa-modal-busca-desc-text">
                {item.descricao}
              </p>
            </div>
          )}
        </div>

        {/* Rodapé de Ações */}
        <div className="jsa-modal-busca-footer">
          <button
            type="button"
            className="jsa-modal-busca-btn-copy"
            onClick={handleCopiarDados}
            title="Copiar dados deste registro"
          >
            <span>📋</span>
            <span>Copiar Dados</span>
          </button>

          {item.rota && (
            <button
              type="button"
              className="jsa-modal-busca-btn-primary"
              onClick={() => {
                onClose();
                if (onNavegar) {
                  onNavegar(item.rota);
                }
              }}
              title="Abrir tela deste módulo"
            >
              <span>👉</span>
              <span>Abrir no Módulo ({item.nomeModulo || "Visualizar"})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
