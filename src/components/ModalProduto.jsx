import React, { useEffect, useState } from 'react';
import './modal.css';

const ModalProduto = ({ isOpen, onClose, onSave, produtoParaEditar }) => {
  const [produto, setProduto] = useState({
    nome: '',
    descricao: '',
    quantidade: '',
    valorUnitario: '',
    estoqueMinimo: '',
  });

  useEffect(() => {
    if (produtoParaEditar) {
      setProduto(produtoParaEditar);
    } else {
      setProduto({
        nome: '',
        descricao: '',
        quantidade: '',
        valorUnitario: '',
        estoqueMinimo: '',
      });
    }
  }, [produtoParaEditar]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProduto({ ...produto, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(produto);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <h2>{produtoParaEditar ? 'Editar Produto' : 'Novo Produto'}</h2>
        <form onSubmit={handleSubmit}>
          <label>Nome:</label>
          <input
            type="text"
            name="nome"
            value={produto.nome}
            onChange={handleChange}
            required
          />

          <label>Descrição:</label>
          <input
            type="text"
            name="descricao"
            value={produto.descricao}
            onChange={handleChange}
          />

          <label>Quantidade:</label>
          <input
            type="number"
            name="quantidade"
            value={produto.quantidade}
            onChange={handleChange}
            required
          />

          <label>Estoque Mínimo:</label>
          <input
            type="number"
            name="estoqueMinimo"
            value={produto.estoqueMinimo}
            onChange={handleChange}
            required
          />

          <label>Valor Unitário:</label>
          <input
            type="number"
            step="0.01"
            name="valorUnitario"
            value={produto.valorUnitario}
            onChange={handleChange}
            required
          />

          <div className="modal-buttons">
            <button type="submit">Salvar</button>
            <button type="button" onClick={onClose}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalProduto;
