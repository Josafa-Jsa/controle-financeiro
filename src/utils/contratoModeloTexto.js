// src/utils/contratoModeloTexto.js

export const DADOS_JSA_PADRAO = {
  razaoSocial: 'JSA Soluções Tecnológicas',
  cnpj: '63.061.124/0001-05',
  endereco: 'Rua Benedito Pereira de Oliveira, n. 3879-W Jd. Monte Líbano, Tangará da Serra - MT',
  telefone: '(65) 98402-7342',
  email: 'jsa.tech.jsa@gmail.com',
  representanteNome: 'Josafá Santos',
  representanteNacionalidade: 'brasileiro',
  representanteEstadoCivil: 'casado',
  representanteProfissao: 'Especialista em TI / Empresário',
  representanteRG: '1699793-2',
  representanteOrgaoRG: 'SSP/MT',
  representanteCPF: '049.032.411-81',
  representanteEndereco: 'Rua Benedito Pereira de Oliveira, n. 3879-W Jd. Monte Líbano, Tangará da Serra - MT',
  cargoRepresentante: 'Sócio Administrador',
  foroCidade: 'Tangará da Serra',
  foroUF: 'MT',
};

function formatarDataPorExtenso(dataStr) {
  try {
    const d = dataStr ? new Date(dataStr + 'T12:00:00') : new Date();
    const meses = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    return `${d.getDate()} de ${meses[d.getMonth()]} de ${d.getFullYear()}`;
  } catch {
    const hoje = new Date();
    return `${hoje.getDate()}/${hoje.getMonth() + 1}/${hoje.getFullYear()}`;
  }
}

export function montarTextoContrato(dados = {}) {
  const jsa = { ...DADOS_JSA_PADRAO, ...(dados.dadosContratada || {}) };
  const cli = dados.dadosContratante || {};

  const contratanteRazao = cli.razaoSocial || cli.nome || dados.parceiro || '[Razão Social da Contratante]';
  const contratanteDoc = cli.documento || cli.cnpj || cli.cpf || '[________]';
  const contratanteEndereco = cli.endereco || '[Endereço completo]';
  const isPJ = String(contratanteDoc).replace(/\D/g, '').length > 11 || cli.tipoPessoa === 'PJ';

  // Qualificação do Contratante
  let contratanteBloco = '';
  if (isPJ) {
    const repNome = cli.representanteNome || cli.nome || '[Nome completo]';
    const repNac = cli.representanteNacionalidade || 'brasileiro(a)';
    const repEstCivil = cli.representanteEstadoCivil || 'casado(a)';
    const repProf = cli.representanteProfissao || 'empresário(a)';
    const repRG = cli.representanteRG || '[________]';
    const repOrgao = cli.representanteOrgaoRG || 'SSP/UF';
    const repCPF = cli.representanteCPF || '[________]';
    const repEnd = cli.representanteEndereco || contratanteEndereco;

    contratanteBloco = `CONTRATANTE: ${contratanteRazao}, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o nº ${contratanteDoc}, com sede em ${contratanteEndereco}, neste ato representada na forma de seus atos constitutivos por seu representante legal, ${repNome}, ${repNac}, ${repEstCivil}, ${repProf}, portador do RG nº ${repRG} ${repOrgao} e inscrito no CPF/MF sob o nº ${repCPF}, residente e domiciliado em ${repEnd}.`;
  } else {
    const rg = cli.representanteRG || cli.rg || '[________]';
    contratanteBloco = `CONTRATANTE: ${contratanteRazao}, pessoa física de direito civil, inscrita no CPF/MF sob o nº ${contratanteDoc}, portador(a) do RG nº ${rg}, residente e domiciliado(a) em ${contratanteEndereco}.`;
  }

  // Cláusula 4 - Vigência
  let clausula4Texto = '';
  if (dados.tipoVigencia === 'determinado') {
    const diasIni = dados.diasInicio || '2';
    const prazoFim = dados.vencimento ? new Date(dados.vencimento + 'T12:00:00').toLocaleDateString('pt-BR') : '[DD/MM/AAAA]';
    clausula4Texto = `4.1. Os serviços terão início em até ${diasIni} dias a contar da assinatura deste contrato e deverão ser concluídos até a data de ${prazoFim}, conforme cronograma anexo (se houver).`;
  } else {
    clausula4Texto = `4.1. O presente contrato vigorará por prazo indeterminado a contar da sua assinatura, podendo ser rescindido nos termos da Cláusula Décima.`;
  }

  // Cláusula 6 - Exclusividade
  let clausula6Texto = '';
  if (dados.tipoExclusividade === 'com_exclusividade') {
    const seg = dados.segmentoExclusividade || 'tecnologia da informação e infraestrutura';
    clausula6Texto = `6.1. A CONTRATADA atuará COM EXCLUSIVIDADE no segmento de ${seg}, comprometendo-se a não prestar serviços congêneres a concorrentes diretos da CONTRATANTE enquanto vigentes os termos deste instrumento.`;
  } else {
    clausula6Texto = `6.1. O presente contrato é celebrado SEM CARÁTER DE EXCLUSIVIDADE, ficando a CONTRATADA autorizada a exercer suas atividades para terceiros, desde que resguardado o dever de sigilo e vedada a prestação concorrencial direta que cause prejuízo à CONTRATANTE.`;
  }

  // Cláusula 7 - Pagamento
  let clausula7Texto = '';
  const valorFormatado = Number(dados.valor || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
  const valorExtenso = dados.valorExtenso ? ` (${dados.valorExtenso})` : '';

  if (dados.tipoPagamento === 'parcelado') {
    const parcTexto = dados.parcelasDetalhes || `  a) Pagamento em parcelas conforme vencimentos pactuados.`;
    clausula7Texto = `7.1. Pelos serviços contratados, a CONTRATANTE pagará à CONTRATADA a importância total de R$ ${valorFormatado}${valorExtenso}, distribuída da seguinte forma:
${parcTexto}`;
  } else {
    const periodo = dados.periodoPagamento || 'mês';
    const diasAdimp = dados.diasAdimplemento || '5';
    clausula7Texto = `7.1. Pelos serviços contratados, a CONTRATANTE pagará à CONTRATADA o valor de R$ ${valorFormatado}${valorExtenso} por ${periodo}, a ser adimplido em até ${diasAdimp} dias após a entrega e validação do relatório/fatura e da nota fiscal.`;
  }

  const cidadeData = `${jsa.foroCidade} - ${jsa.foroUF}, ${formatarDataPorExtenso(dados.dataAssinatura)}`;

  return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS

DAS PARTES

CONTRATADA: ${jsa.razaoSocial}, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob o nº ${jsa.cnpj}, com sede em ${jsa.endereco}, neste ato representada na forma de seus atos constitutivos por seu representante legal, ${jsa.representanteNome}, ${jsa.representanteNacionalidade}, ${jsa.representanteEstadoCivil}, ${jsa.representanteProfissao}, portador do RG nº ${jsa.representanteRG} ${jsa.representanteOrgaoRG} e inscrito no CPF/MF sob o nº ${jsa.representanteCPF}, residente e domiciliado em ${jsa.representanteEndereco}; e

${contratanteBloco}

Têm entre si, justo e acordado, celebrar o presente CONTRATO DE PRESTAÇÃO DE SERVIÇOS, que se regerá pelas cláusulas e condições adiante estipuladas:

CLÁUSULA PRIMEIRA - DO OBJETO
1.1. O presente contrato tem por objeto a prestação de serviços profissionais especializados em ${dados.descricao || dados.objetoServico || '[especificar detalhadamente o serviço ou anexar memorial descritivo]'}, a serem executados pela CONTRATADA em conformidade com as diretrizes deste instrumento.

CLÁUSULA SEGUNDA - DAS OBRIGAÇÕES DA CONTRATANTE
2.1. Fornecer tempestivamente à CONTRATADA todas as informações, acessos, dados e subsídios necessários à perfeita execução dos serviços contratados.
2.2. Disponibilizar os seguintes recursos materiais e operacionais: ${dados.recursosOperacionais || 'não aplicável'}.
2.3. Efetuar o pagamento dos honorários ajustados nos estritos prazos e condições pactuados na Cláusula Sétima.
2.4. Designar um responsável técnico ou interlocutor direto para o alinhamento e validação das entregas.

CLÁUSULA TERCEIRA - DAS OBRIGAÇÕES DA CONTRATADA
3.1. Executar os serviços com zelo, diligência e rigor técnico, observando os prazos, métricas e especificações ajustadas.
3.2. Manter sigilo irrestrito sobre quaisquer informações estratégicas, dados, documentos e projetos da CONTRATANTE acessados em razão deste contrato, perdurando este dever mesmo após sua rescisão ou encerramento.
3.3. Não utilizar materiais, marcas ou dados da CONTRATANTE para fins diversos daqueles expressamente previstos neste instrumento, vedada a sua comercialização ou divulgação a terceiros sem autorização prévia por escrito.
3.4. Responsabilizar-se integralmente por todas as obrigações trabalhistas, previdenciárias, fiscais e securitárias relativas a seus empregados, prepostos e subcontratados envolvidos na prestação, mantendo a CONTRATANTE indene de qualquer litígio correlato.
3.5. Emitir e enviar a respectiva nota fiscal de prestação de serviços com antecedência mínima de ${dados.diasEnvioNF || '5'} dias em relação à data de vencimento do pagamento.

CLÁUSULA QUARTA - DO PRAZO E DA EXECUÇÃO
${clausula4Texto}

CLÁUSULA QUINTA - DOS NÍVEIS DE SERVIÇO E DESEMPENHO (SLA)
5.1. A execução dos serviços poderá ser submetida a avaliações periódicas para assegurar o padrão de qualidade exigido, mediante os seguintes parâmetros:
  a) Segurança: ${dados.slaSeguranca || 'conforme normas técnicas e vigentes'};
  b) Qualidade: ${dados.slaQualidade || 'aprovação formal dos entregáveis e validação técnica'};
  c) Pontualidade: ${dados.slaPontualidade || 'cumprimento rigoroso dos prazos e cronogramas acordados'};
  d) Comunicação: ${dados.slaComunicacao || `canais de atendimento corporativo ${jsa.telefone} e ${jsa.email}, com resposta em até 4h úteis`}.

CLÁUSULA SEXTA - DA (NÃO) EXCLUSIVIDADE
${clausula6Texto}

CLÁUSULA SÉTIMA - DO PREÇO E DAS CONDIÇÕES DE PAGAMENTO
${clausula7Texto}

7.2. O pagamento em atraso ensejará a incidência de multa moratória de 2% (dois por cento) sobre o montante inadimplido, acrescida de juros de 1% (um por cento) ao mês e correção monetária apurada pelo índice ${dados.indiceCorrecao || 'IPCA'}, calculados pro rata die até a data do efetivo pagamento.
7.3. O aceite e validação formal do serviço pela CONTRATANTE é condição indispensável para a quitação integral de cada etapa/entrega.

CLÁUSULA OITAVA - DA INADIMPLÊNCIA E RESCISÃO MOTIVADA
8.1. O descumprimento injustificado de quaisquer cláusulas deste instrumento facultará à parte inocente notificar formalmente a parte infratora para sanar o vício no prazo improrrogável de ${dados.diasSanarVicio || '5'} dias úteis.
8.2. Não regularizada a pendência no prazo estipulado, o contrato poderá ser rescindido de pleno direito, incidindo a parte inadimplente em multa penal não compensatória de ${dados.multaRescisao || '10'}% sobre o valor total do contrato, sem prejuízo de eventuais perdas e danos.

CLÁUSULA NONA - DA RESCISÃO IMOTIVADA
9.1. Qualquer das partes poderá rescindir o presente contrato sem justo motivo mediante aviso prévio por escrito, encaminhado com antecedência mínima de ${dados.diasAvisoPrevio || '30'} dias.
9.2. Na hipótese de resilição unilateral imotivada, a CONTRATANTE deverá remunerar proporcionalmente a CONTRATADA por todos os serviços executados e despesas incorridas até a data da efetiva extinção do vínculo.

CLÁUSULA DÉCIMA - DA PROTEÇÃO DE DADOS PESSOAIS (LGPD)
10.1. As partes comprometem-se a cumprir todas as exigências da Lei Geral de Proteção de Dados (Lei nº 13.709/2018), coletando e tratando dados pessoais estritamente necessários para a consecução e cumprimento do objeto do presente contrato (art. 7º, V, da LGPD) e para o atendimento de obrigações legais e regulatórias (art. 7º, II, da LGPD).
10.2. A CONTRATADA adotará medidas de segurança técnicas e administrativas aptas a resguardar os dados pessoais contra acessos não autorizados, vazamentos ou incidentes de segurança.

CLÁUSULA DÉCIMA PRIMEIRA - DA AUTONOMIA E AUSÊNCIA DE VÍNCULO EMPREGATÍCIO
11.1. As partes reconhecem expressamente que este contrato possui natureza eminentemente civil e empresarial, inexistindo qualquer vínculo de emprego, subordinação jurídica, habitualidade mandatória de jornada ou exclusividade compulsória entre a CONTRATANTE e os profissionais da CONTRATADA, nos termos do art. 442-B da Consolidação das Leis do Trabalho (CLT).

CLÁUSULA DÉCIMA SEGUNDA - DISPOSIÇÕES GERAIS
12.1. A tolerância de qualquer das partes quanto a infrações ou atrasos não implicará renúncia de direitos, novação contratual ou alteração das condições aqui pactuadas.
12.2. Se qualquer disposição deste instrumento for considerada inválida ou ineficaz, as demais cláusulas permanecerão vigentes e plenamente aplicáveis.

CLÁUSULA DÉCIMA TERCEIRA - DO FORO
13.1. Para dirimir quaisquer litígios decorrentes deste contrato, as partes elegem expressamente o foro da Comarca de ${jsa.foroCidade}/${jsa.foroUF}, com renúncia a qualquer outro, por mais privilegiado que seja.

E, por estarem assim justas e acordadas, assinam o presente instrumento em 2 (duas) vias de igual teor e forma, na presença das 2 (duas) testemunhas abaixo nomeadas.

${cidadeData}


_________________________________________
${jsa.razaoSocial.toUpperCase()}
Nome: ${jsa.representanteNome}
Cargo / Procurador: ${jsa.cargoRepresentante}

_________________________________________
${String(contratanteRazao).toUpperCase()}
Nome: ${cli.representanteNome || cli.nome || '[Nome do Representante]'}
Cargo / Procurador: ${cli.representanteCargo || 'Representante Legal'}


TESTEMUNHAS:

1. ______________________________________
Nome: ${dados.testemunha1Nome || '______________________________________'}
CPF: ${dados.testemunha1CPF || '________________________'}

2. ______________________________________
Nome: ${dados.testemunha2Nome || '______________________________________'}
CPF: ${dados.testemunha2CPF || '________________________'}
`.trim();
}
