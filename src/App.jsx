import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';

// Estilos
import 'react-toastify/dist/ReactToastify.css';
import './styles.css';

// Componentes globais
import Navbar from './components/Navbar';

// Páginas
import ContasPage from './pages/Contas/ContasPage';
import FluxoPage from './pages/FluxoCaixa/FluxoPage';
import SimuladorPage from './pages/Simulador/SimuladorPage';
import ContratosPage from './pages/Contratos/ContratosPage';
import EstoquePage from './pages/Estoque/EstoquePage';
import NotasPage from './pages/NotasFiscais/NotasPage';

// Ordem de Serviço
import OrdemServicoForm from './pages/Os/OrdemServicoForm';
import OrdemServicoList from './pages/Os/OrdemServicoList';
import FooterOS from './pages/Os/Footer';

// Modais
import ModalSecao from "./components/ModalSecao";


function App() {
  const [ordens, setOrdens] = useState(JSON.parse(localStorage.getItem('ordens')) || []);

  const adicionarOrdem = (novaOrdem) => {
    const atualizadas = [...ordens, novaOrdem];
    setOrdens(atualizadas);
    localStorage.setItem('ordens', JSON.stringify(atualizadas));
  };

  const excluirOrdem = (numeroOS) => {
    const atualizadas = ordens.filter(o => o.numeroOS !== numeroOS);
    setOrdens(atualizadas);
    localStorage.setItem('ordens', JSON.stringify(atualizadas));
  };

  return (
    <Router>
      <Navbar />
      <ToastContainer autoClose={3000} position="top-right" />
      <Routes>
        <Route path="/" element={<ContasPage />} />
        <Route path="/fluxo" element={<FluxoPage />} />
        <Route path="/simulador" element={<SimuladorPage />} />
        <Route path="/contratos" element={<ContratosPage />} />
        <Route path="/estoque" element={<EstoquePage />} />
        <Route path="/notas" element={<NotasPage />} />
        <Route
          path="/ordem-servico"
          element={
            <div className="container">
              <h1>JSA-TECH, Telecon e Segurança (O.S)</h1>
              <OrdemServicoForm onSalvar={adicionarOrdem} />
              <OrdemServicoList ordens={ordens} onExcluir={excluirOrdem} />
              <FooterOS />
            </div>
          }
        />
        <Route
          path="/ordens"
          element={<OrdemServicoList ordens={ordens} onExcluir={excluirOrdem} />}
        />
      </Routes>
    </Router>
  );
}

export default App;
