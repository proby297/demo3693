import express from 'express';
import { saveSelectedWords } from '../controllers/sentenceController';
import { protect } from '../middleware/authMiddleware';

const router = express.Router();

// 所有句子相关路由都需要认证
router.use(protect);

// 保存选中的单词
router.post('/save-words', saveSelectedWords);

export default router;