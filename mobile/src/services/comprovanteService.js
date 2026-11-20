import api from './api';
export const comprovanteService = {
  criar: (imagem) => {
    const dados = new FormData();
    dados.append('imagem', { uri: imagem.uri, name: imagem.fileName || 'comprovante.jpg', type: imagem.mimeType || 'image/jpeg' });
    return api.post('/comprovantes', dados, { headers: { 'Content-Type': 'multipart/form-data' }, enviarComprovante: true });
  },
  listar: (params) => api.get('/comprovantes', { params }),
  resumo: (params) => api.get('/comprovantes/resumo', { params }),
  detalhar: (id) => api.get(`/comprovantes/${id}`),
  atualizar: (id, dados) => api.patch(`/comprovantes/${id}`, dados),
  remover: (id) => api.delete(`/comprovantes/${id}`),
  imagem: (id) => `${api.defaults.baseURL}/comprovantes/${id}/imagem`,
};
