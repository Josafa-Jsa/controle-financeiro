// src/components/Modais/ModalEnvioEmMassa.jsx
import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import ModalAdicionarItemEnvio from './ModalAdicionarItemEnvio';
import { gerarGuiaTransferenciaUniformePDF } from '../../utils/gerarGuiaTransferenciaUniformePDF';
import { getUser } from '../../auth/auth';
import '../Visual/modal.css';

export const FILIAIS_ENVIO = [
  'Filial 2',
  'Filial 3',
  'Filial 5',
  'Filial 1',
  'Filial 4',
  'Filial 6',
  'Filial 7',
  'Filial Particular',
];

export default function ModalEnvioEmMassa({
  isOpen,
  onClose,
  estoque = [],
  onConfirmarEnvio,
}) {
  const [filial, setFilial] = useState('Filial 2');
  const [motorista, setMotorista] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [itens, setItens] = useState([]);
  const [modalItemAberto, setModalItemAberto] = useState(false);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setFilial('Filial 2');
      setMotorista('');
      setObservacoes('');
      setItens([]);
      setModalItemAberto(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && !modalItemAberto && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, modalItemAberto, onClose]);

  if (!isOpen) return null;

  const handleAdicionarItem = (novoItem) => {
    setItens((prev) => {
      // Se já existe o mesmo departamento, tamanho e estado, soma a quantidade
      const idx = prev.findIndex(
        (i) =>
          i.departamento === novoItem.departamento &&
          i.tamanho === novoItem.tamanho &&
          i.estado === novoItem.estado
      );
      if (idx !== -1) {
        const atualizados = [...prev];
        atualizados[idx].quantidade += novoItem.quantidade;
        return atualizados;
      }
      return [...prev, novoItem];
    });
  };

  const handleRemoverItem = (index) => {
    setItens((prev) => prev.filter((_, idx) => idx !== index));
  };

  const totalPecas = itens.reduce((acc, i) => acc + (Number(i.quantidade) || 0), 0);

  const handleImprimirGuia = () => {
    if (itens.length === 0) {
      toast.warn('Adicione ao menos um uniforme para gerar a guia de transferência.');
      return;
    }
    const user = getUser();
    const dadosParaPDF = {
      filial,
      motorista: motorista.trim() || 'Logística / Próprio',
      observacoes: observacoes.trim(),
      responsavel: user?.name || user?.nome || 'Operador',
      itens,
    };
    const doc = gerarGuiaTransferenciaUniformePDF(dadosParaPDF);
    doc.save(`Guia_Transferencia_${filial.replace(/\s+/g, '_')}_${Date.now()}.pdf`);
    toast.info('📄 Guia de Transferência e Romaneio gerado com sucesso!');
  };

  const handleConfirmar = async () => {
    if (itens.length === 0) {
      toast.warn('Adicione ao menos um uniforme para realizar o envio em massa.');
      return;
    }

    setSalvando(true);
    try {
      const user = getUser();
      await onConfirmarEnvio({
        filial,
        motorista: motorista.trim(),
        observacoes: observacoes.trim(),
        responsavel: user?.name || user?.nome || 'Operador',
        itens,
      });
      toast.success(`Envio em massa de ${totalPecas} uniforme(s) para ${filial} registrado com sucesso!`);
      onClose();
    } catch (err) {
      console.error('Erro ao processar envio em massa de uniformes:', err);
      toast.error('Erro ao registrar o envio em massa.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-box modal-xl"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '820px', width: '94%', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '14px',
            borderBottom: '1px solid #1e293b',
            paddingBottom: '10px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🚚</span> Envio de Uniformes em Massa para Filiais
            </h2>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Configure a transferência de lotes de uniformes para Filial 2, Filial 3, Filial 5 ou outras unidades
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '20px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>

        {/* Linha de Dados da Filial e Transporte */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr', gap: '12px', marginBottom: '14px' }}>
          <div className="form-row">
            <label className="required" style={{ fontSize: '12px', color: '#fed7aa', fontWeight: 600 }}>
              🏢 Filial de Destino:
            </label>
            <select
              value={filial}
              onChange={(e) => setFilial(e.target.value)}
              style={{ height: '38px', fontSize: '13.5px', fontWeight: 700 }}
              required
            >
              {FILIAIS_ENVIO.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label style={{ fontSize: '12px', color: '#cbd5e1' }}>
              🚛 Motorista / Transportador (Opcional):
            </label>
            <input
              type="text"
              placeholder="Ex: Carlos Logística / Veículo Placa ABC-1234"
              value={motorista}
              onChange={(e) => setMotorista(e.target.value)}
              style={{ height: '38px', fontSize: '13px' }}
            />
          </div>
        </div>

        {/* Container com o Botão Adicionar Uniformes e Lista */}
        <div
          style={{
            background: '#0b0f19',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '14px',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            minHeight: '220px',
            maxHeight: '340px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: '#f8fafc', fontWeight: 700 }}>
                📋 Relação de Uniformes do Lote:
              </span>
              <span style={{ background: '#1e293b', color: '#38bdf8', padding: '2px 8px', borderRadius: '4px', fontSize: '11.5px', fontWeight: 700 }}>
                {totalPecas} peça(s)
              </span>
            </div>

            <button
              type="button"
              onClick={() => setModalItemAberto(true)}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
              }}
            >
              <span>➕</span> Adicionar Uniformes
            </button>
          </div>

          {/* Tabela de Itens */}
          <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #1e293b', borderRadius: '6px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#1e293b', color: '#94a3b8', fontSize: '11px', textTransform: 'uppercase' }}>
                  <th style={{ padding: '8px 10px' }}>Departamento</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Tamanho</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Estado</th>
                  <th style={{ padding: '8px 10px', textAlign: 'center' }}>Qtd.</th>
                  <th style={{ padding: '8px 10px', textAlign: 'right' }}>Ação</th>
                </tr>
              </thead>
              <tbody>
                {itens.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '28px', color: '#94a3b8' }}>
                      Nenhum uniforme adicionado ao lote. Clique em <strong>"Adicionar Uniformes"</strong> acima para incluir departamentos e quantidades.
                    </td>
                  </tr>
                ) : (
                  itens.map((item, idx) => (
                    <tr key={item.id || idx} style={{ borderBottom: '1px solid rgba(51, 65, 85, 0.3)' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 600, color: '#f8fafc' }}>
                        {item.departamento}
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span style={{ background: '#1e293b', padding: '2px 6px', borderRadius: '3px', fontFamily: 'monospace', fontWeight: 700 }}>
                          {item.tamanho}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center' }}>
                        <span style={{ color: item.estado === 'Novo' ? '#34d399' : '#fbbf24', fontWeight: 700 }}>
                          {item.estado}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 800, color: '#38bdf8', fontSize: '13px' }}>
                        {item.quantidade} un
                      </td>
                      <td style={{ padding: '8px 10px', textAlign: 'right' }}>
                        <button
                          type="button"
                          onClick={() => handleRemoverItem(idx)}
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            border: '1px solid #ef4444',
                            color: '#f87171',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            fontSize: '11px',
                            cursor: 'pointer',
                          }}
                        >
                          ✕ Remover
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Linha de Observações */}
        <div className="form-row" style={{ marginTop: '10px' }}>
          <label style={{ fontSize: '11.5px', color: '#cbd5e1' }}>
            📝 Observações da Transferência (Opcional):
          </label>
          <input
            type="text"
            placeholder="Ex: Lote de uniformes novos para suprimento do 2º semestre..."
            value={observacoes}
            onChange={(e) => setObservacoes(e.target.value)}
            style={{ height: '34px', fontSize: '12.5px' }}
          />
        </div>

        {/* Rodapé de Ações */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #1e293b',
            paddingTop: '12px',
            marginTop: '10px',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={salvando}
            style={{
              background: '#242b35',
              border: '1px solid #334155',
              color: '#cbd5e1',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '12.5px',
              cursor: 'pointer',
            }}
          >
            Fechar
          </button>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleImprimirGuia}
              disabled={salvando || itens.length === 0}
              style={{
                background: '#1e293b',
                border: '1px solid #38bdf8',
                color: '#38bdf8',
                padding: '8px 14px',
                borderRadius: '6px',
                fontSize: '12.5px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>🖨️</span> Imprimir Romaneio / Guia
            </button>

            <button
              type="button"
              onClick={handleConfirmar}
              disabled={salvando || itens.length === 0}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#fff',
                border: 'none',
                padding: '8px 18px',
                fontSize: '12.5px',
                borderRadius: '6px',
                cursor: 'pointer',
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 10px rgba(2, 132, 199, 0.35)',
              }}
            >
              {salvando ? 'Processando Envio...' : '🚀 Confirmar Envio em Massa'}
            </button>
          </div>
        </div>

        {/* Sub-Modal para Adicionar Itens de Uniforme */}
        <ModalAdicionarItemEnvio
          isOpen={modalItemAberto}
          onClose={() => setModalItemAberto(false)}
          estoque={estoque}
          onAdicionar={handleAdicionarItem}
        />
      </div>
    </div>
  );
}
