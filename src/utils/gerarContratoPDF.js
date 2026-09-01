import { jsPDF } from "jspdf";

export function gerarContratoPDF(os) {

  const doc = new jsPDF();

  const hoje = new Date().toLocaleDateString("pt-BR");

  const contrato = `
CONTRATO DE ADESÃO PARA PRESTAÇÃO DE SERVIÇO DE INTERNET

CONTRATADA: JSA Soluções Tecnológicas
CNPJ: 63.061.124/0001-05
Telefone: (65) 98402-7342
Endereço: Rua Benedito Pereira de Oliveira, n. 3879-W Jd. Monte Líbano
Email: jsa.tech.jsa@gmail.com

CONTRATANTE: ${os.cliente?.nome || ""}
CPF/CNPJ: ${os.cliente?.documento || ""}
Endereço de instalação: ${os.cliente?.endereco || ""}
Telefone: ${os.cliente?.telefone || ""}

1. OBJETO DO CONTRATO
O presente contrato tem como objeto a prestação de serviço de acesso à internet banda larga, incluindo o fornecimento, instalação e configuração dos equipamentos necessários para o funcionamento do serviço no endereço indicado pelo CONTRATANTE.

2. VELOCIDADE CONTRATADA
Velocidade contratada: ${os.velocidade || "______"} Mbps

3. EQUIPAMENTOS E INSTALAÇÃO
Para a prestação do serviço poderão ser utilizados equipamentos como: antena de recepção (WOM 5000 MIMO ou equivalente), base de fixação galvanizada, cabeamento de rede e roteador Wi-Fi.
Equipamento instalado: ${os.equipamento?.marca || ""} ${os.equipamento?.modelo || ""}
Número de série: ${os.equipamento?.serie || ""}

4. TAXA DE INSTALAÇÃO
Pela instalação e ativação do serviço poderá ser cobrada taxa de instalação conforme orçamento previamente apresentado ao CONTRATANTE.

5. MENSALIDADE
O CONTRATANTE pagará mensalmente pelo serviço de acesso à internet o valor correspondente ao plano contratado.
Valor da mensalidade: R$ ${os.valorPagamento || os.custos || ""}
Data de vencimento: ${os.prazoFim || "____/____/______"}

6. INADIMPLÊNCIA
O não pagamento da mensalidade até a data de vencimento poderá acarretar suspensão temporária do serviço até a regularização do débito, bem como possíveis encargos por atraso.

7. RESPONSABILIDADES DO CONTRATANTE
O CONTRATANTE compromete-se a utilizar o serviço de forma legal, não alterar a instalação dos equipamentos e permitir acesso técnico para manutenção sempre que necessário.

8. SUPORTE E MANUTENÇÃO
A CONTRATADA prestará suporte técnico para garantir o funcionamento adequado do serviço, podendo realizar manutenção preventiva ou corretiva.

9. CANCELAMENTO
O presente contrato poderá ser cancelado por qualquer das partes mediante solicitação prévia, devendo ser quitados todos os valores pendentes até a data do cancelamento.

Serviços realizados:
${os.servicos || ""}

Peças utilizadas:
${os.pecas || ""}

Técnico responsável:
${os.tecnico || ""}

Local e Data: ${hoje}

CONTRATANTE: ${os.cliente?.nome || ""}
Assinatura: ________________________________________________

CONTRATADA: JSA Soluções Tecnológicas
Responsável: ${os.tecnico || ""}
Assinatura: ________________________________________________
`;

  doc.setFont("Times","Normal");
  doc.setFontSize(12);

  const linhas = doc.splitTextToSize(contrato, 180);

  let y = 20;

  linhas.forEach((linha) => {

    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    doc.text(linha, 15, y);
    y += 7;

  });

  const blob = doc.output("blob");
  const url = URL.createObjectURL(blob);

  window.open(url);
}