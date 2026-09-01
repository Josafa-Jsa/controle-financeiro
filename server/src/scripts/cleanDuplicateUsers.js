import pool from '../config/db.js';

async function cleanDuplicates() {
  console.log('Iniciando limpeza e deduplicação da tabela users...');
  
  try {
    // Loop até não restar mais nenhum duplicado por e-mail
    while (true) {
      const [dups] = await pool.query(`
        SELECT LOWER(TRIM(email)) as clean_email, COUNT(*) as qtd, MIN(id) as keep_id
        FROM users
        WHERE email IS NOT NULL AND email != ''
        GROUP BY LOWER(TRIM(email))
        HAVING qtd > 1
      `);

      if (dups.length === 0) {
        console.log('✅ Nenhum duplicado por e-mail restante!');
        break;
      }

      console.log(`Eliminando duplicados de ${dups.length} e-mails...`);
      for (const d of dups) {
        await pool.query(
          `DELETE FROM users WHERE LOWER(TRIM(email)) = ? AND id != ?`,
          [d.clean_email, d.keep_id]
        );
      }
    }

    // Loop até não restar nenhum duplicado por username
    while (true) {
      const [dups] = await pool.query(`
        SELECT LOWER(TRIM(username)) as clean_user, COUNT(*) as qtd, MIN(id) as keep_id
        FROM users
        WHERE username IS NOT NULL AND username != ''
        GROUP BY LOWER(TRIM(username))
        HAVING qtd > 1
      `);

      if (dups.length === 0) {
        console.log('✅ Nenhum duplicado por username restante!');
        break;
      }

      console.log(`Eliminando duplicados de ${dups.length} usernames...`);
      for (const d of dups) {
        await pool.query(
          `DELETE FROM users WHERE LOWER(TRIM(username)) = ? AND id != ?`,
          [d.clean_user, d.keep_id]
        );
      }
    }

    // Adiciona o índice UNIQUE no e-mail para impedir fisicamente qualquer duplicação futura
    try {
      await pool.query(`ALTER TABLE users ADD UNIQUE INDEX idx_users_unique_email (email)`);
      console.log('🔒 Índice UNIQUE idx_users_unique_email criado com sucesso!');
    } catch (idxErr) {
      console.log('Índice idx_users_unique_email status:', idxErr.message);
    }

    const [finalRows] = await pool.query('SELECT COUNT(*) as total FROM users');
    console.log(`🎉 Limpeza finalizada! Total de usuários únicos no banco: ${finalRows[0].total}`);
  } catch (err) {
    console.error('Erro na limpeza:', err);
  } finally {
    process.exit(0);
  }
}

cleanDuplicates();

