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
  if (config.enviarComprovante) config.timeout = 70000;
  return config;
});

api.interceptors.response.use((response) => response, async (error) => {
  if (error.response?.status === 401) await logoutHandler();
  return Promise.reject(error);
});

export default api;
