import { useNavigate } from 'react-router-dom';
import styles from './Welcome.module.css';

const Welcome = () => {
    const navigate = useNavigate();

    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1 className={styles.title}>欢迎使用词汇学习系统</h1>
                <p className={styles.description}>
                    这是一个帮助你学习和记忆单词的平台。通过解析句子，你可以轻松学习单词在上下文中的用法。
                </p>
                <div className={styles.buttons}>
                    <button
                        className={`${styles.button} ${styles.loginButton}`}
                        onClick={() => navigate('/login')}
                    >
                        登录
                    </button>
                    <button
                        className={`${styles.button} ${styles.registerButton}`}
                        onClick={() => navigate('/register')}
                    >
                        注册
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Welcome;