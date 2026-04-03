
// 在文件顶部添加导入语句
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import Word from '../models/Word';

// @desc    获取用户的所有生词
// @route   GET /api/vocabulary
// @access  Private
export const getUserVocabulary = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;

        // 获取分页参数
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const skip = (page - 1) * limit;

        // 获取排序方式
        const sortBy = req.query.sortBy as string || 'saveCount';
        const sortOrder = req.query.sortOrder as string || 'desc';

        // 构建排序对象
        const sort: any = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        // 统计总单词数
        const total = await Word.countDocuments({ user: userId });

        // 查询单词列表
        const words = await Word.find({ user: userId })
            .sort(sort)
            .skip(skip)
            .limit(limit)
            .select('-user');

        // 返回分页数据
        res.json({
            words,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        });
        console.log("获取生词本曾功");
    } catch (error: any) {
        console.error('获取生词本失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message });
    }
};

// @desc    删除用户生词
// @route   DELETE /api/vocabulary/:wordId
// @access  Private
export const deleteWord = async (req: Request, res: Response) => {
    try {
        const userId = req.user?.id;
        const wordId = req.params.wordId;

        // 验证MongoDB ObjectId格式
        if (!mongoose.Types.ObjectId.isValid(wordId)) {
            res.status(400).json({ message: '无效的单词ID格式' });
            return;
        }

        // 查找并删除单词，确保只能删除自己的单词
        const word = await Word.findOneAndDelete({
            _id: wordId,
            user: userId
        });

        if (!word) {
            res.status(404).json({ message: '未找到该单词或无权删除' }); return;
        }

        res.json({
            success: true,
            message: `单词 ${word.word} 已成功删除`
        }); return;
    } catch (error: any) {
        console.error('删除单词失败:', error);
        res.status(500).json({ message: '服务器错误', error: error.message }); return;
    }
};