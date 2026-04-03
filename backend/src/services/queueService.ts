// services/queueService.ts

import Redis from 'ioredis';

// 创建一个专门用于执行常规命令（如 LPUSH, GET, SET）的 Redis 客户端。
// **最佳实践**：将用于“订阅”的客户端和用于“常规命令”的客户端分开。
// 因为一旦客户端进入订阅模式，它通常就不能再执行其他命令了。
const redisCommandClient = new Redis({
    host: process.env.REDIS_HOST || 'redis',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    // 可以复用 server.ts 中的重试策略等配置
});

redisCommandClient.on('connect', () => {
    console.log('[Redis Command] Client connected successfully.');
});

redisCommandClient.on('error', (err) => {
    console.error('[Redis Command] Client connection error:', err);
});

/**
 * 将任务添加到 Redis 列表（队列）中
 * @param queueName - 队列的名称 (例如 'segmentation-tasks')
 * @param task - 要添加的任务对象
 */
export const addTaskToQueue = async (queueName: string, task: object): Promise<void> => {
    try {
        // 将任务对象转换为 JSON 字符串，因为 Redis 只能存储字符串、数字等基本类型
        const taskJson = JSON.stringify(task);
        // 使用 LPUSH 命令将任务从列表的左侧推入队列
        await redisCommandClient.lpush(queueName, taskJson);
    } catch (error) {
        console.error(`Failed to add task to queue '${queueName}':`, error);
        // 抛出错误，以便路由处理器可以捕获它并向客户端返回 500 错误
        throw error;
    }
};