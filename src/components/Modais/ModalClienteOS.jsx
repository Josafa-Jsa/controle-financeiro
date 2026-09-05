// src/components/Modais/ModalClienteOS.jsx
import React, { useState, useEffect, useRef } from 'react';
import {
  formatarCPFouCNPJ,
  formatarTelefone,
  buscarClientePorDocumento,
  salvarClienteNaBase,
} from '../../services/clientesService';
import { toast } from 'react-toastify';
import '../Visual/modal.css';

export default function ModalClienteOS({
  isOpen,
  onClose,
  dadosCliente = {},
  onSalvar,
  ordens = [],
}) {
  const [cliente, setCliente] = useState({
    nome: '',
    documento: '',
    telefone: '',
    endereco: '',
    email: '',
  });

  const docInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setCliente({
        nome: dadosCliente?.nome || '',
        documento: formatarCPFouCNPJ(dadosCliente?.documento || ''),
        telefone: formatarTelefone(dadosCliente?.telefone || ''),
        endereco: dadosCliente?.endereco || '',
        email: dadosCliente?.email || '',
      });
      setTimeout(() => {
        docInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen, dadosCliente]);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape' && isOpen) onClose?.();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleDocumentoChange = (e) => {
    const valorFormatado = formatarCPFouCNPJ(e.target.value);
    setCliente((prev) => ({ ...prev, documento: valorFormatado }));

    // Ao inserir o CPF, se tiver cadastro prévio, preenche automaticamente todos os dados
    const encontrado = buscarClientePorDocumento(valorFormatado, ordens);
    if (encontrado) {
      setCliente({
        nome: encontrado.nome || cliente.nome,
        documento: formatarCPFouCNPJ(encontrado.documento || valorFormatado),
        telefone: formatarTelefone(encontrado.telefone || cliente.telefone),
        endereco: encontrado.endereco || cliente.endereco,
        email: encontrado.email || cliente.email,
      });
      toast.success(`✓ Cliente localizado: ${encontrado.nome}! Dados preenchidos automaticamente.`);
    }
  };

  const handleTelefoneChange = (e) => {
    const formatado = formatarTelefone(e.target.value);
    setCliente((prev) => ({ ...prev, telefone: formatado }));
  };

  const handleChange = (campo, valor) => {
    setCliente((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const nomeTrim = String(cliente.nome || '').trim();
    const docTrim = String(cliente.documento || '').trim();
    const emailTrim = String(cliente.email || '').trim();

    if (!docTrim) {
      toast.warn('Informe o CPF ou CNPJ do cliente.');
      return;
    }

    if (!nomeTrim) {
      toast.warn('Informe o Nome Completo do cliente.');
      return;
    }

    if (!emailTrim) {
      toast.warn('O preenchimento do E-mail é obrigatório.');
      return;
    }

    // Validação de formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(emailTrim)) {
      toast.warn('Por favor, informe um formato de e-mail válido (ex: cliente@exemplo.com).');
      return;
    }

    // Salva na base de clientes permanente
    salvarClienteNaBase(cliente);

    onSalvar?.(cliente);
    toast.success('Dados do cliente salvos com sucesso!');
    onClose?.();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box modal-lg"
        style={{ maxWidth: '640px', width: 'min(640px, 94vw)' }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #2b2b36',
            paddingBottom: '12px',
            marginBottom: '16px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '1.4rem' }}>👤</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.25rem', color: '#ff5252' }}>
                Cadastrar / Dados do Cliente
              </h2>
              <span style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
                Preencha as informações do cliente para a Ordem de Serviço
              </span>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            {/* Campo CPF / CNPJ */}
            <div className="form-row">
              <label htmlFor="cli-cpf" style={{ color: '#fff', fontWeight: 700 }}>
                🪪 CPF / CNPJ: *
              </label>
              <input
                ref={docInputRef}
                id="cli-cpf"
                type="text"
                value={cliente.documento}
                placeholder="000.000.000-00"
                onChange={handleDocumentoChange}
                required
              />
            </div>

            {/* Telefone */}
            <div className="form-row">
              <label htmlFor="cli-telefone">📞 Telefone / WhatsApp:</label>
              <input
                id="cli-telefone"
                type="text"
                value={cliente.telefone}
                placeholder="(00) 00000-0000"
                onChange={handleTelefoneChange}
              />
            </div>
          </div>

          {/* Nome completo */}
          <div className="form-row">
            <label htmlFor="cli-nome" style={{ color: '#fff', fontWeight: 700 }}>
              👤 Nome Completo: *
            </label>
            <input
              id="cli-nome"
              type="text"
              value={cliente.nome}
              placeholder="Nome do cliente ou razão social"
              onChange={(e) => handleChange('nome', e.target.value)}
              required
            />
          </div>

          {/* Endereço */}
          <div className="form-row">
            <label htmlFor="cli-endereco">📍 Endereço de Atendimento / Instalação:</label>
            <input
              id="cli-endereco"
              type="text"
              value={cliente.endereco}
              placeholder="Rua, número, bairro, cidade..."
              onChange={(e) => handleChange('endereco', e.target.value)}
            />
          </div>

          {/* E-mail (Obrigatório / Exigência) */}
          <div className="form-row">
            <label htmlFor="cli-email" style={{ color: '#fff', fontWeight: 700 }}>
              ✉️ E-mail: *
            </label>
            <input
              id="cli-email"
              type="text"
              value={cliente.email}
              placeholder="cliente@exemplo.com"
              onChange={(e) => handleChange('email', e.target.value)}
              required
            />
          </div>

          {/* Botões */}
          <div className="modal-buttons" style={{ marginTop: '16px' }}>
            <button className="salve" type="submit">
              💾 Salvar
            </button>
            <button className="cancela" type="button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
