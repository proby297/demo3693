import api from './api';

export interface SaveWordsRequest {
    originalText: string;
    selectedWords: string[];
}

export interface SaveWordsResponse {
    success: boolean;
    message: string;
}
export interface WordSegmentationReq {
    originalText: string;
}
export interface TokenDetail {
    text: string;
    lemma: string;
    pos: string;
    is_stop: boolean;
}
export interface EntityDetail {
    text: string;
    label: string;
}
export interface WordSegmentationRes {
    taskId: string;
    language: string;
    originalText: string;
    tokens: TokenDetail[];
    entities: EntityDetail[];
}
export interface SubmitTaskRequest {
    sentence: string;
    user_language: string
}

export interface SubmitTaskResponse {
    taskId: string;
}


// 保存选中的单词
export const saveSelectedWords = async (data: SaveWordsRequest): Promise<SaveWordsResponse> => {
    const response = await api.post<SaveWordsResponse>('/sentences/save-words', data);
    return response.data;
};
export const submitSegmentationTask = async (data: SubmitTaskRequest): Promise<SubmitTaskResponse> => {
    // 【修改】API 端点路径也已更新为我们在后端定义的正确路径
    // 假设您的 api 实例会自动处理 /api 前缀（因为 Vite 代理）
    const response = await api.post<SubmitTaskResponse>('/tasks/segmentation', data);
    return response.data; // 这里只会返回 { taskId: '...' }
};