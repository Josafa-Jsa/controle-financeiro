import pool from '../config/db.js';

export async function listOS(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM ordens_servico ORDER BY id DESC');
    const osList = rows.map((os) => ({
      id: os.id,
      numeroOS: os.numero_os,
      cliente: typeof os.cliente === 'string' ? JSON.parse(os.cliente) : os.cliente,
      equipamento: typeof os.equipamento === 'string' ? JSON.parse(os.equipamento) : os.equipamento,
      servicos: os.servicos,
      pecas: os.pecas,
      custos: os.custos,
      prazoInicio: os.prazo_inicio ? os.prazo_inicio.toISOString().slice(0, 10) : null,
      prazoFim: os.prazo_fim ? os.prazo_fim.toISOString().slice(0, 10) : null,
      formaPagamento: os.forma_pagamento,
      valorPagamento: os.valor_pagamento,
      tecnico: os.tecnico,
      status: os.status,
      createdAt: os.created_at,
    }));
    res.json(osList);
  } catch (error) {
    console.error('Erro ao listar O.S:', error);
    res.status(500).json({ error: 'Erro ao buscar ordens de serviço.' });
  }
}

export async function createOS(req, res) {
  try {
    const {
      numeroOS = `OS-${Date.now()}`,
      cliente,
      equipamento,
      servicos,
      pecas,
      custos,
      prazoInicio,
      prazoFim,
      formaPagamento,
      valorPagamento,
      tecnico,
      status = 'Pendente',
    } = req.body;

    const [result] = await pool.query(
      `INSERT INTO ordens_servico (numero_os, cliente, equipamento, servicos, pecas, custos, prazo_inicio, prazo_fim, forma_pagamento, valor_pagamento, tecnico, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        numeroOS,
        cliente ? JSON.stringify(cliente) : null,
        equipamento ? JSON.stringify(equipamento) : null,
        servicos || null,
        pecas || null,
        custos ? String(custos) : null,
        prazoInicio ? new Date(prazoInicio).toISOString().slice(0, 10) : null,
        prazoFim ? new Date(prazoFim).toISOString().slice(0, 10) : null,
        formaPagamento || null,
        valorPagamento ? String(valorPagamento) : null,
        tecnico || null,
        status,
      ]
    );

    res.status(201).json({ id: result.insertId, numeroOS, status });
  } catch (error) {
    console.error('Erro ao criar O.S:', error);
    res.status(500).json({ error: 'Erro ao salvar ordem de serviço.' });
  }
}

export async function updateOS(req, res) {
  try {
    const { id } = req.params;
    const {
      cliente,
      equipamento,
      servicos,
      pecas,
      custos,
      prazoInicio,
      prazoFim,
      formaPagamento,
      valorPagamento,
      tecnico,
      status,
    } = req.body;

    await pool.query(
      `UPDATE ordens_servico SET 
         cliente = COALESCE(?, cliente),
         equipamento = COALESCE(?, equipamento),
         servicos = COALESCE(?, servicos),
         pecas = COALESCE(?, pecas),
         custos = COALESCE(?, custos),
         prazo_inicio = COALESCE(?, prazo_inicio),
         prazo_fim = COALESCE(?, prazo_fim),
         forma_pagamento = COALESCE(?, forma_pagamento),
         valor_pagamento = COALESCE(?, valor_pagamento),
         tecnico = COALESCE(?, tecnico),
         status = COALESCE(?, status)
       WHERE id = ?`,
      [
        cliente ? JSON.stringify(cliente) : null,
        equipamento ? JSON.stringify(equipamento) : null,
        servicos,
        pecas,
        custos ? String(custos) : null,
        prazoInicio ? new Date(prazoInicio).toISOString().slice(0, 10) : null,
        prazoFim ? new Date(prazoFim).toISOString().slice(0, 10) : null,
        formaPagamento,
        valorPagamento ? String(valorPagamento) : null,
        tecnico,
        status,
        id,
      ]
    );

    res.json({ message: 'Ordem de serviço atualizada com sucesso.' });
  } catch (error) {
    console.error('Erro ao atualizar O.S:', error);
    res.status(500).json({ error: 'Erro ao atualizar ordem de serviço.' });
  }
}

export async function deleteOS(req, res) {
  try {
    const { id } = req.params;
    await pool.query('DELETE FROM ordens_servico WHERE id = ? OR numero_os = ?', [id, id]);
    res.json({ message: 'Ordem de serviço removida com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir O.S:', error);
    res.status(500).json({ error: 'Erro ao excluir ordem de serviço.' });
  }
}
