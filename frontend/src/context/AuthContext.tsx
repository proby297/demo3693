
import React, { createContext, useState, useContext, useEffect } from 'react';
import { getCurrentUser } from '../services/authService';


interface AuthContextType {
    isAuthenticated: boolean;
    isLoadingAuth: boolean;
    user: { id: string; username: string } | null;

    login: (userData: { id: string; username: string }) => void;
    logout: () => void;
}

// 创建上下文
const AuthContext = createContext<AuthContextType>({
    isAuthenticated: false,
    isLoadingAuth: true,
    user: null,
    login: () => { },
    logout: () => { }
});

// 提供上下文的组件
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<{ id: string; username: string } | null>(null);
    const [isLoadingAuth, setIsLoadingAuth] = useState(true);
    // 登录函数
    const login = (userData: { id: string; username: string }) => {
        setUser(userData);
        // 保存到localStorage，这样刷新页面时可以恢复会话
        localStorage.setItem('user', JSON.stringify(userData));
        setIsLoadingAuth(false); // 登录动作完成后，加载状态应为 false
    };

    // 登出函数
    const logout = () => {
        setUser(null);
        // 清除localStorage中的令牌和用户数据
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setIsLoadingAuth(false); // 登出动作完成后，加载状态也应为 false
    };

    // 在组件挂载时检查localStorage中是否有用户信息
    useEffect(() => {
        const initAuth = async () => {

            const token = localStorage.getItem('token');
            const savedUser = localStorage.getItem('user');

            if (token && savedUser) {
                try {
                    // 可选：验证令牌有效性
                    await getCurrentUser();
                    // 如果没有抛出错误，则令牌有效
                    setUser(JSON.parse(savedUser));
                } catch (error) {
                    console.error('恢复会话失败:', error);
                    // 如果令牌无效，清除存储
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    setUser(null); // 确保 user 状态也被清除
                }
            } else {
                // 如果没有 token 或用户信息，则明确用户未登录
                setUser(null);
            }

            setIsLoadingAuth(false); // 登出动作完成后，加载状态也应为 false
        };

        initAuth();
    }, []);

    return (
        <AuthContext.Provider value={{
            isAuthenticated: !!user,
            isLoadingAuth: isLoadingAuth,
            user,
            login,
            logout
        }}>
            {children}
        </AuthContext.Provider>
    );
};

// 自定义钩子，便于在组件中使用
export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth 必须在 AuthProvider 内部使用');
    }
    return context;
};