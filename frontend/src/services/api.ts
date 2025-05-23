import axios from 'axios';

// 创建一个axios实例
const api = axios.create({
    baseURL: '/api', // 你的后端API基础URL 与vite.config.ts中的proxy保持一致.
    headers: {
        'Content-Type': 'application/json',
    },
});

// 请求拦截器，用于添加认证令牌
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

export default api;