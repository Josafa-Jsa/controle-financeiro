// src/components/Modais/ModalFiltroOS.jsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { buscarClientesEOrdens, formatarCPFouCNPJ, formatarTelefone } from '../../services/clientesService';
import gerarPDF from '../../pages/Os/OrdemServicoPDF';
import termosCondicoes from '../../data/termosCondicoes';
import { toast } from 'react-toastify';
import '../Visual/modal.css';

export default function ModalFiltroOS({
  isOpen,
  onClose,
  ordens = [],
  filtrosIniciais = {},
  onAplicarFiltro,
  onSelectCliente,
}) {
  const [filtros, setFiltros] = useState({
    termoGeral: filtrosIniciais.termoGeral || '',
    nome: filtrosIniciais.nome || '',
    cpf: filtrosIniciais.cpf || '',
    telefone: filtrosIniciais.telefone || '',
    numeroOS: filtrosIniciais.numeroOS || '',
  });

  const [abaAtiva, setAbaAtiva] = useState('ordens'); // 'ordens' ou 'clientes'
  const firstInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);

  // Fechar ao pressionar ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleChange = (campo, valor) => {
    if (campo === 'cpf') {
      valor = formatarCPFouCNPJ(valor);
    } else if (campo === 'telefone') {
      valor = formatarTelefone(valor);
    }
    setFiltros((prev) => ({ ...prev, [campo]: valor }));
  };

  const handleLimpar = () => {
    const limpo = {
      termoGeral: '',
      nome: '',
      cpf: '',
      telefone: '',
      numeroOS: '',
    };
    setFiltros(limpo);
    onAplicarFiltro?.(limpo);
    toast.info('Filtros redefinidos.');
  };

  // Executa a busca em tempo real com base nos filtros
  const resultados = useMemo(() => {
    if (!isOpen) return { ordens: [], clientes: [] };
    return buscarClientesEOrdens(
      {
        termo: filtros.termoGeral,
        nome: filtros.nome,
        cpf: filtros.cpf,
        telefone: filtros.telefone,
        numeroOS: filtros.numeroOS,
      },
      ordens
    );
  }, [isOpen, filtros, ordens]);

  if (!isOpen) return null;

  const totalFiltrosAtivos = Object.values(filtros).filter((v) => String(v).trim().length > 0).length;

  const handleAplicarNaTabela = () => {
    onAplicarFiltro?.(filtros);
    toast.success(`Filtro aplicado na tabela com sucesso (${resultados.ordens.length} O.S. encontrada(s))!`);
    onClose?.();
  };

  const handlePreencherForm = (cliente, equipamento) => {
    if (onSelectCliente) {
      onSelectCliente(cliente, equipamento);
      toast.success(`✓ Dados do cliente "${cliente?.nome || 'Cliente'}" preenchidos no formulário!`);
      onClose?.();
    }
  };

  const handleVerPDF = (os) => {
    gerarPDF(os, termosCondicoes);
    toast.info(`Gerando PDF da ${os.numeroOS || os.numero_os}...`);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-box modal-lg"
        style={{
          maxWidth: '850px',
          width: 'min(850px, 95vw)',
          padding: '24px 26px',
        }}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Cabeçalho do Modal */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #2b2b36',
            paddingBottom: '14px',
            marginBottom: '18px',
          }}
        >
          <div>
            <h2 style={{ margin: 0, fontSize: '1.35rem', color: '#ff5252', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>🔍</span> Pesquisar Clientes & Ordens de Serviço
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: '#a1a1aa' }}>
              Busque por Nome, CPF, Telefone ou Número da OS para preencher dados ou filtrar
            </p>
          </div>
        </div>

        {/* Campos de Filtro / Busca */}
        <div
          style={{
            background: '#131316',
            padding: '16px',
            borderRadius: '12px',
            border: '1px solid #272730',
            marginBottom: '18px',
          }}
        >
          {/* Campo Busca Rápida Unificada */}
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: '#e4e4e7', display: 'block', marginBottom: '5px' }}>
              ⚡ Busca Rápida Geral (Qualquer campo):
            </label>
            <input
              ref={firstInputRef}
              type="text"
              placeholder="Digite qualquer termo (Nome, CPF, Tel, Nº OS, Modelo...)"
              value={filtros.termoGeral}
              onChange={(e) => handleChange('termoGeral', e.target.value)}
              style={{
                width: '100%',
                height: '40px',
                padding: '0 14px',
                borderRadius: '8px',
                border: '1px solid #3f3f4e',
                background: '#1a1a20',
                color: '#fff',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Grid com 4 campos específicos solicitados pelo usuário */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
              gap: '10px',
            }}
          >
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>
                👤 Nome do Cliente:
              </label>
              <input
                type="text"
                placeholder="Ex: Carlos Silva"
                value={filtros.nome}
                onChange={(e) => handleChange('nome', e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid #2e2e38',
                  background: '#18181e',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>
                🪪 CPF ou CNPJ:
              </label>
              <input
                type="text"
                placeholder="000.000.000-00"
                value={filtros.cpf}
                onChange={(e) => handleChange('cpf', e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid #2e2e38',
                  background: '#18181e',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>
                📞 Telefone:
              </label>
              <input
                type="text"
                placeholder="(00) 00000-0000"
                value={filtros.telefone}
                onChange={(e) => handleChange('telefone', e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid #2e2e38',
                  background: '#18181e',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#a1a1aa', display: 'block', marginBottom: '4px' }}>
                📋 Número da O.S.:
              </label>
              <input
                type="text"
                placeholder="Ex: OS-123456"
                value={filtros.numeroOS}
                onChange={(e) => handleChange('numeroOS', e.target.value)}
                style={{
                  width: '100%',
                  height: '36px',
                  padding: '0 10px',
                  borderRadius: '6px',
                  border: '1px solid #2e2e38',
                  background: '#18181e',
                  color: '#fff',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          </div>
        </div>

        {/* Abas de Resultados */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid #272730',
            marginBottom: '14px',
            paddingBottom: '6px',
          }}
        >
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setAbaAtiva('ordens')}
              style={{
                background: abaAtiva === 'ordens' ? '#ff5252' : '#222228',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              📋 Ordens de Serviço ({resultados.ordens.length})
            </button>
            <button
              type="button"
              onClick={() => setAbaAtiva('clientes')}
              style={{
                background: abaAtiva === 'clientes' ? '#0284c7' : '#222228',
                color: '#fff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                transition: 'all 0.2s',
              }}
            >
              👥 Base de Clientes ({resultados.clientes.length})
            </button>
          </div>

          {totalFiltrosAtivos > 0 && (
            <button
              type="button"
              onClick={handleLimpar}
              style={{
                background: 'transparent',
                border: '1px solid #ef4444',
                color: '#ef4444',
                padding: '4px 10px',
                borderRadius: '6px',
                fontSize: '0.76rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Limpar Filtros
            </button>
          )}
        </div>

        {/* Lista de Resultados Rolável */}
        <div
          style={{
            maxHeight: '340px',
            overflowY: 'auto',
            paddingRight: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {abaAtiva === 'ordens' ? (
            resultados.ordens.length === 0 ? (
              <div
                style={{
                  padding: '30px 16px',
                  textAlign: 'center',
                  background: '#141418',
                  borderRadius: '10px',
                  color: '#a1a1aa',
                  border: '1px dashed #2c2c36',
                }}
              >
                <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>🔍</div>
                <div style={{ fontWeight: 600, color: '#e4e4e7', fontSize: '0.92rem' }}>
                  Nenhuma Ordem de Serviço encontrada
                </div>
                <div style={{ fontSize: '0.8rem', marginTop: '4px' }}>
                  Tente alterar os termos da busca acima ou limpar os filtros.
                </div>
              </div>
            ) : (
              resultados.ordens.map((os) => {
                const cli = typeof os.cliente === 'string' ? JSON.parse(os.cliente || '{}') : (os.cliente || {});
                const equip = typeof os.equipamento === 'string' ? JSON.parse(os.equipamento || '{}') : (os.equipamento || {});
                const numero = os.numeroOS || os.numero_os;

                return (
                  <div
                    key={numero}
                    style={{
                      background: '#16161b',
                      border: '1px solid #2b2b35',
                      borderRadius: '10px',
                      padding: '14px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '12px',
                      transition: 'border-color 0.2s',
                    }}
                  >
                    <div style={{ flex: '1 1 300px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ color: '#ff5252', fontWeight: 800, fontFamily: 'monospace', fontSize: '0.95rem' }}>
                          {numero}
                        </span>
                        {os.status && (
                          <span
                            style={{
                              background: 'rgba(34, 197, 94, 0.15)',
                              color: '#4ade80',
                              border: '1px solid rgba(34, 197, 94, 0.3)',
                              fontSize: '0.7rem',
                              padding: '2px 8px',
                              borderRadius: '10px',
                              fontWeight: 700,
                            }}
                          >
                            {os.status}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#ffffff' }}>
                        👤 {cli.nome || 'Cliente não informado'}
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#a1a1aa', marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                        {cli.documento && <span>🪪 CPF/CNPJ: <strong>{formatarCPFouCNPJ(cli.documento)}</strong></span>}
                        {cli.telefone && <span>📞 Tel: <strong>{formatarTelefone(cli.telefone)}</strong></span>}
                        {(equip.marca || equip.modelo) && (
                          <span>💻 Equip: <strong>{[equip.marca, equip.modelo].filter(Boolean).join(' ')}</strong></span>
                        )}
                      </div>

                      {cli.endereco && (
                        <div style={{ fontSize: '0.76rem', color: '#71717a', marginTop: '2px' }}>
                          📍 {cli.endereco}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {onSelectCliente && (
                        <button
                          type="button"
                          onClick={() => handlePreencherForm(cli, equip)}
                          style={{
                            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                            color: '#fff',
                            border: 'none',
                            padding: '7px 12px',
                            borderRadius: '6px',
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                          title="Preencher dados deste cliente na Nova O.S."
                        >
                          <span>📋</span> Usar na Nova OS
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleVerPDF(os)}
                        style={{
                          background: '#0284c7',
                          color: '#fff',
                          border: 'none',
                          padding: '7px 12px',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>📄</span> PDF
                      </button>
                    </div>
                  </div>
                );
              })
            )
          ) : resultados.clientes.length === 0 ? (
            <div
              style={{
                padding: '30px 16px',
                textAlign: 'center',
                background: '#141418',
                borderRadius: '10px',
                color: '#a1a1aa',
                border: '1px dashed #2c2c36',
              }}
            >
              <div style={{ fontSize: '1.8rem', marginBottom: '6px' }}>👥</div>
              <div style={{ fontWeight: 600, color: '#e4e4e7', fontSize: '0.92rem' }}>
                Nenhum cliente cadastrado encontrado
              </div>
            </div>
          ) : (
            resultados.clientes.map((c, idx) => (
              <div
                key={c.documento || c.nome || idx}
                style={{
                  background: '#16161b',
                  border: '1px solid #2b2b35',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px',
                }}
              >
                <div style={{ flex: '1 1 300px' }}>
                  <div style={{ fontSize: '0.96rem', fontWeight: 700, color: '#fff' }}>
                    👤 {c.nome}
                  </div>
                  <div style={{ fontSize: '0.82rem', color: '#a1a1aa', marginTop: '4px', display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                    {c.documento && <span>🪪 CPF/CNPJ: <strong style={{ color: '#e4e4e7' }}>{formatarCPFouCNPJ(c.documento)}</strong></span>}
                    {c.telefone && <span>📞 Tel: <strong style={{ color: '#e4e4e7' }}>{formatarTelefone(c.telefone)}</strong></span>}
                    {c.email && <span>✉️ {c.email}</span>}
                  </div>
                  {c.endereco && (
                    <div style={{ fontSize: '0.78rem', color: '#71717a', marginTop: '3px' }}>
                      📍 {c.endereco}
                    </div>
                  )}
                </div>

                {onSelectCliente && (
                  <button
                    type="button"
                    onClick={() => handlePreencherForm(c, c.ultimoEquipamento)}
                    style={{
                      background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                      color: '#fff',
                      border: 'none',
                      padding: '7px 14px',
                      borderRadius: '6px',
                      fontSize: '0.8rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                    }}
                  >
                    <span>✓</span> Selecionar Cliente
                  </button>
                )}
              </div>
            ))
          )}
        </div>

        {/* Rodapé com Ações */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: '1px solid #2b2b36',
            marginTop: '18px',
            paddingTop: '14px',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>
            Resultados: <strong>{resultados.ordens.length} O.S.</strong> | <strong>{resultados.clientes.length} Cliente(s)</strong>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {onAplicarFiltro && (
              <button
                type="button"
                onClick={handleAplicarNaTabela}
                style={{
                  background: 'linear-gradient(135deg, #ff5252 0%, #dc2626 100%)',
                  color: '#fff',
                  border: 'none',
                  padding: '9px 18px',
                  borderRadius: '7px',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  boxShadow: '0 2px 10px rgba(220, 38, 38, 0.3)',
                }}
              >
                🔍 Aplicar Filtro na Tabela
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                background: '#27272a',
                color: '#e4e4e7',
                border: '1px solid #3f3f46',
                padding: '9px 16px',
                borderRadius: '7px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
