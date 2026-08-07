import axios from 'axios';

const apiBaseURL = import.meta.env.DEV
  ? '/api'
  : (import.meta.env.VITE_API_URL || '/api');

const api = axios.create({
  baseURL: apiBaseURL,
  timeout: 10000,
});

// 请求拦截器：自动添加 token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器：处理 token 过期（只清除 token，不跳转）
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      // 不再自动跳转，让页面自行处理（例如通过 userStore 的 init 更新状态）
    }
    return Promise.reject(error);
  }
);

export default api;
export { authApi } from './auth';
export { toolsApi } from './tools';
export { usersApi } from './users';
export { discoveryApi } from './discovery';
export { statsApi } from './stats';
export { favoritesApi } from './favorites';
export { categoriesApi } from './categories';
