// src/components/Visual/TelaEmManutencaoView.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { obterStatusSistema } from '../../services/systemStatusService';
import './TelaEmManutencaoView.css';

/**
 * Componente exibido quando uma tela ou o sistema geral está sob manutenção.
 * Para tela específica: "[Nome da Tela] Em Manutenção..."
 * Para Geral (Todas as Telas): "Sistema em Manutenção em Múltiplas Telas!"
 */
export default function TelaEmManutencaoView({ nomeTela, mensagem, onVerificarNovamente, isGeral }) {
  const navigate = useNavigate();
  const [verificando, setVerificando] = useState(false);

  const ehManutencaoGeral = Boolean(
    isGeral ||
    (nomeTela && (
      nomeTela.toLowerCase().includes("multiplas") ||
      nomeTela.toLowerCase().includes("múltiplas") ||
      nomeTela.toLowerCase().includes("geral") ||
      nomeTela.toLowerCase().includes("todas as telas")
    ))
  );

  const tituloFormatado = ehManutencaoGeral
    ? "Sistema em Manutenção em Múltiplas Telas!"
    : (nomeTela ? `${nomeTela} Em Manutenção...` : "Esta Tela Em Manutenção...");

  const subtituloFormatado = ehManutencaoGeral
    ? "O sistema está passando por uma manutenção geral preventiva abrangendo todos os módulos e telas. O acesso está temporariamente indisponível para usuários."
    : "Esta tela está temporariamente indisponível para ajustes técnicos e melhorias operacionais.";

  const handleChecarStatus = async () => {
    setVerificando(true);
    try {
      const status = await obterStatusSistema();
      if (!status?.emManutencao) {
        toast.success(`🎉 O acesso foi liberado! O sistema está operacional e online.`);
        if (onVerificarNovamente) {
          onVerificarNovamente(status);
        } else {
          window.location.reload();
        }
      } else {
        toast.warn(`⚠️ O sistema continua em manutenção pela equipe técnica. Aguarde a conclusão.`);
      }
    } catch {
      toast.info(`Verificando conexão com o servidor...`);
    } finally {
      setTimeout(() => setVerificando(false), 450);
    }
  };

  return (
    <div className="maintenance-screen-overlay">
      <div className="maintenance-screen-card">
        {/* Ícone com Pulso Luminoso */}
        <div className="maintenance-icon-wrapper">
          <div className="maintenance-pulse-ring"></div>
          <span className="maintenance-icon">🛠️</span>
        </div>

        {/* Badge Superior */}
        <div className="maintenance-status-chip">
          <span className="maintenance-chip-dot"></span>
          <span>Acesso Temporariamente Bloqueado</span>
        </div>

        {/* TÍTULO */}
        <h1 className="maintenance-screen-title">
          {tituloFormatado}
        </h1>

        <p className="maintenance-screen-subtitle">
          {subtituloFormatado}
        </p>

        {/* Card Informativo com Detalhes */}
        <div className="maintenance-info-box">
          <div className="maintenance-info-row">
            <span className="info-icon">📋</span>
            <div>
              <strong>Motivo do Bloqueio:</strong>
              <p>{mensagem || (ehManutencaoGeral ? "Manutenção preventiva em múltiplos módulos e atualização do sistema." : "Manutenção preventiva e atualização de rotinas do sistema.")}</p>
            </div>
          </div>
          <div className="maintenance-info-row">
            <span className="info-icon">🔒</span>
            <div>
              <strong>Liberação de Acesso:</strong>
              <p>O acesso será liberado automaticamente assim que o sistema retornar ao status <strong>Operacional e Online</strong>.</p>
            </div>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="maintenance-screen-actions">
          <button
            type="button"
            className="btn-maintenance-check"
            onClick={handleChecarStatus}
            disabled={verificando}
          >
            {verificando ? "⏳ Verificando..." : "🔄 Verificar se Liberou"}
          </button>

          {!ehManutencaoGeral ? (
            <button
              type="button"
              className="btn-maintenance-back"
              onClick={() => navigate("/dashboard")}
            >
              📊 Voltar ao Dashboard
            </button>
          ) : (
            <button
              type="button"
              className="btn-maintenance-back"
              onClick={() => navigate("/login")}
              title="Ir para o Login de Administrador"
            >
              🔐 Login Administrativo
            </button>
          )}
        </div>

        <div className="maintenance-screen-footer">
          <span>Equipe JSA Soluções Tecnológicas</span>
        </div>
      </div>
    </div>
  );
}

/**
 * Banner superior exibido apenas para Administradores quando acessam uma tela sob manutenção
 */
export function AdminMaintenanceNoticeBanner({ nomeTela, mensagem }) {
  const navigate = useNavigate();

  const ehManutencaoGeral = (nomeTela && (
    nomeTela.toLowerCase().includes("multiplas") ||
    nomeTela.toLowerCase().includes("múltiplas") ||
    nomeTela.toLowerCase().includes("geral") ||
    nomeTela.toLowerCase().includes("todas as telas")
  ));

  return (
    <div className="admin-maintenance-top-banner">
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span>⚠️</span>
        <strong>MODO MANUTENÇÃO ATIVO:</strong>
        <span>
          {ehManutencaoGeral ? (
            <>O sistema inteiro está em manutenção geral (exibindo "<em>Sistema em Manutenção em Múltiplas Telas!</em>"). Usuários não conseguem acessar nem fazer login.</>
          ) : (
            <>A tela <u>{nomeTela}</u> está bloqueada para os usuários comuns (exibindo "<em>{nomeTela} Em Manutenção...</em>").</>
          )}
        </span>
        {mensagem && <span style={{ opacity: 0.9 }}>Motivo: "{mensagem}"</span>}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <span style={{ fontSize: "11px", background: "rgba(0,0,0,0.25)", padding: "2px 8px", borderRadius: "4px" }}>
          👑 Acesso Master Liberado
        </span>
        <button
          type="button"
          onClick={() => navigate("/dashboard")}
          title="Ir para o Dashboard para restaurar para Operacional & Online"
        >
          ⚙️ Ajustar no Dashboard
        </button>
      </div>
    </div>
  );
}
