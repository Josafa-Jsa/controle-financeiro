// src/utils/gerarRelatorioBaixasUniformePDF.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function gerarRelatorioBaixasUniformePDF(dadosBaixa) {
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
  doc.text('BIG MASTER SUPERMERCADOS • GESTÃO DE PATRIMÔNIO & CONTROLE', margin + 6, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text('LAUDO E RELATÓRIO OFICIAL DE BAIXA & DESCARTE DE UNIFORMES', margin + 6, currentY + 13);

  const dataAtual = new Date().toLocaleString('pt-BR');
  doc.setFontSize(7.5);
  doc.text(`Emissão: ${dataAtual}`, pageWidth - margin - 6, currentY + 10, { align: 'right' });

  currentY += 23;

  // 2. Título
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RELATÓRIO DE BAIXA DE UNIFORMES POR AVARIA / DESCARTE', pageWidth / 2, currentY, { align: 'center' });
  currentY += 6;

  // 3. Tabela de Dados da Baixa
  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    theme: 'grid',
    head: [
      [
        {
          content: '1. DADOS DA BAIXA & MOTIVO DO DESCARTE',
          colSpan: 4,
          styles: { fillColor: [30, 41, 59], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 9 },
        },
      ],
    ],
    body: [
      [
        { content: 'Motivo da Baixa:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] } },
        { content: String(dadosBaixa.motivo || 'Rasgado / Manchado / Impróprio').toUpperCase(), styles: { textColor: [220, 38, 38], fontStyle: 'bold', fontSize: 9.5 } },
        { content: 'Departamento / Setor:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] } },
        { content: String(dadosBaixa.departamento || '-'), styles: { textColor: [2, 132, 199], fontStyle: 'bold', fontSize: 9 } },
      ],
      [
        { content: 'Tamanho da Peça:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] } },
        { content: String(dadosBaixa.tamanho || '-'), styles: { fontStyle: 'bold', fontSize: 9 } },
        { content: 'Quantidade Baixada:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] } },
        { content: `${dadosBaixa.quantidade || 1} peça(s)`, styles: { textColor: [220, 38, 38], fontStyle: 'bold', fontSize: 9.5 } },
      ],
      [
        { content: 'Estado no Momento da Baixa:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] } },
        { content: dadosBaixa.estado === 'Novo' ? '✨ Novo (Defeito de Fábrica)' : '🔄 Usado / Desgastado' },
        { content: 'Responsável pela Baixa:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] } },
        { content: String(dadosBaixa.responsavel || 'Operador / Encarregado') },
      ],
      [
        { content: 'Descrição do Dano / Observações:', styles: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105] } },
        { content: String(dadosBaixa.observacoes || 'Peça inutilizada, sem condições de uso no ambiente de loja.'), colSpan: 3 },
      ],
    ],
    styles: { fontSize: 8.5, cellPadding: 2.5 },
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // 4. Parecer e Procedimento de Descarte
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(margin, currentY, contentWidth, 30, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(220, 38, 38);
  doc.text('PARECER TÉCNICO & DESTINAÇÃO FINAL:', margin + 4, currentY + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(51, 65, 85);
  const parecerTextos = [
    '1. Atesto que a(s) peça(s) acima discriminada(s) foi/foram inspecionada(s) e considerada(s) INAPTA(S) para uso profissional.',
    '2. O saldo em estoque do respectivo departamento foi abatido e atualizado no sistema de controle.',
    '3. A destinação final do material segue as normas de descarte têxtil / incineração / reciclagem da empresa.',
  ];

  let lineY = currentY + 10;
  parecerTextos.forEach((txt) => {
    doc.text(txt, margin + 4, lineY);
    lineY += 5;
  });

  currentY += 36;

  // 5. Assinaturas
  doc.setDrawColor(148, 163, 184);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(margin, currentY, contentWidth, 38, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text('VALIDAÇÃO E AUTORIZAÇÃO DE DESCARTE', margin + 4, currentY + 5.5);

  const colW = (contentWidth - 10) / 2;

  // Responsável pela Baixa
  doc.setDrawColor(100, 116, 139);
  doc.line(margin + 6, currentY + 24, margin + colW, currentY + 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text(String(dadosBaixa.responsavel || 'OPERADOR / ESTOQUISTA').toUpperCase(), margin + colW / 2 + 3, currentY + 27.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Responsável pelo Laudo de Baixa', margin + colW / 2 + 3, currentY + 31.5, { align: 'center' });

  // Gerência / Diretoria
  doc.line(margin + colW + 10, currentY + 24, margin + contentWidth - 6, currentY + 24);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('GERÊNCIA / DIRETORIA', margin + colW + 10 + (colW - 16) / 2, currentY + 27.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  doc.text('Autorização de Baixa Contábil & Estoque', margin + colW + 10 + (colW - 16) / 2, currentY + 31.5, { align: 'center' });

  // Rodapé
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    'BIG MASTER SUPERMERCADOS • Departamento de Prevenção de Perdas e Patrimônio • Documento Oficial',
    pageWidth / 2,
    286,
    { align: 'center' }
  );

  return doc;
}

export function gerarRelatorioBaixasUniformeBlob(dadosBaixa) {
  const doc = gerarRelatorioBaixasUniformePDF(dadosBaixa);
  return doc.output('blob');
}
