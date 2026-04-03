import { Request, Response } from 'express';
import Word from '../models/Word';
import { Document } from 'mongoose';
import { analyzeWords } from '../services/openaiService';

// @desc    保存选中的单词并使用OpenAI分析 (最终修正版)
// @route   POST /api/sentences/save-words
// @access  Private
export const saveSelectedWords = async (req: Request, res: Response) => {
    const { originalText, selectedWords } = req.body;
    const userId = req.user?.id;

    if (!originalText || !selectedWords || !Array.isArray(selectedWords) || selectedWords.length === 0) {
        res.status(400).json({ message: '请提供原文和非空的单词数组' });
        return;
    }

    try {
        console.log('请求体:', { originalText, selectedWords, userId });

        const analysisPromises = selectedWords.map(word =>
            analyzeWords(originalText, [word])
        );

        const analysisResults = await Promise.allSettled(analysisPromises);

        // 我们期望的、干净的数据结构。所有字段都是必需的，且有明确类型。
        const successfulAnalyses: {
            word: string;
            phonetic: string;
            contextMeaning: string;
            sentence: string;
            meaning: string;
            exampleSentence: string;
            exampleSentenceMeaning: string;
            etymology: string;
            synonymsInContext: string[];
        }[] = [];

        const initialErrors: {
            word: string;
            error: string;
            name?: string;
        }[] = [];

        analysisResults.forEach((result, index) => {
            if (result.status === 'fulfilled' && result.value?.words?.length > 0) {
                const rawAnalysis = result.value.words[0];

                // --- 核心改动：数据清洗和规范化 ---
                // 使用 ?? (空值合并运算符) 为所有可能不存在或为 undefined 的字段提供默认值。
                const cleanedAnalysis = {
                    word: rawAnalysis.word ?? '', // 假设 word 总是存在，但以防万一
                    phonetic: rawAnalysis.phonetic ?? '',
                    contextMeaning: rawAnalysis.contextMeaning ?? '',
                    sentence: rawAnalysis.sentence ?? '',
                    meaning: rawAnalysis.meaning ?? '',
                    exampleSentence: rawAnalysis.exampleSentence ?? '',
                    exampleSentenceMeaning: rawAnalysis.exampleSentenceMeaning ?? '',
                    etymology: rawAnalysis.etymology ?? '',
                    synonymsInContext: rawAnalysis.synonymsInContext ?? [], // 如果是 undefined，则变为空数组
                };
                // ------------------------------------

                successfulAnalyses.push(cleanedAnalysis);

            } else {
                const reason = result.status === 'rejected' ? result.reason : { message: 'API返回格式不正确' };
                initialErrors.push({
                    word: selectedWords[index],
                    error: reason?.message || '未知API错误',
                    name: reason?.name
                });
            }
        });

        if (successfulAnalyses.length === 0) {
            res.json({
                success: false,
                message: '所有单词都未能成功分析',
                errors: initialErrors,
            });
            return;
        }

        // 后续代码完全不用变，因为它们现在处理的是100%可预测的干净数据
        const dbPromises = successfulAnalyses.map(async (wordAnalysis) => {
            const wordData = {
                word: wordAnalysis.word.toLowerCase(),
                phonetic: wordAnalysis.phonetic,
                contextMeaning: wordAnalysis.contextMeaning,
                sentence: wordAnalysis.sentence,
                meaning: wordAnalysis.meaning,
                exampleSentence: wordAnalysis.exampleSentence,
                exampleSentenceMeaning: wordAnalysis.exampleSentenceMeaning,
                etymology: wordAnalysis.etymology,
                synonymsInContext: wordAnalysis.synonymsInContext,
                context: originalText,
                user: userId
            };

            const existingWord = await Word.findOne({ word: wordData.word, user: userId });

            if (existingWord) {
                let isNewContextMeaning = false;
                let isNewExample = false;
                let updatedContextMeaning = existingWord.contextMeaning || '';
                if (wordData.contextMeaning && !updatedContextMeaning.includes(wordData.contextMeaning)) {
                    updatedContextMeaning = `${updatedContextMeaning}\n\n${wordData.contextMeaning}`;
                    isNewContextMeaning = true;
                }
                let updatedExampleSentence = existingWord.exampleSentence || '';
                let updatedExampleSentenceMeaning = existingWord.exampleSentenceMeaning || '';
                if (wordData.exampleSentence && !updatedExampleSentence.includes(wordData.exampleSentence)) {
                    updatedExampleSentence = `${updatedExampleSentence}\n\n${wordData.exampleSentence}`;
                    updatedExampleSentenceMeaning = `${updatedExampleSentenceMeaning}\n\n${wordData.exampleSentenceMeaning ?? ''}`;
                    isNewExample = true;
                }
                if (isNewContextMeaning || isNewExample) {
                    return Word.findOneAndUpdate({ _id: existingWord._id }, { $set: { contextMeaning: updatedContextMeaning, exampleSentence: updatedExampleSentence, exampleSentenceMeaning: updatedExampleSentenceMeaning }, $inc: { saveCount: 1 } }, { new: true });
                } else {
                    return Word.findOneAndUpdate({ _id: existingWord._id }, { $inc: { saveCount: 1 } }, { new: true });
                }
            } else {
                return Word.create(wordData);
            }
        });

        const dbResults = await Promise.allSettled(dbPromises);

        const savedWords: (Document | null)[] = [];
        const dbErrors: {
            word: string;
            error: string;
            name?: string;
        }[] = [];

        dbResults.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                savedWords.push(result.value);
            } else {
                dbErrors.push({
                    word: successfulAnalyses[index].word,
                    error: result.reason?.message || '未知数据库错误',
                    name: result.reason?.name
                });
            }
        });

        const finalErrors = [...initialErrors, ...dbErrors];

        res.json({
            success: true,
            message: `成功处理 ${savedWords.length} 个单词${finalErrors.length > 0 ? `，${finalErrors.length}个单词失败` : ''}`,
            savedWords,
            errors: finalErrors.length > 0 ? finalErrors : undefined
        });
        return;

    } catch (error: any) {
        console.error('保存单词时发生意外错误:', error);
        res.status(500).json({
            message: '服务器内部错误',
            error: error.message
        });
        return;
    }
};