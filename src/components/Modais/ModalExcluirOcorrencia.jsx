// src/components/Modais/ModalExcluirOcorrencia.jsx
import React, { useEffect } from 'react';
import '../Visual/modal.css';

export default function ModalExcluirOcorrencia({
  isOpen = false,
  onClose = () => {},
  onConfirm = () => {},
  ocorrencia = null,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !ocorrencia) return null;

  const formatarDataBR = (iso) => {
    if (!iso) return '-';
    try {
      const parts = String(iso).split('T')[0].split('-');
      if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
      return new Date(iso).toLocaleDateString('pt-BR');
    } catch {
      return iso;
    }
  };

  const formatarBRL = (num) => {
    return Number(num || 0).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const totalEvidencias = Array.isArray(ocorrencia.evidencias) ? ocorrencia.evidencias.length : 0;
  const totalProdutos = Array.isArray(ocorrencia.produtosEnvolvidos) ? ocorrencia.produtosEnvolvidos.length : 0;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-excluir-title"
    >
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          width: '90%',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          boxShadow: '0 10px 40px rgba(239, 68, 68, 0.25)',
        }}
      >
        {/* Cabeçalho do Modal de Exclusão */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '14px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '22px',
            }}
          >
            🗑️
          </div>
          <div>
            <h2
              id="modal-excluir-title"
              style={{ margin: 0, fontSize: '18px', color: '#f87171', fontWeight: 800 }}
            >
              Confirmar Exclusão de Ocorrência
            </h2>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Ação restrita a Administradores (ADMIN)
            </span>
          </div>
        </div>

        {/* Card Resumo da Ocorrência que será excluída */}
        <div
          style={{
            background: '#15171b',
            border: '1px solid #283340',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span
              style={{
                fontFamily: 'monospace',
                fontWeight: 800,
                color: '#00d2ff',
                fontSize: '13.5px',
                background: 'rgba(0, 210, 255, 0.1)',
                padding: '2px 8px',
                borderRadius: '4px',
              }}
            >
              {ocorrencia.numero}
            </span>
            <span style={{ fontSize: '11.5px', color: '#94a3b8' }}>
              📅 {formatarDataBR(ocorrencia.data)} {ocorrencia.horaInicio ? `às ${ocorrencia.horaInicio}` : ''}
            </span>
          </div>

          <div style={{ fontSize: '14px', fontWeight: 700, color: '#f1f5f9', marginBottom: '6px' }}>
            {ocorrencia.nome || ocorrencia.tipo || 'Ocorrência sem título'}
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', fontSize: '11.5px', color: '#cbd5e1' }}>
            <span>⚠️ <strong>Tipo:</strong> {ocorrencia.tipo}</span>
            {ocorrencia.local && <span>📍 <strong>Local:</strong> {ocorrencia.local}</span>}
            {ocorrencia.valorTotalEnvolvido > 0 && (
              <span style={{ color: '#4ade80' }}>💰 <strong>Total:</strong> {formatarBRL(ocorrencia.valorTotalEnvolvido)}</span>
            )}
            {totalEvidencias > 0 && (
              <span style={{ color: '#38bdf8' }}>📁 <strong>{totalEvidencias}</strong> mídias vinculadas</span>
            )}
          </div>
        </div>

        {/* Banner de Aviso Crítico */}
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px dashed rgba(239, 68, 68, 0.4)',
            borderRadius: '6px',
            padding: '10px 12px',
            marginBottom: '16px',
            fontSize: '12px',
            color: '#fca5a5',
            lineHeight: 1.4,
          }}
        >
          ⚠️ <strong>Atenção:</strong> Esta ação é irreversível. Todos os relatos, pessoas qualificadas, produtos relacionados, arquivos de mídia e registros de custódia vinculados a este registro serão permanentemente removidos.
        </div>

        {/* Botões de Ação */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            className="cancela"
            onClick={onClose}
            style={{ padding: '8px 16px', fontSize: '13px' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 18px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.35)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            🗑️ Sim, Excluir Ocorrência
          </button>
        </div>
      </div>
    </div>
  );
}
