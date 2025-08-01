import { toast } from 'react-toastify';

const STORAGE_KEY = 'notasFiscais';

export function listarNotas() {
  try {
    const notas = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    return notas;
  } catch (error) {
    toast.error('Erro ao carregar notas.');
    console.error('Erro ao listar notas:', error);
    return [];
  }
}

export function salvarNota(novaNota) {
  try {
    const notas = listarNotas();
    novaNota.id = notas.length ? notas[notas.length - 1].id + 1 : 1;
    novaNota.numero = notas.length ? notas[notas.length - 1].numero + 1 : 1;
    novaNota.status = 'Emitida';
    notas.push(novaNota);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notas));
    toast.success('Nota fiscal emitida com sucesso!');
  } catch (error) {
    toast.error('Erro ao salvar nota fiscal.');
    console.error('Erro ao salvar nota:', error);
  }
}

export function atualizarNota(notaAtualizada) {
  try {
    let notas = listarNotas();
    notas = notas.map(n =>
      n.id === notaAtualizada.id ? notaAtualizada : n
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notas));
    toast.success('Nota fiscal atualizada!');
  } catch (error) {
    toast.error('Erro ao atualizar nota fiscal.');
    console.error('Erro ao atualizar nota:', error);
  }
}

export function cancelarNota(id) {
  try {
    let notas = listarNotas();
    notas = notas.map(n =>
      n.id === id ? { ...n, status: 'Cancelada' } : n
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notas));
    toast.success('Nota fiscal cancelada.');
  } catch (error) {
    toast.error('Erro ao cancelar nota fiscal.');
    console.error('Erro ao cancelar nota:', error);
  }
}
