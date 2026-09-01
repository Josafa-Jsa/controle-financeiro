import pool from '../config/db.js';

export async function listProdutos(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM produtos ORDER BY nome ASC');
    const produtos = rows.map((p) => ({
      id: p.id,
      nome: p.nome,
      descricao: p.descricao,
      quantidade: p.quantidade,
      valorUnitario: Number(p.valor_unitario),
      estoqueMinimo: p.estoque_minimo,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));
    res.json(produtos);
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ error: 'Erro ao buscar produtos do estoque.' });
  }
}

export async function createProduto(req, res) {
  try {
    const { nome, descricao, quantidade = 0, valorUnitario = 0, estoqueMinimo = 0 } = req.body;
    if (!nome) return res.status(400).json({ error: 'Nome do produto é obrigatório.' });

    const [result] = await pool.query(
      `INSERT INTO produtos (nome, descricao, quantidade, valor_unitario, estoque_minimo)
       VALUES (?, ?, ?, ?, ?)`,
      [nome, descricao || null, Number(quantidade) || 0, Number(valorUnitario) || 0, Number(estoqueMinimo) || 0]
    );

    res.status(201).json({ id: result.insertId, nome, quantidade, valorUnitario });
  } catch (error) {
    console.error('Erro ao cadastrar produto:', error);
    res.status(500).json({ error: 'Erro ao cadastrar produto.' });
  }
}

export async function updateProduto(req, res) {
  try {
    const { id } = req.params;
    const { nome, descricao, quantidade, valorUnitario, estoqueMinimo } = req.body;

    await pool.query(
      `UPDATE produtos SET 
         nome = COALESCE(?, nome),
         descricao = COALESCE(?, descricao),
         quantidade = COALESCE(?, quantidade),
         valor_unitario = COALESCE(?, valor_unitario),
         estoque_minimo = COALESCE(?, estoque_minimo)
       WHERE id = ?`,
      [
        nome,
        descricao,
        quantidade !== undefined ? Number(quantidade) : null,
        valorUnitario !== undefined ? Number(valorUnitario) : null,
        estoqueMinimo !== undefined ? Number(estoqueMinimo) : null,
        id,
      ]
    );

    res.json({ message: 'Produto atualizado com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ error: 'Erro ao atualizar produto.' });
  }
}

export async function deleteProduto(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM produtos WHERE id = ?', [id]);
    res.json({ message: 'Produto excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir produto:', error);
    res.status(500).json({ error: 'Erro ao excluir produto.' });
  }
}
