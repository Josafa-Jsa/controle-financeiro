import pool from '../config/db.js';

export async function listNotas(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM notas ORDER BY data_emissao DESC, id DESC');
    const notas = rows.map((n) => ({
      id: n.id,
      numero: n.numero,
      tipo: n.tipo,
      chavedeacesso: n.chavedeacesso,
      clienteOuServico: n.cliente_ou_servico,
      origem: n.origem,
      valor: Number(n.valor),
      dataEmissao: n.data_emissao ? n.data_emissao.toISOString().slice(0, 10) : null,
      status: n.status,
      motivoCancelamento: n.motivo_cancelamento,
      statusCancelamento: n.status_cancelamento,
      cancelRequestId: n.cancel_request_id,
      exclusaoPendente: Boolean(n.exclusao_pendente),
      deleteRequestId: n.delete_request_id,
    }));
    res.json(notas);
  } catch (error) {
    console.error('Erro ao listar notas fiscais:', error);
    res.status(500).json({ error: 'Erro ao buscar notas fiscais.' });
  }
}

export async function createNota(req, res) {
  try {
    const {
      id = Date.now(),
      numero,
      tipo = 'NFe',
      chavedeacesso,
      clienteOuServico,
      origem,
      valor = 0,
      dataEmissao,
      status = 'Adicionada',
    } = req.body;

    await pool.query(
      `INSERT INTO notas (id, numero, tipo, chavedeacesso, cliente_ou_servico, origem, valor, data_emissao, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        numero || null,
        tipo,
        chavedeacesso || null,
        clienteOuServico || null,
        origem || null,
        Number(valor) || 0,
        dataEmissao ? new Date(dataEmissao).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
        status,
      ]
    );

    res.status(201).json({ id, numero, tipo, valor, status });
  } catch (error) {
    console.error('Erro ao criar nota fiscal:', error);
    res.status(500).json({ error: 'Erro ao salvar nota fiscal.' });
  }
}

export async function updateNota(req, res) {
  try {
    const { id } = req.params;
    const {
      numero,
      tipo,
      chavedeacesso,
      clienteOuServico,
      origem,
      valor,
      dataEmissao,
      status,
      motivoCancelamento,
      statusCancelamento,
      cancelRequestId,
      exclusaoPendente,
      deleteRequestId,
    } = req.body;

    await pool.query(
      `UPDATE notas SET 
         numero = COALESCE(?, numero),
         tipo = COALESCE(?, tipo),
         chavedeacesso = COALESCE(?, chavedeacesso),
         cliente_ou_servico = COALESCE(?, cliente_ou_servico),
         origem = COALESCE(?, origem),
         valor = COALESCE(?, valor),
         data_emissao = COALESCE(?, data_emissao),
         status = COALESCE(?, status),
         motivo_cancelamento = COALESCE(?, motivo_cancelamento),
         status_cancelamento = COALESCE(?, status_cancelamento),
         cancel_request_id = COALESCE(?, cancel_request_id),
         exclusao_pendente = COALESCE(?, exclusao_pendente),
         delete_request_id = COALESCE(?, delete_request_id)
       WHERE id = ?`,
      [
        numero,
        tipo,
        chavedeacesso,
        clienteOuServico,
        origem,
        valor !== undefined ? Number(valor) : null,
        dataEmissao ? new Date(dataEmissao).toISOString().slice(0, 10) : null,
        status,
        motivoCancelamento,
        statusCancelamento,
        cancelRequestId,
        exclusaoPendente !== undefined ? (exclusaoPendente ? 1 : 0) : null,
        deleteRequestId,
        id,
      ]
    );

    res.json({ message: 'Nota fiscal atualizada com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar nota:', error);
    res.status(500).json({ error: 'Erro ao atualizar nota fiscal.' });
  }
}

export async function deleteNota(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM notas WHERE id = ?', [id]);
    res.json({ message: 'Nota fiscal removida com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir nota:', error);
    res.status(500).json({ error: 'Erro ao excluir nota fiscal.' });
  }
}
