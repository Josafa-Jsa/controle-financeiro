import React, { useEffect, useState } from 'react';
import {
  listarProdutos,
  salvarProduto,
  atualizarProduto,
  excluirProduto
} from '../../services/estoqueService';

import ModalProduto from '../../components/ModalProduto';

const EstoquePage = () => {
  const [produtos, setProdutos] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = () => {
    const dados = listarProdutos();
    setProdutos(dados);
  };

  const handleSalvar = (produto) => {
    if (produto.id) {
      atualizarProduto(produto);
    } else {
      salvarProduto(produto);
    }
    carregarProdutos();
  };

  const handleEditar = (produto) => {
    setProdutoSelecionado(produto);
    setModalAberto(true);
  };

  const handleExcluir = (id) => {
    if (confirm('Deseja realmente excluir este produto?')) {
      excluirProduto(id);
      carregarProdutos();
    }
  };

  const formatarValor = (valor) => {
    return parseFloat(valor).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const emAlerta = (produto) => {
    return Number(produto.quantidade) < Number(produto.estoqueMinimo);
  };

  return (
    <div className="container">
      <h1>Gestão de Estoque</h1>
      <button onClick={() => { setModalAberto(true); setProdutoSelecionado(null); }}>
        Novo Produto
      </button>

      <table border="1" cellPadding="8" style={{ width: '100%', marginTop: '20px' }}>
        <thead>
          <tr>
            <th>Nome</th>
            <th>Descrição</th>
            <th>Quantidade</th>
            <th>Estoque Mínimo</th>
            <th>Valor Unitário</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {produtos.length === 0 ? (
            <tr>
              <td colSpan="6">Nenhum produto cadastrado.</td>
            </tr>
          ) : (
            produtos.map((produto) => (
              <tr key={produto.id} style={{
                backgroundColor: emAlerta(produto) ? '#f8d7da' : 'transparent'
              }}>
                <td>{produto.nome}</td>
                <td>{produto.descricao}</td>
                <td>{produto.quantidade}</td>
                <td>{produto.estoqueMinimo}</td>
                <td>{formatarValor(produto.valorUnitario)}</td>
                <td>
                  <button onClick={() => handleEditar(produto)}>Editar</button>
                  <button onClick={() => handleExcluir(produto.id)}>Excluir</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <ModalProduto
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        onSave={handleSalvar}
        produtoParaEditar={produtoSelecionado}
      />
    </div>
  );
};

export default EstoquePage;
