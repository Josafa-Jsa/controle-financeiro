import React, { useEffect, useState } from 'react';
import {
  listarContas,
  salvarConta,
  atualizarConta,
  excluirConta
} from '../../services/contasService';
import ModalConta from '../../components/ModalConta';

const ContasPage = () => {
  const [contas, setContas] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState(null);

  const carregarContas = () => {
    const dados = listarContas();
    setContas(dados);
  };

  useEffect(() => {
    carregarContas();
  }, []);

  const handleSalvar = (conta) => {
    if (conta.id) {
      atualizarConta(conta);
    } else {
      salvarConta(conta);
    }
    carregarContas();
  };

  const handleEditar = (conta) => {
    setContaSelecionada(conta);
    setModalAberto(true);
  };

  const handleExcluir = (id) => {
    if (confirm('Deseja realmente excluir esta conta?')) {
      excluirConta(id);
      carregarContas();
    }
  };

  const formatarValor = (valor) => {
    return parseFloat(valor).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatarData = (dataISO) => {
    return new Date(dataISO).toLocaleDateString('pt-BR');
  };

  return (
    <div className="container">
      <h1>Contas a Pagar e Receber</h1>
      <button onClick={() => { setModalAberto(true); setContaSelecionada(null); }}>
        Nova Conta
      </button>

      <table border="1" cellPadding="8" style={{ width: '100%', marginTop: '20px' }}>
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Descrição</th>
            <th>Valor</th>
            <th>Vencimento</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {contas.length === 0 ? (
            <tr>
              <td colSpan="6">Nenhuma conta registrada.</td>
            </tr>
          ) : (
            contas.map(conta => (
              <tr key={conta.id}>
                <td>{conta.tipo}</td>
                <td>{conta.descricao}</td>
                <td>{formatarValor(conta.valor)}</td>
                <td>{formatarData(conta.vencimento)}</td>
                <td>{conta.status}</td>
                <td>
                  <button onClick={() => handleEditar(conta)}>Editar</button>
                  <button onClick={() => handleExcluir(conta.id)}>Excluir</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <ModalConta
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        onSave={handleSalvar}
        contaParaEditar={contaSelecionada}
      />
    </div>
  );
};

export default ContasPage;
