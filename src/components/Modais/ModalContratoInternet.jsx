import React, { useEffect, useState } from "react";
import "../Visual/modal.css";

const VAZIO = {
  nome: "",
  cpf: "",
  telefone: "",
  endereco: "",
  email: "",
  velocidade: "",
  fidelidade: ""
};

const ModalContratoInternet = ({
  isOpen,
  onClose,
  onSave,
  contratoParaEditar
}) => {

  const [contrato, setContrato] = useState(VAZIO);

  useEffect(() => {
    if (contratoParaEditar) {
      setContrato({
        nome: contratoParaEditar.nome ?? "",
        cpf: contratoParaEditar.cpf ?? "",
        telefone: contratoParaEditar.telefone ?? "",
        endereco: contratoParaEditar.endereco ?? "",
        email: contratoParaEditar.email ?? "",
        velocidade: contratoParaEditar.velocidade ?? "",
        fidelidade: contratoParaEditar.fidelidade ?? ""
      });
    } else {
      setContrato(VAZIO);
    }
  }, [contratoParaEditar]);

  // Fechar com ESC
  useEffect(() => {
    if (!isOpen) return;

    const onEsc = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);

  }, [isOpen, onClose]);

  const handleChange = (e) => {
    const { name, value } = e.target;

    setContrato((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    onSave?.(contrato);

    onClose?.();
  };

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >

      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
      >

        <h2>
          {contratoParaEditar
            ? "Editar Contrato de Internet"
            : "Novo Contrato de Internet"}
        </h2>

        <form className="modal-form" onSubmit={handleSubmit}>

          {/* Nome */}
          <div className="form-row">
            <label className="required">Nome completo:</label>
            <input
              type="text"
              name="nome"
              value={contrato.nome}
              onChange={handleChange}
              required
              placeholder="Nome do cliente"
            />
          </div>

          {/* CPF */}
          <div className="form-row">
            <label className="required">CPF:</label>
            <input
              type="text"
              name="cpf"
              value={contrato.cpf}
              onChange={handleChange}
              required
              placeholder="000.000.000-00"
            />
          </div>

          {/* Telefone */}
          <div className="form-row">
            <label className="required">Telefone:</label>
            <input
              type="text"
              name="telefone"
              value={contrato.telefone}
              onChange={handleChange}
              required
              placeholder="(65) 99999-9999"
            />
          </div>

          {/* Endereço */}
          <div className="form-row">
            <label className="required">Endereço:</label>
            <input
              type="text"
              name="endereco"
              value={contrato.endereco}
              onChange={handleChange}
              required
              placeholder="Endereço de instalação"
            />
          </div>

          {/* Email */}
          <div className="form-row">
            <label>Email:</label>
            <input
              type="email"
              name="email"
              value={contrato.email}
              onChange={handleChange}
              placeholder="cliente@email.com"
            />
          </div>

          {/* Velocidade */}
          <div className="form-row">
            <label className="required">Velocidade (Mbps):</label>
            <input
              type="number"
              name="velocidade"
              value={contrato.velocidade}
              onChange={handleChange}
              required
              placeholder="Ex: 300"
            />
          </div>

          {/* Fidelidade */}
          <div className="form-row">
            <label>Fidelidade:</label>

            <div style={{ display: "flex", gap: "20px" }}>

              <label>
                <input
                  type="radio"
                  name="fidelidade"
                  value="Sim"
                  checked={contrato.fidelidade === "Sim"}
                  onChange={handleChange}
                />
                Sim
              </label>

              <label>
                <input
                  type="radio"
                  name="fidelidade"
                  value="Não"
                  checked={contrato.fidelidade === "Não"}
                  onChange={handleChange}
                />
                Não
              </label>

            </div>
          </div>

          {/* Botões */}
          <div className="modal-buttons">

            <button
              className="salve"
              type="submit"
            >
              Salvar
            </button>

            <button
              className="cancela"
              type="button"
              onClick={onClose}
            >
              Cancelar
            </button>

          </div>

        </form>

      </div>

    </div>
  );
};

export default ModalContratoInternet;