import { toast } from 'react-toastify';

const STORAGE_KEY = 'produtos';

export function listarProdutos() {
  try {
    const produtos = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    return produtos;
  } catch (error) {
    toast.error('Erro ao carregar produtos.');
    console.error('Erro ao listar produtos:', error);
    return [];
  }
}

export function salvarProduto(novoProduto) {
  try {
    const produtos = listarProdutos();
    novoProduto.id = produtos.length ? produtos[produtos.length - 1].id + 1 : 1;
    produtos.push(novoProduto);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(produtos));
    toast.success('Produto cadastrado com sucesso!');
  } catch (error) {
    toast.error('Erro ao salvar produto.');
    console.error('Erro ao salvar produto:', error);
  }
}

export function atualizarProduto(produtoAtualizado) {
  try {
    let produtos = listarProdutos();
    produtos = produtos.map(p =>
      p.id === produtoAtualizado.id ? produtoAtualizado : p
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(produtos));
    toast.success('Produto atualizado com sucesso!');
  } catch (error) {
    toast.error('Erro ao atualizar produto.');
    console.error('Erro ao atualizar produto:', error);
  }
}

export function excluirProduto(id) {
  try {
    const produtos = listarProdutos().filter(p => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(produtos));
    toast.success('Produto excluído com sucesso!');
  } catch (error) {
    toast.error('Erro ao excluir produto.');
    console.error('Erro ao excluir produto:', error);
  }
}
