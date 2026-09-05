// src/components/Modais/ModalEditarTema.jsx
import React, { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { LISTA_TEMAS, obterTemaSalvo, aplicarTema } from "../../services/themeService";
import "./ModalEditarTema.css";

export default function ModalEditarTema({ isOpen, onClose }) {
  const [temaSelecionado, setTemaSelecionado] = useState(obterTemaSalvo);

  useEffect(() => {
    if (isOpen) {
      setTemaSelecionado(obterTemaSalvo());
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSelecionarTema = (id, nome) => {
    setTemaSelecionado(id);
    aplicarTema(id);
    toast.success(`🎨 Tema ${nome} aplicado com sucesso!`);
    if (typeof onClose === "function") {
      setTimeout(() => {
        onClose();
      }, 200);
    }
  };

  return (
    <div className="jsa-tema-modal-overlay" onClick={onClose}>
      <div className="jsa-tema-modal-card" onClick={(e) => e.stopPropagation()}>
        {/* Cabeçalho */}
        <div className="jsa-tema-modal-header">
          <div style={{ width: "30px" }} />
          <h2 className="jsa-tema-modal-title">Editar Tema</h2>
          <button
            type="button"
            className="jsa-tema-btn-close"
            onClick={onClose}
            title="Fechar (Esc)"
          >
            ✕
          </button>
        </div>

        {/* Lista de Opções de Cores */}
        <div className="jsa-tema-list">
          {LISTA_TEMAS.map((tema) => {
            const isChecked = temaSelecionado === tema.id;
            return (
              <div
                key={tema.id}
                className="jsa-tema-item-row"
                onClick={() => handleSelecionarTema(tema.id, tema.nome)}
              >
                {/* Checkbox Quadrado */}
                <div className={`jsa-tema-checkbox-box ${isChecked ? "checked" : ""}`}>
                  {isChecked && <span className="jsa-tema-checkmark">✓</span>}
                </div>

                {/* Botão com Cor do Tema */}
                <div className={`jsa-tema-badge-btn tema-badge-${tema.id}`}>
                  {tema.nome}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
