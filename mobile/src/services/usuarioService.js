import api from './api';

export const usuarioService = {
  cadastrar: (dados) => api.post('/usuarios', dados),
};
