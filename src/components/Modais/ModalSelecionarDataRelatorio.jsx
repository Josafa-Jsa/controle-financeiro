import React, { useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import { buscarRelatorioControleNotasBanco } from '../../services/controleNotasService';
import { getUser, isAdmin } from '../../auth/auth';
import { normalizarNomeFilial } from '../../utils/filialUtils';
import '../Visual/modal.css';

export default function ModalSelecionarDataRelatorio({
  isOpen = false,
  onClose = () => {},
  onConfirm = () => {}, // (notasDoBanco, dataSelecionada)
}) {
  const usuarioLogado = getUser();
  const isUserAdmin = isAdmin(usuarioLogado);
  const filialUsuario = normalizarNomeFilial(
    usuarioLogado?.filial ||
    usuarioLogado?.user_filial ||
    localStorage.getItem('usuario_filial') ||
    'Filial 1'
  );

  const getHojeIsoDate = () => {
    const agora = new Date();
    const tzOffset = agora.getTimezoneOffset() * 60000;
    return new Date(agora.getTime() - tzOffset).toISOString().slice(0, 10);
  };

  const [dataSelecionada, setDataSelecionada] = useState(getHojeIsoDate());
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDataSelecionada(getHojeIsoDate());
      setCarregando(false);
    }
  }, [isOpen]);

  useEffect(() => {
    const onEsc = (e) => e.key === 'Escape' && isOpen && !carregando && onClose();
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [isOpen, carregando, onClose]);

  if (!isOpen) return null;

  const handleSelecionarAtalho = (diasAtras = 0) => {
    const d = new Date();
    d.setDate(d.getDate() - diasAtras);
    const tzOffset = d.getTimezoneOffset() * 60000;
    const iso = new Date(d.getTime() - tzOffset).toISOString().slice(0, 10);
    setDataSelecionada(iso);
  };

  const handleGerar = async (e) => {
    e?.preventDefault();
    if (!dataSelecionada) {
      toast.warn('Por favor, selecione uma data válida para gerar o relatório.');
      return;
    }

    setCarregando(true);
    try {
      // Puxa as notas diretamente do banco de dados (tabela controle_notas / relatorio_controle_notas)
      const notasDoBanco = await buscarRelatorioControleNotasBanco({
        data: dataSelecionada,
        filial: isUserAdmin ? undefined : filialUsuario,
        customUser: usuarioLogado,
      });

      if (notasDoBanco.length === 0) {
        toast.info(`Nenhuma nota fiscal encontrada no banco para a data ${dataSelecionada.split('-').reverse().join('/')}. Abrindo relatório consolidado.`);
      } else {
        toast.success(`✅ ${notasDoBanco.length} nota(s) fiscal(is) recuperada(s) do banco de dados para o relatório!`);
      }

      onConfirm(notasDoBanco, dataSelecionada);
    } catch (err) {
      console.error('Erro ao consultar relatório no banco:', err);
      toast.error('Falha ao consultar notas no banco de dados.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={() => !carregando && onClose()}
      role="dialog"
      aria-modal="true"
      style={{
        alignItems: 'center',
        padding: '16px',
        zIndex: 999999,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '480px',
          width: '95%',
          backgroundColor: '#18181c',
          border: '1px solid #27272a',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7)',
          animation: 'fadeIn 0.25s ease-out',
        }}
      >
        {/* Header do Modal */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '16px',
            borderBottom: '1px solid #27272a',
            paddingBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
              }}
            >
              📑
            </div>
            <div>
              <h3 style={{ margin: 0, color: '#f8fafc', fontSize: '1.15rem', fontWeight: 800 }}>
                Gerar Relatório de Notas
              </h3>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                Relatório Oficial • Big Master Supermercados
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={carregando}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '1.3rem',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
            }}
            title="Fechar"
          >
            ✕
          </button>
        </div>

        {/* Badge de Filial / Base de Dados */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#111827',
            border: '1px solid #1e293b',
            borderRadius: '8px',
            padding: '10px 14px',
            marginBottom: '18px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>🏢</span>
            <div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: 700 }}>
                Unidade / Filial
              </div>
              <div style={{ fontSize: '0.88rem', color: '#38bdf8', fontWeight: 700 }}>
                {isUserAdmin ? 'Todas as Filiais (Acesso Master)' : filialUsuario}
              </div>
            </div>
          </div>

          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              padding: '3px 8px',
              borderRadius: '4px',
              backgroundColor: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.3)',
            }}
          >
            BANCO DE DADOS
          </span>
        </div>

        <form onSubmit={handleGerar}>
          {/* Campo de Seleção de Data */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '0.85rem',
                fontWeight: 700,
                color: '#e2e8f0',
                marginBottom: '8px',
              }}
            >
              📅 Selecione a Data para o Relatório:
            </label>
            <input
              type="date"
              value={dataSelecionada}
              onChange={(e) => setDataSelecionada(e.target.value)}
              required
              disabled={carregando}
              style={{
                width: '100%',
                height: '46px',
                padding: '0 14px',
                borderRadius: '8px',
                border: '1px solid #3b82f6',
                backgroundColor: '#0f172a',
                color: '#ffffff',
                fontSize: '1rem',
                fontWeight: 600,
                outline: 'none',
                boxSizing: 'border-box',
                boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.2)',
              }}
            />
            <p style={{ margin: '6px 0 0 0', fontSize: '0.76rem', color: '#94a3b8' }}>
              ℹ️ As notas serão consultadas e filtradas pela hora de chegada/entrega desta data.
            </p>
          </div>

          {/* Atalhos Rápidos */}
          <div style={{ marginBottom: '22px' }}>
            <div style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, marginBottom: '6px', textTransform: 'uppercase' }}>
              Atalhos Rápidos:
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => handleSelecionarAtalho(0)}
                disabled={carregando}
                style={{
                  padding: '6px 12px',
                  backgroundColor: dataSelecionada === getHojeIsoDate() ? 'rgba(56, 189, 248, 0.2)' : '#1e293b',
                  border: dataSelecionada === getHojeIsoDate() ? '1px solid #38bdf8' : '1px solid #334155',
                  color: dataSelecionada === getHojeIsoDate() ? '#38bdf8' : '#cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                📅 Hoje
              </button>

              <button
                type="button"
                onClick={() => handleSelecionarAtalho(1)}
                disabled={carregando}
                style={{
                  padding: '6px 12px',
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  color: '#cbd5e1',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                ⏪ Ontem
              </button>
            </div>
          </div>

          {/* Botões de Ação */}
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', borderTop: '1px solid #27272a', paddingTop: '16px' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={carregando}
              style={{
                height: '42px',
                padding: '0 16px',
                backgroundColor: '#27272a',
                border: '1px solid #3f3f46',
                borderRadius: '8px',
                color: '#e4e4e7',
                fontWeight: 600,
                fontSize: '0.88rem',
                cursor: 'pointer',
              }}
            >
              ✕ Cancelar
            </button>

            <button
              type="submit"
              disabled={carregando}
              style={{
                height: '42px',
                padding: '0 20px',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                border: 'none',
                borderRadius: '8px',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.92rem',
                cursor: carregando ? 'wait' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                transition: 'all 0.2s ease',
              }}
            >
              {carregando ? (
                <>⏳ Consultando Banco...</>
              ) : (
                <><span>📄</span> Gerar Relatório da Data</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
