import React, { useEffect, useRef, useState } from 'react';
import { gerarDanfeBlob, gerarDanfePDF } from '../../utils/gerarDanfePDF';
import '../Visual/modal.css';

export default function ModalDanfe({
  isOpen = false,
  onClose = () => {},
  nota = null,
}) {
  const [pdfUrl, setPdfUrl] = useState('');
  const iframeRef = useRef(null);

  useEffect(() => {
    if (isOpen && nota) {
      try {
        const blob = gerarDanfeBlob(nota);
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);

        return () => {
          if (url) URL.revokeObjectURL(url);
        };
      } catch (err) {
        console.error('Erro ao gerar visualização do DANFE:', err);
      }
    } else {
      setPdfUrl('');
    }
  }, [isOpen, nota]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !nota) return null;

  const handleImprimir = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } else {
        gerarDanfePDF(nota);
      }
    } catch (e) {
      console.warn('Fallback de impressão para download direto:', e);
      gerarDanfePDF(nota);
    }
  };

  const handleBaixar = () => {
    gerarDanfePDF(nota);
  };

  const numeroNota = nota.numero || 'S/N';
  const emitenteNota = nota.origem || nota.clienteOuServico || 'NF-e';

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      style={{
        zIndex: 10000,
        backgroundColor: 'rgba(0, 0, 0, 0.82)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '16px',
        overflow: 'hidden',
      }}
    >
      <div
        className="modal-card modal-danfe-container"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '94vw',
          maxWidth: '960px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#181824',
          borderRadius: '12px',
          border: '1px solid #2e2e42',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          padding: 0,
        }}
      >
        {/* Cabeçalho do Modal */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #2e2e42',
            backgroundColor: '#1f1f2e',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>📄</span> DANFE - Documento Auxiliar da NF-e (Meu DANFE / SEFAZ)
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8' }}>
              NF-e Nº <strong>#{numeroNota}</strong> • {emitenteNota} {nota.cnpj ? `(${nota.cnpj})` : ''} {nota.produtoRelacionado ? `• ${nota.produtoRelacionado}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.4rem',
              cursor: 'pointer',
              lineHeight: 1,
              padding: '4px 8px',
            }}
            title="Fechar (ESC)"
          >
            ✕
          </button>
        </div>

        {/* Corpo do Modal com Visualizador PDF Embutido */}
        <div style={{ flex: 1, padding: '16px', backgroundColor: '#0f0f17', display: 'flex', justifyContent: 'center' }}>
          {pdfUrl ? (
            <iframe
              ref={iframeRef}
              src={pdfUrl}
              title="Visualizador do DANFE em PDF"
              style={{
                width: '100%',
                height: '68vh',
                border: '1px solid #334155',
                borderRadius: '8px',
                backgroundColor: '#ffffff',
              }}
            />
          ) : (
            <div style={{ padding: '40px', color: '#fff', textAlign: 'center' }}>
              <p>Carregando visualização do DANFE...</p>
            </div>
          )}
        </div>

        {/* Rodapé com Ações de Impressão e Fechamento */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 20px',
            borderTop: '1px solid #2e2e42',
            backgroundColor: '#1f1f2e',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              type="button"
              onClick={handleImprimir}
              style={{
                background: '#2563eb',
                color: '#fff',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.4)',
                transition: 'background 0.2s',
              }}
            >
              <span>🖨️</span> Imprimir
            </button>

            <button
              type="button"
              onClick={handleBaixar}
              style={{
                background: '#10b981',
                color: '#fff',
                border: 'none',
                padding: '10px 18px',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '0.95rem',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)',
                transition: 'background 0.2s',
              }}
            >
              <span>📥</span> Baixar PDF
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#475569',
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.95rem',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.2s',
            }}
          >
            <span>✖️</span> Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
