// src/pages/Contratos/ContratosPage.jsx
import React, { useEffect, useState, useRef } from 'react';
import ModalContrato from '../../components/Modais/ModalContrato';
import {
  listarContratos,
  salvarContrato,
  atualizarContrato,
  excluirContrato,
} from '../../services/contratosService';
import { toast } from 'react-toastify';
import { logEvent } from '../../utils/logger';
import { sendTelegramEvent, formatCurrencyBRL, formatDateBR } from '../../utils/telegram';

const POLL_INTERVAL = 4000;

export default function ContratosPage() {
  const [contratos, setContratos] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [contratoSelecionado, setContratoSelecionado] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const pendentesRef = useRef({});
  const lastUpdateIdRef = useRef(0);

  useEffect(() => {
    carregarContratos();
  }, []);

  const carregarContratos = () => {
    try {
      const dados = listarContratos() || [];
      setContratos(dados);
    } catch (e) {
      console.error('Erro ao carregar contratos:', e);
      setContratos([]);
    }
  };

  const tgBase = () => {
    const token = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    return token ? `https://api.telegram.org/bot${token}` : '';
  };

  const tgSendRaw = async (texto, replyMarkupObj) => {
    const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
    const base = tgBase();

    if (!base || !chatId) return;

    const url = `${base}/sendMessage`;
    const params = {
      chat_id: String(chatId),
      text: texto,
      parse_mode: 'HTML',
    };

    if (replyMarkupObj) {
      params.reply_markup = JSON.stringify(replyMarkupObj);
    }

    const body = new URLSearchParams(params).toString();
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
  };

  const checarRespostaTelegram = async (requestId) => {
    const base = tgBase();
    if (!base) return null;

    try {
      const url = `${base}/getUpdates?offset=${lastUpdateIdRef.current + 1}`;
      const resp = await fetch(url);
      const json = await resp.json();

      if (!json.ok) return null;

      for (const upd of json.result) {
        if (upd.update_id > lastUpdateIdRef.current) {
          lastUpdateIdRef.current = upd.update_id;
        }

        const data = upd?.callback_query?.data;
        if (data === `contrato:aprovar:${requestId}`) return 'aprovado';
        if (data === `contrato:negar:${requestId}`) return 'negado';
      }
    } catch {
      return null;
    }

    return null;
  };

  const iniciarPolling = (requestId, contratoId) => {
    const loop = async () => {
      const r = await checarRespostaTelegram(requestId);

      if (r === 'aprovado') {
        excluirContrato(contratoId);
        toast.success('Exclusão do Contrato Aprovada!');

        logEvent({
          type: 'contratos',
          title: 'Contrato excluído com aprovação',
          details: { id: contratoId },
        });

        carregarContratos();
        return;
      }

      if (r === 'negado') {
        toast.warn('Exclusão do Contrato foi Recusada.');
        carregarContratos();
        return;
      }

      pendentesRef.current[requestId] = setTimeout(loop, POLL_INTERVAL);
    };

    loop();
  };

  const solicitarExclusao = async (contrato) => {
    if (!confirm(`Deseja realmente solicitar a exclusão do contrato de "${contrato.parceiro || 'Parceiro'}"?`)) {
      return;
    }

    const motivo = window.prompt('Informe o motivo da exclusão:') || 'Não especificado';

    const requestId = 'REQ-' + Date.now();
    const texto =
      '🧾 <b>Solicitação de Exclusão de Contrato</b>\n\n' +
      `👤 <b>Parceiro:</b> ${contrato.parceiro || '-'}\n` +
      `📝 <b>Descrição:</b> ${contrato.descricao || '-'}\n` +
      `💰 <b>Valor:</b> ${formatCurrencyBRL(contrato.valor)}\n` +
      `⚠️ <b>Motivo:</b> ${motivo}\n` +
      `🆔 <b>ID:</b> #${contrato.id}\n\n` +
      'Deseja autorizar a exclusão definitiva?';

    const replyMarkup = {
      inline_keyboard: [
        [
          { text: '✅ Aprovar', callback_data: `contrato:aprovar:${requestId}` },
          { text: '❌ Negar', callback_data: `contrato:negar:${requestId}` },
        ],
      ],
    };

    try {
      await tgSendRaw(texto, replyMarkup);
      toast.info('Solicitação enviada ao Telegram. Aguardando autorização...');
      iniciarPolling(requestId, contrato.id);
    } catch {
      // Fallback local se o Telegram estiver offline
      excluirContrato(contrato.id);
      toast.success('Contrato excluído localmente.');
      carregarContratos();
    }
  };

  const handleSalvar = (contrato) => {
    try {
      if (contrato.id) {
        atualizarContrato(contrato);
        toast.success('Contrato atualizado com sucesso!');
        logEvent({
          type: 'contratos',
          title: 'Contrato atualizado',
          details: { id: contrato.id, parceiro: contrato.parceiro },
        });
      } else {
        salvarContrato(contrato);
        toast.success('Novo contrato cadastrado com sucesso!');
        logEvent({
          type: 'contratos',
          title: 'Contrato criado',
          details: { parceiro: contrato.parceiro },
        });
      }

      carregarContratos();
      setModalAberto(false);
      setContratoSelecionado(null);
    } catch (e) {
      console.error('Erro ao salvar contrato:', e);
      toast.error('Erro ao salvar contrato.');
    }
  };

  const handleEditar = (contrato) => {
    setContratoSelecionado(contrato);
    setModalAberto(true);
  };

  const totalValor = contratos.reduce((acc, c) => acc + Number(c.valor || 0), 0);
  const contratosFiltrados = contratos.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.parceiro?.toLowerCase().includes(term) ||
      c.descricao?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="page-container fade-in-page">
      {/* Header */}
      <div className="notas-header-bar" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title" style={{ color: '#00d2ff', margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>
            📝 Gestão de Contratos
          </h1>
          <p className="page-subtitle" style={{ color: '#8a94a6', fontSize: '0.95rem', marginTop: '4px' }}>
            Acompanhamento de contratos com clientes, prestadores de serviço e parceiros.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-nova-conta"
            onClick={() => {
              setContratoSelecionado(null);
              setModalAberto(true);
            }}
          >
            + Novo Contrato
          </button>
        </div>
      </div>

      {/* Grid de Métricas */}
      <div className="notas-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            📄
          </div>
          <div className="stat-data">
            <span className="stat-title">Total de Contratos</span>
            <span className="stat-value">{contratos.length}</span>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            💰
          </div>
          <div className="stat-data">
            <span className="stat-title">Valor Total Contratado</span>
            <span className="stat-value" style={{ color: '#10b981' }}>
              {formatCurrencyBRL(totalValor)}
            </span>
          </div>
        </div>
      </div>

      {/* Barra de Pesquisa */}
      <div className="control-bar" style={{ background: '#181d24', padding: '14px 16px', borderRadius: '10px', border: '1px solid #283340', marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="🔍 Pesquisar por parceiro, cliente ou descrição..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="modal-input"
          style={{ maxWidth: '400px' }}
        />
      </div>

      {/* Tabela de Contratos */}
      <div className="table-responsive" style={{ background: '#181d24', borderRadius: '10px', border: '1px solid #283340', overflow: 'hidden' }}>
        <table className="contasTable" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1e2632', borderBottom: '1px solid #2d3748' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Parceiro / Cliente</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Descrição</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Valor</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Vencimento</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {contratosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Nenhum contrato cadastrado ou encontrado.
                </td>
              </tr>
            ) : (
              contratosFiltrados.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#f1f5f9' }}>
                    {c.parceiro || '-'}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                    {c.descricao || '-'}
                  </td>
                  <td style={{ padding: '12px 16px', fontWeight: 700, color: '#10b981' }}>
                    {formatCurrencyBRL(c.valor)}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#94a3b8' }}>
                    {formatDateBR(c.vencimento)}
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button
                        type="button"
                        className="quick-action-btn"
                        onClick={() => handleEditar(c)}
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        type="button"
                        className="quick-action-btn"
                        onClick={() => solicitarExclusao(c)}
                        style={{ padding: '4px 10px', fontSize: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                      >
                        🗑️ Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ModalContrato
        isOpen={modalAberto}
        onClose={() => {
          setModalAberto(false);
          setContratoSelecionado(null);
        }}
        onSave={handleSalvar}
        contratoParaEditar={contratoSelecionado}
      />
    </div>
  );
}