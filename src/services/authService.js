// src/services/authService.js
import { listarContas } from './contasService';

const DIAS_LIMITE_BLOQUEIO = 10;

/**
 * Verifica se o usuário tem pagamento efetuado no mês vigente.
 */
export const usuarioPossuiPagamentoAtivo = (usuarioNome) => {
  const contas = listarContas() || [];
  const hoje = new Date();
  const mesAnoAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  return contas.some((c) => {
    const eFatura = c.descricao === 'SYS_Liberação e Manutenção';
    const eMesmoUsuario = c.cliente === usuarioNome || !c.cliente;
    const eMesAtual = c.vencimento && c.vencimento.slice(0, 7) === mesAnoAtual;
    const estaPago = c.status === 'Pago';

    return eFatura && eMesmoUsuario && estaPago && (eMesAtual || !!c.dataPagamento);
  });
};

/**
 * Avalia se o usuário está bloqueado por ultrapassar 10 dias do vencimento sem pagar.
 */
export const verificarStatusBloqueioUsuario = (usuarioNome, perfil) => {
  if (perfil === 'admin') return { bloqueado: false };

  const contas = listarContas() || [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const contaPendenteAtrazada = contas.find((c) => {
    if (c.status === 'Pago') return false;
    const eFatura = c.descricao === 'SYS_Liberação e Manutenção';
    const eMesmoUsuario = c.cliente === usuarioNome || !c.cliente;

    if (!eFatura || !eMesmoUsuario || !c.vencimento) return false;

    const venc = new Date(c.vencimento);
    venc.setHours(0, 0, 0, 0);

    const diffTempo = hoje.getTime() - venc.getTime();
    const diffDias = Math.floor(diffTempo / (1000 * 3600 * 24));

    return diffDias >= DIAS_LIMITE_BLOQUEIO;
  });

  if (contaPendenteAtrazada) {
    return {
      bloqueado: true,
      motivo: 'Atraso superior a 10 dias na fatura mensal',
      contaPendente: contaPendenteAtrazada,
    };
  }

  return { bloqueado: false };
};

/**
 * Autentica o usuário definindo o tempo de expiração da sessão.
 */
export const realizarLogin = (usuarioNome, perfil, email = '') => {
  const statusBloqueio = verificarStatusBloqueioUsuario(usuarioNome, perfil);
  const temPagamento = usuarioPossuiPagamentoAtivo(usuarioNome);

  const horasSessao = temPagamento ? 8 : 4;
  const expiracaoEmMs = Date.now() + horasSessao * 60 * 60 * 1000;

  localStorage.setItem('usuario_nome', usuarioNome);
  localStorage.setItem('usuario_perfil', perfil || 'user');
  localStorage.setItem('usuario_email', email);
  localStorage.setItem('sessao_expiracao', expiracaoEmMs.toString());
  localStorage.setItem('usuario_bloqueado', statusBloqueio.bloqueado ? 'true' : 'false');

  return {
    usuarioNome,
    perfil,
    bloqueado: statusBloqueio.bloqueado,
    duracaoHoras: horasSessao,
    contaPendente: statusBloqueio.contaPendente || null,
  };
};