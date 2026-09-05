import pool from '../config/db.js';
import fs from 'fs';
import path from 'path';

const ADMIN_EMAILS = ['jsa@jsa.com', 'jsa.admin@gmail.com', 'josafa.santos.jss@gmail.com'];

async function run() {
  try {
    console.log('--- Removendo cobranças SYS de usuários das Filiais 1 a 7 ---');

    // 1. Buscar usuários do banco para mapear filiais
    const [users] = await pool.query('SELECT id, email, role, filial FROM users');
    const userMap = new Map();
    users.forEach((u) => {
      if (u.email) userMap.set(String(u.email).toLowerCase().trim(), u);
      if (u.id) userMap.set(String(u.id).trim(), u);
    });

    // 2. Buscar todas as contas SYS_Liberação e Manutenção
    const [contasSys] = await pool.query("SELECT * FROM contas WHERE descricao = 'SYS_Liberação e Manutenção'");
    console.log(`Encontradas ${contasSys.length} contas de SYS_Liberação e Manutenção no banco.`);

    const idsParaDeletar = [];

    for (const c of contasSys) {
      const email = String(c.user_email || '').toLowerCase().trim();
      const id = String(c.user_id || '').trim();

      const userObj = userMap.get(email) || userMap.get(id);

      const isAdmin = ADMIN_EMAILS.includes(email) || userObj?.role === 'admin' || userObj?.role === 'ADMIN';
      const isFilialParticular = userObj?.filial === 'Filial Particular';

      if (!isAdmin && !isFilialParticular) {
        console.log(`Marcada para exclusão: ID ${c.id} (usuário: ${email || id || 'desconhecido'}, filial: ${userObj?.filial || 'Filial padrão'})`);
        idsParaDeletar.push(c.id);
      } else {
        console.log(`Mantida (ADMIN ou Filial Particular): ID ${c.id} (usuário: ${email}, filial: ${userObj?.filial})`);
      }
    }

    if (idsParaDeletar.length > 0) {
      await pool.query('DELETE FROM contas_baixas WHERE conta_id IN (?)', [idsParaDeletar]);
      await pool.query('DELETE FROM contas WHERE id IN (?)', [idsParaDeletar]);
      console.log(`✅ ${idsParaDeletar.length} contas SYS excluídas com sucesso do banco de dados MySQL.`);
    } else {
      console.log('Nenhuma conta SYS indevida encontrada no banco.');
    }

    // 3. Atualizar server/data/contas.json
    const jsonPath = path.resolve('server/data/contas.json');
    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, 'utf-8');
      const list = JSON.parse(raw || '[]');
      const filtered = list.filter((c) => {
        if (c.descricao !== 'SYS_Liberação e Manutenção') return true;
        const email = String(c.userEmail || '').toLowerCase().trim();
        const id = String(c.userId || '').trim();
        const userObj = userMap.get(email) || userMap.get(id);

        const isAdmin = ADMIN_EMAILS.includes(email) || userObj?.role === 'admin';
        const isFilialParticular = userObj?.filial === 'Filial Particular' || c.filial === 'Filial Particular';

        return isAdmin || isFilialParticular;
      });

      fs.writeFileSync(jsonPath, JSON.stringify(filtered, null, 2), 'utf-8');
      console.log('✅ Fallback server/data/contas.json atualizado com sucesso.');
    }

    // 4. Exibir estado final das contas
    const [contasFinais] = await pool.query('SELECT id, descricao, user_email, valor FROM contas');
    console.log('CONTAS FINAIS NO BANCO:', contasFinais);

  } catch (err) {
    console.error('Erro na execução:', err);
  }
  process.exit();
}

run();
