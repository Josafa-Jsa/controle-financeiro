import pool from '../config/db.js';

export async function listChamados(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM chamados ORDER BY created_at DESC');
    const chamados = rows.map((ch) => {
      let parsedMsgs = [];
      try {
        parsedMsgs = typeof ch.mensagens === 'string' ? JSON.parse(ch.mensagens) : (ch.mensagens || []);
      } catch {}

      let parsedAnexos = [];
      try {
        parsedAnexos = typeof ch.anexos === 'string' ? JSON.parse(ch.anexos) : (ch.anexos || []);
      } catch {}

      const primeiroAnexo = Array.isArray(parsedAnexos) && parsedAnexos.length > 0 ? parsedAnexos[0] : null;

      // Extrai metadados do histórico gravado
      let procExecutado = ch.procedimento_executado || null;
      let motCancelamento = ch.motivo_cancelamento || null;
      let tecResp = ch.tecnico_responsavel || null;
      let cancPor = ch.cancelado_por || null;
      let dataFin = ch.data_finalizacao || null;
      let dataCanc = ch.data_cancelamento || null;

      if (Array.isArray(parsedMsgs)) {
        for (const item of parsedMsgs) {
          const msgStr = String(item.mensagem || "");
          if (msgStr.includes("CHAMADO FINALIZADO") || msgStr.includes("FINALIZADO / RESOLVIDO")) {
            const matchProc = msgStr.match(/Procedimento Executado:\s*([\s\S]+)/i);
            if (matchProc && !procExecutado) procExecutado = matchProc[1].trim();
            if (!tecResp) tecResp = item.autor;
            if (!dataFin) dataFin = item.data;
          }
          if (msgStr.includes("CHAMADO CANCELADO")) {
            const matchMotivo = msgStr.match(/Motivo:\s*([\s\S]+)/i);
            if (matchMotivo && !motCancelamento) motCancelamento = matchMotivo[1].trim();
            if (!cancPor) cancPor = item.autor;
            if (!dataCanc) dataCanc = item.data;
          }
        }
      }

      return {
        id: ch.protocolo || ch.id,
        protocolo: ch.protocolo || ch.id,
        clienteNome: ch.cliente_nome,
        clienteEmail: ch.cliente_email,
        clienteWhatsapp: ch.cliente_whatsapp,
        whatsapp: ch.cliente_whatsapp,
        assunto: ch.assunto,
        descricao: ch.descricao || ch.assunto,
        categoria: ch.categoria,
        prioridade: ch.prioridade,
        status: ch.status,
        procedimentoExecutado: procExecutado,
        motivoCancelamento: motCancelamento,
        tecnicoResponsavel: tecResp,
        canceladoPor: cancPor,
        dataFinalizacao: dataFin,
        dataCancelamento: dataCanc,
        mensagens: parsedMsgs,
        respostas: parsedMsgs,
        anexo: primeiroAnexo,
        anexos: parsedAnexos,
        dataCriacao: ch.created_at ? new Date(ch.created_at).toLocaleString('pt-BR') : undefined,
        createdAt: ch.created_at,
        updatedAt: ch.updated_at,
      };
    });
    res.json(chamados);
  } catch (error) {
    console.error('Erro ao listar chamados:', error);
    res.status(500).json({ error: 'Erro ao buscar chamados.' });
  }
}

export async function createChamado(req, res) {
  try {
    const {
      protocolo,
      id,
      clienteNome,
      clienteEmail,
      clienteWhatsapp,
      whatsapp,
      assunto,
      descricao,
      categoria = 'Geral',
      prioridade = 'Media',
      status = 'Aberto',
      mensagens = [],
      respostas = [],
      anexo,
      anexos = [],
    } = req.body;

    if (!clienteNome || !assunto) {
      return res.status(400).json({ error: 'Nome do cliente e assunto são obrigatórios.' });
    }

    const protoFinal = protocolo || id || `JSA-${Date.now().toString().slice(-6)}`;
    const zapFinal = clienteWhatsapp || whatsapp || null;
    const historicoMsgs = Array.isArray(mensagens) && mensagens.length > 0 ? mensagens : (Array.isArray(respostas) ? respostas : []);
    
    let listaAnexos = [];
    if (Array.isArray(anexos) && anexos.length > 0) {
      listaAnexos = anexos;
    } else if (anexo) {
      listaAnexos = [anexo];
    }

    const [result] = await pool.query(
      `INSERT INTO chamados (protocolo, cliente_nome, cliente_email, cliente_whatsapp, assunto, categoria, prioridade, status, mensagens, anexos)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        protoFinal,
        clienteNome,
        clienteEmail || null,
        zapFinal,
        assunto,
        categoria,
        prioridade,
        status,
        JSON.stringify(historicoMsgs),
        JSON.stringify(listaAnexos),
      ]
    );

    res.status(201).json({ id: result.insertId, protocolo: protoFinal, status });
  } catch (error) {
    console.error('Erro ao criar chamado:', error);
    res.status(500).json({ error: 'Erro ao salvar chamado.' });
  }
}

export async function updateChamado(req, res) {
  try {
    const { id } = req.params;
    const { status, prioridade, categoria, mensagens, respostas, anexo, anexos } = req.body;

    const msgsFinal = mensagens || respostas;
    let listaAnexos = null;
    if (anexos) {
      listaAnexos = anexos;
    } else if (anexo) {
      listaAnexos = [anexo];
    }

    await pool.query(
      `UPDATE chamados SET 
         status = COALESCE(?, status),
         prioridade = COALESCE(?, prioridade),
         categoria = COALESCE(?, categoria),
         mensagens = COALESCE(?, mensagens),
         anexos = COALESCE(?, anexos)
       WHERE id = ? OR protocolo = ?`,
      [
        status,
        prioridade,
        categoria,
        msgsFinal ? JSON.stringify(msgsFinal) : null,
        listaAnexos ? JSON.stringify(listaAnexos) : null,
        id,
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
    await pool.query('DELETE FROM chamados WHERE id = ? OR protocolo = ?', [id, id]);
    res.json({ message: 'Chamado excluído com sucesso.' });
  } catch (error) {
    console.error('Erro ao excluir chamado:', error);
    res.status(500).json({ error: 'Erro ao excluir chamado.' });
  }
}

