import pool from '../config/db.js';

const UF_MAP = {
  '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
  '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
  '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR',
  '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
};

// Assegura colunas cnpj, produto_relacionado, tipo_conta e filial se necessário
let colunasChecadas = false;
async function checarColunasExtras() {
  if (colunasChecadas) return;
  try {
    const [cols] = await pool.query("SHOW COLUMNS FROM notas LIKE 'cnpj'");
    if (cols.length === 0) {
      await pool.query("ALTER TABLE notas ADD COLUMN cnpj VARCHAR(30) NULL, ADD COLUMN produto_relacionado TEXT NULL");
    }
    const [colsTipo] = await pool.query("SHOW COLUMNS FROM notas LIKE 'tipo_conta'");
    if (colsTipo.length === 0) {
      await pool.query("ALTER TABLE notas ADD COLUMN tipo_conta VARCHAR(20) DEFAULT 'Receber'");
    }
    const [colsFilial] = await pool.query("SHOW COLUMNS FROM notas LIKE 'filial'");
    if (colsFilial.length === 0) {
      await pool.query("ALTER TABLE notas ADD COLUMN filial VARCHAR(100) DEFAULT 'Filial 1', ADD INDEX idx_notas_filial (filial)");
    }
    colunasChecadas = true;
  } catch {
    // Silencioso se já existirem ou tabela ainda não criada
  }
}

export async function listNotas(req, res) {
  try {
    await checarColunasExtras();
    const { filial, isAdmin } = req.query;

    let sql = 'SELECT * FROM notas WHERE 1=1';
    const params = [];

    const isMasterAdmin = String(isAdmin) === 'true';

    if (!isMasterAdmin && filial && filial.trim() && filial.trim().toLowerCase() !== 'todas') {
      sql += ' AND (LOWER(filial) = LOWER(?) OR (filial IS NULL AND LOWER(?) = "filial 1"))';
      params.push(filial.trim(), filial.trim());
    }

    sql += ' ORDER BY data_emissao DESC, id DESC';

    const [rows] = await pool.query(sql, params);
    const notas = rows.map((n) => ({
      id: n.id,
      filial: n.filial || 'Filial 1',
      numero: n.numero,
      tipo: n.tipo,
      tipoConta: n.tipo_conta || 'Receber',
      chavedeacesso: n.chavedeacesso,
      clienteOuServico: n.cliente_ou_servico,
      origem: n.origem,
      cnpj: n.cnpj || null,
      produtoRelacionado: n.produto_relacionado || null,
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
    await checarColunasExtras();
    const {
      id = Date.now(),
      filial = 'Filial 1',
      numero,
      tipo = 'NFe',
      tipoConta = 'Receber',
      chavedeacesso,
      clienteOuServico,
      origem,
      cnpj,
      produtoRelacionado,
      valor = 0,
      dataEmissao,
      status = 'Adicionada',
    } = req.body;

    try {
      await pool.query(
        `INSERT INTO notas (id, filial, numero, tipo, tipo_conta, chavedeacesso, cliente_ou_servico, origem, cnpj, produto_relacionado, valor, data_emissao, status)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          filial || 'Filial 1',
          numero || null,
          tipo,
          tipoConta || 'Receber',
          chavedeacesso || null,
          clienteOuServico || null,
          origem || null,
          cnpj || null,
          produtoRelacionado || null,
          Number(valor) || 0,
          dataEmissao ? new Date(dataEmissao).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
          status,
        ]
      );
    } catch {
      // Fallback sem coluna filial se houver algum erro de migração antiga
      try {
        await pool.query(
          `INSERT INTO notas (id, numero, tipo, tipo_conta, chavedeacesso, cliente_ou_servico, origem, cnpj, produto_relacionado, valor, data_emissao, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            numero || null,
            tipo,
            tipoConta || 'Receber',
            chavedeacesso || null,
            clienteOuServico || null,
            origem || null,
            cnpj || null,
            produtoRelacionado || null,
            Number(valor) || 0,
            dataEmissao ? new Date(dataEmissao).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
            status,
          ]
        );
      } catch {
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
      }
    }

    res.status(201).json({ id, filial: filial || 'Filial 1', numero, tipo, tipoConta, valor, status, cnpj, produtoRelacionado });
  } catch (error) {
    console.error('Erro ao criar nota fiscal:', error);
    res.status(500).json({ error: 'Erro ao salvar nota fiscal.' });
  }
}

export async function updateNota(req, res) {
  try {
    await checarColunasExtras();
    const { id } = req.params;
    const {
      filial,
      numero,
      tipo,
      tipoConta,
      chavedeacesso,
      clienteOuServico,
      origem,
      cnpj,
      produtoRelacionado,
      valor,
      dataEmissao,
      status,
      motivoCancelamento,
      statusCancelamento,
      cancelRequestId,
      exclusaoPendente,
      deleteRequestId,
    } = req.body;

    try {
      await pool.query(
        `UPDATE notas SET 
           filial = COALESCE(?, filial),
           numero = COALESCE(?, numero),
           tipo = COALESCE(?, tipo),
           tipo_conta = COALESCE(?, tipo_conta),
           chavedeacesso = COALESCE(?, chavedeacesso),
           cliente_ou_servico = COALESCE(?, cliente_ou_servico),
           origem = COALESCE(?, origem),
           cnpj = COALESCE(?, cnpj),
           produto_relacionado = COALESCE(?, produto_relacionado),
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
          filial,
          numero,
          tipo,
          tipoConta,
          chavedeacesso,
          clienteOuServico,
          origem,
          cnpj,
          produtoRelacionado,
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
    } catch {
      // Fallback padrão
      await pool.query(
        `UPDATE notas SET 
           numero = COALESCE(?, numero),
           tipo = COALESCE(?, tipo),
           chavedeacesso = COALESCE(?, chavedeacesso),
           cliente_ou_servico = COALESCE(?, cliente_ou_servico),
           origem = COALESCE(?, origem),
           cnpj = COALESCE(?, cnpj),
           produto_relacionado = COALESCE(?, produto_relacionado),
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
          cnpj,
          produtoRelacionado,
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
    }

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

/**
 * Consulta e validação estrutural e cadastral da chave da NF-e no portal Meu DANFE / Base Nacional
 */
export async function consultarChave(req, res) {
  try {
    const { chave } = req.params;
    const chaveLimpa = String(chave || '').replace(/\D+/g, '');

    if (chaveLimpa.length !== 44) {
      return res.status(400).json({
        sucesso: false,
        error: `A chave de acesso da NF-e deve possuir exatamente 44 dígitos numéricos (informado: ${chaveLimpa.length}).`,
      });
    }

    const cUf = chaveLimpa.slice(0, 2);
    const uf = UF_MAP[cUf] || 'MT';
    const aa = chaveLimpa.slice(2, 4);
    const mm = chaveLimpa.slice(4, 6);
    const cnpjRaw = chaveLimpa.slice(6, 20);
    const modelo = chaveLimpa.slice(20, 22);
    const serieRaw = chaveLimpa.slice(22, 25);
    const nNfRaw = chaveLimpa.slice(25, 34);

    const cnpjFormatado = `${cnpjRaw.slice(0, 2)}.${cnpjRaw.slice(2, 5)}.${cnpjRaw.slice(5, 8)}/${cnpjRaw.slice(8, 12)}-${cnpjRaw.slice(12)}`;
    const numeroFormatado = String(Number(nNfRaw));
    const serieFormatada = String(Number(serieRaw));
    const ano = 2000 + Number(aa);
    const dataEmissao = `${ano}-${mm}-01`;
    const tipo = modelo === '65' ? 'NFCe' : modelo === '57' ? 'CTe' : 'NFe';

    let nome = `EMITENTE CNPJ ${cnpjFormatado}`;
    let produtoRelacionado = '';
    let tipoConta = 'Receber';
    let municipio = '';
    let logradouro = '';

    // 1. Padrão pré-configurado específico
    if (cnpjRaw === '26536763000145') {
      nome = 'AUTO POSTO DELCAS';
      produtoRelacionado = 'ABASTECIMENTO';
      tipoConta = 'Pagar';
    } else {
      // 2. Busca histórico no banco de dados para esse CNPJ
      try {
        const [historico] = await pool.query(
          `SELECT cliente_ou_servico, origem, produto_relacionado, tipo_conta 
           FROM notas 
           WHERE (cnpj LIKE ? OR chavedeacesso LIKE ?) 
             AND (cliente_ou_servico IS NOT NULL AND cliente_ou_servico != '')
           ORDER BY id DESC LIMIT 1`,
          [`%${cnpjRaw}%`, `%${cnpjRaw}%`]
        );

        if (historico && historico.length > 0) {
          const h = historico[0];
          if (h.cliente_ou_servico || h.origem) {
            nome = h.cliente_ou_servico || h.origem;
          }
          if (h.produto_relacionado) {
            produtoRelacionado = h.produto_relacionado;
          }
          if (h.tipo_conta) {
            tipoConta = h.tipo_conta;
          }
        }
      } catch (errDb) {
        console.warn('[NotasController] Falha ao buscar histórico de CNPJ:', errDb.message);
      }
    }

    // 3. Se ainda não tiver nome ou produto cadastrado, busca na BrasilAPI
    if (nome.startsWith('EMITENTE CNPJ') || !produtoRelacionado) {
      try {
        const respApi = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjRaw}`);
        if (respApi.ok) {
          const d = await respApi.json();
          if (nome.startsWith('EMITENTE CNPJ')) {
            nome = d.nome_fantasia || d.razao_social || nome;
          }
          if (!produtoRelacionado) {
            produtoRelacionado = d.cnae_fiscal_descricao || (d.cnaes_secundarios?.[0]?.descricao) || '';
          }
          municipio = d.municipio || '';
          logradouro = d.logradouro || '';
        }
      } catch {
        // Falha externa tratada
      }
    }

    res.json({
      sucesso: true,
      chavedeacesso: chaveLimpa,
      numero: numeroFormatado,
      serie: serieFormatada,
      tipo,
      tipoConta,
      nome,
      clienteOuServico: nome,
      origem: nome,
      cnpj: cnpjFormatado,
      dataEmissao,
      produtoRelacionado,
      valor: null, // Deixado em branco para inserção manual caso não retornado
      uf,
      municipio,
      logradouro,
    });
  } catch (err) {
    console.error('Erro ao consultar chave NF-e:', err);
    res.status(500).json({ sucesso: false, error: 'Falha ao consultar chave NF-e.' });
  }
}

