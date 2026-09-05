// src/utils/gerarGuiaTransferenciaUniformePDF.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function gerarGuiaTransferenciaUniformePDF(dadosEnvio) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  const contentWidth = pageWidth - margin * 2;
  let currentY = 12;

  // 1. Cabeçalho Oficial
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.roundedRect(margin, currentY, contentWidth, 18, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('BIG MASTER SUPERMERCADOS • LOGÍSTICA & ESTOQUE', margin + 6, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('GUIA DE TRANSFERÊNCIA E REMESSA DE UNIFORMES EM MASSA', margin + 6, currentY + 13);

  const dataAtual = new Date().toLocaleString('pt-BR');
  doc.setFontSize(7.5);
  doc.text(`Data: ${dataAtual}`, pageWidth - margin - 6, currentY + 10, { align: 'right' });

  currentY += 23;

  // 2. Título
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(`ROMANEIO DE ENVIO • DESTINO: ${String(dadosEnvio.filial || 'FILIAL').toUpperCase()}`, pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;

  // 3. Metadados do Envio
  const totalPecas = (dadosEnvio.itens || []).reduce((acc, i) => acc + (Number(i.quantidade) || 0), 0);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [
      [
        {
          content: 'DADOS DO ENVIO & TRANSFERÊNCIA ENTRE UNIDADES',
          colSpan: 4,
          styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        },
      ],
    ],
    body: [
      [
        { content: 'Filial de Destino:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] } },
        { content: String(dadosEnvio.filial || '-').toUpperCase(), styles: { textColor: [2, 132, 199], fontStyle: 'bold', fontSize: 9.5 } },
        { content: 'Total de Peças:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] } },
        { content: `${totalPecas} uniforme(s)`, styles: { textColor: [16, 185, 129], fontStyle: 'bold', fontSize: 9.5 } },
      ],
      [
        { content: 'Enviado por (Remetente):', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] } },
        { content: String(dadosEnvio.enviadoPor || dadosEnvio.responsavel || '-').toUpperCase(), styles: { textColor: [15, 23, 42], fontStyle: 'bold' } },
        { content: 'Quem irá receber (Destinatário):', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] } },
        { content: String(dadosEnvio.quemIraReceber || '-').toUpperCase(), styles: { textColor: [15, 23, 42], fontStyle: 'bold' } },
      ],
      [
        { content: 'Transporte / Motorista:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] } },
        { content: String(dadosEnvio.motorista || 'Próprio / Logística') },
        { content: 'Observações do Lote:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] } },
        { content: String(dadosEnvio.observacoes || 'Envio de reposição periódica de estoque de uniformes.') },
      ],
    ],
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });

  currentY = doc.lastAutoTable.finalY + 5;

  // 4. Relação Detalhada dos Uniformes
  const bodyItens = (dadosEnvio.itens || []).map((item, idx) => [
    idx + 1,
    item.departamento || '-',
    item.tamanho || '-',
    item.estado === 'Novo' ? '✨ NOVO' : '🔄 USADO',
    item.fabricante || 'Jucicler / Stamp',
    `${item.quantidade} un`,
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'striped',
    head: [
      ['#', 'Departamento', 'Tamanho', 'Estado', 'Fabricante', 'Quantidade'],
    ],
    body: bodyItens.length > 0 ? bodyItens : [['-', 'Nenhum item adicionado', '-', '-', '-', '0 un']],
    headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8.5 },
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 55, fontStyle: 'bold' },
      2: { cellWidth: 24, halign: 'center' },
      3: { cellWidth: 26, halign: 'center' },
      4: { cellWidth: 40 },
      5: { cellWidth: 25, halign: 'center', fontStyle: 'bold' },
    },
  });

  currentY = doc.lastAutoTable.finalY + 14;

  // 5. Bloco de Assinaturas de Conferência
  if (currentY > 240) {
    doc.addPage();
    currentY = 20;
  }

  doc.setDrawColor(148, 163, 184);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, currentY, contentWidth, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('TERMO DE CONFERÊNCIA E RECEBIMENTO NA FILIAL DE DESTINO', margin + 4, currentY + 5.5);

  const colW = (contentWidth - 10) / 2;

  // Assinatura Expedição (Origem)
  const nomeExpedidor = String(dadosEnvio.enviadoPor || dadosEnvio.responsavel || 'EXPEDIÇÃO (ORIGEM)').toUpperCase();
  doc.setDrawColor(100, 116, 139);
  doc.line(margin + 6, currentY + 24, margin + colW, currentY + 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(nomeExpedidor, margin + colW / 2 + 3, currentY + 27.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Expedição / Remetente • Data: ___/___/______`, margin + colW / 2 + 3, currentY + 31.5, { align: 'center' });

  // Assinatura Recebimento (Destino)
  const nomeRecebedor = String(dadosEnvio.quemIraReceber || `RESPONSÁVEL RECEBIMENTO (${dadosEnvio.filial || 'DESTINO'})`).toUpperCase();
  doc.line(margin + colW + 10, currentY + 24, margin + contentWidth - 6, currentY + 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(nomeRecebedor, margin + colW + 10 + (colW - 16) / 2, currentY + 27.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text(`Recebimento ${dadosEnvio.filial || ''} • Data: ___/___/______`, margin + colW + 10 + (colW - 16) / 2, currentY + 31.5, { align: 'center' });

  // Rodapé
  const pageHeight = doc.internal.pageSize.getHeight();
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'Copyright © 2026 JSA Soluções Tecnológicas. All rights reserved.',
    margin,
    pageHeight - 6
  );
  doc.text(
    'BIG MASTER SUPERMERCADOS • Logística de Patrimônio • Guia Oficial de Remessa',
    pageWidth - margin,
    pageHeight - 6,
    { align: 'right' }
  );

  return doc;
}
