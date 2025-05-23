import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { login, LoginData } from '../../services/authService';
import styles from './Auth.module.css';

const Login = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { login: authLogin } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('请填写用户名和密码');
            return;
        }

        setIsLoading(true);

        try {
            // 调用登录API
            const userData: LoginData = {
                username,
                password
            };

            const response = await login(userData);

            // 更新认证上下文
            authLogin({ id: response._id, username: response.username });

            // 跳转到句子解析页面
            navigate('/sentences');
        } catch (error: any) {
            console.error('登录失败:', error);

            if (error.response && error.response.data) {
                setError(error.response.data.message || '登录失败，请稍后再试');
            } else {
                setError('登录失败，请检查网络连接');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <form className={styles.form} onSubmit={handleSubmit}>
                <h2 className={styles.title}>登录</h2>

                {error && <div className={styles.error}>{error}</div>}

                <div className={styles.formGroup}>
                    <label htmlFor="username">用户名</label>
                    <input
                        type="text"
                        id="username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                <div className={styles.formGroup}>
                    <label htmlFor="password">密码</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isLoading}
                >
                    {isLoading ? '登录中...' : '登录'}
                </button>

                <p className={styles.switchText}>
                    还没有账号？
                    <span
                        className={styles.switchLink}
                        onClick={() => navigate('/register')}
                    >
                        注册
                    </span>
                </p>
            </form>
        </div>
    );
};

export default Login;