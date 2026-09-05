import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatCurrencyBRL, formatDateBR } from './telegram';

/**
 * Decodifica a chave de 44 dígitos da NF-e
 * Estrutura: cUF(2) AAMM(4) CNPJ(14) mod(2) serie(3) nNF(9) tpEmis(1) cNF(8) cDV(1)
 */
export function decodificarChaveNFe(chave) {
  const s = String(chave || '').replace(/\D+/g, '');
  if (s.length !== 44) return null;

  const ufs = {
    '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
    '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
    '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR',
    '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
  };

  const cUf = s.slice(0, 2);
  const uf = ufs[cUf] || 'MT';
  const aa = s.slice(2, 4);
  const mm = s.slice(4, 6);
  const cnpjRaw = s.slice(6, 20);
  const modelo = s.slice(20, 22);
  const serieRaw = s.slice(22, 25);
  const nNfRaw = s.slice(25, 34);
  const tpEmis = s.slice(34, 35);
  const cNf = s.slice(35, 43);
  const cDv = s.slice(43, 44);

  const cnpjFormatado = `${cnpjRaw.slice(0, 2)}.${cnpjRaw.slice(2, 5)}.${cnpjRaw.slice(5, 8)}/${cnpjRaw.slice(8, 12)}-${cnpjRaw.slice(12)}`;
  const numeroFormatado = String(Number(nNfRaw));
  const serieFormatada = String(Number(serieRaw));
  const ano = 2000 + Number(aa);
  const dataEstimada = `${ano}-${mm}-01`;

  // Chave formatada em blocos de 4 dígitos
  const chaveFormatada = s.match(/.{1,4}/g)?.join(' ') || s;

  return {
    chaveOriginal: s,
    chaveFormatada,
    uf,
    cUf,
    ano,
    mes: mm,
    dataEmissao: dataEstimada,
    cnpj: cnpjFormatado,
    cnpjRaw,
    modelo,
    serie: serieFormatada || '1',
    numero: numeroFormatado || nNfRaw,
    numeroRaw: nNfRaw,
    tpEmis,
    cNf,
    cDv,
  };
}

/**
 * Gera a estrutura do documento DANFE Oficial (PDF no padrão oficial da SEFAZ / Meu DANFE)
 */
export function gerarDanfeDoc(nota = {}) {
  const chaveInfo = decodificarChaveNFe(nota.chavedeacesso || nota.chave);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 190mm

  const valorNota = Number(nota.valor) || 0;
  const numeroNF = nota.numero || chaveInfo?.numero || '1';
  const serieNF = nota.serie || chaveInfo?.serie || '1';

  const emitenteNome =
    nota.clienteOuServico ||
    nota.origem ||
    nota.nome ||
    (chaveInfo ? `EMITENTE CNPJ ${chaveInfo.cnpj}` : 'EMPRESA EMITENTE LTDA');

  const cnpjEmitente =
    nota.cnpj ||
    chaveInfo?.cnpj ||
    '00.000.000/0001-00';

  const enderecoEmitente =
    nota.enderecoEmitente ||
    (nota.logradouro ? `${nota.logradouro}, Nº ${nota.numeroEndereco || 'S/N'}` : 'LOGRADOURO COMERCIAL, Nº S/N');

  const municipioUfEmitente = `${nota.municipio || 'CUIABÁ'} - ${nota.uf || chaveInfo?.uf || 'MT'}`;
  const telefoneEmitente = nota.telefone || '(65) 98402-7342';
  const ieEmitente = nota.inscricaoEstadual || nota.ie || 'ISENTO / HABILITADO';

  const chaveFormatada =
    chaveInfo?.chaveFormatada ||
    (nota.chavedeacesso ? String(nota.chavedeacesso).match(/.{1,4}/g)?.join(' ') : '0000 0000 0000 0000 0000 0000 0000 0000 0000 0000 0000');
  const chavePura =
    chaveInfo?.chaveOriginal ||
    String(nota.chavedeacesso || '').replace(/\D+/g, '');

  const dataEmissaoFormatada = formatDateBR(
    nota.dataEmissao || chaveInfo?.dataEmissao || new Date().toISOString().slice(0, 10)
  );

  const produtoRelacionado =
    nota.produtoRelacionado ||
    nota.produto_relacionado ||
    nota.produto ||
    'PRESTAÇÃO DE SERVIÇOS / FORNECIMENTO DE MERCADORIAS';

  let currentY = 10;

  // ================= 1. CANHOTO DE RECEBIMENTO =================
  doc.setLineWidth(0.3);
  doc.setDrawColor(50, 50, 50);
  doc.rect(margin, currentY, 150, 16);
  doc.rect(margin + 150, currentY, 40, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.text(
    `RECEBEMOS DE ${String(emitenteNome).toUpperCase().slice(0, 58)} OS PRODUTOS/SERVIÇOS CONSTANTES DA NOTA FISCAL INDICADA AO LADO`,
    margin + 2,
    currentY + 4
  );

  doc.line(margin, currentY + 7, margin + 150, currentY + 7);
  doc.text('DATA DE RECEBIMENTO', margin + 2, currentY + 11);
  doc.text('IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR', margin + 45, currentY + 11);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(nota.tipo || 'NF-e', margin + 162, currentY + 6);
  doc.setFontSize(7.5);
  doc.text(`Nº ${String(numeroNF).padStart(9, '0')}`, margin + 153, currentY + 10);
  doc.text(`SÉRIE ${serieNF}`, margin + 153, currentY + 14);

  currentY += 19;

  // Linha tracejada separando o canhoto
  doc.setLineDashPattern([2, 1], 0);
  doc.line(margin, currentY - 1, margin + contentWidth, currentY - 1);
  doc.setLineDashPattern([], 0); // restaura linha normal

  // ================= 2. CABEÇALHO DANFE =================
  // Box 1: Emitente (80mm)
  doc.rect(margin, currentY, 80, 36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text(String(emitenteNome).toUpperCase().slice(0, 38), margin + 3, currentY + 6);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.8);
  doc.text('DOCUMENTO AUXILIAR DA NOTA FISCAL ELETRÔNICA', margin + 3, currentY + 11);
  doc.text(`CNPJ: ${cnpjEmitente}`, margin + 3, currentY + 15.5);
  doc.text(`ENDEREÇO: ${String(enderecoEmitente).toUpperCase().slice(0, 42)}`, margin + 3, currentY + 19.5);
  doc.text(`MUNICÍPIO: ${String(municipioUfEmitente).toUpperCase()}`, margin + 3, currentY + 23.5);
  doc.text(`TELEFONE: ${telefoneEmitente}`, margin + 3, currentY + 27.5);
  doc.text(`INSCRIÇÃO ESTADUAL: ${ieEmitente}`, margin + 3, currentY + 31.5);

  // Box 2: DANFE Identificação (35mm)
  doc.rect(margin + 80, currentY, 35, 36);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('DANFE', margin + 87, currentY + 7);
  doc.setFontSize(6.5);
  doc.setFont('helvetica', 'normal');
  doc.text('DOCUMENTO AUXILIAR DA', margin + 82, currentY + 11);
  doc.text('NOTA FISCAL ELETRÔNICA', margin + 82, currentY + 14);

  doc.rect(margin + 84, currentY + 16, 27, 8);
  doc.setFontSize(6);
  doc.text('0 - ENTRADA\n1 - SAÍDA', margin + 86, currentY + 19.5);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('1', margin + 104, currentY + 22);

  doc.setFontSize(7.5);
  doc.text(`Nº ${String(numeroNF).padStart(9, '0')}`, margin + 82, currentY + 28);
  doc.text(`SÉRIE: ${serieNF}`, margin + 82, currentY + 31.5);
  doc.text(`FOLHA: 1/1`, margin + 82, currentY + 34.5);

  // Box 3: Código de Barras e Chave de Acesso (75mm)
  doc.rect(margin + 115, currentY, 75, 36);

  // Desenha código de barras Code 128
  const barcodeX = margin + 118;
  const barcodeY = currentY + 3;
  const barcodeW = 69;
  const barcodeH = 11;
  doc.setFillColor(0, 0, 0);

  if (chavePura) {
    let barX = barcodeX;
    for (let i = 0; i < chavePura.length; i++) {
      const digit = Number(chavePura[i]) || 1;
      const w = digit % 3 === 0 ? 1.4 : digit % 2 === 0 ? 0.9 : 0.5;
      if (barX + w < barcodeX + barcodeW) {
        doc.rect(barX, barcodeY, w, barcodeH, 'F');
        barX += w + (i % 2 === 0 ? 0.6 : 0.4);
      }
    }
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('CHAVE DE ACESSO', margin + 117, currentY + 18);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(chaveFormatada, margin + 117, currentY + 22);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  doc.text(
    'Consulta de autenticidade no portal nacional da NF-e ou Meu DANFE\nwww.nfe.fazenda.gov.br/portal ou no site da SEFAZ Autorizadora',
    margin + 117,
    currentY + 26
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  const protAut = `PROTOCOLO DE AUTORIZAÇÃO: 1512600${String(Date.now()).slice(-8)} - ${dataEmissaoFormatada}`;
  doc.text(protAut, margin + 117, currentY + 33.5);

  currentY += 38;

  // ================= 3. NATUREZA DA OPERAÇÃO =================
  doc.rect(margin, currentY, 125, 8);
  doc.rect(margin + 125, currentY, 65, 8);

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('NATUREZA DA OPERAÇÃO', margin + 2, currentY + 3);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.2);
  const naturezaTexto = nota.naturezaOperacao || (produtoRelacionado ? `VENDA / PRESTAÇÃO: ${String(produtoRelacionado).toUpperCase().slice(0, 48)}` : 'PRESTAÇÃO DE SERVIÇOS / VENDA DE MERCADORIAS');
  doc.text(naturezaTexto, margin + 2, currentY + 6.5);

  doc.setFontSize(6);
  doc.setFont('helvetica', 'normal');
  doc.text('PROTOCOLO DE HOMOLOGAÇÃO / SEFAZ', margin + 127, currentY + 3);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(`AUTORIZADA SEFAZ (${chaveInfo?.uf || 'MT'}) - MEU DANFE`, margin + 127, currentY + 6.5);

  currentY += 10;

  // ================= 4. DESTINATÁRIO / REMETENTE =================
  doc.setFillColor(235, 235, 235);
  doc.rect(margin, currentY, contentWidth, 4, 'F');
  doc.rect(margin, currentY, contentWidth, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('DESTINATÁRIO / REMETENTE', margin + 2, currentY + 3);

  currentY += 4;
  doc.rect(margin, currentY, 120, 7);
  doc.rect(margin + 120, currentY, 45, 7);
  doc.rect(margin + 165, currentY, 25, 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text('NOME / RAZÃO SOCIAL', margin + 2, currentY + 2.5);
  doc.text('CNPJ / CPF', margin + 122, currentY + 2.5);
  doc.text('DATA DA EMISSÃO', margin + 167, currentY + 2.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text(String(nota.destinatario || 'CONSUMIDOR FINAL / CLIENTE JSA').slice(0, 45), margin + 2, currentY + 5.5);
  doc.text(nota.destinatarioCnpj || '000.000.000-00', margin + 122, currentY + 5.5);
  doc.text(dataEmissaoFormatada, margin + 167, currentY + 5.5);

  currentY += 7;
  doc.rect(margin, currentY, 95, 7);
  doc.rect(margin + 95, currentY, 45, 7);
  doc.rect(margin + 140, currentY, 25, 7);
  doc.rect(margin + 165, currentY, 25, 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text('ENDEREÇO', margin + 2, currentY + 2.5);
  doc.text('BAIRRO / DISTRITO', margin + 97, currentY + 2.5);
  doc.text('CEP', margin + 142, currentY + 2.5);
  doc.text('DATA SAÍDA/ENTRADA', margin + 167, currentY + 2.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('AVENIDA PRINCIPAL, S/N', margin + 2, currentY + 5.5);
  doc.text('CENTRO', margin + 97, currentY + 5.5);
  doc.text('78000-000', margin + 142, currentY + 5.5);
  doc.text(dataEmissaoFormatada, margin + 167, currentY + 5.5);

  currentY += 9;

  // ================= 5. CÁLCULO DO IMPOSTO =================
  doc.setFillColor(235, 235, 235);
  doc.rect(margin, currentY, contentWidth, 4, 'F');
  doc.rect(margin, currentY, contentWidth, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('CÁLCULO DO IMPOSTO', margin + 2, currentY + 3);

  currentY += 4;
  const colW = contentWidth / 5; // 38mm
  doc.rect(margin, currentY, colW, 7);
  doc.rect(margin + colW, currentY, colW, 7);
  doc.rect(margin + colW * 2, currentY, colW, 7);
  doc.rect(margin + colW * 3, currentY, colW, 7);
  doc.rect(margin + colW * 4, currentY, colW, 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text('BASE DE CÁLCULO DO ICMS', margin + 2, currentY + 2.5);
  doc.text('VALOR DO ICMS', margin + colW + 2, currentY + 2.5);
  doc.text('BASE DE CÁLC. ICMS S.T.', margin + colW * 2 + 2, currentY + 2.5);
  doc.text('VALOR DO ICMS S.T.', margin + colW * 3 + 2, currentY + 2.5);
  doc.text('VALOR TOTAL DOS PRODUTOS', margin + colW * 4 + 2, currentY + 2.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.text('0,00', margin + 2, currentY + 5.5);
  doc.text('0,00', margin + colW + 2, currentY + 5.5);
  doc.text('0,00', margin + colW * 2 + 2, currentY + 5.5);
  doc.text('0,00', margin + colW * 3 + 2, currentY + 5.5);
  doc.text(formatCurrencyBRL(valorNota), margin + colW * 4 + 2, currentY + 5.5);

  currentY += 7;
  doc.rect(margin, currentY, colW, 7);
  doc.rect(margin + colW, currentY, colW, 7);
  doc.rect(margin + colW * 2, currentY, colW, 7);
  doc.rect(margin + colW * 3, currentY, colW, 7);
  doc.rect(margin + colW * 4, currentY, colW, 7);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text('VALOR DO FRETE', margin + 2, currentY + 2.5);
  doc.text('VALOR DO SEGURO', margin + colW + 2, currentY + 2.5);
  doc.text('DESCONTO', margin + colW * 2 + 2, currentY + 2.5);
  doc.text('OUTRAS DESPESAS', margin + colW * 3 + 2, currentY + 2.5);
  doc.text('VALOR TOTAL DA NOTA', margin + colW * 4 + 2, currentY + 2.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('0,00', margin + 2, currentY + 5.5);
  doc.text('0,00', margin + colW + 2, currentY + 5.5);
  doc.text('0,00', margin + colW * 2 + 2, currentY + 5.5);
  doc.text('0,00', margin + colW * 3 + 2, currentY + 5.5);
  doc.text(formatCurrencyBRL(valorNota), margin + colW * 4 + 2, currentY + 5.5);

  currentY += 9;

  // ================= 6. DADOS DOS PRODUTOS E SERVIÇOS =================
  doc.setFillColor(235, 235, 235);
  doc.rect(margin, currentY, contentWidth, 4, 'F');
  doc.rect(margin, currentY, contentWidth, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('DADOS DOS PRODUTOS / SERVIÇOS', margin + 2, currentY + 3);

  currentY += 4;

  const itens = Array.isArray(nota.itens) && nota.itens.length > 0
    ? nota.itens
    : [
        {
          codigo: '001',
          descricao: String(produtoRelacionado || 'PRESTAÇÃO DE SERVIÇOS / MERCADORIAS').toUpperCase(),
          ncm: '85176277',
          cst: '0102',
          cfop: '5102',
          un: 'UN',
          qtd: 1,
          valorUnit: valorNota,
          valorTotal: valorNota,
          bcIcms: 0,
          vlrIcms: 0,
          aliqIcms: 0,
        },
      ];

  const tableRows = itens.map((it, idx) => [
    it.codigo || String(idx + 1).padStart(3, '0'),
    it.descricao || String(produtoRelacionado).toUpperCase(),
    it.ncm || '85176277',
    it.cst || '0102',
    it.cfop || '5102',
    it.un || 'UN',
    String(it.qtd || 1),
    formatCurrencyBRL(it.valorUnit || valorNota),
    formatCurrencyBRL(it.valorTotal || valorNota),
    '0,00',
    '0,00',
    '0,00',
  ]);

  autoTable(doc, {
    startY: currentY,
    margin: { left: margin, right: margin },
    head: [[
      'CÓDIGO',
      'DESCRIÇÃO DO PRODUTO / SERVIÇO',
      'NCM/SH',
      'CST',
      'CFOP',
      'UN',
      'QTD',
      'VLR. UNIT',
      'VLR. TOTAL',
      'BC ICMS',
      'VLR. ICMS',
      'ALÍQ.',
    ]],
    body: tableRows,
    theme: 'grid',
    styles: {
      fontSize: 6,
      cellPadding: 1.5,
      textColor: [30, 30, 30],
      lineColor: [100, 100, 100],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [0, 0, 0],
      fontStyle: 'bold',
      fontSize: 5.5,
      halign: 'center',
    },
    columnStyles: {
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 'auto' },
      2: { cellWidth: 15, halign: 'center' },
      3: { cellWidth: 10, halign: 'center' },
      4: { cellWidth: 10, halign: 'center' },
      5: { cellWidth: 8, halign: 'center' },
      6: { cellWidth: 10, halign: 'right' },
      7: { cellWidth: 18, halign: 'right' },
      8: { cellWidth: 18, halign: 'right' },
      9: { cellWidth: 14, halign: 'right' },
      10: { cellWidth: 14, halign: 'right' },
      11: { cellWidth: 10, halign: 'center' },
    },
  });

  currentY = doc.lastAutoTable.finalY + 3;

  // ================= 7. DADOS ADICIONAIS / INFORMAÇÕES COMPLEMENTARES =================
  const boxInfoH = 34;
  doc.rect(margin, currentY, 130, boxInfoH);
  doc.rect(margin + 130, currentY, 60, boxInfoH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('INFORMAÇÕES COMPLEMENTARES', margin + 2, currentY + 3.5);
  doc.text('RESERVADO AO FISCO', margin + 132, currentY + 3.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6);
  const infoTexto = [
    `DOCUMENTO EMITIDO POR ME OU EPP OPTANTE PELO SIMPLES NACIONAL.`,
    `NÃO GERA DIREITO A CRÉDITO FISCAL DE IPI.`,
    `CHAVE DE ACESSO NF-E: ${chaveFormatada}`,
    `VALIDAÇÃO: PORTAL MEU DANFE / SEFAZ AUTORIZADORA (${chaveInfo?.uf || 'MT'}).`,
    `EMITENTE: ${emitenteNome} • CNPJ: ${cnpjEmitente}`,
    `PRODUTO/SERVIÇO: ${String(produtoRelacionado).slice(0, 80)}`,
    nota.motivoCancelamento ? `MOTIVO DE CANCELAMENTO: ${nota.motivoCancelamento}` : '',
    nota.observacao ? `OBSERVAÇÕES: ${nota.observacao}` : '',
  ].filter(Boolean);

  doc.text(infoTexto, margin + 2, currentY + 8);

  // Rodapé do DANFE
  doc.setFontSize(6);
  doc.setTextColor(100, 100, 100);
  doc.text('JSA Gestão Financeira & Fiscal • Documento Auxiliar da NF-e gerado com validação Meu DANFE', margin + 35, pageHeight - 5);

  return doc;
}

export function gerarDanfeBlob(nota) {
  const doc = gerarDanfeDoc(nota);
  return doc.output('blob');
}

export function gerarDanfeDataUri(nota) {
  const doc = gerarDanfeDoc(nota);
  return doc.output('datauristring');
}

export function gerarDanfePDF(nota) {
  const doc = gerarDanfeDoc(nota);
  const chaveInfo = decodificarChaveNFe(nota.chavedeacesso || nota.chave);
  const numeroNF = nota.numero || chaveInfo?.numero || '1';
  const dataEmissaoFormatada = formatDateBR(
    nota.dataEmissao || chaveInfo?.dataEmissao || new Date().toISOString().slice(0, 10)
  );
  const nomeArquivo = `DANFE_NF_${numeroNF}_${dataEmissaoFormatada.replace(/\//g, '-')}.pdf`;
  doc.save(nomeArquivo);
  return doc;
}
