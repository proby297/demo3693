import { Request, Response } from 'express';
import User from '../models/User';
import { generateToken } from '../utils/jwtUtils';

// @desc    注册新用户
// @route   POST /api/auth/register
// @access  Public
export const registerUser = async (req: Request, res: Response) => {
    try {
        const { username, email, password } = req.body;

        // 检查必填字段
        if (!username || !email || !password) {
            return res.status(400).json({ message: '请提供所有必填字段' });
        }

        // 检查用户是否已存在
        const userExists = await User.findOne({ $or: [{ email }, { username }] });

        if (userExists) {
            return res.status(400).json({ message: '用户已存在' });
        }

        // 创建用户
        const user = await User.create({
            username,
            email,
            password,
        });

        if (user) {
            res.status(201).json({
                _id: user._id,
                username: user.username,
                email: user.email,
                token: generateToken(user),
            });
        } else {
            res.status(400).json({ message: '无效的用户数据' });
        }
    } catch (error: any) {
        console.error('注册失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

// @desc    用户登录
// @route   POST /api/auth/login
// @access  Public
export const loginUser = async (req: Request, res: Response) => {
    try {
        const { username, password } = req.body;

        // 检查必填字段
        if (!username || !password) {
            return res.status(400).json({ message: '请提供用户名和密码' });
        }

        // 查找用户
        const user = await User.findOne({ username });

        if (!user) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        // 检查密码
        const isMatch = await user.comparePassword(password);

        if (!isMatch) {
            return res.status(401).json({ message: '用户名或密码错误' });
        }

        res.json({
            _id: user._id,
            username: user.username,
            email: user.email,
            token: generateToken(user),
        });
    } catch (error: any) {
        console.error('登录失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

// @desc    获取当前用户信息
// @route   GET /api/auth/me
// @access  Private
export const getCurrentUser = async (req: Request, res: Response) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: '未授权' });
        }

        const user = await User.findById(req.user.id).select('-password');

        if (!user) {
            return res.status(404).json({ message: '用户不存在' });
        }

        res.json(user);
    } catch (error: any) {
        console.error('获取用户信息失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};