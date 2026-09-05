// src/components/Modais/ModalAnexarDanfe.jsx
import React, { useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import '../Visual/modal.css';

export default function ModalAnexarDanfe({
  isOpen = false,
  onClose = () => {},
  onSaveAnexo = () => {},
  chaveAcesso = '',
  fornecedor = '',
  numero = '',
  anexoAtual = null,
}) {
  const [arquivo, setArquivo] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [arrastando, setArrastando] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      if (anexoAtual) {
        setArquivo(anexoAtual);
        setPreviewUrl(anexoAtual.dataUrl || '');
      } else {
        setArquivo(null);
        setPreviewUrl('');
      }
      setArrastando(false);
    }
  }, [isOpen, anexoAtual]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const processarArquivo = (file) => {
    if (!file) return;

    // Tipos aceitos: PDF, XML, Imagens
    const extensoesPermitidas = ['.pdf', '.xml', '.png', '.jpg', '.jpeg'];
    const nomeLower = file.name.toLowerCase();
    const ehValido = extensoesPermitidas.some((ext) => nomeLower.endsWith(ext));

    if (!ehValido) {
      toast.error('Formato não suportado. Por favor, envie arquivos PDF, XML ou imagem (PNG, JPG).');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      toast.error('O arquivo é muito grande (limite: 15MB).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const novoAnexo = {
        nome: file.name,
        tipo: file.type || (nomeLower.endsWith('.pdf') ? 'application/pdf' : nomeLower.endsWith('.xml') ? 'text/xml' : 'image/jpeg'),
        tamanho: file.size,
        dataUrl,
        criadoEm: new Date().toISOString(),
      };
      setArquivo(novoAnexo);
      setPreviewUrl(dataUrl);
      toast.success(`Arquivo "${file.name}" carregado com sucesso!`);
    };

    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processarArquivo(file);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setArrastando(true);
  };

  const handleDragLeave = () => {
    setArrastando(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setArrastando(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processarArquivo(file);
  };

  const handleCopiarChave = () => {
    if (!chaveAcesso) return;
    navigator.clipboard.writeText(chaveAcesso);
    toast.success('Chave de acesso copiada!');
  };

  const handleAbrirFsist = () => {
    handleCopiarChave();
    window.open('https://www.fsist.com.br/', '_blank', 'noopener,noreferrer');
  };

  const handleSalvar = () => {
    if (!arquivo) {
      toast.warning('Por favor, selecione um arquivo de DANFE para anexar.');
      return;
    }

    onSaveAnexo(arquivo);
    onClose();
  };

  const formatarTamanho = (bytes) => {
    if (!bytes) return '0 KB';
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    return `${(kb / 1024).toFixed(2)} MB`;
  };

  const ehPdf = arquivo?.tipo === 'application/pdf' || arquivo?.nome?.toLowerCase().endsWith('.pdf');
  const ehImagem = arquivo?.tipo?.startsWith('image/') || /\.(png|jpe?g|webp)$/i.test(arquivo?.nome || '');

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
        backgroundColor: 'rgba(0, 0, 0, 0.88)',
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '620px',
          width: '95%',
          maxHeight: '90vh',
          margin: '0 auto',
          padding: '18px 22px',
          backgroundColor: '#18181c',
          border: '1.5px solid #10b981',
          borderRadius: '14px',
          boxShadow: '0 25px 50px rgba(0, 0, 0, 0.9), 0 0 25px rgba(16, 185, 129, 0.25)',
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box',
          overflowY: 'auto',
          animation: 'fadeIn 0.2s ease',
        }}
      >
        {/* Cabeçalho */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.18rem', color: '#34d399' }}>
            <span>📥</span> Anexar Arquivo da DANFE / Nota Fiscal
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

        {/* Barra de Acesso Rápido ao FSIST com Chave */}
        <div
          style={{
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            borderRadius: '10px',
            padding: '10px 14px',
            marginBottom: '14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>Chave da Nota ({numero ? `NF #${numero}` : 'NF-e'}):</span>
            <span style={{ fontSize: '0.78rem', fontFamily: 'monospace', color: '#38bdf8', fontWeight: 700 }}>
              {chaveAcesso ? `${chaveAcesso.slice(0, 24)}...` : 'Chave não informada'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
            {chaveAcesso && (
              <button
                type="button"
                onClick={handleCopiarChave}
                style={{
                  padding: '5px 10px',
                  borderRadius: '6px',
                  backgroundColor: '#1e293b',
                  color: '#cbd5e1',
                  border: '1px solid #334155',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
                title="Copiar Chave de Acesso"
              >
                📋 Copiar Chave
              </button>
            )}

            <button
              type="button"
              onClick={handleAbrirFsist}
              style={{
                padding: '5px 12px',
                borderRadius: '6px',
                backgroundColor: 'rgba(2, 132, 199, 0.2)',
                color: '#38bdf8',
                border: '1px solid #0284c7',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              title="Abrir site do fsist.com.br em nova aba"
            >
              🌐 Abrir FSIST
            </button>
          </div>
        </div>

        {/* Área de Drag and Drop / Seleção de Arquivo */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.xml,.png,.jpg,.jpeg"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />

        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${arrastando ? '#10b981' : arquivo ? '#059669' : '#334155'}`,
            borderRadius: '12px',
            padding: '24px 16px',
            textAlign: 'center',
            backgroundColor: arrastando ? 'rgba(16, 185, 129, 0.1)' : arquivo ? 'rgba(16, 185, 129, 0.05)' : '#111827',
            cursor: 'pointer',
            transition: 'all 0.2s',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '14px',
          }}
        >
          <div style={{ fontSize: '2.4rem' }}>{arquivo ? '📄' : '📁'}</div>
          <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f1f5f9' }}>
            {arquivo ? arquivo.nome : 'Clique aqui ou arraste o arquivo da DANFE'}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
            {arquivo
              ? `${formatarTamanho(arquivo.tamanho)} • Arquivo pronto para anexar`
              : 'Suporta arquivos PDF, XML, PNG ou JPG (máx. 15MB)'}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
            style={{
              marginTop: '4px',
              padding: '6px 14px',
              backgroundColor: '#1e293b',
              border: '1px solid #3b82f6',
              borderRadius: '6px',
              color: '#60a5fa',
              fontSize: '0.8rem',
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {arquivo ? '🔄 Selecionar Outro Arquivo' : '🔍 Procurar Arquivo no Computador'}
          </button>
        </div>

        {/* Pré-visualização quando houver arquivo carregado */}
        {arquivo && previewUrl && (
          <div
            style={{
              backgroundColor: '#0f172a',
              border: '1px solid #1e293b',
              borderRadius: '10px',
              padding: '12px',
              marginBottom: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#10b981', display: 'flex', alignItems: 'center', gap: '5px' }}>
                <span>👁️</span> Pré-visualização do Anexo
              </span>
              <button
                type="button"
                onClick={() => {
                  setArquivo(null);
                  setPreviewUrl('');
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                🗑️ Remover
              </button>
            </div>

            {ehPdf ? (
              <iframe
                src={previewUrl}
                title="Pré-visualização da DANFE"
                style={{
                  width: '100%',
                  height: '240px',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  backgroundColor: '#1e293b',
                }}
              />
            ) : ehImagem ? (
              <div style={{ textAlign: 'center', maxHeight: '240px', overflow: 'hidden', borderRadius: '6px' }}>
                <img
                  src={previewUrl}
                  alt="Anexo da DANFE"
                  style={{ maxWidth: '100%', maxHeight: '240px', objectFit: 'contain' }}
                />
              </div>
            ) : (
              <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.82rem' }}>
                Arquivo XML anexado com sucesso ({arquivo.nome}).
              </div>
            )}
          </div>
        )}

        {/* Botões de Ação */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              height: '38px',
              padding: '0 16px',
              background: '#27272a',
              color: '#e4e4e7',
              border: '1px solid #3f3f46',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.86rem',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleSalvar}
            disabled={!arquivo}
            style={{
              height: '38px',
              padding: '0 20px',
              background: arquivo
                ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                : '#334155',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.86rem',
              cursor: arquivo ? 'pointer' : 'not-allowed',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: arquivo ? '0 2px 10px rgba(16, 185, 129, 0.4)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            <span>📎</span> Confirmar Anexo da Nota
          </button>
        </div>
      </div>
    </div>
  );
}
