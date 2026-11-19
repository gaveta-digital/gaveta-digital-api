import api from './api';
export const categoriaService = {
  listar: () => api.get('/categorias'),
  criar: (dados) => api.post('/categorias', dados),
  atualizar: (id, dados) => api.put(`/categorias/${id}`, dados),
  remover: (id) => api.delete(`/categorias/${id}`),
};
