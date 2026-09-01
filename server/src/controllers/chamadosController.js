import pool from '../config/db.js';

export async function listChamados(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM chamados ORDER BY created_at DESC');
    const chamados = rows.map((ch) => ({
      id: ch.id,
      protocolo: ch.protocolo,
      clienteNome: ch.cliente_nome,
      clienteEmail: ch.cliente_email,
      clienteWhatsapp: ch.cliente_whatsapp,
      assunto: ch.assunto,
      categoria: ch.categoria,
      prioridade: ch.prioridade,
      status: ch.status,
      mensagens: typeof ch.mensagens === 'string' ? JSON.parse(ch.mensagens) : ch.mensagens || [],
      anexos: typeof ch.anexos === 'string' ? JSON.parse(ch.anexos) : ch.anexos || [],
      createdAt: ch.created_at,
      updatedAt: ch.updated_at,
    }));
    res.json(chamados);
  } catch (error) {
    console.error('Erro ao listar chamados:', error);
    res.status(500).json({ error: 'Erro ao buscar chamados.' });
  }
}

export async function createChamado(req, res) {
  try {
    const {
      protocolo = `CH-${Date.now()}`,
      clienteNome,
      clienteEmail,
      clienteWhatsapp,
      assunto,
      categoria = 'Geral',
      prioridade = 'Media',
      status = 'Aberto',
      mensagens = [],
      anexos = [],
    } = req.body;

    if (!clienteNome || !assunto) {
      return res.status(400).json({ error: 'Nome do cliente e assunto são obrigatórios.' });
    }

    const [result] = await pool.query(
      `INSERT INTO chamados (protocolo, cliente_nome, cliente_email, cliente_whatsapp, assunto, categoria, prioridade, status, mensagens, anexos)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        protocolo,
        clienteNome,
        clienteEmail || null,
        clienteWhatsapp || null,
        assunto,
        categoria,
        prioridade,
        status,
        JSON.stringify(mensagens),
        JSON.stringify(anexos),
      ]
    );

    res.status(201).json({ id: result.insertId, protocolo, status });
  } catch (error) {
    console.error('Erro ao criar chamado:', error);
    res.status(500).json({ error: 'Erro ao salvar chamado.' });
  }
}

export async function updateChamado(req, res) {
  try {
    const { id } = req.params;
    const { status, prioridade, categoria, mensagens, anexos } = req.body;

    await pool.query(
      `UPDATE chamados SET 
         status = COALESCE(?, status),
         prioridade = COALESCE(?, prioridade),
         categoria = COALESCE(?, categoria),
         mensagens = COALESCE(?, mensagens),
         anexos = COALESCE(?, anexos)
       WHERE id = ?`,
      [
        status,
        prioridade,
        categoria,
        mensagens ? JSON.stringify(mensagens) : null,
        anexos ? JSON.stringify(anexos) : null,
        id,
      ]
    );

    res.json({ message: 'Chamado atualizado com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar chamado:', error);
    res.status(500).json({ error: 'Erro ao atualizar chamado.' });
  }
}

export async function deleteChamado(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM chamados WHERE id = ?', [id]);
    res.json({ message: 'Chamado excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir chamado:', error);
    res.status(500).json({ error: 'Erro ao excluir chamado.' });
  }
}
