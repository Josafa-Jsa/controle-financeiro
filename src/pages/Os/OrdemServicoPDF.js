import jsPDF from 'jspdf';

const gerarPDF = (dados, termos) => {
  try {
    const doc = new jsPDF();

    const texto = `
JSA-TECH, Telecon e Segurança

Número OS: ${dados.numeroOS}

=== Dados do Cliente ===
Nome: ${dados.cliente.nome}
Telefone: ${dados.cliente.telefone}
Endereço: ${dados.cliente.endereco}
Email: ${dados.cliente.email}
CPF/CNPJ: ${dados.cliente.documento}

=== Equipamento ===
Marca: ${dados.equipamento.marca}
Modelo: ${dados.equipamento.modelo}
Série: ${dados.equipamento.serie}
Problema: ${dados.equipamento.problema}

=== Serviços ===
${dados.servicos}

=== Peças e Materiais ===
${dados.pecas}

=== Custos ===
${dados.custos}

=== Prazos ===
Início: ${dados.prazoInicio}
Previsão Término: ${dados.prazoFim}

=== Pagamento ===
Forma: ${dados.pagamento}

=== Técnico ===
${dados.tecnico}

=== Dados da Empresa ===
JSA-TECH, Telecon e Segurança
CPF/CNPJ: 049.032.411-81
Telefone: (65) 98402-7342
Endereço: Rua Benedito Pereira de Oliveira, n. 3879-W Jd. Monte Líbano
Email: jsa.tech.jsa@gmail.com

=== Termos e Condições ===
${termos}

Assinatura do Cliente: _______________________

Assinatura do Técnico: _______________________
`;

    doc.setFontSize(10);
    const linhas = doc.splitTextToSize(texto, 180); // largura máxima de 180mm
    doc.text(linhas, 10, 10);
    doc.save(`${dados.numeroOS}.pdf`);
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
  }
};

export default gerarPDF;
