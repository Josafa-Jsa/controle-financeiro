// src/components/Visual/TelaSemAcessoView.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import "./TelaSemAcessoView.css";

const MAPA_NOMES_TELAS = {
  "/contas": "Gestão de Contas",
  "/fluxo": "Fluxo de Caixa",
  "/simulador": "Simulador de Créditos & Maquininha",
  "/contratos": "Gestão de Contratos",
  "/contrato-internet": "Contrato Internet / Provedor",
  "/estoque": "Controle de Estoque & Almoxarifado",
  "/notas": "Notas Fiscais (NF-e)",
  "/controle-notas": "Controle de Notas Fiscais",
  "/controle-de-notas": "Controle de Notas Fiscais",
  "/prevencao": "Prevenção de Perdas & Ocorrências",
  "/uniformes": "Controle de Uniformes & EPIs",
  "/ordem-servico": "Ordem de Serviço (O.S)",
  "/ordens": "Ordem de Serviço (O.S)",
  "/dashboard": "Dashboard Principal",
  "/admin/users": "Gestão de Usuários (Admin)",
  "/admin/log": "Logs de Auditoria (Admin)",
  contas: "Gestão de Contas",
  fluxo: "Fluxo de Caixa",
  simulador: "Simulador de Créditos & Maquininha",
  contratos: "Gestão de Contratos",
  "contrato-internet": "Contrato Internet / Provedor",
  estoque: "Controle de Estoque & Almoxarifado",
  notas: "Notas Fiscais (NF-e)",
  "controle-notas": "Controle de Notas Fiscais",
  prevencao: "Prevenção de Perdas & Ocorrências",
  uniformes: "Controle de Uniformes & EPIs",
  "ordem-servico": "Ordem de Serviço (O.S)",
  os: "Ordem de Serviço (O.S)",
  chamados: "Atendimento & Chamados",
};

export default function TelaSemAcessoView({ rota, requiredPermission, nomeTelaCustom }) {
  const navigate = useNavigate();

  const nomeTela =
    nomeTelaCustom ||
    (rota && MAPA_NOMES_TELAS[rota]) ||
    (requiredPermission && MAPA_NOMES_TELAS[requiredPermission]) ||
    "Esta Tela";

  return (
    <div className="acesso-negado-overlay">
      <div className="acesso-negado-card">
        {/* Ícone com Pulso Luminoso */}
        <div className="acesso-negado-icon-wrapper">
          <div className="acesso-negado-pulse-ring"></div>
          <span className="acesso-negado-icon">🔒</span>
        </div>

        {/* Chip de Status */}
        <div className="acesso-negado-status-chip">
          <span className="acesso-negado-chip-dot"></span>
          <span>Acesso Não Autorizado</span>
        </div>

        {/* Badge da Tela */}
        <div>
          <span className="acesso-negado-tela-badge">
            📌 Tela Solicitada: <strong>{nomeTela}</strong>
          </span>
        </div>

        {/* MENSAGEM PRINCIPAL SOLICITADA */}
        <h1 className="acesso-negado-title">
          NO MOMENTO VOCÊ NÃO POSSUI ACESSO A ESSA TELA, SOLICITE O ACESSO NA TELA ATENDIMENTOS, E AGUARDE A EQUIPE TÉCNICA TE CONCEDER ACESSO A TELA E SUAS FUNCIONALIDADES.
        </h1>

        {/* Box com Informações de Suporte */}
        <div className="acesso-negado-info-box">
          <div className="acesso-negado-info-row">
            <span className="info-icon">🛡️</span>
            <div>
              <strong>Controle de Permissões JSA:</strong>
              <p>
                Os módulos do sistema são controlados por perfil de usuário. Se você precisa utilizar as funcionalidades de <strong>{nomeTela}</strong>, abra um chamado na central de atendimentos.
              </p>
            </div>
          </div>
          <div className="acesso-negado-info-row">
            <span className="info-icon">⏱️</span>
            <div>
              <strong>Tempo de Atendimento:</strong>
              <p>
                Nossa equipe técnica analisa as solicitações de liberação com prioridade.
              </p>
            </div>
          </div>
        </div>

        {/* Ações */}
        <div className="acesso-negado-actions">
          <button
            type="button"
            className="btn-acesso-atendimentos"
            onClick={() => navigate("/chamados")}
            title="Ir diretamente para a tela de Atendimentos & Chamados"
          >
            <span>🎧</span>
            <span>Ir para tela de ATENDIMENTOS</span>
          </button>

          <button
            type="button"
            className="btn-acesso-voltar"
            onClick={() => navigate("/dashboard")}
            title="Voltar para a tela inicial"
          >
            <span>🏠</span>
            <span>Voltar ao Início</span>
          </button>
        </div>

        <div className="acesso-negado-footer">
          <span>Copyright © 2026 JSA Soluções Tecnológicas. All rights reserved.</span>
        </div>
      </div>
    </div>
  );
}
