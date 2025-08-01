import React, { useEffect, useState } from 'react';
import { listarContas } from '../../services/contasService';

const FluxoPage = () => {
  const [entradas, setEntradas] = useState(0);
  const [saidas, setSaidas] = useState(0);
  const [saldo, setSaldo] = useState(0);
  const [filtroMes, setFiltroMes] = useState('');

  useEffect(() => {
    calcularFluxo();
  }, [filtroMes]);

  const calcularFluxo = () => {
    const contas = listarContas();
    const hoje = new Date();

    const contasFiltradas = contas.filter(c => {
      if (!filtroMes) return true;
      const dataConta = new Date(c.vencimento);
      return (
        dataConta.getMonth() + 1 === parseInt(filtroMes) &&
        dataConta.getFullYear() === hoje.getFullYear()
      );
    });

    const entradas = contasFiltradas
      .filter(c => c.tipo === 'Receber')
      .reduce((total, c) => total + parseFloat(c.valor || 0), 0);

    const saidas = contasFiltradas
      .filter(c => c.tipo === 'Pagar')
      .reduce((total, c) => total + parseFloat(c.valor || 0), 0);

    setEntradas(entradas);
    setSaidas(saidas);
    setSaldo(entradas - saidas);
  };

  const formatar = (valor) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="container">
      <h1>Fluxo de Caixa</h1>

      <label>Filtrar por mês:</label>
      <select onChange={(e) => setFiltroMes(e.target.value)} value={filtroMes}>
        <option value="">Todos</option>
        {[...Array(12)].map((_, i) => (
          <option key={i + 1} value={i + 1}>
            {new Date(0, i).toLocaleString('pt-BR', { month: 'long' })}
          </option>
        ))}
      </select>

      <div style={{ marginTop: '20px' }}>
        <p><strong>Total de Entradas:</strong> {formatar(entradas)}</p>
        <p><strong>Total de Saídas:</strong> {formatar(saidas)}</p>
        <p><strong>Saldo:</strong> {formatar(saldo)}</p>
      </div>
    </div>
  );
};

export default FluxoPage;
