// export function gerarContratoDaOS(os) {

//   const dataHoje = new Date().toLocaleDateString('pt-BR');

//   const texto = `
// CONTRATO DE ADESÃO PARA PRESTAÇÃO DE SERVIÇO DE INTERNET

// CONTRATADA: JSA Soluções Tecnológicas
// CNPJ: 63.061.124/0001-05
// Telefone: (65) 98402-7342
// Endereço: Rua Benedito Pereira de Oliveira, n. 3879-W Jd. Monte Líbano
// Email: jsa.tech.jsa@gmail.com

// CONTRATANTE: ${os.cliente?.nome || ''}
// CPF/CNPJ: ${os.cliente?.documento || ''}
// Endereço de instalação: ${os.cliente?.endereco || ''}
// Telefone: ${os.cliente?.telefone || ''}

// 1. OBJETO DO CONTRATO
// Prestação de serviço de acesso à internet banda larga.

// 2. VELOCIDADE CONTRATADA
// Velocidade contratada: ______ Mbps

// 3. EQUIPAMENTOS
// Equipamento: ${os.equipamento?.marca || ''} ${os.equipamento?.modelo || ''}
// Número de Série: ${os.equipamento?.serie || ''}

// 4. SERVIÇOS
// ${os.servicos || ''}

// 5. PEÇAS
// ${os.pecas || ''}

// 6. CUSTOS
// Valor do serviço: R$ ${os.custos || '0,00'}

// 7. PRAZOS
// Início: ${os.prazoInicio || ''}
// Previsão de término: ${os.prazoFim || ''}

// 8. FORMA DE PAGAMENTO
// ${os.pagamento || ''}

// Local e Data: ${dataHoje}

// CONTRATANTE: ${os.cliente?.nome || ''}

// Assinatura: _______________________________

// CONTRATADA: JSA Soluções Tecnológicas

// Técnico Responsável: ${os.tecnico || ''}

// Assinatura: _______________________________
// `;

//   return {
//     parceiro: os.cliente?.nome || '',
//     descricao: `Contrato OS ${os.numeroOS}`,
//     valor: os.custos || 0,
//     vencimento: os.prazoFim || new Date().toISOString().slice(0,10),
//     texto
//   };

// }


// ------------------------------------------------------
// export function gerarContratoDaOS(os) {

//   const dataHoje = new Date().toLocaleDateString('pt-BR');

//   const texto = `
// CONTRATO DE ADESÃO PARA PRESTAÇÃO DE SERVIÇO DE INTERNET

// CONTRATADA: JSA Soluções Tecnológicas
// CNPJ: 63.061.124/0001-05
// Telefone: (65) 98402-7342
// Email: jsa.tech.jsa@gmail.com

// CONTRATANTE: ${os.cliente?.nome || ''}
// CPF/CNPJ: ${os.cliente?.documento || ''}
// Endereço de instalação: ${os.cliente?.endereco || ''}
// Telefone: ${os.cliente?.telefone || ''}

// Equipamento: ${os.equipamento?.marca || ''} ${os.equipamento?.modelo || ''}
// Série: ${os.equipamento?.serie || ''}

// Serviço: ${os.servicos || ''}

// Peças: ${os.pecas || ''}

// Valor: R$ ${os.custos || ''}

// Início: ${os.prazoInicio || ''}
// Fim: ${os.prazoFim || ''}

// Pagamento: ${os.pagamento || ''}

// Técnico: ${os.tecnico || ''}

// Data: ${dataHoje}

// Assinatura Cliente: ______________________

// Assinatura Técnico: ______________________
// `;

//   return {
//     parceiro: os.cliente?.nome || '',
//     descricao: `Contrato OS ${os.numeroOS}`,
//     valor: os.custos || 0,
//     vencimento: os.prazoFim || '',
//     texto
//   };

// }

// ---------------------------------------------------------

export function gerarContratoDaOS(os) {

  const dataHoje = new Date().toLocaleDateString('pt-BR');

  const texto = `
CONTRATO DE ADESÃO PARA PRESTAÇÃO DE SERVIÇO DE INTERNET

CONTRATADA: JSA Soluções Tecnológicas
CPF/CNPJ: 63.061.124/0001-05
Telefone: (65) 98402-7342

CONTRATANTE: ${os.cliente?.nome || ''}
CPF/CNPJ: ${os.cliente?.documento || ''}
Endereço: ${os.cliente?.endereco || ''}
Telefone: ${os.cliente?.telefone || ''}

Equipamento: ${os.equipamento?.marca || ''} ${os.equipamento?.modelo || ''}
Série: ${os.equipamento?.serie || ''}

Serviços: ${os.servicos || ''}
Peças: ${os.pecas || ''}

Valor: R$ ${os.valorPagamento || os.custos || '0,00'}

Início: ${os.prazoInicio || ''}
Fim: ${os.prazoFim || ''}

Pagamento: ${os.formaPagamento || os.pagamento || ''}

Técnico: ${os.tecnico || ''}

Data: ${dataHoje}
`;

  return {
    parceiro: os.cliente?.nome || '',
    descricao: `Contrato OS ${os.numeroOS}`,
    valor: os.valorPagamento || os.custos || 0,
    vencimento: os.prazoFim || '',
    texto
  };

}