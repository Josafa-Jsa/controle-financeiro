// src/utils/gerarRelatorioUniformesPDF.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Helper para formatação de números em padrão pt-BR
function formatarQtd(val) {
  const n = Number(val) || 0;
  return `${n.toLocaleString('pt-BR')} un`;
}

/**
 * Gera o documento jsPDF com o relatório completo de uniformes por departamento,
 * com tipografia adaptável, legível e livre de artefatos de encoding/emojis.
 */
export function construirDocumentoRelatorioUniformes(dadosRelatorio) {
  const {
    linhasDepartamentos = [],
    totais = {},
    departamentoFiltro = 'Todos',
    responsavel = 'Operador do Sistema',
  } = dadosRelatorio || {};

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  let currentY = 12;

  // 1. Cabeçalho Oficial
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.roundedRect(margin, currentY, contentWidth, 22, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text('BIG MASTER SUPERMERCADOS • GESTÃO DE PATRIMÔNIO', margin + 6, currentY + 7.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(148, 163, 184);
  doc.text('RELATÓRIO CONSOLIDADO DE UNIFORMES POR DEPARTAMENTO', margin + 6, currentY + 13.5);
  doc.text('Estoque Anterior • Entregas • Descartes • Novos • Usados • Saldo Atual', margin + 6, currentY + 18);

  const dataAtual = new Date().toLocaleString('pt-BR');
  doc.setFontSize(8);
  doc.setTextColor(226, 232, 240);
  doc.text(`Emissão: ${dataAtual}`, pageWidth - margin - 6, currentY + 9, { align: 'right' });
  doc.text(`Resp: ${responsavel}`, pageWidth - margin - 6, currentY + 15, { align: 'right' });

  currentY += 28;

  // 2. Título da Seção
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('POSIÇÃO DE ESTOQUE & MOVIMENTAÇÃO DE UNIFORMES', pageWidth / 2, currentY, { align: 'center' });
  currentY += 5.5;

  if (departamentoFiltro && departamentoFiltro !== 'Todos') {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(71, 85, 105);
    doc.text(`Departamento Selecionado: ${departamentoFiltro}`, pageWidth / 2, currentY, { align: 'center' });
    currentY += 5.5;
  }

  // 3. Mini Cards de Totais (Sem Emojis para Evitar Caracteres Corrompidos / Garbled UTF-8)
  // Largura confortável de ~59mm para cada card, em 2 linhas de 3 cards
  const cardW = (contentWidth - 6) / 3;
  const cardH = 15;

  const kpisLinha1 = [
    { label: 'ESTOQUE ANTERIOR', val: formatarQtd(totais.estoqueAnterior), bg: [241, 245, 249], border: [203, 213, 225], text: [30, 41, 59] },
    { label: 'ENTREGUES (-)', val: formatarQtd(totais.entregues), bg: [236, 253, 245], border: [167, 243, 208], text: [5, 150, 105] },
    { label: 'DESCARTADOS (-)', val: formatarQtd(totais.descartados), bg: [254, 242, 242], border: [254, 202, 202], text: [220, 38, 38] },
  ];

  const kpisLinha2 = [
    { label: 'NOVOS (ATUAL)', val: formatarQtd(totais.novos), bg: [240, 249, 255], border: [186, 230, 253], text: [2, 132, 199] },
    { label: 'USADOS (ATUAL)', val: formatarQtd(totais.usados), bg: [255, 251, 235], border: [253, 230, 138], text: [217, 119, 6] },
    { label: 'SALDO ATUAL EM LOJA', val: formatarQtd(totais.estoqueAtual), bg: [245, 243, 255], border: [221, 214, 254], text: [109, 40, 217] },
  ];

  // Renderiza Linha 1 de KPIs
  kpisLinha1.forEach((kpi, idx) => {
    const x = margin + idx * (cardW + 3);
    doc.setFillColor(...kpi.bg);
    doc.setDrawColor(...kpi.border);
    doc.roundedRect(x, currentY, cardW, cardH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + cardW / 2, currentY + 5.2, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...kpi.text);
    doc.text(kpi.val, x + cardW / 2, currentY + 11.5, { align: 'center' });
  });

  currentY += cardH + 3;

  // Renderiza Linha 2 de KPIs
  kpisLinha2.forEach((kpi, idx) => {
    const x = margin + idx * (cardW + 3);
    doc.setFillColor(...kpi.bg);
    doc.setDrawColor(...kpi.border);
    doc.roundedRect(x, currentY, cardW, cardH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + cardW / 2, currentY + 5.2, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...kpi.text);
    doc.text(kpi.val, x + cardW / 2, currentY + 11.5, { align: 'center' });
  });

  currentY += cardH + 7;

  // 4. Tabela de Departamentos com Cabeçalhos Inteligentes (Sem Quebra de Palavras Indevida)
  // Larguras calculadas para somar exatamente 186mm (contentWidth)
  const colWidths = {
    dep: 46,
    ant: 23,
    ent: 23,
    desc: 24, // 24mm permite que 'DESCARTES' caiba sem quebra de palavra
    nov: 23,
    usd: 23,
    atu: 24,
  };

  const tableBody = linhasDepartamentos.map((l) => [
    l.departamento,
    formatarQtd(l.estoqueAnterior),
    l.entregues > 0 ? formatarQtd(l.entregues) : '-',
    l.descartados > 0 ? formatarQtd(l.descartados) : '-',
    l.novos > 0 ? formatarQtd(l.novos) : '-',
    l.usados > 0 ? formatarQtd(l.usados) : '-',
    formatarQtd(l.estoqueAtual),
  ]);

  const tableFoot = [
    [
      `TOTAL GERAL (${linhasDepartamentos.length} Setores)`,
      formatarQtd(totais.estoqueAnterior),
      formatarQtd(totais.entregues),
      formatarQtd(totais.descartados),
      formatarQtd(totais.novos),
      formatarQtd(totais.usados),
      formatarQtd(totais.estoqueAtual),
    ],
  ];

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [
      [
        { content: 'DEPARTAMENTO', styles: { halign: 'left', fillColor: [30, 41, 59] } },
        { content: 'ESTOQUE\nANTERIOR', styles: { halign: 'center', fillColor: [30, 41, 59] } },
        { content: 'ENTREGUES\n(-)', styles: { halign: 'center', fillColor: [5, 150, 105] } },
        { content: 'DESCARTES\n(-)', styles: { halign: 'center', fillColor: [185, 28, 28] } },
        { content: 'NOVOS\n(ATUAL)', styles: { halign: 'center', fillColor: [2, 132, 199] } },
        { content: 'USADOS\n(ATUAL)', styles: { halign: 'center', fillColor: [217, 119, 6] } },
        { content: 'ESTOQUE\nATUAL', styles: { halign: 'center', fillColor: [109, 40, 217] } },
      ],
    ],
    body: tableBody,
    foot: tableFoot,
    styles: {
      font: 'helvetica',
      fontSize: 8.5,
      cellPadding: { top: 3.2, bottom: 3.2, left: 2, right: 2 },
      textColor: [30, 41, 59],
      valign: 'middle',
      overflow: 'linebreak',
      lineWidth: 0.15,
      lineColor: [203, 213, 225],
    },
    headStyles: {
      font: 'helvetica',
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.5,
      halign: 'center',
      valign: 'middle',
      cellPadding: { top: 3, bottom: 3, left: 1, right: 1 },
    },
    columnStyles: {
      0: { cellWidth: colWidths.dep, halign: 'left', fontStyle: 'bold', textColor: [15, 23, 42] },
      1: { cellWidth: colWidths.ant, halign: 'center', fontStyle: 'bold', textColor: [71, 85, 105] },
      2: { cellWidth: colWidths.ent, halign: 'center', textColor: [5, 150, 105], fontStyle: 'bold' },
      3: { cellWidth: colWidths.desc, halign: 'center', textColor: [220, 38, 38], fontStyle: 'bold' },
      4: { cellWidth: colWidths.nov, halign: 'center', textColor: [2, 132, 199], fontStyle: 'bold' },
      5: { cellWidth: colWidths.usd, halign: 'center', textColor: [217, 119, 6], fontStyle: 'bold' },
      6: { cellWidth: colWidths.atu, halign: 'center', textColor: [109, 40, 217], fontStyle: 'bold' },
    },
    footStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'center',
      cellPadding: { top: 3.5, bottom: 3.5, left: 1.5, right: 1.5 },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  currentY = doc.lastAutoTable.finalY + 8;

  // 5. Bloco de Assinaturas e Observações (garantindo que caiba perfeitamente na página)
  if (currentY + 34 > pageHeight - margin) {
    doc.addPage();
    currentY = 16;
  }

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    '* Observação: O Estoque Anterior é composto pelo Saldo Atual somado ao total de uniformes Entregues e Descartados.',
    margin,
    currentY
  );
  currentY += 8;

  // Linhas de Assinatura com Largura e Posicionamento Proporcional
  const signWidth = (contentWidth - 20) / 2;
  const signY = currentY + 14;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);

  // Assinatura 1: Conferência
  doc.line(margin, signY, margin + signWidth, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('RESPONSÁVEL PELA EMISSÃO / CONFERÊNCIA', margin + signWidth / 2, signY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Almoxarifado & Estoque • ${responsavel}`, margin + signWidth / 2, signY + 8, { align: 'center' });

  // Assinatura 2: Gerência
  doc.line(margin + signWidth + 20, signY, margin + signWidth * 2 + 20, signY);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(30, 41, 59);
  doc.text('GERÊNCIA GERAL / DIRETORIA OPERACIONAL', margin + signWidth + 20 + signWidth / 2, signY + 4, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Big Master Supermercados', margin + signWidth + 20 + signWidth / 2, signY + 8, { align: 'center' });

  // 6. Rodapé em Todas as Páginas (Numeração Adaptável 'Página X de Y' + Copyright)
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Copyright © 2026 JSA Soluções Tecnológicas. All rights reserved.',
      margin,
      pageHeight - 6
    );
    doc.text(
      `Big Master Supermercados • Página ${i} de ${totalPages}`,
      pageWidth - margin,
      pageHeight - 6,
      { align: 'right' }
    );
  }

  return doc;
}

/**
 * Faz o download direto do PDF do Relatório de Uniformes
 */
export function gerarRelatorioUniformesPDF(dadosRelatorio) {
  const doc = construirDocumentoRelatorioUniformes(dadosRelatorio);
  const dataIso = new Date().toISOString().slice(0, 10);
  doc.save(`Relatorio_Uniformes_Departamentos_${dataIso}.pdf`);
}

/**
 * Retorna o Blob do PDF para visualização em modal/iframe
 */
export function gerarRelatorioUniformesBlob(dadosRelatorio) {
  const doc = construirDocumentoRelatorioUniformes(dadosRelatorio);
  return doc.output('blob');
}
