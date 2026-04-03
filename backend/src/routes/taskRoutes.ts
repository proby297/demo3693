// routes/taskRoutes.ts

import express, { Router, Request, Response } from 'express';
import { addTaskToQueue } from '../services/queueService';
import cld from 'cld';

const router: Router = express.Router();

router.post('/segmentation', async (req: Request, res: Response) => {
    const { sentence, user_language: explicitlyProvidedUserLanguage } = req.body;

    if (!sentence || typeof sentence !== 'string' || sentence.trim() === '') {
        res.status(400).json({ error: 'Sentence is required and must be a non-empty string.' });
        return;
    }

    let languageForTask: string;

    // 检查用户是否明确提供了语言，并且不是 'auto'
    if (explicitlyProvidedUserLanguage &&
        typeof explicitlyProvidedUserLanguage === 'string' &&
        explicitlyProvidedUserLanguage.trim().toLowerCase() !== 'auto' &&
        explicitlyProvidedUserLanguage.trim() !== '') {

        languageForTask = explicitlyProvidedUserLanguage.trim().toLowerCase();
        console.log(`[Task Route] Using explicitly provided user_language: ${languageForTask} for sentence: "${sentence}"`);

        // 可选：如果仍然希望运行CLD进行日志记录或比较（但不覆盖用户指定的值）
        try {
            const cldResult = await cld.detect(sentence);
            if (cldResult.reliable && cldResult.languages.length > 0) {
                console.log(`[Task Route] CLD also detected: ${cldResult.languages[0].code} (user-specified '${languageForTask}' will be used)`);
            }
        } catch (cldError: any) {
            console.warn("[Task Route] CLD check for explicitly provided language failed (this is informational):", cldError.message || cldError);
        }

    } else {
        // 用户未提供具体语言，或提供了 'auto'，此时执行 CLD 检测
        console.log(`[Task Route] Attempting CLD detection for sentence: "${sentence}" (explicitlyProvidedUserLanguage was '${explicitlyProvidedUserLanguage || 'not provided'}' or 'auto')`);
        try {
            const cldResult = await cld.detect(sentence);

            if (cldResult.reliable && cldResult.languages.length > 0) {
                languageForTask = cldResult.languages[0].code;
                console.log(`[Task Route] CLD detected language: ${languageForTask} (Reliable: ${cldResult.reliable})`);
            } else {
                languageForTask = 'auto'; // CLD 不可靠或未检测到，回退到 'auto'
                console.log(`[Task Route] CLD detection not reliable or no language found. Defaulting to '${languageForTask}'.`);
            }
        } catch (error: any) {
            console.error("[Task Route] CLD language detection error:", error.message || error);
            languageForTask = 'auto'; // CLD 出错，回退到 'auto'
        }
    }

    const task = {
        id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        text: sentence,
        user_language: languageForTask // 使用最终确定的语言代码
    };

    try {
        await addTaskToQueue('segmentation-tasks', task);
        console.log(`[Task Route] Task ${task.id} enqueued with language '${task.user_language}' for sentence: "${sentence}"`);
        res.status(202).json({ taskId: task.id });
    } catch (error: any) {
        console.error("[Task Route] Error enqueuing task:", error.message || error);
        res.status(500).json({ error: "Failed to enqueue task." });
    }
});

export default router;