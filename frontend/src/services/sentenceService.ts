import api from './api';

export interface SaveWordsRequest {
    originalText: string;
    selectedWords: string[];
}

export interface SaveWordsResponse {
    success: boolean;
    message: string;
}

// 保存选中的单词
export const saveSelectedWords = async (data: SaveWordsRequest): Promise<SaveWordsResponse> => {
    const response = await api.post<SaveWordsResponse>('/sentences/save-words', data);
    return response.data;
};