// src/components/Modais/ModalExcluirConta.jsx
import React, { useEffect } from 'react';
import { formatCurrencyBRL, formatDateBR } from '../../utils/telegram';
import '../Visual/modal.css';

export default function ModalExcluirConta({
  isOpen = false,
  onClose = () => {},
  onConfirm = () => {},
  conta = null,
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

  const [processando, setProcessando] = React.useState(false);

  useEffect(() => {
    if (isOpen) {
      setProcessando(false);
    }
  }, [isOpen]);

  if (!isOpen || !conta) return null;

  const handleConfirmar = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (processando) return;
    setProcessando(true);
    onConfirm(conta);
  };

  const isReceber = conta.tipo === 'Receber';

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
          maxWidth: '480px',
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
              Excluir Conta
            </h3>
            <span style={{ fontSize: '12px', color: '#a1a1aa' }}>
              Confirmação de exclusão definitiva
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

        {/* Resumo da Conta Selecionada */}
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span
                style={{
                  background: isReceber ? 'rgba(46, 204, 113, 0.18)' : 'rgba(231, 76, 60, 0.18)',
                  color: isReceber ? '#2ecc71' : '#e74c3c',
                  border: `1px solid ${isReceber ? 'rgba(46, 204, 113, 0.3)' : 'rgba(231, 76, 60, 0.3)'}`,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                {isReceber ? 'A Receber' : 'A Pagar'}
              </span>
              <span
                style={{
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#34d399',
                  padding: '2px 7px',
                  borderRadius: '4px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  fontFamily: 'monospace',
                }}
              >
                #{conta.codigo || conta.id}
              </span>
            </div>

            <span
              style={{
                fontSize: '15px',
                fontWeight: 800,
                color: isReceber ? '#2ecc71' : '#ef4444',
              }}
            >
              {formatCurrencyBRL(conta.valor)}
            </span>
          </div>

          <div style={{ fontSize: '14px', fontWeight: 600, color: '#f4f4f5' }}>
            {conta.descricao || 'Sem descrição'}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#94a3b8' }}>
            <span>📅 Vencimento: <strong>{formatDateBR(conta.vencimento)}</strong></span>
            <span>Status: <strong style={{ color: conta.status === 'Pago' ? '#34d399' : '#f59e0b' }}>{conta.status}</strong></span>
          </div>

          {conta.observacao && (
            <div style={{ fontSize: '11.5px', color: '#71717a', fontStyle: 'italic', marginTop: '2px' }}>
              Obs: {conta.observacao}
            </div>
          )}
        </div>

        {/* Pergunta de Confirmação */}
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px dashed rgba(239, 68, 68, 0.35)',
            borderRadius: '8px',
            padding: '12px 14px',
            marginBottom: '20px',
            fontSize: '13px',
            color: '#fca5a5',
            lineHeight: 1.45,
          }}
        >
          ⚠️ <strong>Deseja realmente excluir esta conta?</strong>
          <div style={{ fontSize: '11.5px', color: '#f87171', marginTop: '4px' }}>
            Esta ação não poderá ser desfeita e removerá o lançamento definitivamente do sistema financeiro.
          </div>
        </div>

        {/* Botões de Ação */}
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
              transition: 'all 0.15s ease',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={processando}
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              padding: '9px 20px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: processando ? 'not-allowed' : 'pointer',
              opacity: processando ? 0.7 : 1,
              boxShadow: '0 4px 14px rgba(239, 68, 68, 0.3)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{processando ? '⏳' : '🗑️'}</span> {processando ? 'Excluindo...' : 'Sim, Excluir Conta'}
          </button>
        </div>
      </div>
    </div>
  );
}
