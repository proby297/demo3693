// import api from './api';

// // 用户登录接口
// export interface LoginData {
//     username: string;
//     password: string;
// }

// // 用户注册接口
// export interface RegisterData {
//     username: string;
//     email: string;
//     password: string;
// }

// // 认证响应接口
// export interface AuthResponse {
//     _id: string;
//     username: string;
//     email: string;
//     token: string;
// }

// // 注册新用户
// export const register = async (data: RegisterData): Promise<AuthResponse> => {
//     const response = await api.post<AuthResponse>('/auth/register', data);
//     // 也可以在这里自动保存令牌
//     localStorage.setItem('token', response.data.token);
//     return response.data;
// };

// // 用户登录
// export const login = async (data: LoginData): Promise<AuthResponse> => {
//     const response = await api.post<AuthResponse>('/auth/login', data);
//     // 保存令牌到本地存储
//     localStorage.setItem('token', response.data.token);
//     return response.data;
// };

// // 获取当前用户信息
// export const getCurrentUser = async (): Promise<AuthResponse> => {
//     const response = await api.get<AuthResponse>('/auth/me');
//     return response.data;
// };

// // 用户登出
// export const logout = (): void => {
//     localStorage.removeItem('token');
// };
import api from './api';

export interface LoginData {
    username: string;
    password: string;
}

export interface RegisterData {
    username: string;
    email: string;
    password: string;
}

export interface AuthResponse {
    _id: string;
    username: string;
    email: string;
    token: string;
}

// 用户登录
export const login = async (data: LoginData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data);
    // 保存令牌到localStorage
    localStorage.setItem('token', response.data.token);
    return response.data;
};

// 用户注册
export const register = async (data: RegisterData): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data);
    // 保存令牌到localStorage
    localStorage.setItem('token', response.data.token);
    return response.data;
};

// 获取当前用户信息
export const getCurrentUser = async (): Promise<AuthResponse> => {
    const response = await api.get<AuthResponse>('/auth/me');
    return response.data;
};

// 登出 目前没用到，ai似乎生产了一些无效代码。logout我们在authcontext里实现了
export const logout = (): void => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
};
// 添加一个函数来检查和恢复登录状态
