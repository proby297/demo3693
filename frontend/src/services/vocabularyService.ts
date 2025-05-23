import api from './api';

export interface WordData {
    _id: string;
    word: string;
    phonetic: string;
    contextMeaning: string;
    sentence: string;
    meaning: string;
    exampleSentence: string;
    exampleSentenceMeaning: string;
    etymology: string;
    synonymsInContext: string[];
    context: string;
    saveCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface VocabularyResponse {
    words: WordData[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

// 获取用户生词本（分页）
export const getVocabulary = async (page: number, limit: number): Promise<VocabularyResponse> => {
    const response = await api.get<VocabularyResponse>(
        `/vocabulary?page=${page}&limit=${limit}&sortBy=saveCount&sortOrder=desc`
    );
    return response.data;
};

// 删除单词
export const deleteWord = async (wordId: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/vocabulary/${wordId}`);
    return response.data;
};