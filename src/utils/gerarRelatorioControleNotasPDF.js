// src/utils/gerarRelatorioControleNotasPDF.js
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyBRL, formatDateBR } from './telegram';

// Helper para formatar data e hora de chegada
function formatarDataHora(dtStr) {
  if (!dtStr) return '-';
  try {
    const dt = new Date(dtStr);
    if (isNaN(dt.getTime())) return dtStr;
    const dia = String(dt.getDate()).padStart(2, '0');
    const mes = String(dt.getMonth() + 1).padStart(2, '0');
    const ano = dt.getFullYear();
    const hora = String(dt.getHours()).padStart(2, '0');
    const min = String(dt.getMinutes()).padStart(2, '0');
    return `${dia}/${mes}/${ano} ${hora}:${min}`;
  } catch {
    return dtStr;
  }
}

/**
 * Constrói o documento jsPDF com o relatório completo de Controle de Notas
 * ordenado pela hora de chegada/entrega da nota no sistema.
 */
export function construirDocumentoRelatorioControleNotas({
  notas = [],
  responsavel = 'Operador do Sistema',
  filial = 'Filial 1',
  tituloPersonalizado = 'RELATÓRIO CONSOLIDADO DE CONTROLE DE NOTAS FISCAIS',
  filtroPeriodo = 'Geral',
}) {
  // Ordena as notas pela data/hora de chegada (dataHoraEntrega)
  const notasOrdenadas = [...notas].sort((a, b) => {
    const timeA = new Date(a.dataHoraEntrega || a.createdAt || 0).getTime();
    const timeB = new Date(b.dataHoraEntrega || b.createdAt || 0).getTime();
    return timeB - timeA; // Mais recente primeiro
  });

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;
  let currentY = 10;

  // 1. Cabeçalho Oficial
  doc.setFillColor(15, 23, 42); // #0f172a
  doc.roundedRect(margin, currentY, contentWidth, 20, 2, 2, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(`BIG MASTER SUPERMERCADOS • ${String(filial || 'FILIAL').toUpperCase()} • CONTROLE DE NOTAS FISCAIS`, margin + 6, currentY + 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `${tituloPersonalizado} • Ordenado por Ordem Cronológica de Chegada`,
    margin + 6,
    currentY + 13
  );

  const dataAtual = new Date().toLocaleString('pt-BR');
  doc.setFontSize(7.5);
  doc.setTextColor(226, 232, 240);
  doc.text(`Emissão: ${dataAtual}`, pageWidth - margin - 6, currentY + 8, { align: 'right' });
  doc.text(`Resp: ${responsavel} (${filial || 'Filial'})`, pageWidth - margin - 6, currentY + 14, { align: 'right' });

  currentY += 24;

  // 2. Totais e Métricas (KPIs)
  const totalNotas = notasOrdenadas.length;
  const valorTotal = notasOrdenadas.reduce((acc, n) => acc + (Number(n.valor) || 0), 0);
  const fornecedoresUnicos = new Set(
    notasOrdenadas.map((n) => n.fornecedor?.trim() || n.cnpj?.trim()).filter(Boolean)
  ).size;
  const comDanfe = notasOrdenadas.filter((n) => !!n.anexoDanfe).length;

  const cardW = (contentWidth - 6) / 3;
  const cardH = 13;

  const kpis = [
    { label: 'TOTAL DE NOTAS', val: `${totalNotas} notas`, bg: [240, 249, 255], border: [186, 230, 253], text: [2, 132, 199] },
    { label: 'FORNECEDORES ATENDIDOS', val: `${fornecedoresUnicos} cadastrados`, bg: [250, 245, 255], border: [233, 213, 255], text: [126, 34, 206] },
    { label: 'DANFE ANEXADA (FSIST)', val: `${comDanfe} de ${totalNotas}`, bg: [255, 251, 235], border: [253, 230, 138], text: [180, 83, 9] },
  ];

  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (cardW + 3);
    doc.setFillColor(...kpi.bg);
    doc.setDrawColor(...kpi.border);
    doc.roundedRect(x, currentY, cardW, cardH, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + cardW / 2, currentY + 4.5, { align: 'center' });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...kpi.text);
    doc.text(kpi.val, x + cardW / 2, currentY + 10, { align: 'center' });
  });

  currentY += cardH + 5;

  // 3. Tabela de Notas Fiscais
  const corpoTabela = notasOrdenadas.map((n, i) => {
    const situacaoStr = n.situacaoNota ? `\n[${n.situacaoNota}]` : '';
    const numNf = (n.numero ? `NF #${n.numero}` : `NF #${n.id}`) + situacaoStr;
    const fornecedorLinha = n.fornecedor
      ? `${n.fornecedor}${n.cnpj ? `\nCNPJ: ${n.cnpj}` : ''}`
      : (n.cnpj || '-');
    const chaveFormatada = n.chavedeacesso || 'NÃO REGISTRADA';
    const horaChegada = formatarDataHora(n.dataHoraEntrega);
    const quemRec = n.quemRecebeu || 'Não especificado';
    const valorStr = formatCurrencyBRL(n.valor || 0);
    const danfeStatus = n.anexoDanfe ? 'SIM (OK)' : 'PENDENTE';

    return [
      String(i + 1),
      horaChegada,
      numNf,
      fornecedorLinha,
      chaveFormatada,
      quemRec,
      danfeStatus,
      valorStr,
    ];
  });

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin, bottom: 16 },
    head: [
      [
        '#',
        'CHEGADA / ENTREGA',
        'NÚMERO',
        'FORNECEDOR / CNPJ',
        'CHAVE DE ACESSO DA NOTA FISCAL',
        'QUEM RECEBEU',
        'DANFE',
        'VALOR TOTAL',
      ],
    ],
    body: corpoTabela,
    foot: [
      [
        { content: `TOTAL GERAL: ${totalNotas} NOTA(S)`, colSpan: 7, styles: { halign: 'right', fontStyle: 'bold', fontSize: 8.5 } },
        { content: formatCurrencyBRL(valorTotal), styles: { halign: 'right', fontStyle: 'bold', fontSize: 9, textColor: [16, 185, 129] } },
      ],
    ],
    theme: 'grid',
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.8,
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 8 },
      1: { halign: 'center', cellWidth: 30, fontStyle: 'bold', textColor: [180, 83, 9] },
      2: { halign: 'center', cellWidth: 22, fontStyle: 'bold', textColor: [2, 132, 199] },
      3: { halign: 'left', cellWidth: 60, fontStyle: 'bold' },
      4: { halign: 'left', cellWidth: 70, font: 'courier', fontSize: 6.8, textColor: [71, 85, 105] },
      5: { halign: 'left', cellWidth: 35 },
      6: { halign: 'center', cellWidth: 18, fontStyle: 'bold' },
      7: { halign: 'right', cellWidth: 26, fontStyle: 'bold', textColor: [5, 150, 105] },
    },
    didDrawPage: (data) => {
      // Rodapé Obrigatório em todas as páginas: Copyright © 2026 JSA Soluções Tecnológicas. All rights reserved.
      const pageNum = doc.internal.getCurrentPageInfo().pageNumber;
      const totalPages = doc.internal.getNumberOfPages();

      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);

      // Copyright à esquerda/centro
      doc.text(
        'Copyright © 2026 JSA Soluções Tecnológicas. All rights reserved.',
        margin,
        pageHeight - 6
      );

      // Numeração de página à direita
      doc.text(
        `Página ${pageNum} de ${totalPages}`,
        pageWidth - margin,
        pageHeight - 6,
        { align: 'right' }
      );
    },
  });

  return doc;
}

/**
 * Retorna o Blob do PDF para visualização ou impressão no navegador
 */
export function gerarRelatorioControleNotasBlob(dados) {
  const doc = construirDocumentoRelatorioControleNotas(dados);
  return doc.output('blob');
}

/**
 * Realiza o download direto do arquivo PDF
 */
export function baixarRelatorioControleNotasPDF(dados, nomeArquivo = 'Relatorio_Controle_Notas.pdf') {
  const doc = construirDocumentoRelatorioControleNotas(dados);
  doc.save(nomeArquivo);
}
