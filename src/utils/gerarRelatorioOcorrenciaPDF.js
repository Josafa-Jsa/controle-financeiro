// src/utils/gerarRelatorioOcorrenciaPDF.js
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export function gerarRelatorioOcorrenciaPDF(oc) {
  if (!oc) return null;

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 14;

  const formatBRL = (val) => {
    return Number(val || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const formatDataBR = (iso) => {
    if (!iso) return '-';
    try {
      const parts = String(iso).split('T')[0].split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return new Date(iso).toLocaleDateString('pt-BR');
    } catch {
      return iso;
    }
  };

  const formatDataHoraBR = (iso) => {
    if (!iso) return '-';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return String(iso);
      return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR')}`;
    } catch {
      return String(iso);
    }
  };

  const listaEvidencias = Array.isArray(oc.evidencias) ? oc.evidencias : [];
  const imagens = listaEvidencias.filter((e) => e.tipo === 'Imagem');
  const videos = listaEvidencias.filter((e) => e.tipo === 'Vídeo');
  const outrosAnexos = listaEvidencias.filter((e) => e.tipo !== 'Imagem' && e.tipo !== 'Vídeo');
  const temImagens = imagens.length > 0;
  const temVideos = videos.length > 0;
  const temEvidencias = listaEvidencias.length > 0;

  // --- CABEÇALHO DO RELATÓRIO ---
  doc.setFillColor(15, 23, 42); // Azul escuro executivo #0f172a
  doc.rect(margin, 10, pageWidth - margin * 2, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RELATÓRIO DE OCORRÊNCIA E PREVENÇÃO DE PERDAS', margin + 6, 18.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`REGISTRO AUDITADO: ${oc.numero}  |  STATUS: ${String(oc.status || 'Em Aberto').toUpperCase()}`, margin + 6, 25.5);

  const dataEmissao = new Date().toLocaleString('pt-BR');
  doc.text(`EMISSÃO: ${dataEmissao}`, pageWidth - margin - 6, 25.5, { align: 'right' });

  let y = 35;

  // --- BANNER DE DESTAQUE: REGISTRO DE IMAGENS E VÍDEOS ---
  if (temImagens || temVideos || temEvidencias) {
    doc.setFillColor(238, 242, 255); // Indigo suave
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, y, pageWidth - margin * 2, 9.5, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.8);
    doc.setTextColor(67, 56, 202); // Indigo forte
    const txtMidias = `REGISTRO DE EVIDÊNCIAS DIGITAIS: CONTÉM ${imagens.length} REGISTRO(S) DE IMAGEM E ${videos.length} REGISTRO(S) DE VÍDEO ARQUIVADOS NO ACERVO PROBATÓRIO`;
    doc.text(txtMidias, margin + 4, y + 6);

    y += 13.5;
  } else {
    y += 2;
  }

  // --- 1. DADOS GERAIS DO INCIDENTE ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('1. DADOS GERAIS DO INCIDENTE', margin, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    body: [
      [
        { content: 'ID da Ocorrência:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
        oc.numero || '-',
        { content: 'Data / Horário do Fato:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
        `${formatDataBR(oc.data)} às ${oc.horaTermino ? `${oc.horaInicio} - ${oc.horaTermino}` : oc.horaInicio || '-'}`,
      ],
      [
        { content: 'Natureza / Do que se trata:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
        oc.tipo || 'Outros',
        { content: 'Classificação / Gravidade:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
        oc.classificacao || 'Média',
      ],
      [
        { content: 'Local / Setor:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
        `${oc.local || 'Geral'} ${oc.setor ? `(${oc.setor})` : ''}`,
        { content: 'Valor Total Envolvido:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
        formatBRL(oc.valorTotalEnvolvido),
      ],
    ],
  });

  y = doc.lastAutoTable.finalY + 5;

  // --- 2. RELATO FACTUAL DOS FATOS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('2. RELATO FACTUAL DOS FATOS E PROVIDÊNCIAS', margin, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    bodyStyles: { fontSize: 7.5, textColor: [30, 41, 59] },
    body: [
      [
        {
          content: oc.relatoFatos
            ? `Descrição dos Fatos:\n${oc.relatoFatos}`
            : 'Nenhum relato detalhado inserido.',
          styles: { fontStyle: 'italic', cellPadding: 3 },
        },
      ],
      ...(oc.medidasAdotadas
        ? [
          [
            {
              content: `Providências e Medidas Adotadas:\n${oc.medidasAdotadas}`,
              styles: { cellPadding: 3, fillColor: [248, 250, 252] },
            },
          ],
        ]
        : []),
    ],
  });

  y = doc.lastAutoTable.finalY + 5;

  // --- 3. QUALIFICAÇÃO DE PESSOAS ENVOLVIDAS ---
  const listaPessoas = Array.isArray(oc.pessoasEnvolvidas) && oc.pessoasEnvolvidas.length > 0
    ? oc.pessoasEnvolvidas
    : oc.pessoaEnvolvida
      ? [oc.pessoaEnvolvida]
      : [];

  if (listaPessoas.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`3. QUALIFICAÇÃO DE PESSOAS ENVOLVIDAS (${listaPessoas.length})`, margin, y);
    y += 2;

    const linhasPessoas = listaPessoas.map((p, idx) => [
      `#${idx + 1}`,
      p.nome || 'Não informado',
      p.clienteIdentificado === 'Sim' ? 'Cliente' : p.funcionario === 'Sim' ? 'Funcionário' : 'Terceiro',
      p.sexo || '-',
      p.vestimenta || '-',
      p.descricaoFisica || p.caracteristicas || '-',
      p.formaIdentificacao || '-',
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.2 },
      bodyStyles: { fontSize: 7.2, textColor: [30, 41, 59] },
      head: [['#', 'Nome', 'Vínculo', 'Sexo', 'Vestimenta', 'Características Físicas', 'Identificação']],
      body: linhasPessoas,
    });

    y = doc.lastAutoTable.finalY + 5;
  }

  // --- 4. RELAÇÃO DE PRODUTOS ENVOLVIDOS ---
  if (Array.isArray(oc.produtosEnvolvidos) && oc.produtosEnvolvidos.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`4. RELAÇÃO DE PRODUTOS ENVOLVIDOS (${oc.produtosEnvolvidos.length})`, margin, y);
    y += 2;

    const linhasProdutos = oc.produtosEnvolvidos.map((p) => [
      p.codigo || '-',
      p.produto || '-',
      String(p.quantidade || 1),
      formatBRL(p.valorUnitario),
      formatBRL(p.total),
    ]);

    linhasProdutos.push([
      { content: 'VALOR TOTAL ENVOLVIDO:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: formatBRL(oc.valorTotalEnvolvido), styles: { fontStyle: 'bold', fillColor: [220, 252, 231], textColor: [22, 101, 52] } },
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [5, 150, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.2 },
      bodyStyles: { fontSize: 7.2, textColor: [30, 41, 59] },
      head: [['Código', 'Produto / Mercadoria', 'Qtd.', 'Valor Unit.', 'Total (R$)']],
      body: linhasProdutos,
    });

    y = doc.lastAutoTable.finalY + 5;
  }

  // --- 5. RELATÓRIO DE ABORDAGEM & INTERVENÇÃO ---
  if (oc.abordagem) {
    if (y > pageHeight - 55) {
      doc.addPage();
      y = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('5. PROCEDIMENTO DE ABORDAGEM & INTERVENÇÃO', margin, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      bodyStyles: { fontSize: 7.2, textColor: [30, 41, 59] },
      body: [
        [
          { content: 'Houve Abordagem?', styles: { fontStyle: 'bold', fillColor: [255, 237, 213] } },
          oc.abordagem.houveAbordagem || 'Sim',
          { content: 'Data/Hora e Local:', styles: { fontStyle: 'bold', fillColor: [255, 237, 213] } },
          `${formatDataBR(oc.abordagem.data)} ${oc.abordagem.hora || ''} - ${oc.abordagem.local || 'Saída'}`,
        ],
        [
          { content: 'Agentes Responsáveis:', styles: { fontStyle: 'bold', fillColor: [255, 237, 213] } },
          `${oc.abordagem.responsaveis || 'Fiscal de Loja / Segurança'} (Fiscal de Loja / Segurança)`,
          { content: 'Recuperação Mercadorias:', styles: { fontStyle: 'bold', fillColor: [255, 237, 213] } },
          oc.abordagem.recuperacaoMercadorias || 'Sim - Total',
        ],
        [
          { content: 'Comportamento:', styles: { fontStyle: 'bold', fillColor: [255, 237, 213] } },
          oc.abordagem.comportamento || 'Pacífico / Cooperativo',
          { content: 'Acionamento Policial / B.O.:', styles: { fontStyle: 'bold', fillColor: [255, 237, 213] } },
          `${oc.abordagem.acionamentoPolicial || 'Não'} ${oc.abordagem.numeroBoletim ? `(B.O.: ${oc.abordagem.numeroBoletim})` : ''}`,
        ],
        ...(oc.abordagem.relatoAbordagem
          ? [
            [
              {
                content: `Relato da Abordagem: ${oc.abordagem.relatoAbordagem}`,
                colSpan: 4,
                styles: { fontStyle: 'italic', fillColor: [255, 247, 237] },
              },
            ],
          ]
          : []),
      ],
    });

    y = doc.lastAutoTable.finalY + 5;
  }

  // --- 6. ACERVO DE EVIDÊNCIAS DIGITAIS & REGISTRO DE IMAGENS / VÍDEOS ---
  if (y > pageHeight - 60) {
    doc.addPage();
    y = 16;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('6. ACERVO DE EVIDÊNCIAS DIGITAIS & REGISTRO DE IMAGENS / VÍDEOS', margin, y);
  y += 2;

  if (temEvidencias) {
    const linhasEvidencias = listaEvidencias.map((ev, i) => {
      const tipoLabel = ev.tipo === 'Imagem' ? 'Imagem' : ev.tipo === 'Vídeo' ? 'Vídeo' : (ev.tipo || 'Arquivo');
      const horario = ev.horaFim ? `${ev.horaInicio || ''} até ${ev.horaFim}` : ev.horaInicio || '-';
      return [
        ev.numeroSequencial || `#${String(i + 1).padStart(3, '0')}`,
        tipoLabel,
        ev.camera || 'CAM CFTV',
        ev.local || oc.local || 'Loja',
        `${formatDataBR(ev.data || oc.data)} (${horario})`,
        ev.arquivoNome || 'midia_custodia.mp4',
        `${ev.adicionadoPor || 'Operador'} (${formatDataHoraBR(ev.dataHoraUpload || oc.data)})`,
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.2 },
      bodyStyles: { fontSize: 7.2, textColor: [30, 41, 59] },
      head: [['Item', 'Tipo de Mídia', 'Câmera / Fonte', 'Local', 'Data / Período Gravado', 'Arquivo Vinculado', 'Adicionado por']],
      body: linhasEvidencias,
    });

    y = doc.lastAutoTable.finalY + 5;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      bodyStyles: { fontSize: 7.5, textColor: [100, 116, 139] },
      body: [['Nenhum anexo de imagem, vídeo ou documento multimídia cadastrado neste registro até o momento.']],
    });
    y = doc.lastAutoTable.finalY + 5;
  }

  // --- 7. HISTÓRICO DA CADEIA DE CUSTÓDIA PROBATÓRIA ---
  if (Array.isArray(oc.historicoCustodia) && oc.historicoCustodia.length > 0) {
    if (y > pageHeight - 55) {
      doc.addPage();
      y = 16;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text('7. RASTREABILIDADE DA CADEIA DE CUSTÓDIA', margin, y);
    y += 2;

    const linhasCustodia = oc.historicoCustodia.slice(0, 10).map((h) => [
      formatDataHoraBR(h.dataHora),
      h.usuario || 'Sistema',
      h.acao || '-',
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.2 },
      bodyStyles: { fontSize: 7.2, textColor: [30, 41, 59] },
      head: [['Data e Horário', 'Operador / Usuário', 'Ação / Despacho Probatório Registrado']],
      body: linhasCustodia,
    });

    y = doc.lastAutoTable.finalY + 5;
  }

  // --- 8. MATRIZ DE RESPONSABILIDADES DO INCIDENTE ---
  if (y > pageHeight - 50) {
    doc.addPage();
    y = 16;
  }

  const resp = oc.responsaveisRegistro || {};

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('8. MATRIZ DE RESPONSABILIDADES DO INCIDENTE', margin, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.2 },
    bodyStyles: { fontSize: 7.2, textColor: [30, 41, 59] },
    head: [['Papel Operacional', 'Responsável Designado', 'Departamento / Setor', 'Registro / Horário']],
    body: [
      ['Emitido / Registrado por:', resp.emitidoPor?.nome || oc.registradoPor || 'Operador', 'Prevenção de Perdas', resp.emitidoPor?.dataHora ? formatDataHoraBR(resp.emitidoPor.dataHora) : dataEmissao],
      ['Presenciou (Testemunha):', resp.presenciou?.nome || '-', resp.presenciou?.cargo || '-', resp.presenciou?.dataHora ? formatDataHoraBR(resp.presenciou.dataHora) : '-'],
      ['Atendeu / Abordou:', resp.atendeu?.nome || oc.abordagem?.responsaveis || '-', 'Fiscal de Loja / Segurança', resp.atendeu?.dataHora ? formatDataHoraBR(resp.atendeu.dataHora) : '-'],
      ['Recebeu (Triagem):', resp.recebeu?.nome || '-', 'Central de Monitoramento (CFTV)', resp.recebeu?.dataHora ? formatDataHoraBR(resp.recebeu.dataHora) : '-'],
      ['Analisou (Auditoria):', resp.analisou?.nome || '-', 'Prevenção e Auditoria', resp.analisou?.dataHora ? formatDataHoraBR(resp.analisou.dataHora) : '-'],
      ['Autorizou Encerramento:', resp.autorizouEncerramento?.nome || '-', 'Gerência Operacional', resp.autorizouEncerramento?.dataHora ? formatDataHoraBR(resp.autorizouEncerramento.dataHora) : '-'],
    ],
  });

  y = doc.lastAutoTable.finalY + 10;

  // --- 9. TERMOS DE ENCERRAMENTO E ASSINATURAS FORMAIS ---
  if (y > pageHeight - 35) {
    doc.addPage();
    y = 20;
  }

  const colWidth = (pageWidth - margin * 2 - 12) / 3;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.3);

  // Linha 1
  doc.line(margin, y, margin + colWidth, y);
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(resp.emitidoPor?.nome || oc.registradoPor || 'Operador', margin + colWidth / 2, y + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Emissor / Prevenção de Perdas', margin + colWidth / 2, y + 7, { align: 'center' });

  // Linha 2
  const x2 = margin + colWidth + 6;
  doc.line(x2, y, x2 + colWidth, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(resp.atendeu?.nome || oc.abordagem?.responsaveis || 'Fiscal / Segurança', x2 + colWidth / 2, y + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Fiscal de Loja / Segurança', x2 + colWidth / 2, y + 7, { align: 'center' });

  // Linha 3
  const x3 = x2 + colWidth + 6;
  doc.line(x3, y, x3 + colWidth, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(resp.autorizouEncerramento?.nome || 'Gerente Responsável', x3 + colWidth / 2, y + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Gerência / Diretoria', x3 + colWidth / 2, y + 7, { align: 'center' });

  // Rodapé com paginação
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      // `JSA Soluções Tecnológicas & Prevenção de Perdas  |  Ocorrência ${oc.numero}  |  Página ${i} de ${totalPages}`,
      `Big Master Supermercados / Prevenção de Perdas  |  Ocorrência ${oc.numero}  |  Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 5.5,
      { align: 'center' }
    );
  }

  return doc;
}

export function baixarRelatorioOcorrenciaPDF(oc) {
  const doc = gerarRelatorioOcorrenciaPDF(oc);
  if (doc) {
    const nomeArquivo = `Relatorio_Prevencao_${String(oc.numero || 'Ocorrencia').replace(/\W+/g, '_')}.pdf`;
    doc.save(nomeArquivo);
  }
}

export function gerarRelatorioOcorrenciaBlob(oc) {
  const doc = gerarRelatorioOcorrenciaPDF(oc);
  return doc ? doc.output('blob') : null;
}
