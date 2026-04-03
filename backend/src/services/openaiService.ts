import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// API密钥和地址
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const API_URL: string = process.env.API_URL ?? ''; // Ensure API_URL is always a string
if (!API_URL) {
    throw new Error('API_URL environment variable is not set');
}

interface WordAnalysis {
    word: string;
    phonetic?: string;
    contextMeaning?: string;
    sentence?: string;                // 新字段
    meaning?: string;                 // 新字段
    exampleSentence?: string;         // 修改：从数组改为单个句子
    exampleSentenceMeaning?: string;  // 新字段
    etymology?: string;
    synonymsInContext?: string[];
}

export interface AnalysisResponse {
    words: WordAnalysis[];
}

/**
 * 使用类OpenAI API分析文本中的单词
 */
export const analyzeWords = async (text: string, words: string[]): Promise<AnalysisResponse> => {
    try {
        const response = await axios.post(
            API_URL,
            {
                model: 'gpt-4o-mini',
                messages: [
                    {
                        role: 'system',
                        content: `You are a professional machine translation and linguistic analysis engine. Analyze a given text and return a JSON object with details for each specified word. For each word, include:

word: the word itself

phonetic: its phonetic transcription

contextMeaning: its meaning in the context of the text(in chinese)

sentence: the original sentence containing the word

meaning: Chinese translation of the sentence

exampleSentence: a new sentence using the word with the same meaning

exampleSentenceMeaning: its Chinese translation

etymology: root and origin(in chinese)

synonymsInContext: synonyms that can replace the word in the sentence

Return only valid JSON in the format:
{ "words": [ { word info objects } ] }
`
                    },
                    {
                        role: 'user',
                        content: `文本内容: "${text}"\n\n需要分析的单词: ${words.join(', ')}`
                    }
                ],
                temperature: 0.5,
                response_format: { type: 'json_object' }
            },
            {
                headers: {
                    'Authorization': `Bearer ${OPENAI_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        // 确保响应包含我们需要的数据
        const result = response.data.choices[0]?.message?.content;

        if (!result) {
            throw new Error('API返回的数据格式不正确');
        }

        // 解析JSON字符串
        const parsedResult = JSON.parse(result);

        // 确保返回值是预期的格式
        if (!parsedResult.words || !Array.isArray(parsedResult.words)) {
            throw new Error('API返回的数据不含words数组');
        }

        return parsedResult;
    } catch (error: any) {
        console.error('调用OpenAI API失败:', error.message);

        if (error.response) {
            console.error('OpenAI API错误:', error.response.data);
        }

        throw new Error(`分析单词失败: ${error.message}`);
    }
};