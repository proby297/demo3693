import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { register, RegisterData } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import styles from './Auth.module.css';

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState(''); // 新增email字段
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // 表单验证
        if (!username || !email || !password) {
            setError('请填写所有字段');
            return;
        }

        if (password !== confirmPassword) {
            setError('两次输入的密码不一致');
            return;
        }

        setIsLoading(true);

        try {
            // 调用注册API
            const userData: RegisterData = {
                username,
                email,
                password
            };

            const response = await register(userData);

            // 注册成功后自动登录
            login({ id: response._id, username: response.username });

            // 跳转到句子解析页面
            navigate('/sentences');
        } catch (error: any) {
            console.error('注册失败:', error);

            if (error.response && error.response.data) {
                setError(error.response.data.message || '注册失败，请稍后再试');
            } else {
                setError('注册失败，请检查网络连接');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <form className={styles.form} onSubmit={handleSubmit}>
                <h2 className={styles.title}>注册</h2>

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
                    <label htmlFor="email">邮箱</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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

                <div className={styles.formGroup}>
                    <label htmlFor="confirmPassword">确认密码</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                    />
                </div>

                <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={isLoading}
                >
                    {isLoading ? '注册中...' : '注册'}
                </button>

                <p className={styles.switchText}>
                    已有账号？
                    <span
                        className={styles.switchLink}
                        onClick={() => navigate('/login')}
                    >
                        登录
                    </span>
                </p>
            </form>
        </div>
    );
};

export default Register;