import { toast } from 'react-toastify';

const STORAGE_KEY = 'contratos';

export function listarContratos() {
  try {
    const contratos = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    return contratos;
  } catch (error) {
    toast.error('Erro ao carregar contratos.');
    console.error('Erro ao listar contratos:', error);
    return [];
  }
}

export function salvarContrato(novoContrato) {
  try {
    const contratos = listarContratos();
    novoContrato.id = contratos.length ? contratos[contratos.length - 1].id + 1 : 1;
    contratos.push(novoContrato);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contratos));
    toast.success('Contrato adicionado com sucesso!');
  } catch (error) {
    toast.error('Erro ao salvar contrato.');
    console.error('Erro ao salvar contrato:', error);
  }
}

export function atualizarContrato(contratoAtualizado) {
  try {
    let contratos = listarContratos();
    contratos = contratos.map(c =>
      c.id === contratoAtualizado.id ? contratoAtualizado : c
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contratos));
    toast.success('Contrato atualizado com sucesso!');
  } catch (error) {
    toast.error('Erro ao atualizar contrato.');
    console.error('Erro ao atualizar contrato:', error);
  }
}

export function excluirContrato(id) {
  try {
    const contratos = listarContratos().filter(c => c.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(contratos));
    toast.success('Contrato excluído com sucesso!');
  } catch (error) {
    toast.error('Erro ao excluir contrato.');
    console.error('Erro ao excluir contrato:', error);
  }
}
