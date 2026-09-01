// src/pages/Estoque/EstoquePage.jsx
import React, { useEffect, useState } from 'react';
import {
  listarProdutos,
  salvarProduto,
  atualizarProduto,
  excluirProduto,
} from '../../services/estoqueService';
import ModalProduto from '../../components/Modais/ModalProduto';
import { toast } from 'react-toastify';
import { logEvent } from '../../utils/logger';
import { sendTelegramEvent, formatCurrencyBRL } from '../../utils/telegram';

export default function EstoquePage() {
  const [produtos, setProdutos] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroApenasBaixo, setFiltroApenasBaixo] = useState(false);

  useEffect(() => {
    carregarProdutos();
  }, []);

  const carregarProdutos = () => {
    try {
      const dados = listarProdutos() || [];
      setProdutos(dados);
    } catch (e) {
      console.error('Erro ao listar produtos:', e);
      setProdutos([]);
    }
  };

  const formatarValor = (valor) => formatCurrencyBRL(valor);
  const emAlerta = (produto) =>
    Number(produto.quantidade || 0) < Number(produto.estoqueMinimo || 0);

  const linhasProduto = (p) =>
    [
      `Nome: ${p?.nome || '-'}`,
      p?.descricao ? `Descrição: ${p.descricao}` : '',
      `Qtd: ${p?.quantidade ?? '-'}`,
      `Est. mín.: ${p?.estoqueMinimo ?? '-'}`,
      `Vlr unit.: ${p?.valorUnitario != null ? formatarValor(p.valorUnitario) : '-'}`,
      p?.id ? `ID: #${p.id}` : '',
    ].filter(Boolean);

  const notificarCriacao = async (p) => {
    try {
      await sendTelegramEvent({
        title: 'Produto cadastrado no Estoque',
        emoji: '🟢',
        lines: linhasProduto(p),
      });
    } catch {}
  };

  const notificarEdicao = async (p) => {
    try {
      await sendTelegramEvent({
        title: 'Produto atualizado no Estoque',
        emoji: '✏️',
        lines: linhasProduto(p),
      });
    } catch {}
  };

  const notificarExclusao = async (p) => {
    try {
      await sendTelegramEvent({
        title: 'Produto excluído do Estoque',
        emoji: '🗑️',
        lines: linhasProduto(p),
      });
    } catch {}
  };

  const notificarAjuste = async (p, delta, motivo) => {
    try {
      const sinal = delta >= 0 ? '➕' : '➖';
      await sendTelegramEvent({
        title: 'Ajuste Rápido de Estoque',
        emoji: sinal,
        lines: [
          `Ajuste: ${delta >= 0 ? '+' : ''}${delta}`,
          motivo ? `Motivo: ${motivo}` : '',
          ...linhasProduto(p),
        ].filter(Boolean),
      });
    } catch {}
  };

  const handleSalvar = async (produto) => {
    try {
      if (produto.id) {
        const ant = produtos.find((p) => p.id === produto.id);
        const atualizado = atualizarProduto(produto);
        toast.success('Produto atualizado com sucesso!');

        logEvent({
          type: 'estoque',
          title: 'Produto atualizado',
          details: {
            id: atualizado?.id ?? produto.id,
            nome: atualizado?.nome ?? produto.nome,
            quantidadeAnterior: ant?.quantidade,
            quantidadeAtual: atualizado?.quantidade ?? produto.quantidade,
          },
        });

        await notificarEdicao(atualizado || produto);
      } else {
        const criado = salvarProduto(produto) || produto;
        toast.success('Novo produto cadastrado com sucesso!');

        logEvent({
          type: 'estoque',
          title: 'Produto cadastrado',
          details: {
            id: criado.id,
            nome: criado.nome,
            quantidade: criado.quantidade,
          },
        });

        await notificarCriacao(criado);
      }

      carregarProdutos();
      setModalAberto(false);
      setProdutoSelecionado(null);
    } catch (e) {
      console.error('Erro ao salvar produto:', e);
      toast.error('Falha ao salvar produto.');
    }
  };

  const handleEditar = (produto) => {
    setProdutoSelecionado(produto);
    setModalAberto(true);
  };

  const handleExcluir = async (id) => {
    const alvo = produtos.find((p) => p.id === id);
    if (!confirm(`Deseja realmente excluir o produto "${alvo?.nome || 'Item'}"?`)) return;

    try {
      excluirProduto(id);
      toast.success('Produto excluído com sucesso.');

      logEvent({
        type: 'estoque',
        title: 'Produto excluído',
        details: { id, nome: alvo?.nome },
      });

      if (alvo) await notificarExclusao(alvo);
      carregarProdutos();
    } catch (e) {
      console.error('Erro ao excluir produto:', e);
      toast.error('Erro ao excluir produto.');
    }
  };

  const handleAjusteRapido = async (produto, delta) => {
    const novaQtd = Math.max(0, Number(produto.quantidade || 0) + delta);
    const atualizado = { ...produto, quantidade: novaQtd };

    try {
      atualizarProduto(atualizado);
      toast.info(`Estoque de "${produto.nome}": ${novaQtd} un.`);
      await notificarAjuste(atualizado, delta, 'Ajuste rápido pelo painel');
      carregarProdutos();
    } catch (e) {
      console.error('Erro no ajuste rápido:', e);
    }
  };

  // Cálculos de resumo
  const totalProdutos = produtos.length;
  const produtosAlerta = produtos.filter(emAlerta);
  const totalUnidades = produtos.reduce((acc, p) => acc + Number(p.quantidade || 0), 0);
  const valorTotalEstoque = produtos.reduce(
    (acc, p) => acc + Number(p.quantidade || 0) * Number(p.valorUnitario || 0),
    0
  );

  const produtosFiltrados = produtos.filter((p) => {
    const term = searchTerm.toLowerCase();
    const matchBusca =
      p.nome?.toLowerCase().includes(term) ||
      p.codigo?.toLowerCase().includes(term) ||
      p.descricao?.toLowerCase().includes(term);

    if (filtroApenasBaixo) {
      return matchBusca && emAlerta(p);
    }
    return matchBusca;
  });

  return (
    <div className="page-container fade-in-page">
      {/* Header */}
      <div className="notas-header-bar" style={{ marginBottom: '20px' }}>
        <div>
          <h1 className="page-title" style={{ color: '#00d2ff', margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>
            📦 Controle de Estoque & Produtos
          </h1>
          <p className="page-subtitle" style={{ color: '#8a94a6', fontSize: '0.95rem', marginTop: '4px' }}>
            Gerenciamento de produtos, controle de estoque mínimo, reposição e valores.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            className="btn-nova-conta"
            onClick={() => {
              setProdutoSelecionado(null);
              setModalAberto(true);
            }}
          >
            + Novo Produto
          </button>
        </div>
      </div>

      {/* Grid de Métricas */}
      <div className="notas-stats-grid" style={{ marginBottom: '24px' }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
            📦
          </div>
          <div className="stat-data">
            <span className="stat-title">Total de Produtos</span>
            <span className="stat-value">{totalProdutos}</span>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: `4px solid ${produtosAlerta.length > 0 ? '#ef4444' : '#10b981'}` }}>
          <div className="stat-icon" style={{ background: produtosAlerta.length > 0 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)', color: produtosAlerta.length > 0 ? '#ef4444' : '#10b981' }}>
            ⚠️
          </div>
          <div className="stat-data">
            <span className="stat-title">Estoque Baixo / Reposição</span>
            <span className="stat-value" style={{ color: produtosAlerta.length > 0 ? '#f87171' : '#4ade80' }}>
              {produtosAlerta.length} {produtosAlerta.length === 1 ? 'item' : 'itens'}
            </span>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
            💰
          </div>
          <div className="stat-data">
            <span className="stat-title">Patrimônio em Estoque</span>
            <span className="stat-value" style={{ color: '#10b981' }}>
              {formatCurrencyBRL(valorTotalEstoque)}
            </span>
          </div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #a855f7' }}>
          <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#a855f7' }}>
            🏷️
          </div>
          <div className="stat-data">
            <span className="stat-title">Total de Unidades</span>
            <span className="stat-value" style={{ color: '#c084fc' }}>{totalUnidades} un.</span>
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="control-bar" style={{ background: '#181d24', padding: '14px 16px', borderRadius: '10px', border: '1px solid #283340', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <input
          type="text"
          placeholder="🔍 Pesquisar por código, nome ou descrição do produto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="modal-input"
          style={{ maxWidth: '400px' }}
        />

        <button
          type="button"
          className="quick-action-btn"
          onClick={() => setFiltroApenasBaixo(!filtroApenasBaixo)}
          style={{
            padding: '8px 14px',
            fontSize: '12.5px',
            background: filtroApenasBaixo ? 'rgba(239, 68, 68, 0.2)' : '#242b35',
            color: filtroApenasBaixo ? '#f87171' : '#94a3b8',
            borderColor: filtroApenasBaixo ? '#ef4444' : '#334155',
          }}
        >
          {filtroApenasBaixo ? '✅ Mostrando Apenas Estoque Baixo' : '⚠️ Filtrar Estoque Baixo'}
        </button>
      </div>

      {/* Tabela de Estoque */}
      <div className="table-responsive" style={{ background: '#181d24', borderRadius: '10px', border: '1px solid #283340', overflow: 'hidden' }}>
        <table className="contasTable" style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#1e2632', borderBottom: '1px solid #2d3748' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Código / Ref</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Produto</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Qtd Atual</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Estoque Mín.</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Vlr Unitário</th>
              <th style={{ padding: '12px 16px', textAlign: 'left' }}>Total</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'center' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {produtosFiltrados.length === 0 ? (
              <tr>
                <td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
                  Nenhum produto cadastrado ou encontrado.
                </td>
              </tr>
            ) : (
              produtosFiltrados.map((p) => {
                const alerta = emAlerta(p);
                const valorTotalItem = Number(p.quantidade || 0) * Number(p.valorUnitario || 0);

                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '12px 16px', color: '#94a3b8', fontFamily: 'monospace' }}>
                      {p.codigo || `#${p.id}`}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#f1f5f9' }}>{p.nome || '-'}</div>
                      {p.descricao && (
                        <div style={{ fontSize: '11.5px', color: '#64748b', marginTop: '2px' }}>
                          {p.descricao}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => handleAjusteRapido(p, -1)}
                          style={{ background: '#242b35', border: '1px solid #334155', color: '#fff', width: '22px', height: '22px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Diminuir 1 unidade"
                        >
                          -
                        </button>
                        <strong style={{ fontSize: '14px', color: alerta ? '#f87171' : '#f1f5f9', minWidth: '24px' }}>
                          {p.quantidade ?? 0}
                        </strong>
                        <button
                          type="button"
                          onClick={() => handleAjusteRapido(p, 1)}
                          style={{ background: '#242b35', border: '1px solid #334155', color: '#fff', width: '22px', height: '22px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          title="Aumentar 1 unidade"
                        >
                          +
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center', color: '#94a3b8' }}>
                      {p.estoqueMinimo ?? '-'}
                    </td>
                    <td style={{ padding: '12px 16px', color: '#cbd5e1' }}>
                      {formatarValor(p.valorUnitario)}
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#10b981' }}>
                      {formatarValor(valorTotalItem)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: alerta ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                          color: alerta ? '#f87171' : '#4ade80',
                          border: `1px solid ${alerta ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                        }}
                      >
                        {alerta ? '🔴 Repor Estoque' : '🟢 Normal'}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="quick-action-btn"
                          onClick={() => handleEditar(p)}
                          style={{ padding: '4px 10px', fontSize: '12px' }}
                        >
                          ✏️ Editar
                        </button>
                        <button
                          type="button"
                          className="quick-action-btn"
                          onClick={() => handleExcluir(p.id)}
                          style={{ padding: '4px 10px', fontSize: '12px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                        >
                          🗑️ Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <ModalProduto
        isOpen={modalAberto}
        onClose={() => {
          setModalAberto(false);
          setProdutoSelecionado(null);
        }}
        onSave={handleSalvar}
        produtoParaEditar={produtoSelecionado}
      />
    </div>
  );
}
