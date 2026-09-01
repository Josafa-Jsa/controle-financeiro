import React, { useState, useEffect } from 'react';
import '../Visual/modal.css';

const ModalMotivo = ({ isOpen, onClose, onConfirm, titulo, descricao, placeholder, textoBotao = "Confirmar" }) => {
  const [motivo, setMotivo] = useState('');
  const [erro, setErro] = useState(false);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) handleClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (!motivo.trim()) {
      setErro(true);
      return;
    }
    onConfirm(motivo.trim());
    setMotivo('');
    setErro(false);
  };

  const handleClose = () => {
    setMotivo('');
    setErro(false);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
        <h2>{titulo}</h2>
        <p style={{ margin: '10px 0', color: '#ccc' }}>{descricao}</p>
        
        <textarea
          rows={4}
          style={{
            width: '100%',
            padding: '10px',
            borderRadius: '6px',
            backgroundColor: '#1e1e1e',
            color: '#fff',
            border: erro ? '1px solid #ff4d4d' : '1px solid #444',
            outline: 'none',
            resize: 'none'
          }}
          placeholder={placeholder || "Digite o motivo..."}
          value={motivo}
          onChange={(e) => {
            setMotivo(e.target.value);
            if (e.target.value.trim()) setErro(false);
          }}
        />
        {erro && <small style={{ color: '#ff4d4d', display: 'block', marginTop: '4px' }}>O motivo é obrigatório.</small>}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '15px' }}>
          <button className="cancela" type="button" onClick={handleClose}>
            Cancelar
          </button>
          <button 
            type="button" 
            onClick={handleConfirm}
            style={{ background: '#d32f2f', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >
            {textoBotao}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalMotivo;