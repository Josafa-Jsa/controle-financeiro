import React from 'react';
import { Link } from 'react-router-dom';

const Navbar = () => {
  return (
    <nav style={{
      backgroundColor: '#f2f2f2',
      padding: '10px',
      marginBottom: '20px',
      borderBottom: '1px solid #ccc'
    }}>
      <ul style={{
        listStyle: 'none',
        display: 'flex',
        gap: '15px',
        padding: 0,
        margin: 0
      }}>
        <Link to="/ordem-servico">Ordem de Serviço</Link>
        <li><Link to="/">Contas</Link></li>
        <li><Link to="/fluxo">Fluxo de Caixa</Link></li>
        <li><Link to="/simulador">Simulador</Link></li>
        <li><Link to="/contratos">Contratos</Link></li>
        <li><Link to="/estoque">Estoque</Link></li>
        <li><Link to="/notas">Notas Fiscais</Link></li>
      </ul>
    </nav>
  );
};

export default Navbar;
