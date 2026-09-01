// src/pages/Contratos/ContratoInternetPage.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import ModalContratoInternet from "../../components/Modais/ModalContratoInternet";

const STORAGE_KEY = "contratosInternet";

export default function ContratoInternetPage() {
  const [modalAberto, setModalAberto] = useState(false);
  const [contratos, setContratos] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        setContratos(JSON.parse(raw));
      }
    } catch (e) {
      console.error("Erro ao carregar contratos de internet:", e);
    }
  }, []);

  const salvarContrato = (novoContrato) => {
    try {
      const contrato = {
        id: Date.now(),
        ...novoContrato,
      };

      const lista = [...contratos, contrato];
      setContratos(lista);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
      toast.success(`Contrato de Internet para "${novoContrato.nome || 'Cliente'}" cadastrado com sucesso!`);
      setModalAberto(false);
    } catch (e) {
      console.error("Erro ao salvar contrato de internet:", e);
      toast.error("Erro ao salvar contrato de internet.");
    }
  };

  const handleExcluir = (id, nome) => {
    if (!confirm(`Deseja realmente remover o contrato de internet de "${nome || 'Cliente'}"?`)) {
      return;
    }
    const lista = contratos.filter((c) => c.id !== id);
    setContratos(lista);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lista));
    toast.success("Contrato de internet removido com sucesso!");
  };

  const contratosFiltrados = contratos.filter((c) => {
    const term = searchTerm.toLowerCase();
    return (
      c.nome?.toLowerCase().includes(term) ||
      c.cpf?.toLowerCase().includes(term) ||
      c.telefone?.toLowerCase().includes(term) ||
      String(c.velocidade || "").includes(term)
    );
  });

  const totalComFidelidade = contratos.filter((c) => c.fidelidade === "Sim" || c.fidelidade === "sim").length;
  const velMedia = contratos.length
    ? Math.round(contratos.reduce((acc, c) => acc + Number(c.velocidade || 0), 0) / contratos.length)
    : 0;

  return (
    <div className="page-container fade-in-page">
      {/* Header */}
      <div className="notas-header-bar" style={{ marginBottom: "20px" }}>
        <div>
          <h1 className="page-title" style={{ color: "#00d2ff", margin: 0, fontSize: "1.8rem", fontWeight: 800 }}>
            🌐 Contratos de Internet & Planos
          </h1>
          <p className="page-subtitle" style={{ color: "#8a94a6", fontSize: "0.95rem", marginTop: "4px" }}>
            Gestão de assinantes de internet, velocidades contratadas e fidelidade.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button
            className="btn-nova-conta"
            onClick={() => setModalAberto(true)}
          >
            + Novo Contrato Internet
          </button>
        </div>
      </div>

      {/* Grid de Métricas */}
      <div className="notas-stats-grid" style={{ marginBottom: "24px" }}>
        <div className="stat-card" style={{ borderLeft: "4px solid #3b82f6" }}>
          <div className="stat-icon" style={{ background: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" }}>
            👥
          </div>
          <div className="stat-data">
            <span className="stat-title">Total de Assinantes</span>
            <span className="stat-value">{contratos.length}</span>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: "4px solid #10b981" }}>
          <div className="stat-icon" style={{ background: "rgba(16, 185, 129, 0.15)", color: "#10b981" }}>
            ⚡
          </div>
          <div className="stat-data">
            <span className="stat-title">Com Fidelidade Ativa</span>
            <span className="stat-value" style={{ color: "#10b981" }}>{totalComFidelidade}</span>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: "4px solid #a855f7" }}>
          <div className="stat-icon" style={{ background: "rgba(168, 85, 247, 0.15)", color: "#a855f7" }}>
            🚀
          </div>
          <div className="stat-data">
            <span className="stat-title">Velocidade Média</span>
            <span className="stat-value" style={{ color: "#c084fc" }}>{velMedia} Mbps</span>
          </div>
        </div>
      </div>

      {/* Barra de Pesquisa */}
      <div className="control-bar" style={{ background: "#181d24", padding: "14px 16px", borderRadius: "10px", border: "1px solid #283340", marginBottom: "20px" }}>
        <input
          type="text"
          placeholder="🔍 Pesquisar por cliente, CPF, telefone ou velocidade..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="modal-input"
          style={{ maxWidth: "400px" }}
        />
      </div>

      {/* Tabela de Contratos Internet */}
      <div className="table-responsive" style={{ background: "#181d24", borderRadius: "10px", border: "1px solid #283340", overflow: "hidden" }}>
        <table className="contasTable" style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#1e2632", borderBottom: "1px solid #2d3748" }}>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>Cliente / Titular</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>CPF</th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>Telefone / Contato</th>
              <th style={{ padding: "12px 16px", textAlign: "center" }}>Velocidade</th>
              <th style={{ padding: "12px 16px", textAlign: "center" }}>Fidelidade</th>
              <th style={{ padding: "12px 16px", textAlign: "center" }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {contratosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ textAlign: "center", padding: "30px", color: "#64748b" }}>
                  Nenhum contrato de internet registrado ou encontrado.
                </td>
              </tr>
            ) : (
              contratosFiltrados.map((c) => (
                <tr key={c.id} style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "#f1f5f9" }}>
                    {c.nome || "-"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#94a3b8", fontFamily: "monospace" }}>
                    {c.cpf || "-"}
                  </td>
                  <td style={{ padding: "12px 16px", color: "#cbd5e1" }}>
                    {c.telefone || "-"}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "12px",
                        fontSize: "12px",
                        fontWeight: 700,
                        background: "rgba(59, 130, 246, 0.15)",
                        color: "#60a5fa",
                        border: "1px solid rgba(59, 130, 246, 0.3)",
                      }}
                    >
                      🚀 {c.velocidade || "0"} Mbps
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: "12px",
                        fontSize: "11.5px",
                        fontWeight: 600,
                        background: c.fidelidade === "Sim" ? "rgba(16, 185, 129, 0.15)" : "rgba(148, 163, 184, 0.15)",
                        color: c.fidelidade === "Sim" ? "#4ade80" : "#94a3b8",
                        border: `1px solid ${c.fidelidade === "Sim" ? "rgba(16, 185, 129, 0.3)" : "rgba(148, 163, 184, 0.3)"}`,
                      }}
                    >
                      {c.fidelidade || "Não"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <button
                      type="button"
                      className="quick-action-btn"
                      onClick={() => handleExcluir(c.id, c.nome)}
                      style={{ padding: "4px 10px", fontSize: "12px", background: "rgba(239, 68, 68, 0.15)", color: "#f87171", borderColor: "rgba(239, 68, 68, 0.3)" }}
                    >
                      🗑️ Excluir
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ModalContratoInternet
        isOpen={modalAberto}
        onClose={() => setModalAberto(false)}
        onSave={salvarContrato}
      />
    </div>
  );
}