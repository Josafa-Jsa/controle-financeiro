// src/utils/gerarComprovanteUniformePDF.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function gerarComprovanteUniformePDF(dadosEntrega) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = 12;

  // 1. Cabeçalho Oficial Big Master
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.roundedRect(margin, currentY, contentWidth, 18, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('BIG MASTER SUPERMERCADOS • GESTÃO OPERACIONAL', margin + 6, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('TERMO OFICIAL DE ENTREGA E RETIRADA DE UNIFORME PROFISSIONAL', margin + 6, currentY + 13);

  const dataAtual = new Date().toLocaleString('pt-BR');
  doc.setFontSize(7.5);
  doc.text(`Emissão: ${dataAtual}`, pageWidth - margin - 6, currentY + 10, { align: 'right' });

  currentY += 23;

  // 2. Título do Documento
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RECIBO E DECLARAÇÃO DE RETIRADA DE UNIFORME', pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;

  // 3. Tabela com Dados do Colaborador
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [
      [
        {
          content: '1. QUALIFICAÇÃO DO COLABORADOR BENEFICIÁRIO',
          colSpan: 4,
          styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        },
      ],
    ],
    body: [
      [
        { content: 'Nome Completo:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105], fontSize: 8.5 } },
        { content: String(dadosEntrega.nome || '-').toUpperCase(), styles: { textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 9 } },
        { content: 'CPF:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105], fontSize: 8.5 } },
        { content: String(dadosEntrega.cpf || '-'), styles: { textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 9 } },
      ],
      [
        { content: 'Matrícula:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105], fontSize: 8.5 } },
        { content: String(dadosEntrega.matricula || '-'), styles: { textColor: [15, 23, 42], fontSize: 8.5 } },
        { content: 'Departamento / Setor:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105], fontSize: 8.5 } },
        { content: String(dadosEntrega.departamento || '-'), styles: { textColor: [2, 132, 199], fontStyle: 'bold', fontSize: 8.5 } },
      ],
    ],
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });

  currentY = doc.lastAutoTable.finalY + 5;

  // 4. Tabela com Dados do Uniforme Entregue
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [
      [
        {
          content: '2. ESPECIFICAÇÕES DO UNIFORME ENTREGUE',
          colSpan: 4,
          styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        },
      ],
    ],
    body: [
      [
        { content: 'Tamanho:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105], fontSize: 8.5 } },
        { content: String(dadosEntrega.tamanho || '-'), styles: { textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 9 } },
        { content: 'Estado da Peça:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105], fontSize: 8.5 } },
        { content: `${dadosEntrega.estado === 'Novo' ? '✨ NOVO' : '🔄 USADO'}`, styles: { textColor: dadosEntrega.estado === 'Novo' ? [16, 185, 129] : [217, 119, 6], fontStyle: 'bold', fontSize: 9 } },
      ],
      [
        { content: 'Quantidade Entregue:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105], fontSize: 8.5 } },
        { content: `${dadosEntrega.quantidade || 1} peça(s)`, styles: { textColor: [15, 23, 42], fontStyle: 'bold', fontSize: 8.5 } },
        { content: 'Tipo de Operação:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105], fontSize: 8.5 } },
        { content: dadosEntrega.trocaDevolucao ? 'TROCA COM DEVOLUÇÃO DO USADO' : 'PRIMEIRA ENTREGA / REPOSIÇÃO', styles: { textColor: [15, 23, 42], fontSize: 8.5 } },
      ],
      [
        { content: 'Responsável pela Entrega:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105], fontSize: 8.5 } },
        { content: String(dadosEntrega.responsavel || 'Operador / Encarregado'), colSpan: 3, styles: { textColor: [15, 23, 42], fontSize: 8.5 } },
      ],
    ],
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });

  currentY = doc.lastAutoTable.finalY + 5;

  // 5. Termo de Compromisso e Regra de Troca
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, 34, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(220, 38, 38);
  doc.text('⚠️ REGULAMENTO INTERNO & DIRETRIZES DE USO:', margin + 4, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const textoTermo = [
    '1. Declaro que recebi da empresa o(s) uniforme(s) acima discriminado(s) em perfeitas condições de uso e higiene.',
    '2. Comprometo-me a zelar pela guarda e conservação do mesmo, utilizando-o exclusivamente no desempenho de minhas funções.',
    '3. REGRA DE TROCA OBRIGATÓRIA: A troca ou substituição de uniforme somente será realizada mediante a DEVOLUÇÃO DO UNIFORME USADO (VELHO).',
    '4. Em caso de rescisão de contrato de trabalho, comprometo-me a devolver todos os uniformes sob minha posse no ato do desligamento.',
  ];

  let lineY = currentY + 10;
  textoTermo.forEach((txt) => {
    doc.text(txt, margin + 4, lineY);
    lineY += 4.8;
  });

  currentY += 40;

  // 6. Bloco de Assinatura do Colaborador (Coleta Física na Folha A4)
  doc.setDrawColor(148, 163, 184);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, currentY, contentWidth, 42, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('ASSINATURA DO COLABORADOR (RETIRADA DE UNIFORME NA FOLHA A4)', margin + 4, currentY + 5.5);

  if (dadosEntrega.assinatura && typeof dadosEntrega.assinatura === 'string' && dadosEntrega.assinatura.startsWith('data:image')) {
    try {
      doc.addImage(dadosEntrega.assinatura, 'PNG', margin + (contentWidth - 60) / 2, currentY + 7, 60, 19);
    } catch (err) {
      console.warn('Erro ao inserir imagem de assinatura:', err);
    }
  }

  // Linha para Assinatura Física com Caneta
  doc.setDrawColor(71, 85, 105);
  doc.line(margin + 20, currentY + 27, pageWidth - margin - 20, currentY + 27);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(String(dadosEntrega.nome || 'Colaborador').toUpperCase(), pageWidth / 2, currentY + 32, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text(
    `CPF: ${dadosEntrega.cpf || '-'} • Matrícula: ${dadosEntrega.matricula || '-'} • Data da Coleta: ____/____/________`,
    pageWidth / 2,
    currentY + 36.5,
    { align: 'center' }
  );

  // 7. Rodapé Institucional
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Copyright © 2026 JSA Soluções Tecnológicas. All rights reserved.',
    margin,
    pageHeight - 6
  );
  doc.text(
    'BIG MASTER SUPERMERCADOS • Controle de Patrimônio e Uniformes • Documento Oficial',
    pageWidth - margin,
    pageHeight - 6,
    { align: 'right' }
  );

  return doc;
}

export function gerarComprovanteUniformeBlob(dadosEntrega) {
  const doc = gerarComprovanteUniformePDF(dadosEntrega);
  return doc.output('blob');
}
