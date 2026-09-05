import pool from '../../../server/src/config/db.js';
import fs from 'fs';
import path from 'path';

async function run() {
  try {
    console.log('--- Corrigindo notas e contas no banco MySQL ---');

    // 1. Atualizar notas existentes de admin
    await pool.query(`
      UPDATE notas 
      SET user_email = 'jsa@jsa.com', user_id = '16330', user_name = 'JSA Admin', filial = 'Filial 4' 
      WHERE user_email IS NULL OR user_email = ''
    `);

    // 2. Inserir as 3 notas fiscais do usuario intelbraslemes@gmail.com
    const notasParaInserir = [
      {
        id: 1788555489641,
        numero: '192881',
        tipo: 'NFe',
        chavedeacesso: '',
        cliente_ou_servico: 'COMBUSTIVEL',
        origem: 'COMBUSTIVEL',
        valor: 50.00,
        data_emissao: '2026-07-07',
        status: 'Emitida',
        tipo_conta: 'Receber',
        filial: 'Filial 4',
        user_email: 'intelbraslemes@gmail.com',
        user_id: '3',
        user_name: 'intelbraslemes'
      },
      {
        id: 1788555489610,
        numero: '193290',
        tipo: 'NFe',
        chavedeacesso: '',
        cliente_ou_servico: 'COMBUSTIVEL',
        origem: 'COMBUSTIVEL',
        valor: 50.00,
        data_emissao: '2026-08-06',
        status: 'Emitida',
        tipo_conta: 'Receber',
        filial: 'Filial 4',
        user_email: 'intelbraslemes@gmail.com',
        user_id: '3',
        user_name: 'intelbraslemes'
      },
      {
        id: 1788555489558,
        numero: '45767',
        tipo: 'NFe',
        chavedeacesso: '',
        cliente_ou_servico: 'COMBUSTIVEL',
        origem: 'COMBUSTIVEL',
        valor: 128.18,
        data_emissao: '2026-09-03',
        status: 'Emitida',
        tipo_conta: 'Receber',
        filial: 'Filial 4',
        user_email: 'intelbraslemes@gmail.com',
        user_id: '3',
        user_name: 'intelbraslemes'
      }
    ];

    for (const n of notasParaInserir) {
      const [existing] = await pool.query('SELECT id FROM notas WHERE numero = ? AND user_email = ?', [n.numero, n.user_email]);
      if (existing.length === 0) {
        await pool.query(`
          INSERT INTO notas (id, numero, tipo, chavedeacesso, cliente_ou_servico, origem, valor, data_emissao, status, tipo_conta, filial, user_email, user_id, user_name)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [n.id, n.numero, n.tipo, n.chavedeacesso, n.cliente_ou_servico, n.origem, n.valor, n.data_emissao, n.status, n.tipo_conta, n.filial, n.user_email, n.user_id, n.user_name]);
        console.log('Nota inserida com sucesso:', n.numero);
      } else {
        await pool.query(`
          UPDATE notas SET valor = ?, data_emissao = ?, tipo_conta = ?, filial = ?, user_email = ?, user_id = ?, user_name = ?
          WHERE id = ?
        `, [n.valor, n.data_emissao, n.tipo_conta, n.filial, n.user_email, n.user_id, n.user_name, existing[0].id]);
        console.log('Nota atualizada com sucesso:', n.numero);
      }
    }

    // 3. Garantir as 5 contas do usuario intelbraslemes@gmail.com no banco MySQL
    const contasIntelbrasIds = [1788555489641, 1788555489610, 1788555562147, 1788555489558, 1788555596274];
    await pool.query(`
      UPDATE contas 
      SET user_email = 'intelbraslemes@gmail.com', user_id = '3' 
      WHERE id IN (?, ?, ?, ?, ?)
    `, contasIntelbrasIds);

    console.log('Contas de intelbraslemes@gmail.com atualizadas com sucesso!');

    // 4. Atualizar fallback JSON de contas (server/data/contas.json)
    const contasJsonPath = path.resolve('server/data/contas.json');
    if (fs.existsSync(contasJsonPath)) {
      const raw = fs.readFileSync(contasJsonPath, 'utf-8');
      const list = JSON.parse(raw || '[]');
      const updatedList = list.map((c) => {
        if (contasIntelbrasIds.includes(Number(c.id))) {
          return {
            ...c,
            userEmail: 'intelbraslemes@gmail.com',
            userId: '3'
          };
        }
        return c;
      });
      fs.writeFileSync(contasJsonPath, JSON.stringify(updatedList, null, 2), 'utf-8');
      console.log('Fallback server/data/contas.json atualizado!');
    }

    const [allNotas] = await pool.query('SELECT id, numero, user_email, valor, filial FROM notas');
    console.log('NOTAS ATUAIS:', allNotas);

    const [allContas] = await pool.query('SELECT id, descricao, user_email, valor FROM contas');
    console.log('CONTAS ATUAIS:', allContas);

  } catch (err) {
    console.error('Erro na execução:', err);
  }
  process.exit();
}

run();
