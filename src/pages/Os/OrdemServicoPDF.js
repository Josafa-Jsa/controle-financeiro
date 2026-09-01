// // import jsPDF from "jspdf";

// // const gerarPDF = (dados, termos) => {
// //   try {
// //     const doc = new jsPDF();

// //     const texto = `
// // JSA, Soluções Tecnológicas

// // Número OS: ${dados.numeroOS}

// // === Dados do Cliente ===
// // Nome: ${dados.cliente.nome}
// // Telefone: ${dados.cliente.telefone}
// // Endereço: ${dados.cliente.endereco}
// // Email: ${dados.cliente.email}
// // CPF/CNPJ: ${dados.cliente.documento}

// // === Equipamento ===
// // Marca: ${dados.equipamento.marca}
// // Modelo: ${dados.equipamento.modelo}
// // Série: ${dados.equipamento.serie}
// // Problema: ${dados.equipamento.problema}

// // === Serviços ===
// // ${dados.servicos}

// // === Peças e Materiais ===
// // ${dados.pecas}

// // === Custos ===
// // ${dados.custos}

// // === Prazos ===
// // Início: ${dados.prazoInicio}
// // Previsão Término: ${dados.prazoFim}

// // === Pagamento ===
// // Forma: ${dados.pagamento}

// // === Técnico ===
// // ${dados.tecnico}

// // === Dados da Empresa ===
// // JSA Soluções Tecnológicas
// // CPF/CNPJ: 049.032.411-81
// // Telefone: (65) 98402-7342
// // Endereço: Rua Benedito Pereira de Oliveira, n. 3879-W Jd. Monte Líbano
// // Email: jsa.tech.jsa@gmail.com

// // === Termos e Condições ===
// // ${termos}

// // Assinatura do Cliente: _______________________

// // Assinatura do Técnico: _______________________
// // `;

// //     doc.setFontSize(10);
// //     const linhas = doc.splitTextToSize(texto, 180); // largura máxima de 180mm
// //     doc.text(linhas, 10, 10);
// //     doc.save(`${dados.numeroOS}.pdf`);
// //   } catch (error) {
// //     console.error("Erro ao gerar PDF:", error);
// //   }
// // };

// // export default gerarPDF;

// // src/pages/Os/OrdemServicoPDF.js
// import jsPDF from "jspdf";
// import { logEvent } from "../../utils/logger";

// function sanitizeFileName(name) {
//   return String(name || "OS")
//     .replace(/[\\/:*?"<>|]+/g, "_")
//     .slice(0, 120);
// }

// const gerarPDF = (dados = {}, termos = "") => {
//   try {
//     const doc = new jsPDF({ unit: "mm", format: "a4" });

//     const empresaBlock = [
//       "JSA Soluções Tecnológicas",
//       "",
//       `Número OS: ${dados?.numeroOS || "-"}`,
//       "",
//       "=== Dados do Cliente ===",
//       `Nome: ${dados?.cliente?.nome || "-"}`,
//       `Telefone: ${dados?.cliente?.telefone || "-"}`,
//       `Endereço: ${dados?.cliente?.endereco || "-"}`,
//       `Email: ${dados?.cliente?.email || "-"}`,
//       `CPF/CNPJ: ${dados?.cliente?.documento || "-"}`,
//       "",
//       "=== Equipamento ===",
//       `Marca: ${dados?.equipamento?.marca || "-"}`,
//       `Modelo: ${dados?.equipamento?.modelo || "-"}`,
//       // `Série: ${dados?.equipamento?.serie || "-"}`,
//       `Problema: ${dados?.equipamento?.problema || "-"}`,
//       "",
//       "=== Serviços ===",
//       String(dados?.servicos || "-"),
//       "",
//       "=== Peças e Materiais ===",
//       String(dados?.pecas || "-"),
//       "",
//       // "=== Custos ===",
//       // String(dados?.custos || "-"),
//       // "",
//       "=== Prazos ===",
//       // `Início: ${dados?.prazoInicio || "-"}`,
//       `Previsão Término: ${dados?.prazoFim || "-"}`,
//       "",
//       "=== Pagamento ===",
//       `Forma: ${dados?.pagamento || "-"}`,
//       "",
//       "=== Técnico ===",
//       String(dados?.tecnico || "-"),
//       "",
//       "=== Dados da Empresa ===",
//       "JSA Soluções Tecnológicas",
//       "CPF/CNPJ: 63.061.124/0001-05",
//       "Telefone: (65) 98402-7342",
//       "Endereço: Rua Benedito Pereira de Oliveira, n. 3879-W Jd. Monte Líbano",
//       "Email: jsa.tech.jsa@gmail.com",
//       "",
//       "=== Termos e Condições ===",
//       String(termos || "-"),
//       "",
//       `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
//     ].join("\n");

//     // layout
//     const marginLeft = 10;
//     const marginTop = 12;
//     const maxWidth = 190; // A4: 210mm width -> 10mm margins
//     const lineHeight = 5.5;
//     const pageHeight = 297;
//     const bottomMargin = 12;
//     let cursorY = marginTop;

//     doc.setFont("helvetica", "normal");
//     doc.setFontSize(12);

//     // título
//     doc.setFontSize(14);
//     doc.text("Ordem de Serviço - JSA", marginLeft, cursorY);
//     cursorY += 8;

//     // corpo
//     doc.setFontSize(10);
//     const lines = doc.splitTextToSize(empresaBlock, maxWidth);

//     lines.forEach((ln) => {
//       if (cursorY + lineHeight > pageHeight - bottomMargin) {
//         doc.addPage();
//         cursorY = marginTop;
//       }
//       doc.text(ln, marginLeft, cursorY);
//       cursorY += lineHeight;
//     });

//     // rodapé simples com número de página
//     const pageCount = doc.getNumberOfPages();
//     for (let i = 1; i <= pageCount; i++) {
//       doc.setPage(i);
//       doc.setFontSize(9);
//       doc.text(`Página ${i} de ${pageCount}`, 210 - marginLeft - 20, 297 - 8);
//     }

//     const fileName = sanitizeFileName(`${dados?.numeroOS || "OS"}.pdf`);
//     doc.save(fileName);

//     // ===== LOG: PDF gerado =====
//     logEvent({
//       type: "os",
//       title: "PDF gerado",
//       details: {
//         numeroOS: dados?.numeroOS || "",
//         cliente: dados?.cliente?.nome || "",
//         tecnico: dados?.tecnico || "",
//         arquivo: fileName,
//       },
//     });
//   } catch (error) {
//     console.error("Erro ao gerar PDF:", error);
//     // log de erro também
//     try {
//       logEvent({
//         type: "os",
//         title: "Erro ao gerar PDF",
//         details: {
//           numeroOS: dados?.numeroOS || "",
//           erro: String(error?.message || error),
//         },
//       });
//     } catch {}
//   }
// };

// export default gerarPDF;



// src/pages/Os/OrdemServicoPDF.js
import jsPDF from "jspdf";
import { logEvent } from "../../utils/logger";

function sanitizeFileName(name) {
  return String(name || "OS")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .slice(0, 120);
}

const gerarPDF = (dados = {}, termos = "") => {
  try {
    const doc = new jsPDF({ unit: "mm", format: "a4" });

    const empresaBlock = [
      "JSA Soluções Tecnológicas",
      "",
      `Número OS: ${dados?.numeroOS || "-"}`,
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
      String(dados?.custos || "-"),
      "",
      "=== Prazos ===",
      `Início: ${dados?.prazoInicio || "-"}`,
      `Previsão Término: ${dados?.prazoFim || "-"}`,
      "",
      "=== Pagamento ===",
      `Forma: ${dados?.pagamento || "-"}`,
      "",
      "=== Técnico ===",
      String(dados?.tecnico || "-"),
      "",
      "=== Dados da Empresa ===",
      "JSA Soluções Tecnológicas",
      "CPF/CNPJ: 63.061.124/0001-05",
      "Telefone: (65) 98402-7342",
      "Endereço: Rua Benedito Pereira de Oliveira, n. 3879-W Jd. Monte Líbano, Tangará da Serra - MT",
      "Email: jsa.tech.jsa@gmail.com",
      "",
      "=== Termos e Condições ===",
      String(termos || "-"),
      "",
      `Gerado em: ${new Date().toLocaleString("pt-BR")}`,
    ].join("\n");

    // Layout
    const marginLeft = 10;
    const marginTop = 12;
    const maxWidth = 190; // A4: 210mm largura - 20mm margens
    const lineHeight = 5.5;
    const pageHeight = 297;
    const bottomMargin = 12;
    let cursorY = marginTop;

    doc.setFont("helvetica", "normal");

    // Título
    doc.setFontSize(14);
    doc.text("Ordem de Serviço - JSA", marginLeft, cursorY);
    cursorY += 8;

    // Corpo
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(empresaBlock, maxWidth);

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
    } catch {}
  }
};

export default gerarPDF;