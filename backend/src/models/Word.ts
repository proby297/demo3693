import mongoose from 'mongoose';

export interface IWord extends mongoose.Document {
    word: string;
    phonetic?: string;
    contextMeaning?: string;
    sentence?: string;            // 新字段：包含单词的原句
    meaning?: string;             // 新字段：原句翻译
    exampleSentence?: string;     // 修改：从数组改为单个句子
    exampleSentenceMeaning?: string; // 新字段：例句翻译
    etymology?: string;
    synonymsInContext?: string[];
    context: string;
    user: mongoose.Schema.Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}

const wordSchema = new mongoose.Schema(
    {
        word: {
            type: String,
            required: true,
            trim: true,
            lowercase: true,
        },
        phonetic: {
            type: String,
        },
        contextMeaning: {
            type: String,
        },
        sentence: {                // 新字段
            type: String,
        },
        meaning: {                 // 新字段
            type: String,
        },
        exampleSentence: {         // 修改：从数组改为单个字符串
            type: String,
        },
        exampleSentenceMeaning: {  // 新字段
            type: String,
        },
        etymology: {
            type: String,
        },
        synonymsInContext: {
            type: [String],
        },
        context: {
            type: String,
            required: true,
        },
        saveCount: {
            type: Number,
            default: 1
        },
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

// 复合索引，确保用户不会保存重复单词
wordSchema.index({ user: 1, word: 1 }, { unique: true });

const Word = mongoose.model<IWord>('Word', wordSchema);

export default Word;