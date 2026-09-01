// src/components/Modais/ModalRelatorioPrevencao.jsx
import React, { useEffect, useRef, useState } from 'react';
import {
  gerarRelatorioOcorrenciaBlob,
  baixarRelatorioOcorrenciaPDF,
} from '../../utils/gerarRelatorioOcorrenciaPDF';
import { toast } from 'react-toastify';
import '../Visual/modal.css';

export default function ModalRelatorioPrevencao({
  isOpen = false,
  onClose = () => {},
  ocorrencia = null,
}) {
  const [pdfUrl, setPdfUrl] = useState('');
  const iframeRef = useRef(null);

  useEffect(() => {
    if (isOpen && ocorrencia) {
      try {
        const blob = gerarRelatorioOcorrenciaBlob(ocorrencia);
        if (blob) {
          const url = URL.createObjectURL(blob);
          setPdfUrl(url);

          return () => {
            if (url) URL.revokeObjectURL(url);
          };
        }
      } catch (err) {
        console.error('Erro ao gerar relatório da ocorrência:', err);
        toast.error('Erro ao gerar visualização do relatório.');
      }
    } else {
      setPdfUrl('');
    }
  }, [isOpen, ocorrencia]);

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

  const handleImprimir = () => {
    try {
      if (iframeRef.current && iframeRef.current.contentWindow) {
        iframeRef.current.contentWindow.focus();
        iframeRef.current.contentWindow.print();
      } else {
        baixarRelatorioOcorrenciaPDF(ocorrencia);
      }
    } catch (e) {
      console.warn('Fallback de impressão para download:', e);
      baixarRelatorioOcorrenciaPDF(ocorrencia);
    }
  };

  const handleBaixar = () => {
    try {
      baixarRelatorioOcorrenciaPDF(ocorrencia);
      toast.success('Relatório baixado com sucesso!');
    } catch (e) {
      console.error('Erro ao baixar relatório:', e);
      toast.error('Erro ao baixar arquivo PDF.');
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="relatorio-title"
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
            borderBottom: '1px solid #283340',
            paddingBottom: '10px',
          }}
        >
          <div>
            <h2
              id="relatorio-title"
              style={{ margin: 0, fontSize: '18px', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <span>📄</span> Relatório Oficial de Ocorrência — {ocorrencia.numero}
            </h2>
            <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: '#94a3b8' }}>
              Documento probatório gerado para arquivo, auditoria, RH e autoridades competentes.
            </p>
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              className="quick-action-btn"
              onClick={handleImprimir}
              style={{
                background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
                color: '#fff',
                borderColor: '#38bdf8',
                padding: '6px 14px',
                fontWeight: 700,
                fontSize: '12px',
              }}
            >
              🖨️ Imprimir Relatório
            </button>

            <button
              type="button"
              className="quick-action-btn"
              onClick={handleBaixar}
              style={{
                background: 'linear-gradient(135deg, #059669 0%, #047857 100%)',
                color: '#fff',
                borderColor: '#10b981',
                padding: '6px 14px',
                fontWeight: 700,
                fontSize: '12px',
              }}
            >
              📥 Baixar em PDF
            </button>

            <button
              type="button"
              className="cancela"
              onClick={onClose}
              style={{ padding: '6px 12px', fontSize: '12px' }}
            >
              ✕ Fechar
            </button>
          </div>
        </div>

        {/* Visualizador de PDF */}
        <div style={{ flex: 1, position: 'relative', background: '#0f172a', borderRadius: '8px', overflow: 'hidden' }}>
          {pdfUrl ? (
            <iframe
              ref={iframeRef}
              src={pdfUrl}
              title={`Relatório ${ocorrencia.numero}`}
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
              Gerando documento...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
