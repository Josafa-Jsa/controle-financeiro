import React from 'react';

const ModalSecao = ({ titulo, campos, dados, onChange, onClose, onSalvar }) => {
  return (
    <div className="modal-overlay">
      <div className="modal-box">
        <h2>{titulo}</h2>
        {campos.map(campo => (
          campo.label.toLowerCase().includes('descr') || campo.label.toLowerCase().includes('peça') || campo.label.toLowerCase().includes('serviço') ? (
            <textarea
              key={campo.nome}
              placeholder={campo.label}
              rows={4}
              value={dados[campo.nome] || ''}
              onChange={(e) => onChange(campo.nome, e.target.value)}
            />
          ) : (
            <input
              key={campo.nome}
              placeholder={campo.label}
              value={dados[campo.nome] || ''}
              onChange={(e) => onChange(campo.nome, e.target.value)}
            />
          )
        ))}
        <div className="modal-buttons">
          <button className='salve' onClick={onSalvar}>Salvar</button>
          <button className='fecha' onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
};

export default ModalSecao;
