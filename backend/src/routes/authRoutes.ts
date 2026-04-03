import express from 'express';
import { registerUser, loginUser, getCurrentUser } from '../controllers/authController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// 注册路由
router.post('/register', (req, res, next) => {
    registerUser(req, res).catch(next);
});

// 登录路由
router.post('/login', (req, res, next) => {
    loginUser(req, res).catch(next);
});

// 获取当前用户信息路由
router.get('/me', protect, (req, res, next) => {
    getCurrentUser(req, res).catch(next);
});

export default router;