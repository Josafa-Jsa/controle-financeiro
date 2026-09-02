import pool from './server/src/config/db.js';

async function main() {
  const dadosNathalia = {
    numero: 'OC-2026-0001',
    nome: 'Bolacha oreo',
    status: 'Em Aberto',
    data: '2026-09-02',
    hora_inicio: '15:00',
    hora_termino: '15:30',
    tipo: 'Furto',
    classificacao: 'Média',
    local: 'sessao das bolachas',
    setor: 'correrdor das bebidas',
    descricao: 'Bolacha oreo',
    relato_fatos: 'o suspeito pegou a bolacha com atitude suspeita e foi desfarçando ate o corredor das bebidas percebeu que nao tinha ninguem a volta colou na cintura',
    medidas_adotadas: 'os seguranças abordaram fora da loja e trouxe ate a sala de cftv',
    pessoas_envolvidas: JSON.stringify([
      {
        id: 1,
        nome: 'Geraldo',
        documento: '-',
        vinculo: 'Terceiro',
        sexo: 'Masculino',
        vestimenta: 'camisa branca e bermuda escura',
        caracteristicas: 'oculos',
        identificacao: 'cameras'
      }
    ]),
    pessoa_envolvida: JSON.stringify({
      nome: 'Geraldo',
      vinculo: 'Terceiro'
    }),
    produtos_envolvidos: JSON.stringify([
      {
        id: 1,
        codigo: '0000000',
        nome: 'bolacha',
        categoria: '-',
        quantidade: 1,
        valorUnitario: 3.99,
        valorTotal: 3.99,
        recuperado: 'Sim',
        avaria: 'Não'
      }
    ]),
    valor_total_envolvido: 3.99,
    abordagem: JSON.stringify({
      houveAbordagem: 'Sim',
      data: '2026-09-02',
      hora: '15:00',
      local: 'sessao das bolachas (Área de Saída)',
      responsaveis: 'Nathalia Martins Girardi (Fiscal de Loja / Segurança)',
      recuperacaoMercadorias: 'Sim - Total',
      comportamento: 'Pacífico / Cooperativo',
      conducaoSalaReservada: 'Sim (Com presença de testemunhas)',
      acionamentoPolicial: 'Sim - Polícia Militar',
      numeroBoletim: '',
      numeroBoletimCisc: '',
      relatoAbordagem: 'os seguranças ja estava esperando o suspeito pelo lado de fora da loja, e trouxe o suspeito ate a sala cftv sem contato fisico, chegando ma sala o suspeito tiro a bolacha da cintura'
    }),
    evidencias: JSON.stringify([
      {
        id: 1,
        numeroSequencial: '#001',
        tipo: 'Vídeo',
        camera: 'DVR 202 CANAL 1',
        local: 'sessao das bolachas',
        data: '2026-09-02',
        horaInicio: '15:00:00',
        horaFim: '15:30:00',
        arquivoNome: 'FURTO SESSAO DAS BOLACHA',
        tamanhoStr: 'MP4',
        adicionadoPor: 'Nathalia Martins Girardi',
        dataHoraUpload: '2026-09-02T15:43:36.000Z'
      }
    ]),
    responsaveis_registro: JSON.stringify({
      emitidoPor: {
        nome: 'Nathalia Martins Girardi',
        cargo: 'Prevenção de Perdas',
        dataHora: '2026-09-02T15:24:59.000Z'
      },
      atendeu: {
        nome: 'Nathalia Martins Girardi',
        cargo: 'Fiscal de Loja / Segurança',
        dataHora: '2026-09-02T15:40:42.000Z'
      }
    }),
    historico_custodia: JSON.stringify([
      {
        id: 7,
        dataHora: '2026-09-02T15:47:53.000Z',
        usuario: 'Nathalia Martins Girardi',
        acao: 'Nathalia Martins Girardi atualizou a relação de produtos envolvidos (1 itens - Total R$ 3.99)'
      },
      {
        id: 6,
        dataHora: '2026-09-02T15:43:36.000Z',
        usuario: 'Nathalia Martins Girardi',
        acao: 'Nathalia Martins Girardi atualizou o acervo de evidências (1 itens)'
      },
      {
        id: 5,
        dataHora: '2026-09-02T15:40:50.000Z',
        usuario: 'Nathalia Martins Girardi',
        acao: 'Nathalia Martins Girardi visualizou a ocorrência e cadeia de custódia'
      },
      {
        id: 4,
        dataHora: '2026-09-02T15:40:42.000Z',
        usuario: 'Nathalia Martins Girardi',
        acao: 'Nathalia Martins Girardi registrou o relatório de abordagem da ocorrência'
      },
      {
        id: 3,
        dataHora: '2026-09-02T15:29:49.000Z',
        usuario: 'Nathalia Martins Girardi',
        acao: 'Nathalia Martins Girardi atualizou o registro de pessoas envolvidas (1 pessoa)'
      },
      {
        id: 2,
        dataHora: '2026-09-02T15:28:04.000Z',
        usuario: 'Nathalia Martins Girardi',
        acao: 'Nathalia Martins Girardi registrou o relato factual dos acontecimentos'
      },
      {
        id: 1,
        dataHora: '2026-09-02T15:24:59.000Z',
        usuario: 'Nathalia Martins Girardi',
        acao: 'Nathalia Martins Girardi registrou a ocorrência OC-2026-0001 no sistema'
      }
    ]),
    user_login: 'nathaliamartinsgirardi',
    user_email: 'nathalia.martins@bigmaster.com',
    registrado_por: 'Nathalia Martins Girardi'
  };

  const sql = `
    UPDATE prevencao SET
      nome = ?,
      status = ?,
      data = ?,
      hora_inicio = ?,
      hora_termino = ?,
      tipo = ?,
      classificacao = ?,
      local = ?,
      setor = ?,
      descricao = ?,
      relato_fatos = ?,
      medidas_adotadas = ?,
      pessoas_envolvidas = ?,
      pessoa_envolvida = ?,
      produtos_envolvidos = ?,
      valor_total_envolvido = ?,
      abordagem = ?,
      evidencias = ?,
      responsaveis_registro = ?,
      historico_custodia = ?,
      user_login = ?,
      user_email = ?,
      registrado_por = ?
    WHERE numero = 'OC-2026-0001' OR id = 2
  `;

  const values = [
    dadosNathalia.nome,
    dadosNathalia.status,
    dadosNathalia.data,
    dadosNathalia.hora_inicio,
    dadosNathalia.hora_termino,
    dadosNathalia.tipo,
    dadosNathalia.classificacao,
    dadosNathalia.local,
    dadosNathalia.setor,
    dadosNathalia.descricao,
    dadosNathalia.relato_fatos,
    dadosNathalia.medidas_adotadas,
    dadosNathalia.pessoas_envolvidas,
    dadosNathalia.pessoa_envolvida,
    dadosNathalia.produtos_envolvidos,
    dadosNathalia.valor_total_envolvido,
    dadosNathalia.abordagem,
    dadosNathalia.evidencias,
    dadosNathalia.responsaveis_registro,
    dadosNathalia.historico_custodia,
    dadosNathalia.user_login,
    dadosNathalia.user_email,
    dadosNathalia.registrado_por
  ];

  const [res] = await pool.query(sql, values);
  console.log('UPDATE SUCCESS:', res.affectedRows);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
