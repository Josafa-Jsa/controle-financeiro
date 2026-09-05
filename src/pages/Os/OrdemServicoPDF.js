// src/pages/Os/OrdemServicoPDF.js
import jsPDF from "jspdf";
import { logEvent } from "../../utils/logger";
import logoJSA from "../../assets/JSA.png";

let cachedLogoImage = null;

function getLogoImage() {
  return new Promise((resolve) => {
    if (cachedLogoImage && cachedLogoImage.complete && cachedLogoImage.naturalWidth > 0) {
      return resolve(cachedLogoImage);
    }
    if (typeof window === "undefined") {
      return resolve(null);
    }
    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        cachedLogoImage = img;
        resolve(img);
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = logoJSA;
    } catch {
      resolve(null);
    }
  });
}

// Pré-carrega no navegador para resposta instantânea ao clicar
if (typeof window !== "undefined") {
  getLogoImage();
}

function sanitizeFileName(name) {
  return String(name || "OS")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .slice(0, 120);
}

const gerarPDF = async (dados = {}, termos = "") => {
  try {
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    const termoFinal = dados?.termoCondicoes || termos || "";
    const formaPagamentoTexto = dados?.formaPagamento || dados?.pagamento || "-";
    const valorPagamentoTexto = dados?.valorPagamento ? `R$ ${dados.valorPagamento}` : (dados?.custos || "-");

    // Layout
    const marginLeft = 10;
    const marginTop = 12;
    const maxWidth = 190; // A4: 210mm largura - 20mm margens
    const lineHeight = 5.5;
    const pageHeight = 297;
    const bottomMargin = 12;
    let cursorY = marginTop;

    // Título
    // doc.setFont("helvetica", "bold");
    // doc.setFontSize(14);
    // doc.text("Ordem de Serviço - JSA", marginLeft, cursorY);
    // cursorY += 6;

    // Cabeçalho da Empresa: Imagem JSA à esquerda + Dados da Empresa ao lado
    const logoWidth = 28;
    const logoHeight = 18.5; // proporção compatível com a imagem (~1.5)
    const headerStartY = cursorY;

    // Carrega/Recupera a imagem do logo
    const logoImg = await getLogoImage();
    if (logoImg) {
      try {
        doc.addImage(logoImg, "PNG", marginLeft, headerStartY, logoWidth, logoHeight);
      } catch (errImg) {
        console.warn("Aviso ao adicionar imagem no PDF:", errImg);
      }
    }

    // Informações da Empresa alinhadas ao lado direito da logo
    const textX = marginLeft + logoWidth + 4; // 10 + 28 + 4 = 42mm
    let infoY = headerStartY + 3.2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("JSA Soluções Tecnológicas", textX, infoY);
    infoY += 3.8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("CPF/CNPJ: 63.061.124/0001-05", textX, infoY);
    infoY += 3.5;
    doc.text("Telefone: (65) 98402-7342", textX, infoY);
    infoY += 3.5;
    doc.text("Endereço: Rua Benedito Pereira de Oliveira, n. 3879-W Jd. Monte Líbano, Tangará da Serra - MT", textX, infoY);
    infoY += 3.5;
    doc.text("Email: jsa.tech.jsa@gmail.com", textX, infoY);

    cursorY = Math.max(headerStartY + logoHeight, infoY) + 3;

    // Linha divisória sutil
    doc.setDrawColor(180, 180, 195);
    doc.setLineWidth(0.3);
    doc.line(marginLeft, cursorY, marginLeft + maxWidth, cursorY);
    cursorY += 4.5;

    // Corpo da Ordem de Serviço
    const corpoBlock = [
      `N°: ${dados?.numeroOS || "-"}`,
      "",
      "=== Dados do Cliente ===",
      `Nome: ${dados?.cliente?.nome || "-"}`,
      `Telefone: ${dados?.cliente?.telefone || "-"}`,
      `Endereço: ${dados?.cliente?.endereco || "-"}`,
      `Email: ${dados?.cliente?.email || "-"}`,
      `CPF/CNPJ: ${dados?.cliente?.documento || "-"}`,
      "",
      "=== Equipamento ===",
      `Marca: ${dados?.equipamento?.marca || "-"}`,
      `Modelo: ${dados?.equipamento?.modelo || "-"}`,
      `Série: ${dados?.equipamento?.serie || "-"}`,
      `Problema: ${dados?.equipamento?.problema || "-"}`,
      "",
      "=== Serviços ===",
      String(dados?.servicos || "-"),
      "",
      "=== Peças e Materiais ===",
      String(dados?.pecas || "-"),
      "",
      "=== Custos ===",
      String(valorPagamentoTexto),
      "",
      "=== Prazos ===",
      `Início: ${dados?.prazoInicio || "-"}`,
      `Previsão Término: ${dados?.prazoFim || "-"}`,
      "",
      "=== Pagamento ===",
      `Forma: ${formaPagamentoTexto}`,
      "",
      "=== Técnico ===",
      String(dados?.tecnico || "-"),
      "",
      "=== Termos e Condições ===",
      String(termoFinal || "-"),
      "",
      `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    ].join("\n");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(corpoBlock, maxWidth);

    lines.forEach((ln) => {
      if (cursorY + lineHeight > pageHeight - bottomMargin) {
        doc.addPage();
        cursorY = marginTop;
      }
      doc.text(ln, marginLeft, cursorY);
      cursorY += lineHeight;
    });

    // Rodapé com paginação
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.text(`Página ${i} de ${pageCount}`, 210 - marginLeft - 20, 297 - 8);
    }

    const fileName = sanitizeFileName(`${dados?.numeroOS || "OS"}.pdf`);
    doc.save(fileName);

    // LOG: PDF gerado
    logEvent({
      type: "os",
      title: "PDF gerado",
      details: {
        numeroOS: dados?.numeroOS || "",
        cliente: dados?.cliente?.nome || "",
        tecnico: dados?.tecnico || "",
        arquivo: fileName,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    try {
      logEvent({
        type: "os",
        title: "Erro ao gerar PDF",
        details: {
          numeroOS: dados?.numeroOS || "",
          erro: String(error?.message || error),
        },
      });
    } catch { }
  }
};

export default gerarPDF;