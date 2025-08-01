import React, { useEffect, useState } from 'react';
import {
  listarNotas,
  salvarNota,
  atualizarNota,
  cancelarNota
} from '../../services/notasService';

import ModalNota from '../../components/ModalNota';

const NotasPage = () => {
  const [notas, setNotas] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [notaSelecionada, setNotaSelecionada] = useState(null);

  useEffect(() => {
    carregarNotas();
  }, []);

  const carregarNotas = () => {
    const dados = listarNotas();
    setNotas(dados);
  };

  const handleSalvar = (nota) => {
    if (nota.id) {
      atualizarNota(nota);
    } else {
      salvarNota(nota);
    }
    carregarNotas();
  };

  const handleEditar = (nota) => {
    setNotaSelecionada(nota);
    setModalAberto(true);
  };

  const handleCancelar = (id) => {
    if (confirm('Deseja realmente cancelar esta nota fiscal?')) {
      cancelarNota(id);
      carregarNotas();
    }
  };

  const formatarValor = (valor) => {
    return parseFloat(valor).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatarData = (data) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  return (
    <div className="container">
      <h1>Notas Fiscais (Simuladas)</h1>
      <button onClick={() => { setModalAberto(true); setNotaSelecionada(null); }}>
        Emitir Nova Nota
      </button>

      <table border="1" cellPadding="8" style={{ width: '100%', marginTop: '20px' }}>
        <thead>
          <tr>
            <th>Número</th>
            <th>Tipo</th>
            <th>Cliente / Serviço</th>
            <th>Valor</th>
            <th>Data</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {notas.length === 0 ? (
            <tr>
              <td colSpan="7">Nenhuma nota fiscal registrada.</td>
            </tr>
          ) : (
            notas.map(nota => (
              <tr key={nota.id} style={{
                backgroundColor: nota.status === 'Cancelada' ? '#f8d7da' : 'transparent'
              }}>
                <td>{nota.numero}</td>
                <td>{nota.tipo}</td>
                <td>{nota.clienteOuServico}</td>
                <td>{formatarValor(nota.valor)}</td>
                <td>{formatarData(nota.dataEmissao)}</td>
                <td>{nota.status}</td>
                <td>
                  <button onClick={() => handleEditar(nota)} disabled={nota.status === 'Cancelada'}>Editar</button>
                  <button onClick={() => handleCancelar(nota.id)} disabled={nota.status === 'Cancelada'}>Cancelar</button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <ModalNota
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        onSave={handleSalvar}
        notaParaEditar={notaSelecionada}
      />
    </div>
  );
};

export default NotasPage;
