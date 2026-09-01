import pool from '../config/db.js';

export async function listContratos(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM contratos ORDER BY vencimento ASC, id DESC');
    const contratos = rows.map((c) => ({
      id: c.id,
      parceiro: c.parceiro,
      descricao: c.descricao,
      tipo: c.tipo,
      valor: Number(c.valor),
      vencimento: c.vencimento ? c.vencimento.toISOString().slice(0, 10) : null,
      dados: typeof c.dados === 'string' ? JSON.parse(c.dados) : c.dados,
      arquivoNome: c.arquivo_nome,
      arquivoBase64: c.arquivo_base64,
    }));
    res.json(contratos);
  } catch (error) {
    console.error('Erro ao listar contratos:', error);
    res.status(500).json({ error: 'Erro ao buscar contratos.' });
  }
}

export async function createContrato(req, res) {
  try {
    const { parceiro, descricao, tipo = 'Geral', valor = 0, vencimento, dados, arquivoNome, arquivoBase64 } = req.body;

    const [result] = await pool.query(
      `INSERT INTO contratos (parceiro, descricao, tipo, valor, vencimento, dados, arquivo_nome, arquivo_base64)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parceiro || null,
        descricao || null,
        tipo,
        Number(valor) || 0,
        vencimento ? new Date(vencimento).toISOString().slice(0, 10) : null,
        dados ? JSON.stringify(dados) : null,
        arquivoNome || null,
        arquivoBase64 || null,
      ]
    );

    res.status(201).json({ id: result.insertId, parceiro, tipo, valor });
  } catch (error) {
    console.error('Erro ao criar contrato:', error);
    res.status(500).json({ error: 'Erro ao salvar contrato.' });
  }
}

export async function updateContrato(req, res) {
  try {
    const { id } = req.params;
    const { parceiro, descricao, tipo, valor, vencimento, dados, arquivoNome, arquivoBase64 } = req.body;

    await pool.query(
      `UPDATE contratos SET 
         parceiro = COALESCE(?, parceiro),
         descricao = COALESCE(?, descricao),
         tipo = COALESCE(?, tipo),
         valor = COALESCE(?, valor),
         vencimento = COALESCE(?, vencimento),
         dados = COALESCE(?, dados),
         arquivo_nome = COALESCE(?, arquivo_nome),
         arquivo_base64 = COALESCE(?, arquivo_base64)
       WHERE id = ?`,
      [
        parceiro,
        descricao,
        tipo,
        valor !== undefined ? Number(valor) : null,
        vencimento ? new Date(vencimento).toISOString().slice(0, 10) : null,
        dados ? JSON.stringify(dados) : null,
        arquivoNome,
        arquivoBase64,
        id,
      ]
    );

    res.json({ message: 'Contrato atualizado com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar contrato:', error);
    res.status(500).json({ error: 'Erro ao atualizar contrato.' });
  }
}

export async function deleteContrato(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM contratos WHERE id = ?', [id]);
    res.json({ message: 'Contrato excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir contrato:', error);
    res.status(500).json({ error: 'Erro ao excluir contrato.' });
  }
}
