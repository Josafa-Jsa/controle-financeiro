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

  // --- CABEÇALHO DO RELATÓRIO ---
  doc.setFillColor(15, 23, 42); // Navy escuro #0f172a
  doc.rect(margin, 10, contentWidth, 22, 'F');

  // Faixa decorativa ciano
  doc.setFillColor(56, 189, 248); // #38bdf8
  doc.rect(margin, 31, contentWidth, 1, 'F');

  // Título e Subtítulo
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11.5);
  doc.text('RELATÓRIO OFICIAL DE OCORRÊNCIA E PREVENÇÃO DE PERDAS', margin + 6, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(56, 189, 248);
  doc.text('JSA SOLUÇÕES TECNOLÓGICAS • DEPARTAMENTO DE PREVENÇÃO DE PERDAS', margin + 6, 24);

  // Metadados à direita
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  doc.text(`REGISTRO: ${oc.numero || 'OC-0000'}`, pageWidth - margin - 6, 17.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(`STATUS: ${String(oc.status || 'Em Aberto').toUpperCase()}  |  EMISSÃO: ${dataEmissao}`, pageWidth - margin - 6, 24, { align: 'right' });

  let y = 35;

  // --- BANNER DE DESTAQUE: REGISTRO DE EVIDÊNCIAS DIGITAIS ---
  if (temEvidencias) {
    doc.setFillColor(238, 242, 255); // Indigo claro
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(0.35);
    doc.roundedRect(margin, y, contentWidth, 8.5, 1.2, 1.2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(67, 56, 202);
    const txtMidias = `ACERVO PROBATÓRIO AUDITADO: ${imagens.length} REGISTRO(S) DE IMAGEM, ${videos.length} REGISTRO(S) DE VÍDEO E ${outrosAnexos.length} DOCUMENTO(S) VINCULADOS`;
    doc.text(txtMidias, margin + 4, y + 5.5, { maxWidth: contentWidth - 8 });

    y += 11.5;
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

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 7, textColor: [30, 41, 59], cellPadding: 2 },
    body: [
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
    ],
  });

  y = doc.lastAutoTable.finalY + 4;

  // --- 2. RELATO FACTUAL DOS FATOS E PROVIDÊNCIAS ---
  y = renderSectionHeader('2. RELATO FACTUAL DOS FATOS E PROVIDÊNCIAS', y);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    theme: 'grid',
    styles: { fontSize: 7, textColor: [30, 41, 59], cellPadding: 2.5 },
    body: [
      [
        {
          content: oc.relatoFatos
            ? `Descrição Factual dos Fatos:\n${oc.relatoFatos}`
            : 'Nenhum relato detalhado inserido.',
          styles: { fontStyle: 'italic', fillColor: [255, 255, 255] },
        },
      ],
      ...(oc.medidasAdotadas
        ? [
            [
              {
                content: `Providências e Medidas Adotadas:\n${oc.medidasAdotadas}`,
                styles: { fillColor: [248, 250, 252], fontStyle: 'normal' },
              },
            ],
          ]
        : []),
    ],
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

    const linhasPessoas = listaPessoas.map((p, idx) => [
      `#${idx + 1}`,
      p.nome || 'Não informado',
      p.clienteIdentificado === 'Sim' ? 'Cliente' : p.funcionario === 'Sim' ? 'Funcionário' : (p.tipoEnvolvido || 'Terceiro'),
      p.sexo || '-',
      p.vestimenta || '-',
      p.descricaoFisica || p.caracteristicas || '-',
      p.formaIdentificacao || p.cpf || '-',
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [67, 56, 202], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.8 },
      styles: { fontSize: 6.8, textColor: [30, 41, 59], cellPadding: 1.8 },
      head: [['#', 'Nome do Envolvido', 'Vínculo', 'Sexo', 'Vestimenta Observada', 'Características Físicas', 'Identificação']],
      body: linhasPessoas,
    });

    y = doc.lastAutoTable.finalY + 4;
  }

  // --- 4. RELAÇÃO DE PRODUTOS ENVOLVIDOS ---
  if (Array.isArray(oc.produtosEnvolvidos) && oc.produtosEnvolvidos.length > 0) {
    y = renderSectionHeader(`4. RELAÇÃO DE PRODUTOS ENVOLVIDOS (${oc.produtosEnvolvidos.length})`, y);

    const linhasProdutos = oc.produtosEnvolvidos.map((p) => [
      p.codigo || '-',
      p.produto || '-',
      String(p.quantidade || 1),
      formatBRL(p.valorUnitario),
      formatBRL(p.total),
      p.recuperado || 'Sim',
      p.avaria || 'Não',
    ]);

    linhasProdutos.push([
      { content: 'VALOR TOTAL ENVOLVIDO:', colSpan: 4, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249] } },
      { content: formatBRL(oc.valorTotalEnvolvido), styles: { fontStyle: 'bold', fillColor: [220, 252, 231], textColor: [22, 101, 52] } },
      { content: '', colSpan: 2, styles: { fillColor: [241, 245, 249] } },
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [4, 120, 87], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.8 },
      styles: { fontSize: 6.8, textColor: [30, 41, 59], cellPadding: 1.8 },
      head: [['Código', 'Produto / Mercadoria', 'Qtd.', 'Valor Unit.', 'Total (R$)', 'Recuperado?', 'Avaria?']],
      body: linhasProdutos,
    });

    y = doc.lastAutoTable.finalY + 4;
  }

  // --- 5. PROCEDIMENTO DE ABORDAGEM & SEGURANÇA ---
  if (oc.abordagem) {
    y = renderSectionHeader('5. PROCEDIMENTO DE ABORDAGEM & SEGURANÇA', y);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      styles: { fontSize: 6.8, textColor: [30, 41, 59], cellPadding: 2 },
      body: [
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
          { content: 'Polícia / Boletim:', styles: { fontStyle: 'bold', fillColor: [255, 237, 213] } },
          `${oc.abordagem.acionamentoPolicial || 'Não'} ${oc.abordagem.numeroBoletim ? `(B.O.: ${oc.abordagem.numeroBoletim})` : ''}`,
        ],
        ...(oc.abordagem.relatoAbordagem
          ? [
              [
                {
                  content: `Relato da Abordagem:\n${oc.abordagem.relatoAbordagem}`,
                  colSpan: 4,
                  styles: { fontStyle: 'italic', fillColor: [255, 247, 237] },
                },
              ],
            ]
          : []),
      ],
    });

    y = doc.lastAutoTable.finalY + 4;
  }

  // --- QUEBRA DE PÁGINA ESTRUTURADA PARA PAINEL DE AUDITORIA, CUSTÓDIA & RESPONSABILIDADES ---
  // Se estiver próximo do fim da página 1 (mais de 190mm), cria página 2 limpa para evidências e assinaturas
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
      headStyles: { fillColor: [2, 132, 199], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.8 },
      styles: { fontSize: 6.8, textColor: [30, 41, 59], cellPadding: 1.8 },
      head: [['Item', 'Tipo de Mídia', 'Câmera / Fonte', 'Local', 'Data / Período Gravado', 'Arquivo Vinculado', 'Adicionado por']],
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

  // --- 7. RASTREABILIDADE DA CADEIA DE CUSTÓDIA PROBATÓRIA ---
  if (Array.isArray(oc.historicoCustodia) && oc.historicoCustodia.length > 0) {
    if (y > pageHeight - 65) {
      doc.addPage();
      y = 14;
    }

    y = renderSectionHeader('7. RASTREABILIDADE DA CADEIA DE CUSTÓDIA', y);

    const linhasCustodia = oc.historicoCustodia.slice(0, 12).map((h) => [
      formatDataHoraBR(h.dataHora),
      h.usuario || 'Sistema',
      h.acao || '-',
    ]);

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      theme: 'grid',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.8 },
      styles: { fontSize: 6.8, textColor: [30, 41, 59], cellPadding: 1.8 },
      head: [['Data e Horário', 'Operador / Usuário', 'Ação / Despacho Probatório Registrado']],
      body: linhasCustodia,
      showHead: 'everyPage',
    });

    y = doc.lastAutoTable.finalY + 4;
  }

  // --- 8. MATRIZ DE RESPONSABILIDADES DO INCIDENTE ---
  if (y > pageHeight - 55) {
    doc.addPage();
    y = 14;
  }

  const resp = oc.responsaveisRegistro || {};

  y = renderSectionHeader('8. MATRIZ DE RESPONSABILIDADES DO INCIDENTE', y);

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

  y = doc.lastAutoTable.finalY + 8;

  // --- 9. TERMOS DE ENCERRAMENTO E ASSINATURAS FORMAIS ---
  if (y > pageHeight - 32) {
    doc.addPage();
    y = 20;
  }

  const colWidth = (contentWidth - 12) / 3;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.35);

  // Linha 1: Emissor
  doc.line(margin, y, margin + colWidth, y);
  doc.setFontSize(7.2);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(resp.emitidoPor?.nome || oc.registradoPor || 'Operador', margin + colWidth / 2, y + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Emissor / Prevenção de Perdas', margin + colWidth / 2, y + 7, { align: 'center' });

  // Linha 2: Atendeu / Fiscal
  const x2 = margin + colWidth + 6;
  doc.line(x2, y, x2 + colWidth, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(resp.atendeu?.nome || oc.abordagem?.responsaveis || 'Fiscal / Segurança', x2 + colWidth / 2, y + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Fiscal de Loja / Segurança', x2 + colWidth / 2, y + 7, { align: 'center' });

  // Linha 3: Gerência
  const x3 = x2 + colWidth + 6;
  doc.line(x3, y, x3 + colWidth, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42);
  doc.text(resp.autorizouEncerramento?.nome || 'Gerente Responsável', x3 + colWidth / 2, y + 3.5, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('Gerência / Diretoria', x3 + colWidth / 2, y + 7, { align: 'center' });

  // --- RODAPÉ OFICIAL EM TODAS AS PÁGINAS ---
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // Linha divisória de rodapé
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 8, pageWidth - margin, pageHeight - 8);

    doc.setFontSize(6.8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184);
    doc.text(
      `JSA Soluções Tecnológicas • Gestão de Prevenção de Perdas | Ocorrência: ${oc.numero || '-'} | Página ${i} de ${totalPages}`,
      pageWidth / 2,
      pageHeight - 4.5,
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
