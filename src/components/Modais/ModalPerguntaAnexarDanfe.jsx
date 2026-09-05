// src/components/Modais/ModalPerguntaAnexarDanfe.jsx
import React, { useEffect } from 'react';
import { toast } from 'react-toastify';
import '../Visual/modal.css';

export default function ModalPerguntaAnexarDanfe({
  isOpen = false,
  onClose = () => {},
  onConfirm = () => {},
  chaveAcesso = '',
  fornecedor = '',
  numero = '',
}) {
  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSim = () => {
    // 1. Copia a chave de acesso se existir
    if (chaveAcesso) {
      try {
        navigator.clipboard.writeText(chaveAcesso);
        toast.info('Chave copiada para a área de transferência!');
      } catch (err) {
        console.warn('Falha ao copiar chave:', err);
      }
    }

    // 2. Abre o site do FSIST em uma nova aba
    try {
      window.open('https://www.fsist.com.br/', '_blank', 'noopener,noreferrer');
    } catch (e) {
      console.warn('Erro ao abrir link do FSIST:', e);
    }

    // 3. Executa callback de confirmação (que abre o modal de anexar)
    onConfirm();
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        alignItems: 'center',
        padding: '16px',
        zIndex: 999999,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '500px',
          width: '95%',
          margin: '0 auto',
          padding: '20px 24px',
          backgroundColor: '#18181c',
          border: '1.5px solid #0284c7',
          borderRadius: '14px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.9), 0 0 25px rgba(2, 132, 199, 0.3)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          animation: 'fadeIn 0.2s ease',
        }}
      >
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem', color: '#38bdf8' }}>
            <span>📎</span> Anexar Nota em Recebidos?
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.3rem',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '2px 6px',
            }}
            title="Fechar (ESC)"
          >
            ✕
          </button>
        </div>

        {/* Informações da Nota */}
        <div
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
          }}
        >
          {fornecedor && (
            <div style={{ fontSize: '0.85rem', color: '#e2e8f0' }}>
              <strong>Fornecedor:</strong> <span style={{ color: '#38bdf8', fontWeight: 700 }}>{fornecedor}</span>
            </div>
          )}
          {numero && (
            <div style={{ fontSize: '0.82rem', color: '#94a3b8' }}>
              <strong>Nº da Nota:</strong> #{numero}
            </div>
          )}
          {chaveAcesso && (
            <div style={{ fontSize: '0.74rem', color: '#64748b', fontFamily: 'monospace', wordBreak: 'break-all' }}>
              <strong>Chave:</strong> {chaveAcesso}
            </div>
          )}
        </div>

        {/* Mensagem e Explicação do Fluxo */}
        <div
          style={{
            backgroundColor: 'rgba(2, 132, 199, 0.1)',
            border: '1px solid rgba(2, 132, 199, 0.3)',
            borderRadius: '10px',
            padding: '12px 14px',
            marginBottom: '18px',
            fontSize: '0.86rem',
            color: '#cbd5e1',
            lineHeight: '1.45',
          }}
        >
          <div style={{ fontWeight: 700, color: '#38bdf8', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>🌐</span> Consulta & Download da DANFE
          </div>
          Ao clicar em <strong>"Sim"</strong>, você será direcionado para o site{' '}
          <strong style={{ color: '#38bdf8' }}>https://www.fsist.com.br/</strong> com a chave copiada para consultar e baixar a DANFE, e abriremos a tela para anexar o arquivo recebido.
        </div>

        {/* Botões de Ação */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: '40px',
              padding: '0 16px',
              background: '#27272a',
              color: '#e4e4e7',
              border: '1px solid #3f3f46',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.88rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Não / Agora Não
          </button>

          <button
            type="button"
            onClick={handleSim}
            style={{
              height: '40px',
              padding: '0 20px',
              background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 10px rgba(2, 132, 199, 0.45)',
              transition: 'all 0.15s',
            }}
          >
            <span>✅</span> Sim, Anexar DANFE
          </button>
        </div>
      </div>
    </div>
  );
}
