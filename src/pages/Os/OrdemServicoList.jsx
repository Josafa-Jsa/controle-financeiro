import React from 'react';
import gerarPDF from './OrdemServicoPDF';
import termosCondicoes from '../../data/termosCondicoes'; // Caminho corrigido
import { toast } from 'react-toastify';

const OrdemServicoList = ({ ordens, onExcluir }) => {
  const handleVisualizar = (os) => {
    try {
      gerarPDF(os, termosCondicoes);
      toast.info(`Visualizando PDF da OS ${os.numeroOS}`);
    } catch (error) {
      toast.error(`Erro ao gerar PDF da OS ${os.numeroOS}`);
      console.error(error);
    }
  };

  const handleExcluir = (numeroOS) => {
    try {
      onExcluir(numeroOS);
      toast.warn(`OS ${numeroOS} excluída com sucesso.`);
    } catch (error) {
      toast.error(`Erro ao excluir OS ${numeroOS}`);
      console.error(error);
    }
  };

  return (
    <div>
      <h2>Ordens de Serviço Salvas</h2>

      {ordens.length === 0 ? (
        <p>Nenhuma OS salva.</p>
      ) : (
        <table border="1" cellPadding="5" style={{ width: '100%' }}>
          <thead>
            <tr>
              <th>Número OS</th>
              <th>Cliente</th>
              <th>Equipamento</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {ordens.map((os) => (
              <tr key={os.numeroOS}>
                <td>{os.numeroOS}</td>
                <td>{os.cliente.nome}</td>
                <td>{os.equipamento.modelo}</td>
                <td>
                  <button onClick={() => handleVisualizar(os)}>Visualizar PDF</button>{' '}
                  <button onClick={() => handleExcluir(os.numeroOS)}>Excluir</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default OrdemServicoList;
