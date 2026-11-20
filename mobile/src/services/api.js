import axios from 'axios';

let tokenProvider = () => null;
let logoutHandler = async () => {};
export const setTokenProvider = (provider) => { tokenProvider = provider; };
export const setLogoutHandler = (handler) => { logoutHandler = handler; };

const api = axios.create({
  baseURL: `${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8080'}/api`,
  timeout: 15000,
});

api.interceptors.request.use((config) => {
  const token = tokenProvider();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  // A leitura pela IA pode tentar até 4 modelos de 15 s; aumentar junto se a lista crescer.
  if (config.enviarComprovante) config.timeout = 70000;
  return config;
});

api.interceptors.response.use((response) => response, async (error) => {
  // Só encerra a sessão se a requisição levava token. Um 401 no login
  // (credenciais inválidas) deve apenas mostrar o erro na própria tela.
  const eraAutenticada = Boolean(error.config?.headers?.Authorization);
  if (error.response?.status === 401 && eraAutenticada) await logoutHandler();
  return Promise.reject(error);
});

export default api;
