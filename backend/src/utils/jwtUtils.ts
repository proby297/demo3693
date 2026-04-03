import jwt from 'jsonwebtoken';
import config from '../config/config';
import { IUser } from '../models/User';

export const generateToken = (user: IUser): string => {
    return jwt.sign(
        {
            id: user._id,
            username: user.username
        },
        config.jwtSecret,
        {
            expiresIn: '30d',
        }
    );
};

export const verifyToken = (token: string): any => {
    try {
        return jwt.verify(token, config.jwtSecret);
    } catch (error) {
        throw new Error('无效或过期的令牌');
    }
};