// src/data/termosCondicoes.js

export const MODELOS_TERMOS = [
    {
        id: 'conscientizacao',
        titulo: 'Declaração de Conscientização',
        subtitulo: 'Serviços solicitados previamente e termos gerais',
        icone: '📝',
        badge: 'Ciência / Geral',
        badgeCor: '#3b82f6',
        texto: `O cliente declara estar ciente de que os serviços executados foram solicitados previamente.
Os prazos e valores acordados estão sujeitos a alterações mediante negociação.
A garantia é válida apenas para os serviços descritos nesta Ordem de Serviço.
A JSA Soluções Tecnológicas, não se responsabiliza por danos decorrentes de mau uso do equipamento.`.trim(),
    },
    {
        id: 'garantia_servico',
        titulo: 'Garantia de Serviço (Formatação)',
        subtitulo: 'Garantia de 7 dias para serviços de formatação e BKP',
        icone: '💻',
        badge: '7 Dias Garantia',
        badgeCor: '#10b981',
        texto: `Garantia de 7 dias para serviços (FORMATAÇÃO) realizados.
Caso houver BKP, o prazo de armazenamento de espera, é de acordo ao prazo do serviço executado;
Sendo assim é de extrema importância, a validação e verificação dos dados retornados ao dispositivo restaurado!
Não nos responsabilizamos por danos causados por mau uso ou quedas.
Orçamentos são válidos por 3 dias a partir da data de emissão.`.trim(),
    },
    {
        id: 'garantia_troca_peca',
        titulo: 'Garantia de Troca de Peça e Manutenção',
        subtitulo: '90 dias para peças e 30 dias para manutenção',
        icone: '🔧',
        badge: '90 / 30 Dias',
        badgeCor: '#f59e0b',
        texto: `Garantia de 90 dias para troca de peças, 30 dias para manutenção da mesma.
Caso houver alguma avaria, cliente terá que informar de imediato, para que mesmo seja resolvildo dentro do prazo de garantia;
Sendo assim é de extrema importância, a validação e verificação dos equipamento retornado ao dispositivo restaurado!
Não nos responsabilizamos por danos causados por mau uso ou quedas.
Orçamentos são válidos por 3 dias a partir da data de emissão.`.trim(),
    },
];

export const obterTermoPorId = (id) => {
    const modelo = MODELOS_TERMOS.find((m) => m.id === id);
    return modelo ? modelo.texto : MODELOS_TERMOS[0].texto;
};

export const obterModeloTermo = (id) => {
    return MODELOS_TERMOS.find((m) => m.id === id) || MODELOS_TERMOS[0];
};

// Termo padrão exportado como default para compatibilidade direta
const termosCondicoes = MODELOS_TERMOS[0].texto;
export default termosCondicoes;
