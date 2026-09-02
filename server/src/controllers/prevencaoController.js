import pool from '../config/db.js';

export async function listPrevencao(req, res) {
  try {
    const userEmail = req.query?.email || req.headers['x-user-email'];
    const userId = req.query?.userId;
    const userLogin = req.query?.username;
    const isAdmin =
      String(req.query?.isAdmin || '').toLowerCase() === 'true' ||
      String(userEmail || '').toLowerCase() === 'jsa@jsa.com' ||
      String(userEmail || '').toLowerCase() === 'josafa.santos.jss@gmail.com';

    let query = 'SELECT * FROM prevencao';
    const params = [];

    if (!isAdmin && (userEmail || userId || userLogin)) {
      const conds = [];
      if (userEmail) {
        conds.push('LOWER(user_email) = LOWER(?)');
        params.push(userEmail);
      }
      if (userId) {
        conds.push('user_id = ?');
        params.push(userId);
      }
      if (userLogin) {
        conds.push('LOWER(user_login) = LOWER(?)');
        params.push(userLogin);
      }
      conds.push('user_email IS NULL');
      conds.push('user_email = ""');

      query += ` WHERE (${conds.join(' OR ')})`;
    }

    query += ' ORDER BY created_at DESC LIMIT 500';

    const [rows] = await pool.query(query, params);

    const ocorrencias = rows.map((row) => ({
      id: row.id,
      numero: row.numero,
      nome: row.nome,
      status: row.status || 'Em Aberto',
      data: row.data ? String(row.data).slice(0, 10) : new Date().toISOString().slice(0, 10),
      horaInicio: row.hora_inicio || '',
      horaTermino: row.hora_termino || '',
      tipo: row.tipo || 'Geral',
      classificacao: row.classificacao || 'Média',
      local: row.local || '',
      setor: row.setor || '',
      descricao: row.descricao || '',
      relatoFatos: row.relato_fatos || '',
      medidasAdotadas: row.medidas_adotadas || '',
      pessoasEnvolvidas: typeof row.pessoas_envolvidas === 'string' ? JSON.parse(row.pessoas_envolvidas || '[]') : row.pessoas_envolvidas || [],
      pessoaEnvolvida: typeof row.pessoa_envolvida === 'string' ? JSON.parse(row.pessoa_envolvida || 'null') : row.pessoa_envolvida || null,
      produtosEnvolvidos: typeof row.produtos_envolvidos === 'string' ? JSON.parse(row.produtos_envolvidos || '[]') : row.produtos_envolvidos || [],
      valorTotalEnvolvido: Number(row.valor_total_envolvido) || 0,
      abordagem: typeof row.abordagem === 'string' ? JSON.parse(row.abordagem || 'null') : row.abordagem || null,
      evidencias: typeof row.evidencias === 'string' ? JSON.parse(row.evidencias || '[]') : row.evidencias || [],
      responsaveisRegistro: typeof row.responsaveis_registro === 'string' ? JSON.parse(row.responsaveis_registro || '{}') : row.responsaveis_registro || {},
      historicoCustodia: typeof row.historico_custodia === 'string' ? JSON.parse(row.historico_custodia || '[]') : row.historico_custodia || [],
      userId: row.user_id,
      userEmail: row.user_email,
      userLogin: row.user_login,
      registradoPor: row.registrado_por || 'Operador',
      createdAt: row.created_at ? new Date(row.created_at).toISOString() : new Date().toISOString(),
      updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
    }));

    res.json(ocorrencias);
  } catch (error) {
    console.error('Erro ao listar ocorrências de prevenção:', error);
    res.status(500).json({ error: 'Erro ao listar ocorrências.', details: error.message });
  }
}

export async function createPrevencao(req, res) {
  try {
    const d = req.body || {};
    const numero = d.numero || `OC-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`;
    const nome = d.nome || `Ocorrência - ${d.tipo || 'Geral'}`;
    const status = d.status || 'Em Aberto';
    const data = d.data ? String(d.data).slice(0, 10) : new Date().toISOString().slice(0, 10);
    const horaInicio = d.horaInicio || '';
    const horaTermino = d.horaTermino || '';
    const tipo = d.tipo || 'Geral';
    const classificacao = d.classificacao || 'Média';
    const local = d.local || '';
    const setor = d.setor || '';
    const descricao = d.descricao || '';
    const relatoFatos = d.relatoFatos || '';
    const medidasAdotadas = d.medidasAdotadas || '';
    const pessoasEnvolvidas = JSON.stringify(d.pessoasEnvolvidas || []);
    const pessoaEnvolvida = JSON.stringify(d.pessoaEnvolvida || null);
    const produtosEnvolvidos = JSON.stringify(d.produtosEnvolvidos || []);
    const valorTotalEnvolvido = Number(d.valorTotalEnvolvido) || 0;
    const abordagem = JSON.stringify(d.abordagem || null);
    const evidencias = JSON.stringify(d.evidencias || []);
    const responsaveisRegistro = JSON.stringify(d.responsaveisRegistro || {});
    const historicoCustodia = JSON.stringify(d.historicoCustodia || []);
    const userId = d.userId || null;
    const userEmail = d.userEmail || '';
    const userLogin = d.userLogin || '';
    const registradoPor = d.registradoPor || 'Operador';

    const sql = `
      INSERT INTO prevencao (
        numero, nome, status, data, hora_inicio, hora_termino,
        tipo, classificacao, local, setor, descricao,
        relato_fatos, medidas_adotadas, pessoas_envolvidas, pessoa_envolvida,
        produtos_envolvidos, valor_total_envolvido, abordagem, evidencias,
        responsaveis_registro, historico_custodia, user_id, user_email,
        user_login, registrado_por
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nome = VALUES(nome),
        status = VALUES(status),
        data = VALUES(data),
        hora_inicio = VALUES(hora_inicio),
        hora_termino = VALUES(hora_termino),
        tipo = VALUES(tipo),
        classificacao = VALUES(classificacao),
        local = VALUES(local),
        setor = VALUES(setor),
        descricao = VALUES(descricao),
        relato_fatos = VALUES(relato_fatos),
        medidas_adotadas = VALUES(medidas_adotadas),
        pessoas_envolvidas = VALUES(pessoas_envolvidas),
        pessoa_envolvida = VALUES(pessoa_envolvida),
        produtos_envolvidos = VALUES(produtos_envolvidos),
        valor_total_envolvido = VALUES(valor_total_envolvido),
        abordagem = VALUES(abordagem),
        evidencias = VALUES(evidencias),
        responsaveis_registro = VALUES(responsaveis_registro),
        historico_custodia = VALUES(historico_custodia),
        registrado_por = VALUES(registrado_por),
        updated_at = NOW()
    `;

    const params = [
      numero, nome, status, data, horaInicio, horaTermino,
      tipo, classificacao, local, setor, descricao,
      relatoFatos, medidasAdotadas, pessoasEnvolvidas, pessoaEnvolvida,
      produtosEnvolvidos, valorTotalEnvolvido, abordagem, evidencias,
      responsaveisRegistro, historicoCustodia, userId, userEmail,
      userLogin, registradoPor
    ];

    const [result] = await pool.query(sql, params);
    const newId = result.insertId || d.id;

    res.status(201).json({ ok: true, id: newId, numero, status });
  } catch (error) {
    console.error('Erro ao criar/atualizar ocorrência:', error);
    res.status(500).json({ error: 'Erro ao salvar ocorrência.', details: error.message });
  }
}

export async function updatePrevencao(req, res) {
  try {
    const { id } = req.params;
    const d = req.body || {};

    const updates = [];
    const params = [];

    if (d.status !== undefined) { updates.push('status = ?'); params.push(d.status); }
    if (d.nome !== undefined) { updates.push('nome = ?'); params.push(d.nome); }
    if (d.tipo !== undefined) { updates.push('tipo = ?'); params.push(d.tipo); }
    if (d.classificacao !== undefined) { updates.push('classificacao = ?'); params.push(d.classificacao); }
    if (d.local !== undefined) { updates.push('local = ?'); params.push(d.local); }
    if (d.setor !== undefined) { updates.push('setor = ?'); params.push(d.setor); }
    if (d.descricao !== undefined) { updates.push('descricao = ?'); params.push(d.descricao); }
    if (d.relatoFatos !== undefined) { updates.push('relato_fatos = ?'); params.push(d.relatoFatos); }
    if (d.medidasAdotadas !== undefined) { updates.push('medidas_adotadas = ?'); params.push(d.medidasAdotadas); }
    if (d.pessoasEnvolvidas !== undefined) { updates.push('pessoas_envolvidas = ?'); params.push(JSON.stringify(d.pessoasEnvolvidas)); }
    if (d.pessoaEnvolvida !== undefined) { updates.push('pessoa_envolvida = ?'); params.push(JSON.stringify(d.pessoaEnvolvida)); }
    if (d.produtosEnvolvidos !== undefined) { updates.push('produtos_envolvidos = ?'); params.push(JSON.stringify(d.produtosEnvolvidos)); }
    if (d.valorTotalEnvolvido !== undefined) { updates.push('valor_total_envolvido = ?'); params.push(Number(d.valorTotalEnvolvido) || 0); }
    if (d.abordagem !== undefined) { updates.push('abordagem = ?'); params.push(JSON.stringify(d.abordagem)); }
    if (d.evidencias !== undefined) { updates.push('evidencias = ?'); params.push(JSON.stringify(d.evidencias)); }
    if (d.responsaveisRegistro !== undefined) { updates.push('responsaveis_registro = ?'); params.push(JSON.stringify(d.responsaveisRegistro)); }
    if (d.historicoCustodia !== undefined) { updates.push('historico_custodia = ?'); params.push(JSON.stringify(d.historicoCustodia)); }

    if (updates.length === 0) {
      return res.json({ ok: true, message: 'Nenhum campo a atualizar.' });
    }

    updates.push('updated_at = NOW()');
    const sql = `UPDATE prevencao SET ${updates.join(', ')} WHERE id = ? OR numero = ?`;
    params.push(id, id);

    await pool.query(sql, params);
    res.json({ ok: true, id, message: 'Ocorrência atualizada com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar ocorrência:', error);
    res.status(500).json({ error: 'Erro ao atualizar ocorrência.', details: error.message });
  }
}

export async function deletePrevencao(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM prevencao WHERE id = ? OR numero = ?', [id, id]);
    res.json({ ok: true, id, message: 'Ocorrência excluída com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir ocorrência:', error);
    res.status(500).json({ error: 'Erro ao excluir ocorrência.', details: error.message });
  }
}
