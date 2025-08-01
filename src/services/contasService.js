import { toast } from 'react-toastify';

const STORAGE_KEY = 'contas';

export function listarContas() {
  try {
    const contas = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    return contas;
  } catch (error) {
    toast.error('Erro ao carregar contas.');
    console.error('Erro ao listar contas:', error);
    return [];
  }
}

export function salvarConta(novaConta) {
  try {
    const contas = listarContas();
    novaConta.id = contas.length ? contas[contas.length - 1].id + 1 : 1;
    contas.push(novaConta);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contas));
    toast.success('Conta adicionada com sucesso!');
  } catch (error) {
    toast.error('Erro ao salvar conta.');
    console.error('Erro ao salvar conta:', error);
  }
}

export function atualizarConta(contaAtualizada) {
  try {
    let contas = listarContas();
    contas = contas.map(conta =>
      conta.id === contaAtualizada.id ? contaAtualizada : conta
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contas));
    toast.success('Conta atualizada com sucesso!');
  } catch (error) {
    toast.error('Erro ao atualizar conta.');
    console.error('Erro ao atualizar conta:', error);
  }
}

export function excluirConta(id) {
  try {
    const contas = listarContas().filter(conta => conta.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contas));
    toast.success('Conta excluída com sucesso!');
  } catch (error) {
    toast.error('Erro ao excluir conta.');
    console.error('Erro ao excluir conta:', error);
  }
}
