import React, { useRef, useEffect } from "react";
import { toast } from "react-toastify";
import { jsPDF } from "jspdf";
import { formatCurrencyBRL, formatDateBR } from "../../utils/telegram";
import "../Visual/ModalBoleto.css";

export default function ModalBoleto({
  isOpen,
  onClose,
  boleto,
  onConfirmarPagamento,
  processando = false,
}) {
  const boletoPrintRef = useRef(null);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Escape" && isOpen) onClose?.();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !boleto) return null;

  const handleCopiarLinhaDigitavel = () => {
    if (boleto.linhaDigitavel) {
      navigator.clipboard.writeText(boleto.linhaDigitavel);
      toast.success("Linha digitável copiada com sucesso!");
    }
  };

  const handleCopiarCodigoBarras = () => {
    if (boleto.codigoBarras) {
      navigator.clipboard.writeText(boleto.codigoBarras);
      toast.success("Código de barras copiado com sucesso!");
    }
  };

  const handleGerarPDF = () => {
    try {
      const doc = new jsPDF();

      // Cabeçalho do Banco Cora
      doc.setFillColor(30, 30, 36);
      doc.rect(0, 0, 210, 28, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.setTextColor(255, 255, 255);
      doc.text("BANCO CORA (403-9)", 14, 18);

      doc.setFontSize(11);
      doc.setTextColor(0, 210, 255);
      doc.text("BOLETO DE COBRANÇA BANCÁRIA", 130, 18);

      // Linha Digitável
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(boleto.linhaDigitavel || "", 14, 38);

      // Linha divisória
      doc.setDrawColor(200, 200, 200);
      doc.line(14, 42, 196, 42);

      // Informações da Cobrança
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 116, 139);

      doc.text("Beneficiário:", 14, 50);
      doc.text("CNPJ do Beneficiário:", 14, 58);
      doc.text("Pagador / Cliente:", 14, 66);
      doc.text("Documento (CPF/CNPJ):", 14, 74);
      doc.text("Data de Emissão:", 14, 82);
      doc.text("Data de Vencimento:", 120, 50);
      doc.text("Valor do Documento:", 120, 58);
      doc.text("Status da Fatura:", 120, 66);

      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);

      doc.text(boleto.beneficiario || "JSA Soluções Tecnológicas", 55, 50);
      doc.text(boleto.cnpjBeneficiario || "63.061.124/0001-05", 55, 58);
      doc.text(boleto.cliente || "Cliente", 55, 66);
      doc.text(boleto.documentoCliente || "34052649000178", 55, 74);
      doc.text(boleto.dataEmissao || new Date().toLocaleDateString("pt-BR"), 55, 82);

      doc.setTextColor(220, 38, 38);
      doc.text(boleto.vencimentoFmt || formatDateBR(boleto.vencimento), 160, 50);

      doc.setTextColor(16, 185, 129);
      doc.setFontSize(12);
      doc.text(formatCurrencyBRL(boleto.valor), 160, 58);

      doc.setFontSize(9);
      doc.setTextColor(59, 130, 246);
      doc.text(boleto.status || "EMITIDO (CORA v2)", 160, 66);

      // Caixa de Instruções
      doc.setDrawColor(226, 232, 240);
      doc.setFillColor(248, 250, 252);
      doc.roundedRect(14, 92, 182, 38, 3, 3, "FD");

      doc.setFont("helvetica", "bold");
      doc.setTextColor(30, 41, 59);
      doc.text("Instruções de Pagamento e Encargos:", 18, 100);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(71, 85, 105);
      doc.text("- Pagável em qualquer banco ou via Internet Banking até o vencimento.", 18, 108);
      doc.text(`- ${boleto.jurosMulta || "Multa de R$ 5,00 após vencimento e juros de 3,67% a.m."}`, 18, 116);
      doc.text("- Referência: " + (boleto.descricao || "SYS_Liberação e Manutenção"), 18, 124);

      // Representação do Código de Barras
      doc.setFillColor(15, 23, 42);
      doc.rect(14, 140, 182, 24, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("courier", "bold");
      doc.setFontSize(11);
      doc.text(boleto.codigoBarras || "", 20, 155);

      // Rodapé
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(
        "Boleto gerado via integração direta Banco Cora v2 • JSA Soluções Tecnológicas",
        14,
        175
      );

      doc.save(`Boleto_Cora_${boleto.code || "JSA"}.pdf`);
      toast.success("Download do Boleto PDF iniciado!");
    } catch (err) {
      console.error("Erro ao gerar PDF do boleto:", err);
      toast.error("Erro ao exportar PDF do boleto.");
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-boleto-container"
        onClick={(e) => e.stopPropagation()}
        ref={boletoPrintRef}
      >
        {/* Cabeçalho do Boleto */}
        <div className="boleto-header">
          <div className="boleto-bank-logo">
            <span className="bank-icon">🏦</span>
            <div>
              <h3>Banco Cora</h3>
              <span className="bank-code">Código: 403-9</span>
            </div>
          </div>
          <div className="boleto-doc-title">
            <span>BOLETO BANCÁRIO</span>
            <strong>{formatCurrencyBRL(boleto.valor)}</strong>
          </div>
        </div>

        {/* Linha Digitável */}
        <div className="boleto-linha-digitavel-box">
          <div className="linha-label">Linha Digitável:</div>
          <div className="linha-code">{boleto.linhaDigitavel}</div>
          <button
            type="button"
            className="btn-copiar-linha"
            onClick={handleCopiarLinhaDigitavel}
            title="Copiar Linha Digitável"
          >
            📋 Copiar Linha
          </button>
        </div>

        {/* Grid de Informações */}
        <div className="boleto-grid-info">
          <div className="info-block">
            <span className="info-title">Beneficiário</span>
            <strong className="info-value">{boleto.beneficiario}</strong>
            <span className="info-sub">CNPJ: {boleto.cnpjBeneficiario}</span>
          </div>

          <div className="info-block">
            <span className="info-title">Vencimento</span>
            <strong className="info-value text-danger">
              {boleto.vencimentoFmt || formatDateBR(boleto.vencimento)}
            </strong>
            <span className="info-sub">Emissão: {boleto.dataEmissao}</span>
          </div>

          <div className="info-block">
            <span className="info-title">Pagador / Cliente</span>
            <strong className="info-value">{boleto.cliente}</strong>
            <span className="info-sub">Doc: {boleto.documentoCliente}</span>
          </div>

          <div className="info-block">
            <span className="info-title">Serviço / Referência</span>
            <strong className="info-value">{boleto.descricao}</strong>
            <span className="info-sub">Código: {boleto.code}</span>
          </div>
        </div>

        {/* Instruções */}
        <div className="boleto-instrucoes-box">
          <strong>Instruções do Boleto:</strong>
          <p>• Pagável em qualquer banco ou canais digitais até o vencimento.</p>
          <p>• {boleto.jurosMulta}</p>
          <p>• Liberação imediata e automática do sistema após a confirmação.</p>
        </div>

        {/* Barra de Código de Barras Visual */}
        <div className="boleto-barcode-box">
          <div className="barcode-bars">
            <div className="barcode-numeric">{boleto.codigoBarras}</div>
          </div>
          <button
            type="button"
            className="btn-copiar-barcode"
            onClick={handleCopiarCodigoBarras}
          >
            📋 Copiar Código de Barras
          </button>
        </div>

        {/* Ações do Modal */}
        <div className="boleto-modal-actions">
          <button
            type="button"
            className="btn-imprimir-pdf"
            onClick={handleGerarPDF}
          >
            📥 Baixar / Imprimir PDF
          </button>

          {onConfirmarPagamento && (
            <button
              type="button"
              className="btn-confirmar-boleto-pago"
              onClick={onConfirmarPagamento}
              disabled={processando}
            >
              {processando
                ? "⏳ Confirmando no Banco..."
                : "✅ Confirmar Pagamento do Boleto"}
            </button>
          )}

          <button
            type="button"
            className="btn-fechar-boleto"
            onClick={onClose}
            disabled={processando}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
