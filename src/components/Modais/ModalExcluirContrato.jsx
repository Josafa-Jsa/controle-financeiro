// src/components/Modais/ModalExcluirContrato.jsx
import React, { useState, useEffect } from 'react';
import { formatCurrencyBRL, formatDateBR } from '../../utils/telegram';
import '../Visual/modal.css';

export default function ModalExcluirContrato({
  isOpen = false,
  onClose = () => {},
  onConfirm = () => {},
  contrato = null,
}) {
  const [motivo, setMotivo] = useState('');

  useEffect(() => {
    if (isOpen) {
      setMotivo('');
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !contrato) return null;

  const handleExcluir = (e) => {
    e?.preventDefault();
    onConfirm(motivo.trim() || 'Exclusão direta solicitada no sistema');
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 99999 }}
    >
      <div
        className="modal-box"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '500px',
          width: '92%',
          background: '#18181b',
          border: '1px solid rgba(239, 68, 68, 0.4)',
          borderRadius: '14px',
          padding: '22px 24px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(239, 68, 68, 0.15)',
          animation: 'fadeInPage 0.2s ease',
        }}
      >
        {/* Topo do Modal */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '16px' }}>
          <div
            style={{
              width: '46px',
              height: '46px',
              borderRadius: '12px',
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '24px',
              flexShrink: 0,
            }}
          >
            🗑️
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#f87171', fontWeight: 800 }}>
              Encerrar Contrato (Excluir)
            </h3>
            <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
              Confirmação de encerramento e exclusão definitiva do contrato
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#a1a1aa',
              fontSize: '1.4rem',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '4px',
            }}
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Resumo do Contrato */}
        <div
          style={{
            background: '#1e1e24',
            border: '1px solid #2e2e38',
            borderRadius: '10px',
            padding: '14px 16px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#f4f4f5' }}>
              👤 {contrato.parceiro || 'Cliente / Parceiro'}
            </span>
            <span style={{ fontSize: '14px', fontWeight: 700, color: '#10b981' }}>
              {formatCurrencyBRL(contrato.valor)}
            </span>
          </div>

          {contrato.descricao && (
            <div style={{ fontSize: '12.5px', color: '#cbd5e1' }}>
              📝 <strong>Descrição:</strong> {contrato.descricao}
            </div>
          )}

          {contrato.vencimento && (
            <div style={{ fontSize: '12px', color: '#94a3b8' }}>
              📅 <strong>Vencimento:</strong> {formatDateBR(contrato.vencimento)}
            </div>
          )}
        </div>

        {/* Campo de Motivo */}
        <form onSubmit={handleExcluir}>
          <div style={{ marginBottom: '16px' }}>
            <label
              htmlFor="motivo-exclusao-contrato"
              style={{ display: 'block', fontSize: '12.5px', color: '#e4e4e7', fontWeight: 600, marginBottom: '6px' }}
            >
              Motivo da exclusão (opcional):
            </label>
            <input
              id="motivo-exclusao-contrato"
              type="text"
              placeholder="Ex: Cancelamento de plano, duplicidade..."
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: '#121214',
                border: '1px solid #27272a',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '13px',
                boxSizing: 'border-box',
                outline: 'none',
              }}
            />
          </div>

          {/* Banner de Atenção */}
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.08)',
              border: '1px dashed rgba(239, 68, 68, 0.35)',
              borderRadius: '8px',
              padding: '10px 12px',
              marginBottom: '20px',
              fontSize: '12px',
              color: '#fca5a5',
              lineHeight: 1.45,
            }}
          >
            ⚠️ <strong>Atenção:</strong> Esta ação removerá o contrato permanentemente do sistema.
          </div>

          {/* Botões */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              className="cancela"
              onClick={onClose}
              style={{
                padding: '9px 18px',
                fontSize: '13px',
                borderRadius: '8px',
                background: '#27272a',
                border: '1px solid #3f3f46',
                color: '#e4e4e7',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                padding: '9px 20px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
              }}
            >
              <span>🗑️</span> Sim, Encerrar Contrato (Excluir)
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
