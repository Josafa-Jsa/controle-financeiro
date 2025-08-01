import React, { useState, useEffect } from 'react';
import './modal.css';

const ModalConta = ({ isOpen, onClose, onSave, contaParaEditar }) => {
  const [conta, setConta] = useState({
    tipo: 'Pagar',
    descricao: '',
    valor: '',
    vencimento: '',
    status: 'Pendente',
  });

  useEffect(() => {
    if (contaParaEditar) {
      setConta(contaParaEditar);
    } else {
      setConta({
        tipo: 'Pagar',
        descricao: '',
        valor: '',
        vencimento: '',
        status: 'Pendente',
      });
    }
  }, [contaParaEditar]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setConta({ ...conta, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(conta);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{contaParaEditar ? 'Editar Conta' : 'Nova Conta'}</h2>
        <form onSubmit={handleSubmit}>
          <label>Tipo:</label>
          <select name="tipo" value={conta.tipo} onChange={handleChange}>
            <option value="Pagar">Pagar</option>
            <option value="Receber">Receber</option>
          </select>

          <label>Descrição:</label>
          <input
            type="text"
            name="descricao"
            value={conta.descricao}
            onChange={handleChange}
            required
          />

          <label>Valor:</label>
          <input
            type="number"
            name="valor"
            step="0.01"
            value={conta.valor}
            onChange={handleChange}
            required
          />

          <label>Vencimento:</label>
          <input
            type="date"
            name="vencimento"
            value={conta.vencimento}
            onChange={handleChange}
            required
          />

          <label>Status:</label>
          <select name="status" value={conta.status} onChange={handleChange}>
            <option value="Pendente">Pendente</option>
            <option value="Pago">Pago</option>
          </select>

          <div className="modal-buttons">
            <button type="submit">Salvar</button>
            <button type="button" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalConta;
