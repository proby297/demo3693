import express from 'express';
import { getUserVocabulary, deleteWord } from '../controllers/vocabularyController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// 所有生词本相关路由都需要认证
router.use(protect);

// 获取用户生词本
router.get('/', getUserVocabulary);

// 删除单词
router.delete('/:wordId', deleteWord);

export default router;