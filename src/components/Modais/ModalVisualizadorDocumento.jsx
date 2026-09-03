// src/components/Modais/ModalVisualizadorDocumento.jsx
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import '../Visual/modal.css';

export default function ModalVisualizadorDocumento({
  isOpen = false,
  onClose = () => {},
  titulo = 'Visualização do Documento Oficial',
  subtitulo = 'Documento emitido pelo sistema Big Master',
  blob = null,
  nomeArquivo = 'Documento_Oficial.pdf',
}) {
  const [pdfUrl, setPdfUrl] = useState('');
  const iframeRef = useRef(null);

  useEffect(() => {
    if (isOpen && blob) {
      try {
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);

        return () => {
          if (url) URL.revokeObjectURL(url);
        };
      } catch (err) {
        console.error('Erro ao gerar visualização do documento:', err);
        toast.error('Erro ao gerar visualização do documento.');
      }
    } else {
      setPdfUrl('');
    }
  }, [isOpen, blob]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !blob) return null;

  const handleImprimir = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } else {
        handleSalvarPDF();
      }
    } catch (e) {
      console.warn('Fallback de impressão para download:', e);
      handleSalvarPDF();
    }
  };

  const handleSalvarPDF = () => {
    try {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = nomeArquivo;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Documento salvo com sucesso!');
    } catch (e) {
      console.error('Erro ao salvar arquivo PDF:', e);
      toast.error('Erro ao baixar o arquivo PDF.');
    }
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
        className="modal-box modal-xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '95%',
          maxWidth: '1000px',
          height: '92vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '16px',
        }}
      >
        {/* Cabeçalho do Modal */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '10px',
            borderBottom: '1px solid #1e293b',
            paddingBottom: '10px',
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '17px',
                color: '#38bdf8',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontWeight: 700,
              }}
            >
              <span>📄</span> {titulo}
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              {subtitulo}
            </p>
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handleImprimir}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#fff',
                border: '1px solid #38bdf8',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(2, 132, 199, 0.35)',
              }}
            >
              <span>🖨️</span> Imprimir
            </button>

            <button
              type="button"
              onClick={handleSalvarPDF}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#fff',
                border: '1px solid #10b981',
                padding: '8px 16px',
                borderRadius: '8px',
                fontWeight: 700,
                fontSize: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(16, 185, 129, 0.35)',
              }}
            >
              <span>💾</span> Salvar PDF
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#cbd5e1',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Fechar
            </button>
          </div>
        </div>

        {/* Visualizador de PDF */}
        <div style={{ flex: 1, position: 'relative', background: '#0f172a', borderRadius: '8px', overflow: 'hidden' }}>
          {pdfUrl ? (
            <iframe
              ref={iframeRef}
              src={pdfUrl}
              title="Visualizador de Documento"
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
            />
          ) : (
            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                height: '100%',
                color: '#94a3b8',
                fontSize: '14px',
              }}
            >
              Gerando visualização do documento...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
