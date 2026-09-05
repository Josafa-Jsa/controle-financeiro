// src/components/Modais/ModalExcluirNota.jsx
import React, { useEffect, useState } from 'react';
import { formatCurrencyBRL, formatDateBR } from '../../utils/telegram';
import '../Visual/modal.css';

export default function ModalExcluirNota({
  isOpen = false,
  onClose = () => {},
  onConfirm = () => {},
  nota = null,
}) {
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setProcessando(false);
    }
  }, [isOpen]);

  if (!isOpen || !nota) return null;

  const handleConfirmar = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    if (processando) return;
    setProcessando(true);
    onConfirm(nota);
  };

  const statusExibicao =
    !nota.status || nota.status === 'Emitida' ? 'Adicionada' : nota.status;
  const numExibicao = nota.numero || nota.id;
  const clienteExibicao = nota.clienteOuServico || nota.origem || 'Não informado';

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
              Excluir Nota Fiscal
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
            title="Fechar (ESC)"
          >
            ✕
          </button>
        </div>

        {/* Resumo da Nota Selecionada */}
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
                  background: 'rgba(56, 189, 248, 0.18)',
                  color: '#38bdf8',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                }}
              >
                NF
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
                #{numExibicao}
              </span>
            </div>
            <span
              style={{
                fontSize: '0.75rem',
                color: '#e4e4e7',
                background: '#27272a',
                padding: '2px 8px',
                borderRadius: '6px',
                fontWeight: 600,
              }}
            >
              {statusExibicao}
            </span>
          </div>

          <div style={{ fontSize: '14px', color: '#f4f4f5', fontWeight: 600, marginTop: '2px' }}>
            {clienteExibicao}
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '6px 12px',
              fontSize: '12.5px',
              color: '#d4d4d8',
              borderTop: '1px solid #27272a',
              paddingTop: '8px',
              marginTop: '4px',
            }}
          >
            <div>
              <span style={{ color: '#71717a' }}>Valor:</span>{' '}
              <strong style={{ color: '#4ade80' }}>
                {formatCurrencyBRL(nota.valor || 0)}
              </strong>
            </div>
            <div>
              <span style={{ color: '#71717a' }}>Emissão:</span>{' '}
              <strong>{nota.dataEmissao ? formatDateBR(nota.dataEmissao) : '-'}</strong>
            </div>
            {nota.tipo && (
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: '#71717a' }}>Tipo:</span>{' '}
                <span style={{ color: '#e4e4e7' }}>{nota.tipo}</span>
              </div>
            )}
          </div>
        </div>

        {/* Mensagem de Aviso */}
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '20px',
            fontSize: '12.5px',
            color: '#fca5a5',
            lineHeight: 1.45,
          }}
        >
          ⚠️ <strong>Atenção:</strong> Tem certeza que deseja excluir esta Nota Fiscal? Esta ação é definitiva e removerá a nota fiscal do sistema.
        </div>

        {/* Rodapé com Ações */}
        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={processando}
            style={{
              padding: '9px 18px',
              background: '#27272a',
              color: '#e4e4e7',
              border: '1px solid #3f3f46',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: processando ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={processando}
            style={{
              padding: '9px 18px',
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: processando ? 'not-allowed' : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 12px rgba(239, 68, 68, 0.35)',
              transition: 'all 0.2s',
              opacity: processando ? 0.7 : 1,
            }}
          >
            {processando ? 'Excluindo...' : '🗑️ Sim, Excluir Nota'}
          </button>
        </div>
      </div>
    </div>
  );
}
