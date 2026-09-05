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
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

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
  const temEvidencias = listaEvidencias.length > 0;
  const dataEmissao = new Date().toLocaleString('pt-BR');

  // --- CABEÇALHO DO RELATÓRIO (COMPACTO & ELEGANTE) ---
  doc.setFillColor(15, 23, 42); // Navy escuro #0f172a
  doc.rect(margin, 8, contentWidth, 14, 'F');

  // Faixa decorativa ciano
  doc.setFillColor(56, 189, 248); // #38bdf8
  doc.rect(margin, 21.3, contentWidth, 0.7, 'F');

  // Título e Subtítulo
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('RELATÓRIO OFICIAL DE OCORRÊNCIA E PREVENÇÃO DE PERDAS', margin + 4, 13.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.setTextColor(56, 189, 248);
  doc.text('BIG MASTER • DEPARTAMENTO DE PREVENÇÃO DE PERDAS E ROUBOS', margin + 4, 18.5);
  // doc.text('JSA SOLUÇÕES TECNOLÓGICAS • DEPARTAMENTO DE PREVENÇÃO DE PERDAS E ROUBOS', margin + 4, 18.5);

  // Metadados à direita
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`REGISTRO: ${oc.numero || 'OC-0000'}`, pageWidth - margin - 4, 13.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(148, 163, 184);
  doc.text(`STATUS: ${String(oc.status || 'Em Aberto').toUpperCase()}  |  EMISSÃO: ${dataEmissao}`, pageWidth - margin - 4, 18.5, { align: 'right' });

  let y = 25;

  // --- BANNER DE DESTAQUE: REGISTRO DE EVIDÊNCIAS DIGITAIS ---
  if (temEvidencias) {
    doc.setFillColor(238, 242, 255); // Indigo claro
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.35);
    doc.roundedRect(margin, y, contentWidth, 7.5, 1.2, 1.2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(67, 56, 202);
    const txtMidias = `ACERVO PROBATÓRIO AUDITADO: ${imagens.length} REGISTRO(S) DE IMAGEM, ${videos.length} REGISTRO(S) DE VÍDEO E ${outrosAnexos.length} DOCUMENTO(S) VINCULADOS`;
    doc.text(txtMidias, margin + 4, y + 4.8, { maxWidth: contentWidth - 8 });

    y += 10;
  } else {
    y += 2;
  }

  // Helper para títulos de seção
  const renderSectionHeader = (titulo, currentY) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(titulo, margin, currentY);
    return currentY + 1.8;
  };

  // --- 1. DADOS GERAIS DO INCIDENTE ---
  y = renderSectionHeader('1. DADOS GERAIS DO INCIDENTE', y);

  const dadosGeraisBody = [
    [
      { content: 'ID da Ocorrência:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 32 } },
      { content: oc.numero || '-', styles: { fontStyle: 'bold', textColor: [2, 132, 199] } },
      { content: 'Data / Horário do Fato:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249], cellWidth: 36 } },
      `${formatDataBR(oc.data)} às ${oc.horaTermino ? `${oc.horaInicio} às ${oc.horaTermino}` : oc.horaInicio || '-'}`,
    ],
    [
      { content: 'Natureza do Evento:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      oc.tipo || 'Outros',
      { content: 'Classificação / Gravidade:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      oc.classificacao || 'Média',
    ],
    [
      { content: 'Local / Setor:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      `${oc.local || 'Geral'} ${oc.setor ? `(${oc.setor})` : ''}`,
      { content: 'Valor Total Envolvido:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: formatBRL(oc.valorTotalEnvolvido), styles: { fontStyle: 'bold', textColor: [22, 101, 52] } },
    ],
    [
      { content: 'Filial Referente:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: oc.filial || 'Filial 1', styles: { fontStyle: 'bold', textColor: [2, 132, 199] } },
      { content: 'Registrado por:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: oc.registradoPor || oc.responsaveisRegistro?.emitidoPor?.nome || 'Operador', styles: { fontStyle: 'bold' } },
    ],
  ];

  if (oc.nome || oc.titulo) {
    dadosGeraisBody.push([
      { content: 'Título / Resumo:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: oc.nome || oc.titulo, colSpan: 3 },
    ]);
  }

  if (oc.descricao && oc.descricao !== oc.relatoFatos) {
    dadosGeraisBody.push([
      { content: 'Observações Iniciais:', styles: { fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: oc.descricao, colSpan: 3, styles: { fontStyle: 'italic' } },
    ]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 7, textColor: [30, 41, 59], cellPadding: 2 },
    body: dadosGeraisBody,
  });

  y = doc.lastAutoTable.finalY + 4;

  // --- 2. RELATO FACTUAL DOS FATOS E PROVIDÊNCIAS ---
  y = renderSectionHeader('2. RELATO FACTUAL DOS FATOS E PROVIDÊNCIAS', y);

  const relatoBody = [
    [
      {
        content: oc.relatoFatos
          ? `Descrição Factual dos Fatos:\n${oc.relatoFatos}`
          : 'Nenhum relato detalhado inserido.',
        styles: { fontStyle: 'italic', fillColor: [255, 255, 255] },
      },
    ],
  ];

  if (oc.medidasAdotadas) {
    relatoBody.push([
      {
        content: `Providências e Medidas Adotadas:\n${oc.medidasAdotadas}`,
        styles: { fillColor: [248, 250, 252], fontStyle: 'normal' },
      },
    ]);
  }

  if (oc.parecerFinal || oc.conclusao) {
    relatoBody.push([
      {
        content: `Parecer Final / Conclusão Técnica:\n${oc.parecerFinal || oc.conclusao}`,
        styles: { fillColor: [240, 253, 244], fontStyle: 'normal' },
      },
    ]);
  }

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 7, textColor: [30, 41, 59], cellPadding: 2.5 },
    body: relatoBody,
  });

  y = doc.lastAutoTable.finalY + 4;

  // --- 3. QUALIFICAÇÃO DE PESSOAS ENVOLVIDAS ---
  const listaPessoas = Array.isArray(oc.pessoasEnvolvidas) && oc.pessoasEnvolvidas.length > 0
    ? oc.pessoasEnvolvidas
    : oc.pessoaEnvolvida
      ? [oc.pessoaEnvolvida]
      : [];

  if (listaPessoas.length > 0) {
    y = renderSectionHeader(`3. QUALIFICAÇÃO DE PESSOAS ENVOLVIDAS (${listaPessoas.length})`, y);

    const linhasPessoas = listaPessoas.map((p, idx) => {
      const docStr = p.documento || p.cpf || p.rg || '-';
      const obsStr = p.observacoes ? ` (Obs: ${p.observacoes})` : '';
      return [
        `#${idx + 1}`,
        p.nome || 'Não informado',
        docStr,
        p.clienteIdentificado === 'Sim' ? 'Cliente' : p.funcionario === 'Sim' ? 'Funcionário' : (p.tipoEnvolvido || 'Terceiro'),
        p.sexo || '-',
        p.vestimenta || '-',
        `${p.descricaoFisica || p.caracteristicas || '-'}${obsStr}`,
        p.formaIdentificacao || '-',
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [67, 56, 202], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.8 },
      styles: { fontSize: 6.8, textColor: [30, 41, 59], cellPadding: 1.8 },
      head: [['#', 'Nome do Envolvido', 'Documento', 'Vínculo', 'Sexo', 'Vestimenta Observada', 'Características Físicas / Obs', 'Identificação']],
      body: linhasPessoas,
    });

    y = doc.lastAutoTable.finalY + 4;
  }

  // --- 4. RELAÇÃO DE PRODUTOS ENVOLVIDOS ---
  if (Array.isArray(oc.produtosEnvolvidos) && oc.produtosEnvolvidos.length > 0) {
    y = renderSectionHeader(`4. RELAÇÃO DE PRODUTOS ENVOLVIDOS (${oc.produtosEnvolvidos.length})`, y);

    const linhasProdutos = oc.produtosEnvolvidos.map((p) => [
      p.codigo || '-',
      p.produto || p.descricao || '-',
      p.categoria || '-',
      String(p.quantidade || 1),
      formatBRL(p.valorUnitario),
      formatBRL(p.total),
      p.recuperado || 'Sim',
      p.avaria || 'Não',
    ]);

    linhasProdutos.push([
      { content: 'VALOR TOTAL ENVOLVIDO:', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: formatBRL(oc.valorTotalEnvolvido), styles: { fontStyle: 'bold', fillColor: [220, 252, 231], textColor: [22, 101, 52] } },
      { content: '', colSpan: 2, styles: { fillColor: [241, 245, 249] } },
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.8 },
      styles: { fontSize: 6.8, textColor: [30, 41, 59], cellPadding: 1.8 },
      head: [['Código', 'Produto / Mercadoria', 'Categoria', 'Qtd.', 'Valor Unit.', 'Total (R$)', 'Recuperado?', 'Avaria?']],
      body: linhasProdutos,
    });

    y = doc.lastAutoTable.finalY + 4;
  }

  // --- 5. PROCEDIMENTO DE ABORDAGEM & SEGURANÇA ---
  if (oc.abordagem) {
    y = renderSectionHeader('5. PROCEDIMENTO DE ABORDAGEM & SEGURANÇA', y);

    const abordagemBody = [
      [
        { content: 'Houve Abordagem?', styles: { fontStyle: 'bold', fillColor: [255, 237, 213], cellWidth: 32 } },
        oc.abordagem.houveAbordagem || 'Sim',
        { content: 'Data/Hora e Local:', styles: { fontStyle: 'bold', fillColor: [255, 237, 213], cellWidth: 34 } },
        `${formatDataBR(oc.abordagem.data)} ${oc.abordagem.hora || ''} - ${oc.abordagem.local || oc.local || 'Área da Loja'}`,
      ],
      [
        { content: 'Agentes Responsáveis:', styles: { fontStyle: 'bold', fillColor: [255, 237, 213] } },
        `${oc.abordagem.responsaveis || 'Fiscal de Loja / Segurança'} (Fiscal de Loja / Segurança)`,
        { content: 'Recuperação Itens:', styles: { fontStyle: 'bold', fillColor: [255, 237, 213] } },
        oc.abordagem.recuperacaoMercadorias || 'Sim - Total',
      ],
      [
        { content: 'Conduta / Comportamento:', styles: { fontStyle: 'bold', fillColor: [255, 237, 213] } },
        oc.abordagem.comportamento || 'Pacífico / Cooperativo',
        { content: 'Sala Reservada:', styles: { fontStyle: 'bold', fillColor: [255, 237, 213] } },
        oc.abordagem.conducaoSalaReservada || 'Não',
      ],
      [
        { content: 'Polícia / B.O. CISC:', styles: { fontStyle: 'bold', fillColor: [255, 237, 213] } },
        `${oc.abordagem.acionamentoPolicial || 'Não'} ${oc.abordagem.numeroBoletimCisc || oc.abordagem.numeroBoletim ? `(B.O. CISC: ${oc.abordagem.numeroBoletimCisc || oc.abordagem.numeroBoletim})` : ''}`,
        { content: 'Anexo do Boletim:', styles: { fontStyle: 'bold', fillColor: [255, 237, 213] } },
        oc.abordagem.boletimArquivo ? `Sim: ${oc.abordagem.boletimArquivo.nome}` : 'Nenhum anexo',
      ],
    ];

    if (oc.abordagem.relatoAbordagem) {
      abordagemBody.push([
        {
          content: `Relato Factual da Abordagem:\n${oc.abordagem.relatoAbordagem}`,
          colSpan: 4,
          styles: { fontStyle: 'italic', fillColor: [255, 247, 237] },
        },
      ]);
    }

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 6.8, textColor: [30, 41, 59], cellPadding: 2 },
      body: abordagemBody,
    });

    y = doc.lastAutoTable.finalY + 4;
  }

  // --- QUEBRA DE PÁGINA ESTRUTURADA PARA PAINEL DE AUDITORIA, CUSTÓDIA & RESPONSABILIDADES ---
  if (y > pageHeight - 85) {
    doc.addPage();
    y = 14;
  }

  // --- 6. ACERVO DE EVIDÊNCIAS DIGITAIS ---
  y = renderSectionHeader('6. ACERVO DE EVIDÊNCIAS DIGITAIS & REGISTRO DE MÍDIAS', y);

  if (temEvidencias) {
    const linhasEvidencias = listaEvidencias.map((ev, i) => {
      const tipoLabel = ev.tipo === 'Imagem' ? '📷 Imagem' : ev.tipo === 'Vídeo' ? '📹 Vídeo' : `📁 ${ev.tipo || 'Arquivo'}`;
      const horario = ev.horaFim ? `${ev.horaInicio || ''} às ${ev.horaFim}` : ev.horaInicio || '-';
      const detalheStr = ev.descricaoEvidencia ? ` (Info: ${ev.descricaoEvidencia})` : '';
      return [
        ev.numeroSequencial || `#${String(i + 1).padStart(3, '0')}`,
        tipoLabel,
        ev.camera || 'CAM CFTV',
        `${ev.local || oc.local || 'Loja'}${detalheStr}`,
        `${formatDataBR(ev.data || oc.data)} (${horario})`,
        `${ev.arquivoNome || 'midia_custodia.mp4'} ${ev.tamanhoStr ? `[${ev.tamanhoStr}]` : ''}`,
        `${ev.adicionadoPor || 'Operador'} (${formatDataHoraBR(ev.dataHoraUpload || oc.data)})`,
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.8 },
      styles: { fontSize: 6.8, textColor: [30, 41, 59], cellPadding: 1.8 },
      head: [['Item', 'Tipo de Mídia', 'Câmera / Fonte', 'Local / Ponto', 'Data / Período Gravado', 'Arquivo Vinculado', 'Adicionado por']],
      body: linhasEvidencias,
      showHead: 'everyPage',
    });

    y = doc.lastAutoTable.finalY + 4;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 7, textColor: [100, 116, 139], cellPadding: 2 },
      body: [['Nenhum anexo de imagem, vídeo ou documento multimídia cadastrado neste registro.']],
    });
    y = doc.lastAutoTable.finalY + 4;
  }

  // --- 7. MATRIZ DE RESPONSABILIDADES DO INCIDENTE ---
  if (y > pageHeight - 55) {
    doc.addPage();
    y = 14;
  }

  const resp = oc.responsaveisRegistro || {};

  y = renderSectionHeader('7. MATRIZ DE RESPONSABILIDADES DO INCIDENTE', y);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.8 },
    styles: { fontSize: 6.8, textColor: [30, 41, 59], cellPadding: 1.8 },
    head: [['Papel Operacional', 'Responsável Designado', 'Departamento / Setor', 'Registro / Horário']],
    body: [
      ['Emitido / Registrado por:', resp.emitidoPor?.nome || oc.registradoPor || 'Operador', 'Prevenção de Perdas', resp.emitidoPor?.dataHora ? formatDataHoraBR(resp.emitidoPor.dataHora) : dataEmissao],
      ['Presenciou (Testemunha):', resp.presenciou?.nome || '-', resp.presenciou?.cargo || '-', resp.presenciou?.dataHora ? formatDataHoraBR(resp.presenciou.dataHora) : '-'],
      ['Atendeu / Abordou:', resp.atendeu?.nome || oc.abordagem?.responsaveis || '-', 'Fiscal de Loja / Segurança', resp.atendeu?.dataHora ? formatDataHoraBR(resp.atendeu.dataHora) : '-'],
      ['Recebeu (Triagem):', resp.recebeu?.nome || '-', 'Central de Monitoramento (CFTV)', resp.recebeu?.dataHora ? formatDataHoraBR(resp.recebeu.dataHora) : '-'],
      ['Analisou (Auditoria):', resp.analisou?.nome || '-', 'Prevenção e Auditoria', resp.analisou?.dataHora ? formatDataHoraBR(resp.analisou.dataHora) : '-'],
      ['Autorizou Encerramento:', resp.autorizouEncerramento?.nome || '-', 'Gerência Operacional', resp.autorizouEncerramento?.dataHora ? formatDataHoraBR(resp.autorizouEncerramento.dataHora) : '-'],
    ],
    showHead: 'everyPage',
  });

  // --- RODAPÉ OFICIAL EM TODAS AS PÁGINAS ---
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Linha divisória de rodapé
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 9, pageWidth - margin, pageHeight - 9);

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      'Copyright © 2026 JSA Soluções Tecnológicas. All rights reserved.',
      margin,
      pageHeight - 4.5
    );
    doc.text(
      `BIG MASTER • Gestão de Prevenção de Perdas | Ocorrência: ${oc.numero || '-'} | Página ${i} de ${totalPages}`,
      pageWidth - margin,
      pageHeight - 4.5,
      { align: 'right' }
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
