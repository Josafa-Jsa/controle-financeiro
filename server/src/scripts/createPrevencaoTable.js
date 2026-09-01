import pool from '../config/db.js';

async function run() {
  try {
    const sql = `
      CREATE TABLE IF NOT EXISTS \`prevencao\` (
        \`id\` BIGINT NOT NULL AUTO_INCREMENT,
        \`numero\` VARCHAR(64) NOT NULL UNIQUE,
        \`nome\` VARCHAR(255) NOT NULL,
        \`status\` VARCHAR(50) NOT NULL DEFAULT 'Em Aberto',
        \`data\` DATE NOT NULL,
        \`hora_inicio\` VARCHAR(10) NULL,
        \`hora_termino\` VARCHAR(10) NULL,
        \`tipo\` VARCHAR(100) NOT NULL DEFAULT 'Geral',
        \`classificacao\` VARCHAR(50) NOT NULL DEFAULT 'Média',
        \`local\` VARCHAR(255) NULL,
        \`setor\` VARCHAR(255) NULL,
        \`descricao\` TEXT NULL,
        \`relato_fatos\` LONGTEXT NULL,
        \`medidas_adotadas\` LONGTEXT NULL,
        \`pessoas_envolvidas\` JSON NULL,
        \`pessoa_envolvida\` JSON NULL,
        \`produtos_envolvidos\` JSON NULL,
        \`valor_total_envolvido\` DECIMAL(15,2) NOT NULL DEFAULT 0.00,
        \`abordagem\` JSON NULL,
        \`evidencias\` JSON NULL,
        \`responsaveis_registro\` JSON NULL,
        \`historico_custodia\` JSON NULL,
        \`user_id\` BIGINT NULL,
        \`user_email\` VARCHAR(190) NULL,
        \`user_login\` VARCHAR(100) NULL,
        \`registrado_por\` VARCHAR(190) NULL,
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        INDEX \`idx_prevencao_numero\` (\`numero\`),
        INDEX \`idx_prevencao_status\` (\`status\`),
        INDEX \`idx_prevencao_data\` (\`data\`),
        INDEX \`idx_prevencao_user_id\` (\`user_id\`),
        INDEX \`idx_prevencao_email\` (\`user_email\`),
        INDEX \`idx_prevencao_login\` (\`user_login\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `;

    await pool.query(sql);
    console.log('✔ [MySQL] Tabela `prevencao` criada com sucesso no banco `jsa_app`!');

    const [tables] = await pool.query('SHOW TABLES');
    console.log('📋 Lista atual de tabelas no banco de dados:', tables.map(t => Object.values(t)[0]));

    process.exit(0);
  } catch (err) {
    console.error('❌ Erro ao criar tabela prevencao:', err);
    process.exit(1);
  }
}

run();
