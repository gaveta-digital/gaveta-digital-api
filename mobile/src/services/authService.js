import api from './api';
export const authService = {
  login: (dados) => api.post('/login', dados),
  cadastrar: (dados) => api.post('/usuarios', dados),
};
