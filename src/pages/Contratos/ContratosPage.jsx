import React, { useEffect, useState } from 'react';
import {
  listarContratos,
  salvarContrato,
  atualizarContrato,
  excluirContrato
} from '../../services/contratosService';

import ModalContrato from '../../components/ModalContrato';

const ContratosPage = () => {
  const [contratos, setContratos] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [contratoSelecionado, setContratoSelecionado] = useState(null);

  useEffect(() => {
    carregarContratos();
  }, []);

  const carregarContratos = () => {
    const dados = listarContratos();
    setContratos(dados);
  };

  const handleSalvar = (contrato) => {
    if (contrato.id) {
      atualizarContrato(contrato);
    } else {
      salvarContrato(contrato);
    }
    carregarContratos();
  };

  const handleEditar = (contrato) => {
    setContratoSelecionado(contrato);
    setModalAberto(true);
  };

  const handleExcluir = (id) => {
    if (confirm('Deseja realmente excluir este contrato?')) {
      excluirContrato(id);
      carregarContratos();
    }
  };

  const formatarData = (dataISO) => {
    return new Date(dataISO).toLocaleDateString('pt-BR');
  };

  const formatarValor = (valor) => {
    return parseFloat(valor).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  };

  const vencimentoProximo = (data) => {
    const hoje = new Date();
    const venc = new Date(data);
    const diff = (venc - hoje) / (1000 * 60 * 60 * 24);
    return diff <= 7 && diff >= 0;
  };

  return (
    <div className="container">
      <h1>Gestão de Contratos</h1>
      <button onClick={() => { setModalAberto(true); setContratoSelecionado(null); }}>
        Novo Contrato
      </button>

      <table border="1" cellPadding="8" style={{ width: '100%', marginTop: '20px' }}>
        <thead>
          <tr>
            <th>Parceiro</th>
            <th>Descrição</th>
            <th>Valor</th>
            <th>Vencimento</th>
            <th>Arquivo</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {contratos.length === 0 ? (
            <tr>
              <td colSpan="6">Nenhum contrato registrado.</td>
            </tr>
          ) : (
            contratos.map((contrato) => (
              <tr key={contrato.id} style={{
                backgroundColor: vencimentoProximo(contrato.vencimento) ? '#fff3cd' : 'transparent'
              }}>
                <td>{contrato.parceiro}</td>
                <td>{contrato.descricao}</td>
                <td>{formatarValor(contrato.valor)}</td>
                <td>{formatarData(contrato.vencimento)}</td>
                <td>
                  {contrato.arquivoBase64 && (
                    <a href={contrato.arquivoBase64} download={contrato.arquivoNome} target="_blank" rel="noreferrer">
                      Baixar PDF
                    </a>
                  )}
                </td>
                <td>
                  <button onClick={() => handleEditar(contrato)}>Editar</button>
                  <button onClick={() => handleExcluir(contrato.id)}>Excluir</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <ModalContrato
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        onSave={handleSalvar}
        contratoParaEditar={contratoSelecionado}
      />
    </div>
  );
};

export default ContratosPage;
