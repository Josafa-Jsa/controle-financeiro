import React, { useState, useEffect } from 'react';
import { listarSimulacoes, salvarSimulacao } from '../../services/simulacoesService';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const tabelaJuros = {
  1: 3.2953,
  2: 5.8288,
  3: 5.1563,
  4: 4.7529,
  5: 4.4876,
  6: 4.2972,
  7: 4.1566,
  8: 4.0489,
  9: 3.9615,
  10: 3.8888,
  11: 3.8314,
  12: 3.7816
};

const SimuladorPage = () => {
  const [valor, setValor] = useState('');
  const [juros, setJuros] = useState('');
  const [parcelas, setParcelas] = useState('');
  const [bloquearJuros, setBloquearJuros] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [simulacoesSalvas, setSimulacoesSalvas] = useState([]);

  useEffect(() => {
    setSimulacoesSalvas(listarSimulacoes());
  }, []);

  const handleParcelasChange = (e) => {
    const quantidade = e.target.value;
    setParcelas(quantidade);

    if (tabelaJuros[quantidade]) {
      setJuros(tabelaJuros[quantidade]);
      setBloquearJuros(true);
    } else {
      setBloquearJuros(false);
    }
  };

  const calcularParcelas = () => {
    try {
      const P = parseFloat(valor);
      const i = parseFloat(juros) / 100;
      const n = parseInt(parcelas);

      if (!P || !i || !n) {
        return toast.warn('Preencha todos os campos corretamente.');
      }

      const parcela = (P * i) / (1 - Math.pow(1 + i, -n));
      const totalPago = parcela * n;
      const totalJuros = totalPago - P;

      const tabela = Array.from({ length: n }, (_, index) => ({
        numero: index + 1,
        valor: parcela,
      }));

      setResultado({ parcela, totalPago, totalJuros, tabela });

      toast.success(
        `Simulação concluída: ${n}x de ${formatar(parcela)}. Total: ${formatar(totalPago)}`
      );
    } catch (error) {
      console.error('Erro ao calcular simulação:', error);
      toast.error('Erro na simulação.');
    }
  };

  const salvarResultadoAtual = () => {
    if (!resultado) return;

    const novaSimulacao = {
      valor: parseFloat(valor),
      juros: parseFloat(juros),
      parcelas: parseInt(parcelas),
      total: resultado.totalPago,
      jurosTotal: resultado.totalJuros,
      data: new Date().toLocaleString('pt-BR'),
    };

    salvarSimulacao(novaSimulacao);
    setSimulacoesSalvas(listarSimulacoes());
    toast.success('Simulação salva com sucesso!');
  };

  const formatar = (valor) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div className="container">
      <ToastContainer position="top-center" autoClose={3000} />
      <h1>Simulador de Crédito</h1>

      <div style={{ display: 'flex', flexDirection: 'column', maxWidth: 400 }}>
        <label>Valor do Crédito:</label>
        <input
          type="number"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Ex: 1000"
        />

        <label>Nº de Parcelas:</label>
        <select value={parcelas} onChange={handleParcelasChange}>
          <option value="">Selecione</option>
          {Object.keys(tabelaJuros).map((qtd) => (
            <option key={qtd} value={qtd}>
              {qtd}x
            </option>
          ))}
        </select>

        <label>Juros Mensal (%):</label>
        <input
          type="number"
          step="0.0001"
          value={juros}
          onChange={(e) => setJuros(e.target.value)}
          readOnly={bloquearJuros}
        />

        <button onClick={calcularParcelas} style={{ marginTop: '10px' }}>
          Simular
        </button>
      </div>

      {resultado && (
        <div style={{ marginTop: '30px' }}>
          <h3>Resultado:</h3>
          <p><strong>Parcela Mensal:</strong> {formatar(resultado.parcela)}</p>
          <p><strong>Total a Pagar:</strong> {formatar(resultado.totalPago)}</p>
          <p><strong>Total de Juros:</strong> {formatar(resultado.totalJuros)}</p>

          <button onClick={salvarResultadoAtual} style={{ margin: '10px 0' }}>
            Salvar Simulação
          </button>

          <h4>Tabela de Parcelas:</h4>
          <table border="1" cellPadding="8">
            <thead>
              <tr>
                <th>Parcela</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {resultado.tabela.map((item) => (
                <tr key={item.numero}>
                  <td>{item.numero}</td>
                  <td>{formatar(item.valor)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {simulacoesSalvas.length > 0 && (
        <div style={{ marginTop: '40px' }}>
          <h3>Simulações Salvas</h3>
          <table border="1" cellPadding="8" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Data</th>
                <th>Valor</th>
                <th>Juros</th>
                <th>Parcelas</th>
                <th>Total</th>
                <th>Juros Totais</th>
              </tr>
            </thead>
            <tbody>
              {simulacoesSalvas.map((s, i) => (
                <tr key={i}>
                  <td>{s.data}</td>
                  <td>{formatar(s.valor)}</td>
                  <td>{s.juros}%</td>
                  <td>{s.parcelas}</td>
                  <td>{formatar(s.total)}</td>
                  <td>{formatar(s.jurosTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default SimuladorPage;
