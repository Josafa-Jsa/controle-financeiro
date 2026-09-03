// src/components/Modais/ModalServicosOS.jsx
import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import '../Visual/modal.css';

export default function ModalServicosOS({
  isOpen,
  onClose,
  servicosIniciais = '',
  pecasIniciais = '',
  onSalvar,
}) {
  const [servicos, setServicos] = useState('');
  const [pecas, setPecas] = useState('');
  const firstTextareaRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setServicos(servicosIniciais || '');
      setPecas(pecasIniciais || '');
      setTimeout(() => {
        firstTextareaRef.current?.focus();
      }, 100);
    }
  }, [isOpen, servicosIniciais, pecasIniciais]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSalvar?.({ servicos, pecas });
    toast.success('Serviços e Peças salvos com sucesso!');
    onClose?.();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box modal-lg"
        style={{ maxWidth: '640px', width: 'min(640px, 94vw)' }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #2b2b36',
            paddingBottom: '12px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>🛠️</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#ff5252' }}>
                Serviços, Peças e Materiais
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
                Descreva os serviços executados e as peças ou materiais utilizados
              </span>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form className="modal-form" onSubmit={handleSubmit}>
          {/* Serviços */}
          <div className="form-row">
            <label htmlFor="servicos-desc" style={{ color: '#fff', fontWeight: 700 }}>
              🛠️ Serviços a Realizar / Executados:
            </label>
            <textarea
              ref={firstTextareaRef}
              id="servicos-desc"
              rows={4}
              value={servicos}
              placeholder="Ex: Formatação e reinstalação do sistema operacional, limpeza preventiva, configuração de roteador..."
              onChange={(e) => setServicos(e.target.value)}
            />
          </div>

          {/* Peças e Materiais */}
          <div className="form-row">
            <label htmlFor="pecas-desc" style={{ color: '#fff', fontWeight: 700 }}>
              🔩 Peças e Materiais Utilizados:
            </label>
            <textarea
              id="pecas-desc"
              rows={4}
              value={pecas}
              placeholder="Ex: 1x SSD 480GB Kingston, 1x Pasta Térmica Prata, 2x Conectores RJ45 Blindados..."
              onChange={(e) => setPecas(e.target.value)}
            />
          </div>

          {/* Botões */}
          <div className="modal-buttons" style={{ marginTop: '16px' }}>
            <button className="salve" type="submit">
              💾 Salvar Serviços e Peças
            </button>
            <button className="cancela" type="button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
