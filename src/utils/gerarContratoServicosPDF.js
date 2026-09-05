// src/utils/gerarContratoServicosPDF.js
import jsPDF from 'jspdf';
import { montarTextoContrato } from './contratoModeloTexto';
import { logEvent } from './logger';

function sanitizeFileName(name) {
  return String(name || 'Contrato')
    .replace(/[\\/:*?"<>|]+/g, '_')
    .slice(0, 100);
}

export function gerarContratoServicosPDF(dados = {}) {
  try {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });

    const textoCompleto = dados.texto || montarTextoContrato(dados);

    const marginLeft = 14;
    const marginTop = 15;
    const maxWidth = 182; // A4 210mm - 28mm margens
    const lineHeight = 5.2;
    const pageHeight = 297;
    const bottomMargin = 15;
    let cursorY = marginTop;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('CONTRATO DE PRESTAÇÃO DE SERVIÇOS', 105, cursorY, { align: 'center' });
    cursorY += 8;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);

    // Divide em parágrafos e linhas
    const paragrafos = textoCompleto.split('\n');

    paragrafos.forEach((paragrafo) => {
      const pTrim = paragrafo.trim();

      // Linha vazia
      if (!pTrim) {
        cursorY += 3.5;
        if (cursorY > pageHeight - bottomMargin) {
          doc.addPage();
          cursorY = marginTop;
        }
        return;
      }

      // Títulos de Cláusulas ou Seções em Negrito
      const isHeader =
        pTrim.startsWith('CLÁUSULA') ||
        pTrim.startsWith('DAS PARTES') ||
        pTrim.startsWith('CONTRATADA:') ||
        pTrim.startsWith('CONTRATANTE:') ||
        pTrim.startsWith('TESTEMUNHAS:');

      if (isHeader) {
        doc.setFont('helvetica', 'bold');
        if (pTrim.startsWith('CLÁUSULA')) {
          cursorY += 2;
        }
      } else {
        doc.setFont('helvetica', 'normal');
      }

      const linhasQuebradas = doc.splitTextToSize(paragrafo, maxWidth);

      linhasQuebradas.forEach((linha) => {
        if (cursorY + lineHeight > pageHeight - bottomMargin) {
          doc.addPage();
          cursorY = marginTop;
        }
        doc.text(linha, marginLeft, cursorY);
        cursorY += lineHeight;
      });
    });

    // Numeração de páginas no rodapé
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(
        `JSA Soluções Tecnológicas • Contrato de Prestação de Serviços • Página ${i} de ${totalPages}`,
        105,
        297 - 8,
        { align: 'center' }
      );
    }

    const parceiroNome = dados.parceiro || dados.dadosContratante?.razaoSocial || dados.dadosContratante?.nome || 'Cliente';
    const fileName = sanitizeFileName(`Contrato_${parceiroNome}.pdf`);
    doc.save(fileName);

    logEvent({
      type: 'contratos',
      title: 'PDF de Contrato Oficial gerado',
      details: {
        parceiro: parceiroNome,
        arquivo: fileName,
      },
    });

    return true;
  } catch (err) {
    console.error('Erro ao gerar PDF do Contrato:', err);
    throw err;
  }
}

export default gerarContratoServicosPDF;
