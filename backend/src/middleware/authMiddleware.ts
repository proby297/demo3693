import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwtUtils';
import User from '../models/User';

// 扩展Request类型以包含用户属性
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

export const protect = async (req: Request, res: Response, next: NextFunction) => {
    try {
        let token;

        if (
            req.headers.authorization &&
            req.headers.authorization.startsWith('Bearer')
        ) {
            // 获取令牌
            token = req.headers.authorization.split(' ')[1];

            // 验证令牌
            const decoded = verifyToken(token);

            // 获取用户信息，排除密码
            req.user = await User.findById(decoded.id).select('-password');

            next();
        } else if (!token) {
            res.status(401).json({ message: '未授权，没有令牌' });
            return;
        }
    } catch (error) {
        console.error('认证失败', error);
        res.status(401).json({ message: '未授权，令牌失败' });
        return;
    }
};