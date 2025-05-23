import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './MainLayout.module.css';

const MainLayout = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <div className={styles.logo}>词汇学习系统🚀</div>
                <nav className={styles.nav}>
                    <NavLink
                        to="/app/sentences"
                        className={({ isActive }) =>
                            isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                        }
                    >
                        解析句子
                    </NavLink>
                    <NavLink
                        to="/app/vocabulary"
                        className={({ isActive }) =>
                            isActive ? `${styles.navLink} ${styles.active}` : styles.navLink
                        }
                    >
                        生词本
                    </NavLink>
                </nav>
                <div className={styles.userInfo}>
                    <span className={styles.username}>{user?.username}</span>
                    <button className={styles.logoutButton} onClick={handleLogout}>
                        退出
                    </button>
                </div>
            </header>
            <main className={styles.main}>
                <Outlet />
            </main>
        </div>
    );
};

export default MainLayout;