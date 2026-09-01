import React, { useState, useMemo } from 'react';
import gerarPDF from './OrdemServicoPDF';
import termosCondicoes from '../../data/termosCondicoes';
import { toast } from 'react-toastify';
import ModalSecao from '../../components/Modais/ModalSecao';
import ModalFiltroOS from '../../components/Modais/ModalFiltroOS';
import { buscarClientesEOrdens, formatarCPFouCNPJ, formatarTelefone } from '../../services/clientesService';

import { logEvent } from '../../utils/logger';
import { sendTelegramEvent } from '../../utils/telegram';
import '../../components/Visual/OrdemServicoList.css';

const OrdemServicoList = ({ ordens = [], onExcluir }) => {
  // ===== estado do modal de motivo =====
  const [modalAberto, setModalAberto] = useState(false);
  const [dadosModal, setDadosModal] = useState({ motivo: '' });
  const [osParaExcluir, setOsParaExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [busca, setBusca] = useState('');

  // ===== estado do modal de busca e filtros =====
  const [modalFiltroAberto, setModalFiltroAberto] = useState(false);
  const [filtrosAvancados, setFiltrosAvancados] = useState({
    termoGeral: '',
    nome: '',
    cpf: '',
    telefone: '',
    numeroOS: '',
  });

  const totalFiltrosAvancados = useMemo(() => {
    return Object.values(filtrosAvancados).filter((v) => String(v).trim().length > 0).length;
  }, [filtrosAvancados]);

  const temFiltroAtivo = busca.trim().length > 0 || totalFiltrosAvancados > 0;

  const limparTodosFiltros = () => {
    setBusca('');
    setFiltrosAvancados({
      termoGeral: '',
      nome: '',
      cpf: '',
      telefone: '',
      numeroOS: '',
    });
    toast.info('Filtros limpos.');
  };

  const abrirModalExcluir = (os) => {
    setOsParaExcluir(os);
    setDadosModal({ motivo: '' });
    setModalAberto(true);

    // log: abriu modal de exclusão
    logEvent({
      type: 'os',
      title: 'Abrir modal de exclusão de OS',
      details: { numeroOS: os?.numeroOS || '' },
    });
  };

  const fecharModal = () => {
    if (excluindo) return;
    setModalAberto(false);
    setOsParaExcluir(null);
    setDadosModal({ motivo: '' });
  };

  // ===== Telegram (alerta de exclusão) via helper padronizado =====
  const notificarTelegramExclusao = async (os, motivoTexto) => {
    const linhas = [
      `Número: ${os?.numeroOS || '-'}`,
      `Cliente: ${os?.cliente?.nome || '-'}`,
      `Equipamento: ${[os?.equipamento?.marca, os?.equipamento?.modelo]
        .filter(Boolean)
        .join(' ') || '-'
      }`,
      `Motivo: ${motivoTexto || '-'}`,
      `Data: ${new Date().toLocaleString('pt-BR')}`,
    ];

    await sendTelegramEvent({
      title: 'OS excluída',
      emoji: '🗑️',
      lines: linhas,
    });
  };

  // ===== ações =====
  const handleVisualizar = (os) => {
    gerarPDF(os, termosCondicoes);
    toast.info(`Visualizando PDF da OS ${os.numeroOS}`);

    // log: PDF visualizado
    logEvent({
      type: 'os',
      title: 'Visualização de PDF da OS',
      details: {
        numeroOS: os?.numeroOS || '',
        cliente: os?.cliente?.nome || '',
        equipamento: `${os?.equipamento?.marca || ''} ${os?.equipamento?.modelo || ''
          }`.trim(),
      },
    });
  };

  // Acionado pelo "Salvar" do ModalSecao
  const confirmarExcluir = async () => {
    if (!osParaExcluir) return;
    const motivoTrim = String(dadosModal.motivo || '').trim();
    if (!motivoTrim) {
      toast.warn('Motivo é obrigatório para excluir a OS.');
      return;
    }

    try {
      setExcluindo(true);

      // executa exclusão
      onExcluir(osParaExcluir.numeroOS);

      // log: OS excluída
      logEvent({
        type: 'os',
        title: 'OS excluída',
        details: {
          numeroOS: osParaExcluir?.numeroOS || '',
          cliente: osParaExcluir?.cliente?.nome || '',
          equipamento: `${osParaExcluir?.equipamento?.marca || ''} ${osParaExcluir?.equipamento?.modelo || ''
            }`.trim(),
          motivo: motivoTrim,
        },
      });

      toast.warn(`OS ${osParaExcluir.numeroOS} excluída com sucesso.`);

      // notifica no Telegram
      await notificarTelegramExclusao(osParaExcluir, motivoTrim);

      fecharModal();
    } catch (e) {
      console.error('Erro ao excluir OS:', e);
      toast.error('Falha ao excluir OS.');
    } finally {
      setExcluindo(false);
    }
  };

  const ordensFiltradas = useMemo(() => {
    // 1. Se houver busca inline direta
    if (busca.trim()) {
      return buscarClientesEOrdens({ termo: busca }, ordens).ordens;
    }

    // 2. Se houver filtros avançados vindos do modal
    if (totalFiltrosAvancados > 0) {
      return buscarClientesEOrdens(
        {
          termo: filtrosAvancados.termoGeral,
          nome: filtrosAvancados.nome,
          cpf: filtrosAvancados.cpf,
          telefone: filtrosAvancados.telefone,
          numeroOS: filtrosAvancados.numeroOS,
        },
        ordens
      ).ordens;
    }

    return ordens;
  }, [ordens, busca, filtrosAvancados, totalFiltrosAvancados]);

  return (
    <div className="os-list-container">
      <div className="os-list-header">
        <h2 className="os-list-title">
          <span>📋</span> Ordens de Serviço Emitidas ({ordensFiltradas.length}{ordensFiltradas.length !== ordens.length ? ` de ${ordens.length}` : ''})
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
          {ordens.length > 0 && (
            <input
              type="text"
              className="os-search-input"
              placeholder="🔍 Busca rápida (Nome, CPF, Tel, Nº OS)..."
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                if (e.target.value) {
                  setFiltrosAvancados({ termoGeral: '', nome: '', cpf: '', telefone: '', numeroOS: '' });
                }
              }}
            />
          )}

          <button
            type="button"
            onClick={() => setModalFiltroAberto(true)}
            style={{
              background: totalFiltrosAvancados > 0 ? 'linear-gradient(135deg, #ff5252 0%, #dc2626 100%)' : 'linear-gradient(135deg, #27272a 0%, #1e1e24 100%)',
              color: '#ffffff',
              border: totalFiltrosAvancados > 0 ? '1px solid #ff5252' : '1px solid #3f3f46',
              padding: '9px 15px',
              borderRadius: '8px',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.2s ease',
              boxShadow: totalFiltrosAvancados > 0 ? '0 2px 12px rgba(220, 38, 38, 0.35)' : '0 2px 6px rgba(0, 0, 0, 0.2)',
            }}
            title="Abrir modal de busca avançada por Nome, CPF, Telefone ou Número da OS"
          >
            <span>🔍</span> {totalFiltrosAvancados > 0 ? `Filtro Aplicado (${totalFiltrosAvancados})` : 'Filtrar / Buscar (Modal)'}
          </button>
        </div>
      </div>

      {/* Banner de Filtro Ativo */}
      {temFiltroAtivo && (
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '8px',
            padding: '8px 14px',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '8px',
            fontSize: '0.84rem',
            color: '#fca5a5',
          }}
        >
          <div>
            🔍 <strong>Filtro ativo:</strong> Exibindo {ordensFiltradas.length} de {ordens.length} O.S.
            {busca && <span> | Termo: "<em>{busca}</em>"</span>}
            {filtrosAvancados.nome && <span> | Nome: "<em>{filtrosAvancados.nome}</em>"</span>}
            {filtrosAvancados.cpf && <span> | CPF/CNPJ: "<em>{filtrosAvancados.cpf}</em>"</span>}
            {filtrosAvancados.telefone && <span> | Tel: "<em>{filtrosAvancados.telefone}</em>"</span>}
            {filtrosAvancados.numeroOS && <span> | Nº OS: "<em>{filtrosAvancados.numeroOS}</em>"</span>}
          </div>
          <button
            type="button"
            onClick={limparTodosFiltros}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#f87171',
              textDecoration: 'underline',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.82rem',
            }}
          >
            ✕ Limpar Filtros
          </button>
        </div>
      )}

      {ordens.length === 0 ? (
        <div className="os-list-empty">
          <div className="os-list-empty-icon">📝</div>
          <p style={{ margin: 0, fontSize: '1rem', color: '#e4e4e7', fontWeight: 600 }}>Nenhuma Ordem de Serviço cadastrada</p>
          <p style={{ margin: '6px 0 0 0', fontSize: '0.85rem', color: '#71717a' }}>Preencha as seções acima e clique em "Salvar Ordem de Serviço".</p>
        </div>
      ) : ordensFiltradas.length === 0 ? (
        <div className="os-list-empty">
          <p style={{ margin: 0, color: '#e4e4e7' }}>Nenhuma OS encontrada para "{busca}"</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="os-table">
            <thead>
              <tr>
                <th>Número OS</th>
                <th>Cliente</th>
                <th>Equipamento</th>
                <th>Custo / Pagamento</th>
                <th style={{ textAlign: 'center' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {ordensFiltradas.map((os) => (
                <tr key={os.numeroOS}>
                  <td className="os-numero">{os.numeroOS}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{os.cliente?.nome || '-'}</div>
                    {os.cliente?.telefone && (
                      <div style={{ fontSize: '0.8rem', color: '#71717a' }}>{os.cliente.telefone}</div>
                    )}
                  </td>
                  <td>
                    <div>
                      {[os.equipamento?.marca, os.equipamento?.modelo]
                        .filter(Boolean)
                        .join(' ') || '-'}
                    </div>
                    {os.equipamento?.serie && (
                      <div style={{ fontSize: '0.8rem', color: '#71717a' }}>S/N: {os.equipamento.serie}</div>
                    )}
                  </td>
                  <td>
                    <div style={{ color: '#4ade80', fontWeight: 600 }}>
                      {os.valorPagamento || os.custos || '-'}
                    </div>
                    {os.formaPagamento && (
                      <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>{os.formaPagamento}</div>
                    )}
                  </td>
                  <td>
                    <div className="tb-acoes">
                      <button
                        type="button"
                        className="btn-tb btn-tb-pdf"
                        onClick={() => handleVisualizar(os)}
                        title="Visualizar ou Imprimir PDF"
                      >
                        <span>📄</span> PDF
                      </button>
                      <button
                        type="button"
                        className="btn-tb btn-tb-delete"
                        onClick={() => abrirModalExcluir(os)}
                        title="Excluir Ordem de Serviço"
                      >
                        <span>🗑️</span> Excluir
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== ModalSecao para coletar motivo ===== */}
      {modalAberto && (
        <ModalSecao
          titulo={`Excluir ${osParaExcluir?.numeroOS || 'OS'}`}
          campos={[
            {
              nome: 'motivo',
              label: 'Motivo da exclusão (obrigatório)',
              type: 'textarea',
            },
          ]}
          dados={dadosModal}
          onChange={(campo, valor) =>
            setDadosModal((prev) => ({ ...prev, [campo]: valor }))
          }
          onClose={fecharModal}
          onSalvar={confirmarExcluir}
        />
      )}

      {/* ===== ModalFiltroOS para busca avançada ===== */}
      {modalFiltroAberto && (
        <ModalFiltroOS
          isOpen={true}
          onClose={() => setModalFiltroAberto(false)}
          ordens={ordens}
          filtrosIniciais={filtrosAvancados}
          onAplicarFiltro={(novosFiltros) => {
            setFiltrosAvancados(novosFiltros);
            setBusca('');
            setModalFiltroAberto(false);
          }}
        />
      )}
    </div>
  );
};

export default OrdemServicoList;