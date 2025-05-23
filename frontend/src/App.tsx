import { ReactElement } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Welcome from './pages/Welcome';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import MainLayout from './components/layout/MainLayout';
import SentenceParser from './pages/sentences/SentenceParser';
import VocabularyList from './pages/vocabulary/Vocabulary';

// 受保护的路由组件
const ProtectedRoute = ({ children }: { children: ReactElement }) => {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  if (isLoadingAuth) {
    // 认证状态仍在检查中，显示加载指示
    return <div>加载中...</div>; // 或者你的 Spinner 组件
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children ? children : <Outlet />;
};

// 认证状态路由 - 已登录用户会被重定向到句子解析页面
const AuthRoute = ({ children }: { children: ReactElement }) => {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  if (isLoadingAuth) {
    // 认证状态仍在检查中，显示加载指示
    return <div>加载中...</div>; // 或者你的 Spinner 组件
  }

  if (isAuthenticated) {
    return <Navigate to="/app/sentences" replace />;
  }

  return children;
};

function AppRoutes() {
  return (
    <Routes>
      {/* 公共路由 */}
      <Route path="/" element={
        <AuthRoute>
          <Welcome />
        </AuthRoute>
      } />
      <Route path="/login" element={
        <AuthRoute>
          <Login />
        </AuthRoute>
      } />
      <Route path="/register" element={
        <AuthRoute>
          <Register />
        </AuthRoute>
      } />

      {/* 受保护的路由 */}
      <Route path="/app" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      }>
        <Route path="sentences" element={<SentenceParser />} />
        <Route path="vocabulary" element={<VocabularyList />} />
      </Route>
      {/* 添加额外的重定向路由 */}
      <Route path="/sentences" element={
        <ProtectedRoute>
          <Navigate to="/app/sentences" replace />
        </ProtectedRoute>
      } />
      <Route path="/vocabulary" element={
        <ProtectedRoute>
          <Navigate to="/app/vocabulary" replace />
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>

        <AppRoutes />

      </BrowserRouter>
    </AuthProvider>
  );
}


export default App;