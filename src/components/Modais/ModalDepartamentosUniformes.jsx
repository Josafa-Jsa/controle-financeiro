// src/components/Modais/ModalDepartamentosUniformes.jsx
import React, { useEffect } from 'react';
import { DEPARTAMENTOS_PADRAO } from '../../services/uniformesService';
import '../Visual/modal.css';

export default function ModalDepartamentosUniformes({
  isOpen,
  onClose,
  estoque = [],
  onSelecionarDepartamento,
}) {
  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Total geral de uniformes de todos os departamentos
  const totalGeralEmpresa = estoque.reduce((acc, item) => acc + (Number(item.total_qtd) || 0), 0);
  const totalNovosEmpresa = estoque.reduce((acc, item) => acc + (Number(item.estado_novo_qtd) || 0), 0);
  const totalUsadosEmpresa = estoque.reduce((acc, item) => acc + (Number(item.estado_usado_qtd) || 0), 0);

  // Mapeamento e cálculo de cada departamento da lista oficial
  const dadosDepartamentos = DEPARTAMENTOS_PADRAO.map((depNome) => {
    const itensDep = estoque.filter((i) => i.departamento === depNome);
    const novos = itensDep.reduce((acc, i) => acc + (Number(i.estado_novo_qtd) || 0), 0);
    const usados = itensDep.reduce((acc, i) => acc + (Number(i.estado_usado_qtd) || 0), 0);
    const total = itensDep.reduce((acc, i) => acc + (Number(i.total_qtd) || 0), 0);

    const tamanhosSet = Array.from(new Set(itensDep.map((i) => i.tamanho).filter(Boolean)));
    const percentual = totalGeralEmpresa > 0 ? ((total / totalGeralEmpresa) * 100).toFixed(1) : 0;

    return {
      nome: depNome,
      novos,
      usados,
      total,
      tamanhos: tamanhosSet,
      percentual,
      temEstoque: total > 0,
    };
  });

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-box modal-xl"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '880px', width: '94%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}
      >
        {/* Cabeçalho */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '12px',
            borderBottom: '1px solid #1e293b',
            paddingBottom: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '26px' }}>🏢</span>
            <div>
              <h2 style={{ margin: 0, fontSize: '18px', color: '#f8fafc' }}>
                Quadro de Departamentos & Uniformes Cadastrados
              </h2>
              <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                Resumo quantitativo de peças novas e usadas distribuídas por setor
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              fontSize: '20px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        {/* Barra de Totais Gerais */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '10px',
            marginBottom: '16px',
          }}
        >
          <div style={{ background: '#111827', border: '1px solid #1e293b', padding: '10px 14px', borderRadius: '8px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, display: 'block' }}>TOTAL GERAL EM ESTOQUE</span>
            <strong style={{ fontSize: '20px', color: '#38bdf8' }}>{totalGeralEmpresa} peças</strong>
          </div>
          <div style={{ background: '#111827', border: '1px solid #1e293b', padding: '10px 14px', borderRadius: '8px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, display: 'block' }}>✨ UNIFORMES NOVOS</span>
            <strong style={{ fontSize: '20px', color: '#34d399' }}>{totalNovosEmpresa} peças</strong>
          </div>
          <div style={{ background: '#111827', border: '1px solid #1e293b', padding: '10px 14px', borderRadius: '8px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, display: 'block' }}>🔄 UNIFORMES USADOS</span>
            <strong style={{ fontSize: '20px', color: '#fbbf24' }}>{totalUsadosEmpresa} peças</strong>
          </div>
          <div style={{ background: '#111827', border: '1px solid #1e293b', padding: '10px 14px', borderRadius: '8px' }}>
            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 600, display: 'block' }}>DEPARTAMENTOS ATIVOS</span>
            <strong style={{ fontSize: '20px', color: '#a78bfa' }}>
              {dadosDepartamentos.filter((d) => d.temEstoque).length} / {dadosDepartamentos.length}
            </strong>
          </div>
        </div>

        {/* Tabela com Scroll */}
        <div style={{ overflowY: 'auto', flex: 1, border: '1px solid #1e293b', borderRadius: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12.5px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#1e293b', color: '#94a3b8', fontSize: '11.5px', textTransform: 'uppercase' }}>
                <th style={{ padding: '10px 14px' }}>Departamento</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>✨ Novos</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>🔄 Usados</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>Total Peças</th>
                <th style={{ padding: '10px 12px' }}>Tamanhos Disponíveis</th>
                <th style={{ padding: '10px 14px', textAlign: 'right' }}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {dadosDepartamentos.map((dep) => (
                <tr
                  key={dep.nome}
                  style={{
                    borderBottom: '1px solid rgba(51, 65, 85, 0.4)',
                    background: dep.temEstoque ? 'rgba(30, 41, 59, 0.25)' : 'transparent',
                  }}
                >
                  <td style={{ padding: '10px 14px' }}>
                    <strong style={{ color: dep.temEstoque ? '#f8fafc' : '#94a3b8', fontSize: '13px' }}>
                      {dep.nome}
                    </strong>
                    {dep.temEstoque && (
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        {dep.percentual}% do estoque geral
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span
                      style={{
                        background: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid #10b981',
                        color: '#34d399',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '11.5px',
                      }}
                    >
                      {dep.novos} un
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span
                      style={{
                        background: 'rgba(245, 158, 11, 0.15)',
                        border: '1px solid #f59e0b',
                        color: '#fbbf24',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontWeight: 700,
                        fontSize: '11.5px',
                      }}
                    >
                      {dep.usados} un
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <strong style={{ fontSize: '14px', color: dep.temEstoque ? '#38bdf8' : '#64748b' }}>
                      {dep.total} un
                    </strong>
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {dep.tamanhos.length > 0 ? (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {dep.tamanhos.map((t) => (
                          <span
                            key={t}
                            style={{
                              background: '#1e293b',
                              border: '1px solid #475569',
                              color: '#f8fafc',
                              padding: '1px 6px',
                              borderRadius: '3px',
                              fontSize: '11px',
                              fontFamily: 'monospace',
                              fontWeight: 700,
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: '#64748b', fontSize: '11.5px', fontStyle: 'italic' }}>Sem itens</span>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', textAlign: 'right' }}>
                    <button
                      type="button"
                      onClick={() => {
                        if (onSelecionarDepartamento) {
                          onSelecionarDepartamento(dep.nome);
                        }
                        onClose();
                      }}
                      style={{
                        background: '#1e293b',
                        border: '1px solid #38bdf8',
                        color: '#38bdf8',
                        padding: '4px 10px',
                        borderRadius: '5px',
                        fontSize: '11.5px',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                    >
                      🔍 Filtrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Rodapé */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: '#334155',
              border: 'none',
              color: '#f8fafc',
              padding: '8px 16px',
              borderRadius: '6px',
              fontSize: '12.5px',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
